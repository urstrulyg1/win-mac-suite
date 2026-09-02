/**
 * WinSuite & MacSuite v6.6 - Network Doctor & Connectivity Route
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
import {
  getWindowsNetworkDoctor,
  getWindowsWifiIntelligence,
  getWindowsBluetoothDoctor,
  getWindowsListeningPorts,
} from '../helpers/windows-helpers.js';

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

    const activeIface = Array.isArray(netInterfaces)
      ? netInterfaces.find((n) => n.operstate === 'up' && !n.internal) || netInterfaces[0]
      : null;

    let dnsTimeMs = null;
    try {
      const start = performance.now();
      await resolveAsync('apple.com').catch(() => resolveAsync('cloudflare.com'));
      dnsTimeMs = Math.round(performance.now() - start);
    } catch {
      dnsTimeMs = null; // DNS resolution failed — report as unavailable, not a fake value
    }

    // Measure real gateway latency using ping (1 packet) — platform-safe binary
    const isWin = process.platform === 'win32';
    let gatewayLatencyMs = null;
    if (defaultGateway) {
      try {
        const { execFile } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(execFile);
        const pingStart = performance.now();
        if (isWin) {
          const sysRoot = process.env.SystemRoot || 'C:\\Windows';
          await execAsync(`${sysRoot}\\System32\\ping.exe`, ['-n', '1', '-w', '2000', defaultGateway], { timeout: 4000 });
        } else {
          await execAsync('/sbin/ping', ['-c', '1', '-t', '2', defaultGateway], { timeout: 3000 });
        }
        gatewayLatencyMs = +(performance.now() - pingStart).toFixed(1);
      } catch {}
    }

    res.json({
      online: activeIface?.operstate === 'up',
      defaultGateway,
      dnsResolutionTimeMs: dnsTimeMs,
      gatewayLatencyMs,
      packetLossPct: null,
      activeAdapter: {
        name: activeIface?.iface || 'en0',
        type: activeIface?.type || 'wireless',
        ip: activeIface?.ip4 || '',
        speed: activeIface?.speed || null,
        mac: activeIface?.mac || '',
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/network/doctor (6-Step Guided Troubleshooting Pipeline) ────────
router.get('/doctor', async (_req, res) => {
  try {
    const doctorData = isMac
      ? await getMacNetworkDoctor()
      : await getWindowsNetworkDoctor();
    res.json(doctorData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/network/bluetooth (Bluetooth & AirDrop Doctor) ──────────────────
router.get('/bluetooth', async (_req, res) => {
  try {
    const btData = isMac
      ? await getMacBluetoothAirDropDoctor()
      : await getWindowsBluetoothDoctor();
    res.json(btData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/network/wifi-intelligence ──────────────────────────────────────
router.get('/wifi-intelligence', async (_req, res) => {
  try {
    const wifiData = isMac
      ? await getMacWifiIntelligence()
      : await getWindowsWifiIntelligence();
    res.json(wifiData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/network/listening-ports ────────────────────────────────────────
router.get('/listening-ports', async (_req, res) => {
  try {
    const ports = isMac
      ? await getMacListeningPorts()
      : await getWindowsListeningPorts();
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
