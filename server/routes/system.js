import express from 'express';
import os from 'os';
import fs from 'fs';
import path from 'path';
import si from 'systeminformation';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getMacListeningPorts, getMacThermalState, getMacInstalledApplicationsInventory, getMacAppFootprint, getMacDeveloperEnvironmentHealth } from '../helpers/macos-helpers.js';
import { getMacUpdateHistory, getMacFailedUpdates, getMacServiceDependencies } from '../helpers/macos-advanced-helpers.js';
import { getWindowsListeningPorts, getWindowsInstalledApps, getWindowsDeveloperEnvironmentHealth, getWindowsThermalState, getWindowsWslHealth, getWindowsPrinterQueueDoctor, probeWindowsElevation, getWindowsAppFootprint } from '../helpers/windows-helpers.js';
import { PERMISSION, createPermissionState, buildPermissionMatrix } from '../core/permissions.js';
import { AVAILABILITY } from '../core/contract.js';
import { checkConnectivity } from '../runtime/degraded-mode.js';

const execFileAsync = promisify(execFile);
const router = express.Router();
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';
const detectedPlatform = isMac ? 'macos' : isWin ? 'windows' : 'unsupported';

async function commandExists(command) {
  try {
    await execFileAsync(isWin ? 'where.exe' : 'sh', isWin ? [command] : ['-lc', `command -v ${command}`], { encoding: 'utf8', timeout: 3000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

router.get('/sysinfo', async (_req, res) => {
  try {
    const [osInfo, cpu, mem, fsSize, currentLoad, cpuTempRaw, connectivity] = await Promise.all([
      si.osInfo(), si.cpu(), si.mem(), si.fsSize(), si.currentLoad(), si.cpuTemperature().catch(() => ({ main: null })), checkConnectivity(),
    ]);
    const cpuUsage = Number.isFinite(currentLoad?.currentLoad) ? Math.round(currentLoad.currentLoad) : null;
    let cpuTemp = Number.isFinite(cpuTempRaw?.main) && cpuTempRaw.main > 0 ? Math.round(cpuTempRaw.main) : null;
    if (cpuTemp === null && isWin) {
      try {
        const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '(Get-CimInstance -ClassName Win32_PerfFormattedData_Counters_ThermalZoneInformation -ErrorAction SilentlyContinue | Select-Object -First 1).HighPrecisionTemperature'], { encoding: 'utf8', timeout: 3000, windowsHide: true });
        const raw = Number.parseInt(String(stdout).trim(), 10);
        if (Number.isFinite(raw) && raw > 2730) cpuTemp = Math.round((raw - 2732) / 10);
      } catch {}
    }
    const primary = Array.isArray(fsSize) ? fsSize.find((f) => f.mount === '/System/Volumes/Data' || f.mount === '/' || /^C:/i.test(f.mount)) || fsSize[0] : null;
    const totalDiskGB = primary?.size > 0 ? Math.round(primary.size / 1024 ** 3) : null;
    const freeDiskGB = primary?.size > 0 && Number.isFinite(primary.used) ? +((primary.size - primary.used) / 1024 ** 3).toFixed(1) : null;
    const totalMemory = Number(mem?.total); const activeMemory = Number(mem?.active);
    const processor = os.cpus()[0]?.model?.replace(/\s+/g, ' ').trim() || `${cpu?.manufacturer || ''} ${cpu?.brand || ''}`.trim() || null;
    res.json({ platform: detectedPlatform, brand: isMac ? 'MacSuite' : isWin ? 'WinSuite' : 'Suite', hostName: os.hostname(), user: os.userInfo()?.username || null, os: `${osInfo.distro || ''} ${osInfo.release || ''}`.trim() || null, build: osInfo.build || null, arch: os.arch(), processor, cores: Number.isFinite(cpu?.cores) ? cpu.cores : null, ramGB: totalMemory > 0 ? Math.round(totalMemory / 1024 ** 3) : null, freeDiskGB, totalDiskGB, cpuUsage, cpuTemp, cpuTempFormatted: cpuTemp === null ? 'UNAVAILABLE' : `${cpuTemp}°C`, memoryUsage: totalMemory > 0 && Number.isFinite(activeMemory) ? Math.round(activeMemory / totalMemory * 100) : null, uptime: Number.isFinite(os.uptime()) ? `${Math.floor(os.uptime() / 3600)}h ${Math.floor(os.uptime() % 3600 / 60)}m` : null, isOnline: connectivity.online, connectivity: { online: connectivity.online, method: connectivity.method, checkedAt: new Date(connectivity.checkedAt).toISOString() }, capabilities: null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/capabilities', async (_req, res) => {
  if (!isWin && !isMac) return res.json({ platform: detectedPlatform, capabilities: [] });
  const definitions = isWin ? [
    ['win.ps', 'PowerShell 7/5.1', 'powershell', 'Windows management and automation'],
    ['win.sfc', 'System File Checker', 'sfc', 'Windows system file integrity'],
    ['win.dism', 'DISM', 'dism.exe', 'Windows component store servicing'],
    ['win.winget', 'WinGet', 'winget', 'Windows package manager'],
    ['win.restore', 'System Restore', 'Checkpoint-Computer', 'Restore point creation'],
    ['win.bitlocker', 'BitLocker', 'manage-bde', 'Volume encryption management'],
  ] : [
    ['mac.brew', 'Homebrew', 'brew', 'Homebrew package manager'],
    ['mac.diskutil', 'Disk Utility', 'diskutil', 'Disk and APFS management'],
    ['mac.tmutil', 'Time Machine', 'tmutil', 'Time Machine management'],
    ['mac.swup', 'Software Update', 'softwareupdate', 'macOS software updates'],
    ['mac.spctl', 'Gatekeeper', 'spctl', 'Code-signing policy assessment'],
    ['mac.sip', 'System Integrity Protection', 'csrutil', 'SIP status management'],
  ];
  const capabilities = [];
  for (const [id, name, command, description] of definitions) {
    const available = await commandExists(command);
    capabilities.push({ id, name, command, status: available ? 'available' : 'not-found', description });
  }
  capabilities.push(isMac
    ? { id: 'mac.fda', name: 'Full Disk Access', command: 'TCC', status: 'not-checked', description: 'Permission state requires a runtime probe.' }
    : { id: 'win.admin', name: 'Administrator', command: 'elevation probe', status: 'not-checked', description: 'Elevation is determined by the permissions endpoint.' });
  res.json({ platform: detectedPlatform, capabilities });
});

router.get('/permissions', async (_req, res) => {
  const probed = await probeRealPermissionState();
  const state = createPermissionState(probed.granted);
  const matrix = buildPermissionMatrix(state, detectedPlatform, { mdmBlocked: probed.mdmBlocked });
  const by = (a) => matrix.features.filter((f) => f.availability === a).map((f) => f.featureId);
  res.json({ platform: detectedPlatform, contractVersion: '16.1.1', elevationLevel: probed.granted[PERMISSION.ADMIN] === true ? (isWin ? 'Administrator' : 'Root / Admin') : 'UNKNOWN', isElevated: probed.granted[PERMISSION.ADMIN] ?? null, elevationProbe: probed.evidence, permissionState: state, matrix: { counts: matrix.counts, coveragePct: matrix.coveragePct, available: by(AVAILABILITY.AVAILABLE), limited: by(AVAILABILITY.LIMITED), requiresPermission: by(AVAILABILITY.REQUIRES_PERMISSION), unsupported: by(AVAILABILITY.UNSUPPORTED), features: matrix.features }, grantInstructions: matrix.features.filter((f) => f.availability === AVAILABILITY.REQUIRES_PERMISSION).flatMap((f) => f.grantInstructions), honestyStatement: matrix.honestyStatement, capabilities: { canRunIntegrityChecks: probed.granted[PERMISSION.ADMIN] ?? null, canModifyServices: probed.granted[PERMISSION.ADMIN] ?? null, canCleanCaches: null, canTriggerUpdates: probed.granted[PERMISSION.ADMIN] ?? null } });
});

async function probeRealPermissionState() {
  const granted = {}; const evidence = [];
  if (isWin) {
    try {
      const p = await probeWindowsElevation();
      granted[PERMISSION.ADMIN] = typeof p.isAdmin === 'boolean' ? p.isAdmin : null;
      evidence.push({ permission: PERMISSION.ADMIN, probe: p.method || 'Windows elevation probe', observed: p.isAdmin === true ? 'Administrator context detected' : p.isAdmin === false ? 'Not elevated' : 'undetermined', granted: granted[PERMISSION.ADMIN] });
    } catch { evidence.push({ permission: PERMISSION.ADMIN, probe: 'Windows elevation probe', observed: 'unavailable', granted: null }); }
  } else if (isMac) {
    const uid = typeof process.getuid === 'function' ? process.getuid() : null;
    granted[PERMISSION.ADMIN] = uid === null ? null : uid === 0;
    evidence.push({ permission: PERMISSION.ADMIN, probe: 'process.getuid()', observed: uid === null ? 'unavailable' : `uid=${uid}`, granted: granted[PERMISSION.ADMIN] });
    try {
      const fsp = await import('fs/promises');
      await fsp.readdir(`${os.homedir()}/Library/Application Support/com.apple.TCC`);
      granted[PERMISSION.FULL_DISK_ACCESS] = true;
      evidence.push({ permission: PERMISSION.FULL_DISK_ACCESS, probe: 'TCC database readability', observed: 'readable', granted: true });
    } catch {
      granted[PERMISSION.FULL_DISK_ACCESS] = null;
      evidence.push({ permission: PERMISSION.FULL_DISK_ACCESS, probe: 'TCC database readability', observed: 'undetermined', granted: null });
    }
  }
  const connectivity = await checkConnectivity().catch(() => null);
  if (connectivity) {
    granted[PERMISSION.NETWORK] = connectivity.online === true;
    evidence.push({ permission: PERMISSION.NETWORK, probe: connectivity.method || 'connectivity probe', observed: connectivity.online === true ? 'network reachable' : 'network unreachable', granted: granted[PERMISSION.NETWORK] });
  }
  return { granted, evidence, mdmBlocked: [] };
}

router.get('/network/listening-ports', async (_req, res) => { try { const ports = isMac ? await getMacListeningPorts() : isWin ? await getWindowsListeningPorts() : []; res.json({ platform: detectedPlatform, count: ports.length, ports }); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/apps/inventory', async (_req, res) => { try { const apps = isMac ? await getMacInstalledApplicationsInventory() : isWin ? await getWindowsInstalledApps() : []; res.json({ platform: detectedPlatform, count: apps.length, apps }); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/apps/footprint/:appName', async (req, res) => { try { if (!isMac && !isWin) return res.json({ platform: detectedPlatform, availability: AVAILABILITY.UNSUPPORTED }); res.json(isMac ? await getMacAppFootprint(req.params.appName) : await getWindowsAppFootprint(req.params.appName)); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/developer/health', async (_req, res) => { try { if (!isMac && !isWin) return res.json({ platform: detectedPlatform, availability: AVAILABILITY.UNSUPPORTED }); res.json(isMac ? await getMacDeveloperEnvironmentHealth() : await getWindowsDeveloperEnvironmentHealth()); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/thermal', async (_req, res) => { try { if (!isMac && !isWin) return res.json({ platform: detectedPlatform, availability: AVAILABILITY.UNSUPPORTED }); res.json(isMac ? await getMacThermalState() : await getWindowsThermalState()); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/windows/wsl', async (_req, res) => { try { if (!isWin) return res.json({ platform: detectedPlatform, availability: AVAILABILITY.UNSUPPORTED }); res.json(await getWindowsWslHealth()); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/windows/printer-queue', async (_req, res) => { try { if (!isWin) return res.json({ platform: detectedPlatform, availability: AVAILABILITY.UNSUPPORTED }); res.json(await getWindowsPrinterQueueDoctor()); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/update/history', async (_req, res) => { try { if (isMac) return res.json(await getMacUpdateHistory()); if (isWin) return res.json({ platform: detectedPlatform, availability: AVAILABILITY.UNSUPPORTED, canonicalEndpoint: '/api/windows/v2/update/history' }); return res.json({ platform: detectedPlatform, availability: AVAILABILITY.UNSUPPORTED }); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/update/failed', async (_req, res) => { try { if (isMac) return res.json(await getMacFailedUpdates()); if (isWin) return res.json({ platform: detectedPlatform, availability: AVAILABILITY.UNSUPPORTED, canonicalEndpoint: '/api/windows/v2/update/failed' }); return res.json({ platform: detectedPlatform, availability: AVAILABILITY.UNSUPPORTED }); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/services/deps', async (_req, res) => { try { if (isMac) return res.json(await getMacServiceDependencies()); if (isWin) return res.json({ platform: detectedPlatform, availability: AVAILABILITY.UNSUPPORTED, canonicalEndpoint: '/api/windows/v2/services/deps' }); return res.json({ platform: detectedPlatform, availability: AVAILABILITY.UNSUPPORTED }); } catch (err) { res.status(500).json({ error: err.message }); } });

router.get('/health-score', async (_req, res) => {
  try {
    const [mem, load, disks] = await Promise.all([si.mem().catch(() => null), si.currentLoad().catch(() => null), si.fsSize().catch(() => [])]);
    const scores = [];
    if (load && Number.isFinite(load.currentLoad)) { const v = Math.round(load.currentLoad); scores.push({ name: 'CPU', value: Math.max(0, 100 - v), detail: `${v}% load` }); }
    if (mem?.total > 0 && Number.isFinite(mem.active)) { const v = Math.round(mem.active / mem.total * 100); scores.push({ name: 'Memory', value: Math.max(0, 100 - v), detail: `${v}% in use` }); }
    const primary = disks.find((f) => f.mount === '/' || f.mount === '/System/Volumes/Data' || /^C:/i.test(f.mount)) || disks[0];
    if (primary?.size > 0 && Number.isFinite(primary.used)) { const v = Math.round(primary.used / primary.size * 100); scores.push({ name: 'Disk', value: Math.max(0, 100 - v), detail: `${v}% full` }); }
    const healthScore = scores.length ? Math.round(scores.reduce((a, s) => a + s.value, 0) / scores.length) : null;
    res.json({ platform: detectedPlatform, healthScore, qualified: scores.length > 0, components: scores, sampledAt: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/recent-downloads', async (_req, res) => {
  try {
    const dir = path.join(os.homedir(), 'Downloads');
    if (!fs.existsSync(dir)) return res.json({ platform: detectedPlatform, availability: AVAILABILITY.UNAVAILABLE, reason: 'Downloads directory is unavailable.' });
    const entries = fs.readdirSync(dir).map((name) => { try { const full = path.join(dir, name); const stat = fs.statSync(full); return { name, size: stat.size, modifiedAt: stat.mtime.toISOString() }; } catch { return null; } }).filter(Boolean).sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt)).slice(0, 20);
    res.json({ platform: detectedPlatform, count: entries.length, downloads: entries });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
