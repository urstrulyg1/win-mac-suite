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
    res.json({ platform: detectedPlatform, brand: isMac ? 'MacSuite' : isWin ? 'WinSuite' : 'Suite', hostName: os.hostname(), user: os.userInfo()?.username || null, os: `${osInfo.distro || (isMac ? 'macOS' : isWin ? 'Windows' : 'Unknown')} ${osInfo.release || ''}`.trim(), build: osInfo.build || null, arch: os.arch(), processor, cores: Number.isFinite(cpu?.cores) ? cpu.cores : os.cpus().length || null, ramGB: totalMemory > 0 ? Math.round(totalMemory / 1024 ** 3) : null, freeDiskGB, totalDiskGB, cpuUsage, cpuTemp, cpuTempFormatted: cpuTemp === null ? 'UNAVAILABLE' : `${cpuTemp}°C`, memoryUsage: totalMemory > 0 && Number.isFinite(activeMemory) ? Math.round(activeMemory / totalMemory * 100) : null, uptime: `${Math.floor(os.uptime() / 3600)}h ${Math.floor(os.uptime() % 3600 / 60)}m`, isOnline: connectivity.online, connectivity: { online: connectivity.online, method: connectivity.method, checkedAt: new Date(connectivity.checkedAt).toISOString() }, capabilities: { powershell: isWin ? 'available' : 'unsupported', sfc: isWin ? 'available' : 'unsupported', dism: isWin ? 'available' : 'unsupported', winget: isWin ? 'available' : 'unsupported', defender: isWin ? 'available' : 'unsupported', storageSense: isWin ? 'available' : 'unsupported', homebrew: isMac ? 'available' : 'unsupported', diskutil: isMac ? 'available' : 'unsupported', tmutil: isMac ? 'available' : 'unsupported', softwareupdate: isMac ? 'available' : 'unsupported', gatekeeper: isMac ? 'available' : 'unsupported', xprotect: isMac ? 'available' : 'unsupported', sip: isMac ? 'available' : 'unsupported' } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/capabilities', async (_req, res) => {
  if (isWin) return res.json({ platform: detectedPlatform, capabilities: [
    { id: 'win.ps', name: 'PowerShell 7/5.1', command: 'powershell', status: 'available', description: 'Windows management and automation' },
    { id: 'win.sfc', name: 'System File Checker', command: 'sfc', status: 'available', description: 'Windows system file integrity' },
    { id: 'win.dism', name: 'DISM', command: 'dism.exe', status: 'available', description: 'Windows component store servicing' },
    { id: 'win.winget', name: 'WinGet', command: 'winget', status: 'optional', description: 'Windows package manager; may not be installed' },
    { id: 'win.defender', name: 'Microsoft Defender', command: 'Update-MpSignature', status: 'available', description: 'Defender management interface' },
    { id: 'win.restore', name: 'System Restore', command: 'Checkpoint-Computer', status: 'permission-required', description: 'Restore point creation requires elevation' },
    { id: 'win.bitlocker', name: 'BitLocker', command: 'manage-bde', status: 'available', description: 'Volume encryption management' },
  ] });
  if (isMac) {
    const brewPath = fs.existsSync('/opt/homebrew/bin/brew') ? '/opt/homebrew/bin/brew' : '/usr/local/bin/brew';
    let brewVersion = null;
    if (fs.existsSync(brewPath)) { try { const { stdout } = await execFileAsync(brewPath, ['--version'], { encoding: 'utf8', timeout: 4000 }); brewVersion = String(stdout).split('\n')[0].replace('Homebrew ', '').trim() || null; } catch {} }
    return res.json({ platform: detectedPlatform, capabilities: [
      { id: 'mac.brew', name: 'Homebrew', command: 'brew', status: brewVersion ? 'available' : 'not-installed', version: brewVersion, description: 'Homebrew package manager' },
      { id: 'mac.diskutil', name: 'Disk Utility', command: 'diskutil', status: fs.existsSync('/usr/sbin/diskutil') ? 'available' : 'not-found', description: 'Disk and APFS management' },
      { id: 'mac.tmutil', name: 'Time Machine', command: 'tmutil', status: fs.existsSync('/usr/bin/tmutil') ? 'available' : 'not-found', description: 'Time Machine management' },
      { id: 'mac.swup', name: 'Software Update', command: 'softwareupdate', status: fs.existsSync('/usr/sbin/softwareupdate') ? 'available' : 'not-found', description: 'macOS software updates' },
      { id: 'mac.spctl', name: 'Gatekeeper', command: 'spctl', status: fs.existsSync('/usr/sbin/spctl') ? 'available' : 'not-found', description: 'Code-signing policy assessment' },
      { id: 'mac.sip', name: 'System Integrity Protection', command: 'csrutil', status: fs.existsSync('/usr/bin/csrutil') ? 'available' : 'not-found', description: 'SIP status management' },
      { id: 'mac.fda', name: 'Full Disk Access', command: 'tccutil', status: 'permission-required', description: 'User-controlled TCC privacy permission' },
    ] });
  }
  res.json({ platform: detectedPlatform, capabilities: [] });
});

