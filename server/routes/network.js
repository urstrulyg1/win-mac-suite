/**
 * WinSuite & MacSuite v6.5 - Network Doctor & Connectivity Route
 * Endpoints:
 * - GET /api/network/diagnostics
 * - GET /api/network/doctor
 * - GET /api/network/bluetooth
 * - GET /api/network/wifi-intelligence
 * - GET /api/network/listening-ports
 */

import express from 'express';
import si from 'systeminformation';
import dns from 'dns';
import { promisify } from 'util';
import {
  getMacNetworkDoctor,
  getMacBluetoothAirDropDoctor,
  getMacWifiIntelligence,
  getMacListeningPorts,
} from '../helpers/macos-helpers.js';

const resolveAsync = promisify(dns.resolve);
const router = express.Router();
const isMac = process.platform === 'darwin';

// ── GET /api/network/diagnostics ────────────────────────────────────────────
router.get('/diagnostics', async (_req, res) => {
  try {
    const [netInterfaces, defaultGateway] = await Promise.all([
      si.networkInterfaces(),
      si.networkGatewayDefault().catch(() => null),
    ]);

    const activeIface = Array.isArray(netInterfaces) && netInterfaces.length > 0
      ? netInterfaces.find((n) => n.operstate === 'up' && !n.internal) || netInterfaces[0]
      : null;

    // Measure real DNS resolution time (fall back to null, never a made-up latency).
    let dnsTimeMs = null;
    try {
      const start = performance.now();
      const resolved = await resolveAsync('apple.com').catch(() => resolveAsync('cloudflare.com'));
      if (resolved) dnsTimeMs = Math.max(Math.round(performance.now() - start), 1);
    } catch {
      dnsTimeMs = null;
    }

    // Measure real gateway latency using ping (1 packet); null if the gateway or ping is unavailable.
    let gatewayLatencyMs = null;
    if (defaultGateway) {
      try {
        const { execFile } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(execFile);
        const pingStart = performance.now();
        await execAsync('/sbin/ping', ['-c', '1', '-W', '2000', defaultGateway], { timeout: 3000 });
        gatewayLatencyMs = +(performance.now() - pingStart).toFixed(1);
      } catch {
        gatewayLatencyMs = null;
      }
    }

    res.json({
      online: activeIface ? activeIface.operstate === 'up' : false,
      defaultGateway,
      dnsResolutionTimeMs: dnsTimeMs,
      gatewayLatencyMs,
      packetLossPct: null,
      activeAdapter: activeIface
        ? {
            name: activeIface.iface || null,
            type: activeIface.type || null,
            ip: activeIface.ip4 || '',
            speed: activeIface.speed && activeIface.speed > 0 ? activeIface.speed : null,
            mac: activeIface.mac || '',
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/network/doctor (6-Step Guided Troubleshooting Pipeline) ────────
router.get('/doctor', async (_req, res) => {
  try {
    if (!isMac) {
      res.json({ available: false, reason: 'Network doctor workflow is macOS-only.' });
      return;
    }
    const doctorData = await getMacNetworkDoctor();
    res.json(doctorData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/network/bluetooth (Bluetooth & AirDrop Doctor) ──────────────────
router.get('/bluetooth', async (_req, res) => {
  try {
    if (!isMac) {
      res.json({ available: false, reason: 'Bluetooth/AirDrop diagnostics are macOS-only.' });
      return;
    }
    const btData = await getMacBluetoothAirDropDoctor();
    res.json(btData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/network/wifi-intelligence ──────────────────────────────────────
router.get('/wifi-intelligence', async (_req, res) => {
  try {
    if (!isMac) {
      res.json({ available: false, reason: 'Wi-Fi intelligence is macOS-only.' });
      return;
    }
    const wifiData = await getMacWifiIntelligence();
    res.json(wifiData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/network/listening-ports ────────────────────────────────────────
router.get('/listening-ports', async (_req, res) => {
  try {
    const ports = isMac ? await getMacListeningPorts() : [];
    res.json({
      platform: isMac ? 'macos' : 'windows',
      count: ports.length,
      ports,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
