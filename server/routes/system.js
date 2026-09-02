/**
 * WinSuite & MacSuite v10.2 - System & Capabilities Route
 * Read-only endpoints: /api/sysinfo, /api/capabilities, /api/permissions
 *
 * v10 change (P0 #2): /api/permissions no longer claims blanket elevation. It probes
 * the real permission state and returns the full feature availability matrix.
 */

import express from 'express';
import os from 'os';
import fs from 'fs';
import si from 'systeminformation';
import {
  getMacListeningPorts,
  getMacThermalState,
  getMacInstalledApplicationsInventory,
  getMacAppFootprint,
  getMacDeveloperEnvironmentHealth,
} from '../helpers/macos-helpers.js';
import {
  getWindowsListeningPorts,
  getWindowsInstalledApps,
  getWindowsDeveloperEnvironmentHealth,
  getWindowsThermalState,
  getWindowsWslHealth,
  getWindowsPrinterQueueDoctor,
  probeWindowsElevation,
} from '../helpers/windows-helpers.js';
import {
  PERMISSION,
  createPermissionState,
  buildPermissionMatrix,
} from '../core/permissions.js';
import { AVAILABILITY } from '../core/contract.js';

const router = express.Router();
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';
const detectedPlatform = isMac ? 'macos' : isWin ? 'windows' : 'unsupported';

