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
  getMacDnsDiagnostics,
  getMacFirewallRules,
} from '../helpers/macos-advanced-helpers.js';
import {
  getWindowsNetworkDoctor,
  getWindowsWifiIntelligence,
  getWindowsBluetoothDoctor,
  getWindowsListeningPorts,
} from '../helpers/windows-helpers.js';

const resolveAsync = promisify(dns.resolve);

/**
 * Resolves a hostname but never hangs the request: if the system resolver stalls
 * (offline host, blocked outbound DNS, no resolver configured) we abort after
 * 4s and let the caller report the probe as unavailable rather than blocking the
 * whole diagnostics endpoint. This matters equally on Windows and macOS.
 */
function resolveWithTimeout(host, timeoutMs = 4000) {
  return Promise.race([
    resolveAsync(host),
    new Promise((_resolve, reject) => {
      setTimeout(() => reject(new Error('DNS resolution timed out')), timeoutMs);
    }),
  ]);
}

/**
 * Bounds an arbitrary async probe so a misbehaving OS call (a WMI/WinRM query
 * that never returns on some Windows configurations, or a platform mismatch
 * during cross-platform development) can never hang the diagnostics endpoint.
 */
function withTimeout(promise, timeoutMs = 6000, label = 'probe') {
  return Promise.race([
    promise,
    new Promise((_resolve, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    }),
  ]);
}

const router = express.Router();
const isMac = process.platform === 'darwin';

// ── GET /api/network/diagnostics ────────────────────────────────────────────
router.get('/diagnostics', async (_req, res) => {
  try {
    const [netInterfacesSafe, defaultGateway] = await Promise.all([
      withTimeout(si.networkInterfaces(), 6000, 'network interfaces').catch(() => null),
      withTimeout(si.networkGatewayDefault(), 6000, 'default gateway').catch(() => null),
    ]);
    const netInterfaces = netInterfacesSafe && Array.isArray(netInterfacesSafe) ? netInterfacesSafe : null;

    const activeIface = Array.isArray(netInterfaces)
      ? netInterfaces.find((n) => n.operstate === 'up' && !n.internal) || netInterfaces[0]
      : null;

    let dnsTimeMs = null;
    try {
      const start = performance.now();
      await resolveWithTimeout('apple.com').catch(() => resolveWithTimeout('cloudflare.com'));
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
        name: activeIface?.iface || null,
        type: activeIface?.type || null,
        ip: activeIface?.ip4 || null,
        speed: activeIface?.speed || null,
        mac: activeIface?.mac || null,
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

// ── GET /api/network/dns-diagnostics ────────────────────────────────────────
router.get('/dns-diagnostics', async (_req, res) => {
  try {
    if (isMac) {
      res.json(await getMacDnsDiagnostics());
    } else {
      // Windows: use the top-level dns import (no re-import needed)
      const resolve = promisify(dns.resolve4);
      const resolveTimed = (host) => Promise.race([
        resolve(host),
        new Promise((_resolve, reject) => setTimeout(() => reject(new Error('DNS resolution timed out')), 4000)),
      ]);
      const testHosts = ['microsoft.com', 'cloudflare.com', 'google.com'];
      const results = [];
      for (const host of testHosts) {
        try {
          const start = performance.now();
          await resolveTimed(host);
          results.push({ host, resolved: true, latencyMs: Math.round(performance.now() - start) });
        } catch {
          results.push({ host, resolved: false, latencyMs: null });
        }
      }
      const servers = dns.getServers();
      res.json({
        configuredServers: servers,
        testResults: results,
        allResolved: results.every(r => r.resolved),
        avgLatencyMs: Math.round(results.filter(r => r.latencyMs !== null).reduce((s, r, _, a) => s + r.latencyMs / a.length, 0)) || null,
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/network/firewall-rules ──────────────────────────────────────────
router.get('/firewall-rules', async (_req, res) => {
  try {
    if (isMac) {
      res.json(await getMacFirewallRules());
    } else {
      // Windows: covered by /api/windows/v2/network/firewall
      res.json({ note: 'Use /api/windows/v2/network/firewall for Windows firewall rules.', enabled: null, rules: [] });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