router.get('/permissions', async (_req, res) => {
  const probed = await probeRealPermissionState(); const state = createPermissionState(probed.granted); const matrix = buildPermissionMatrix(state, detectedPlatform, { mdmBlocked: probed.mdmBlocked }); const by = (a) => matrix.features.filter((f) => f.availability === a).map((f) => f.featureId);
  res.json({ platform: detectedPlatform, contractVersion: '16.1.1', elevationLevel: probed.granted[PERMISSION.ADMIN] ? (isWin ? 'Administrator' : 'Root / Admin') : 'Standard User', isElevated: !!probed.granted[PERMISSION.ADMIN], elevationProbe: probed.evidence, permissionState: state, matrix: { counts: matrix.counts, coveragePct: matrix.coveragePct, available: by(AVAILABILITY.AVAILABLE), limited: by(AVAILABILITY.LIMITED), requiresPermission: by(AVAILABILITY.REQUIRES_PERMISSION), unsupported: by(AVAILABILITY.UNSUPPORTED), features: matrix.features }, grantInstructions: matrix.features.filter((f) => f.availability === AVAILABILITY.REQUIRES_PERMISSION).flatMap((f) => f.grantInstructions), honestyStatement: matrix.honestyStatement, capabilities: { canRunIntegrityChecks: !!probed.granted[PERMISSION.ADMIN], canModifyServices: !!probed.granted[PERMISSION.ADMIN], canCleanCaches: true, canTriggerUpdates: !!probed.granted[PERMISSION.ADMIN] } });
});

async function probeRealPermissionState() {
  const granted = {}; const evidence = []; let isAdmin = false; let method = ''; let observed = '';
  if (isWin) { const p = await probeWindowsElevation(); isAdmin = !!p.isAdmin; method = p.method; observed = isAdmin ? 'Administrator context detected' : 'Not elevated'; }
  else { const uid = typeof process.getuid === 'function' ? process.getuid() : null; isAdmin = uid === 0; method = 'process.getuid()'; observed = uid === null ? 'unavailable' : `uid=${uid}`; }
  granted[PERMISSION.ADMIN] = isAdmin; evidence.push({ permission: PERMISSION.ADMIN, probe: method, observed, granted: isAdmin });
  let fda = false; if (isMac) { try { const fsp = await import('fs/promises'); await fsp.readdir(`${os.homedir()}/Library/Application Support/com.apple.TCC`); fda = true; } catch {} }
  granted[PERMISSION.FULL_DISK_ACCESS] = fda; evidence.push({ permission: PERMISSION.FULL_DISK_ACCESS, probe: 'TCC database readability', observed: isMac ? (fda ? 'readable' : 'not readable') : 'not applicable', granted: fda });
  granted[PERMISSION.USER_APPROVED] = true; granted[PERMISSION.NETWORK] = true; granted[PERMISSION.DEVELOPER_TOOLS] = isMac ? true : !!process.env.DEVELOPER_DIR;
  for (const p of [PERMISSION.ACCESSIBILITY, PERMISSION.SCREEN_RECORDING, PERMISSION.CAMERA, PERMISSION.MICROPHONE]) { granted[p] = false; evidence.push({ permission: p, probe: 'TCC state cannot be read without prompting', observed: 'undetermined', granted: false }); }
  return { granted, evidence, mdmBlocked: [] };
}