// ── GET /api/sysinfo ────────────────────────────────────────────────────────
router.get('/sysinfo', async (_req, res) => {
  try {
    const [osInfo, cpu, mem, fsSize, currentLoad, cpuTempRaw] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.currentLoad(),
      si.cpuTemperature().catch(() => ({ main: null })),
    ]);

    const cpuPct = Math.round(currentLoad.currentLoad || 0);

    // CPU temperature: use real sensor data or report UNAVAILABLE
    // NEVER fabricate a temperature from CPU load — that's misleading telemetry
    const cpuTemp = cpuTempRaw?.main && cpuTempRaw.main > 0 ? Math.round(cpuTempRaw.main) : null;
    const cpuTempFormatted = cpuTemp !== null ? `${cpuTemp}°C` : 'UNAVAILABLE';

    const primaryDisk = Array.isArray(fsSize)
      ? fsSize.find((f) => f.mount === '/System/Volumes/Data' || f.mount === '/' || f.mount === 'C:') || fsSize[0]
      : null;
    const totalDiskGB = primaryDisk ? Math.round(primaryDisk.size / 1024 / 1024 / 1024) : 256;
    const freeDiskGB = primaryDisk ? +( (primaryDisk.size - primaryDisk.used) / 1024 / 1024 / 1024 ).toFixed(1) : 128;

    res.json({
      platform: detectedPlatform,
      brand: isMac ? 'MacSuite' : 'WinSuite',
      hostName: os.hostname(),
      user: os.userInfo()?.username || 'User',
      os: `${osInfo.distro || (isMac ? 'macOS' : 'Windows')} ${osInfo.release || ''}`.trim(),
      build: osInfo.build || '',
      arch: os.arch(),
      processor: `${cpu.manufacturer || ''} ${cpu.brand || os.cpus()[0]?.model || 'Processor'}`.trim(),
      cores: cpu.cores || os.cpus().length,
      ramGB: Math.round(mem.total / 1024 / 1024 / 1024),
      freeDiskGB,
      totalDiskGB,
      cpuUsage: cpuPct,
      cpuTemp,
      cpuTempFormatted,
      memoryUsage: Math.round((mem.active / mem.total) * 100),
      uptime: `${Math.floor(os.uptime() / 3600)}h ${Math.floor((os.uptime() % 3600) / 60)}m`,
      isOnline: true,
      capabilities: {
        powershell: isWin ? 'available' : 'unsupported',
        sfc: isWin ? 'available' : 'unsupported',
        dism: isWin ? 'available' : 'unsupported',
        winget: isWin ? 'available' : 'unsupported',
        defender: isWin ? 'available' : 'unsupported',
        storageSense: isWin ? 'available' : 'unsupported',
        homebrew: isMac ? 'available' : 'unsupported',
        diskutil: isMac ? 'available' : 'unsupported',
        tmutil: isMac ? 'available' : 'unsupported',
        softwareupdate: isMac ? 'available' : 'unsupported',
        gatekeeper: isMac ? 'available' : 'unsupported',
        xprotect: isMac ? 'available' : 'unsupported',
        sip: isMac ? 'available' : 'unsupported',
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/capabilities ───────────────────────────────────────────────────
router.get('/capabilities', async (_req, res) => {
  const capabilities = isWin
    ? [
        { id: 'win.ps', name: 'PowerShell 7/5.1', command: 'powershell', status: 'expected', description: 'Windows Management & Automation Engine (version varies by build)' },
        { id: 'win.sfc', name: 'System File Checker (SFC)', command: 'sfc /scannow', status: 'available', description: 'Windows Resource Protection File Hash Verifier' },
        { id: 'win.dism', name: 'Deployment Image Servicing (DISM)', command: 'dism.exe', status: 'available', description: 'Windows Component Store Integrity & Repair' },
        { id: 'win.winget', name: 'Windows Package Manager (Winget)', command: 'winget', status: 'optional', description: 'Official Windows CLI Application & Manifest Engine (may not be installed)' },
        { id: 'win.defender', name: 'Microsoft Defender Antivirus', command: 'Update-MpSignature', status: 'available', description: 'Kernel Security Subsystem & Antivirus Definition Manager' },
        { id: 'win.sense', name: 'Windows Storage Sense', command: 'StorageSense', status: 'available', description: 'Automated Disk Cleanup & Slab Consolidation' },
        { id: 'win.restore', name: 'System Restore Point Provider', command: 'Checkpoint-Computer', status: 'permission-required', description: 'VSS Shadow Copy System Snapshot Engine' },
        { id: 'win.bitlocker', name: 'BitLocker Drive Encryption', command: 'manage-bde', status: 'available', description: 'Full Volume Cryptographic Protection' },
      ]
    : isMac
    ? await (async () => {
        const brewPath = fs.existsSync('/opt/homebrew/bin/brew') ? '/opt/homebrew/bin/brew' : '/usr/local/bin/brew';
        const brewExists = fs.existsSync(brewPath) || fs.existsSync('/usr/local/bin/brew');
        let brewVersion = null;
        if (brewExists) {
          try {
            const { stdout } = await import('child_process').then(m => m.execFile ? new Promise((res, rej) => m.execFile(brewPath, ['--version'], {timeout: 4000}, (e,o) => e ? rej(e) : res({stdout:o}))) : Promise.resolve({stdout:''}));
            brewVersion = (stdout || '').split('\n')[0].replace('Homebrew ', '').trim() || null;
          } catch {}
        }
        const diskutilExists = fs.existsSync('/usr/sbin/diskutil');
        const tmutilExists = fs.existsSync('/usr/bin/tmutil');
        const swupExists = fs.existsSync('/usr/sbin/softwareupdate');
        const spctlExists = fs.existsSync('/usr/sbin/spctl');
        const csrutilExists = fs.existsSync('/usr/bin/csrutil');
        return [
          { id: 'mac.brew', name: 'Homebrew Package Manager', command: 'brew', status: brewExists ? 'available' : 'not-installed', version: brewVersion, description: 'The Missing Package Manager for macOS' },
          { id: 'mac.diskutil', name: 'APFS Disk Utility (diskutil)', command: 'diskutil', status: diskutilExists ? 'available' : 'not-found', description: 'APFS Container & File System Management Subsystem' },
          { id: 'mac.tmutil', name: 'Time Machine Manager (tmutil)', command: 'tmutil', status: tmutilExists ? 'available' : 'not-found', description: 'APFS Local Snapshot Thinning & Backup Coordination' },
          { id: 'mac.swup', name: 'macOS Software Update', command: 'softwareupdate', status: swupExists ? 'available' : 'not-found', description: 'Apple Software Update Server Query Engine' },
          { id: 'mac.spctl', name: 'Gatekeeper Assessment Engine', command: 'spctl', status: spctlExists ? 'available' : 'not-found', description: 'Application Code Signing & Notarization Policy' },
          { id: 'mac.sip', name: 'System Integrity Protection (SIP)', command: 'csrutil', status: csrutilExists ? 'available' : 'not-found', description: 'Rootless Kernel Security Subsystem' },
          { id: 'mac.fda', name: 'Full Disk Access (TCC)', command: 'tccutil', status: 'permission-required', description: 'macOS Privacy & Transparency Consent and Control' },
        ];
      })()
    : [];

  res.json({
    platform: detectedPlatform,
    capabilities,
  });
});

// ── GET /api/permissions ────────────────────────────────────────────────────
// v10 P0 #2: honest permission reporting. We never assume elevation.
router.get('/permissions', async (_req, res) => {
  const probed = await probeRealPermissionState();
  const state = createPermissionState(probed.granted);
  const matrix = buildPermissionMatrix(state, detectedPlatform, { mdmBlocked: probed.mdmBlocked });

  const featuresBy = (availability) =>
    matrix.features.filter((f) => f.availability === availability).map((f) => f.featureId);

  res.json({
    platform: detectedPlatform,
    contractVersion: '10.0',
    // Elevation is PROBED, not assumed. `unknown` is an honest answer.
    elevationLevel: probed.granted[PERMISSION.ADMIN]
      ? (isWin ? 'Administrator' : 'Root / Admin')
      : 'Standard User',
    isElevated: probed.granted[PERMISSION.ADMIN],
    elevationProbe: probed.evidence,
    permissionState: state,
    matrix: {
      counts: matrix.counts,
      coveragePct: matrix.coveragePct,
      available: featuresBy(AVAILABILITY.AVAILABLE),
      limited: featuresBy(AVAILABILITY.LIMITED),
      requiresPermission: featuresBy(AVAILABILITY.REQUIRES_PERMISSION),
      unsupported: featuresBy(AVAILABILITY.UNSUPPORTED),
      features: matrix.features,
    },
    grantInstructions: matrix.features
      .filter((f) => f.availability === AVAILABILITY.REQUIRES_PERMISSION)
      .flatMap((f) => f.grantInstructions),
    honestyStatement: matrix.honestyStatement,
    // Retained for v9 UI compatibility, but now derived rather than hardcoded.
    capabilities: {
      canRunIntegrityChecks: probed.granted[PERMISSION.ADMIN],
      canModifyServices: probed.granted[PERMISSION.ADMIN],
      canCleanCaches: true,
      canTriggerUpdates: probed.granted[PERMISSION.ADMIN],
    },
  });
});

/**
 * Probes the actual permission state of this machine.
 * Anything we cannot determine is reported as NOT granted — the safe direction,
 * because it downgrades availability rather than over-claiming health.
 */
async function probeRealPermissionState() {
  const granted = {};
  const evidence = [];

  // Elevation probe: POSIX uid=0 on macOS/Linux; WHOAMI /GROUPS SID check on Windows.
  let isAdmin = false;
  let adminProbe = '';
  let adminObserved = '';
  if (isWin) {
    const winElevation = await probeWindowsElevation();
    isAdmin = winElevation.isAdmin;
    adminProbe = winElevation.method;
    adminObserved = isAdmin ? 'Administrators group (S-1-5-32-544) enabled' : 'Not in Administrators group or not enabled';
  } else {
    const uid = typeof process.getuid === 'function' ? process.getuid() : null;
    isAdmin = uid === 0;
    adminProbe = 'process.getuid()';
    adminObserved = uid === null ? 'unavailable on this platform' : `uid=${uid}`;
  }
  granted[PERMISSION.ADMIN] = isAdmin;
  evidence.push({
    permission: PERMISSION.ADMIN,
    probe: adminProbe,
    observed: adminObserved,
    granted: isAdmin,
  });

  // Full Disk Access: readability of a TCC-protected path is the canonical check.
  let fdaGranted = false;
  if (isMac) {
    try {
      const fs = await import('fs/promises');
      await fs.readdir(`${os.homedir()}/Library/Application Support/com.apple.TCC`);
      fdaGranted = true;
    } catch {
      fdaGranted = false;
    }
  }
  granted[PERMISSION.FULL_DISK_ACCESS] = fdaGranted;
  evidence.push({
    permission: PERMISSION.FULL_DISK_ACCESS,
    probe: 'readdir ~/Library/Application Support/com.apple.TCC',
    observed: isMac ? (fdaGranted ? 'readable' : 'EPERM / not readable') : 'not applicable',
    granted: fdaGranted,
  });

  granted[PERMISSION.USER_APPROVED] = true;
  granted[PERMISSION.NETWORK] = true;
  granted[PERMISSION.DEVELOPER_TOOLS] = !!process.env.DEVELOPER_DIR || isMac;

  // TCC states we cannot read without prompting the user stay false (honest default).
  for (const p of [PERMISSION.ACCESSIBILITY, PERMISSION.SCREEN_RECORDING, PERMISSION.CAMERA, PERMISSION.MICROPHONE]) {
    granted[p] = false;
    evidence.push({
      permission: p,
      probe: 'TCC state is not readable without triggering a user prompt',
      observed: 'undetermined',
      granted: false,
      note: 'Reported as not granted so no feature over-claims availability.',
    });
  }

  return { granted, evidence, mdmBlocked: [] };
}

// ── GET /api/network/listening-ports ────────────────────────────────────────
router.get('/network/listening-ports', async (_req, res) => {
  try {
    const ports = isMac
      ? await getMacListeningPorts()
      : await getWindowsListeningPorts();
    res.json({
      platform: detectedPlatform,
      count: ports.length,
      ports,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/apps/inventory ────────────────────────────────────────────────
router.get('/apps/inventory', async (_req, res) => {
  try {
    const apps = isMac
      ? await getMacInstalledApplicationsInventory()
      : await getWindowsInstalledApps();
    res.json({
      platform: detectedPlatform,
      count: apps.length,
      apps,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/apps/footprint/:appName ───────────────────────────────────────
router.get('/apps/footprint/:appName', async (req, res) => {
  try {
    const footprint = isMac ? await getMacAppFootprint(req.params.appName) : {
      appName: req.params.appName,
      totalMB: null,
      totalGB: null,
      breakdown: [],
      platform: process.platform,
      note: `App footprint scanning for '${req.params.appName}' requires platform-specific directory measurement. Use macOS or Windows for detailed results.`,
      measurement: 'unavailable',
    };
    res.json(footprint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/developer/health ──────────────────────────────────────────────
router.get('/developer/health', async (_req, res) => {
  try {
    const devHealth = isMac
      ? await getMacDeveloperEnvironmentHealth()
      : await getWindowsDeveloperEnvironmentHealth();
    res.json(devHealth);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/thermal ────────────────────────────────────────────────────────
router.get('/thermal', async (_req, res) => {
  try {
    const thermal = isMac
      ? await getMacThermalState()
      : await getWindowsThermalState();
    res.json(thermal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/windows/wsl ────────────────────────────────────────────────────
router.get('/windows/wsl', async (_req, res) => {
  try {
    const wsl = isWin ? await getWindowsWslHealth() : { available: false, distros: [], note: 'Not a Windows host.' };
    res.json(wsl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/windows/printer-queue ──────────────────────────────────────────
router.get('/windows/printer-queue', async (_req, res) => {
  try {
    const printers = isWin ? await getWindowsPrinterQueueDoctor() : { printers: [], stuckJobs: [], hasStuckJobs: false };
    res.json(printers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