router.get('/network/listening-ports', async (_req, res) => { try { const ports = isMac ? await getMacListeningPorts() : isWin ? await getWindowsListeningPorts() : []; res.json({ platform: detectedPlatform, count: ports.length, ports }); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/apps/inventory', async (_req, res) => { try { const apps = isMac ? await getMacInstalledApplicationsInventory() : isWin ? await getWindowsInstalledApps() : []; res.json({ platform: detectedPlatform, count: apps.length, apps }); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/apps/footprint/:appName', async (req, res) => { try { res.json(isMac ? await getMacAppFootprint(req.params.appName) : isWin ? await getWindowsAppFootprint(req.params.appName) : { platform: detectedPlatform, available: false }); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/developer/health', async (_req, res) => { try { res.json(isMac ? await getMacDeveloperEnvironmentHealth() : isWin ? await getWindowsDeveloperEnvironmentHealth() : { platform: detectedPlatform, available: false }); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/thermal', async (_req, res) => { try { res.json(isMac ? await getMacThermalState() : isWin ? await getWindowsThermalState() : { platform: detectedPlatform, available: false }); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/windows/wsl', async (_req, res) => { try { res.json(isWin ? await getWindowsWslHealth() : { platform: detectedPlatform, available: false, distros: [], note: 'WSL requires Windows.' }); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/windows/printer-queue', async (_req, res) => { try { res.json(isWin ? await getWindowsPrinterQueueDoctor() : { platform: detectedPlatform, available: false, printers: [], stuckJobs: [], hasStuckJobs: false }); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/update/history', async (_req, res) => { try { if (isMac) return res.json(await getMacUpdateHistory()); if (isWin) return res.json({ platform: detectedPlatform, history: [], count: 0, canonicalEndpoint: '/api/windows/v2/update/history' }); return res.json({ platform: detectedPlatform, history: [], count: 0, available: false }); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/update/failed', async (_req, res) => { try { if (isMac) return res.json(await getMacFailedUpdates()); if (isWin) return res.json({ platform: detectedPlatform, failedUpdates: [], count: 0, canonicalEndpoint: '/api/windows/v2/update/failed' }); return res.json({ platform: detectedPlatform, failedUpdates: [], count: 0, available: false }); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/services/deps', async (_req, res) => { try { if (isMac) return res.json(await getMacServiceDependencies()); if (isWin) return res.json({ platform: detectedPlatform, services: [], count: 0, canonicalEndpoint: '/api/windows/v2/services/deps' }); return res.json({ platform: detectedPlatform, services: [], count: 0, available: false }); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/health-score', async (_req, res) => { try { const [mem, load, disks] = await Promise.all([si.mem().catch(() => null), si.currentLoad().catch(() => null), si.fsSize().catch(() => [])]); const scores = []; if (load && Number.isFinite(load.currentLoad)) { const v = Math.round(load.currentLoad); scores.push({ name: 'CPU', value: Math.max(0, 100 - v), detail: `${v}% load` }); } if (mem?.total > 0 && Number.isFinite(mem.active)) { const v = Math.round(mem.active / mem.total * 100); scores.push({ name: 'Memory', value: Math.max(0, 100 - v), detail: `${v}% in use` }); } const primary = disks.find((f) => f.mount === '/' || f.mount === '/System/Volumes/Data' || /^C:/i.test(f.mount)) || disks[0]; if (primary?.size > 0 && Number.isFinite(primary.used)) { const v = Math.round(primary.used / primary.size * 100); scores.push({ name: 'Disk', value: Math.max(0, 100 - v), detail: `${v}% full` }); } const score = scores.length ? Math.round(scores.reduce((a, b) => a + b.value, 0) / scores.length) : null; res.json({ score, grade: score === null ? 'N/A' : score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor', components: scores, platform: detectedPlatform, timestamp: new Date().toISOString(), measurement: scores.length ? 'observed' : 'unavailable' }); } catch (err) { res.status(500).json({ error: err.message }); } });
router.get('/recent-downloads', async (_req, res) => { try { const dir = path.join(os.homedir(), 'Downloads'); if (!fs.existsSync(dir)) return res.json({ platform: detectedPlatform, files: [], count: 0, available: false }); const files = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => { try { const s = fs.statSync(path.join(dir, e.name)); return { name: e.name, sizeMB: Math.round(s.size / 1024 / 1024 * 10) / 10, modifiedAt: s.mtime.toISOString(), ext: path.extname(e.name).toLowerCase() }; } catch { return null; } }).filter(Boolean).sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt)).slice(0, 30); res.json({ platform: detectedPlatform, files, count: files.length, path: dir, measurement: 'observed' }); } catch (err) { res.status(500).json({ error: err.message }); } });

export default router;
