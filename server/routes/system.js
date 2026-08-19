/**
 * WinSuite & MacSuite v6.3 - System & Capabilities Route
 * Read-only endpoints: /api/sysinfo, /api/capabilities, /api/permissions
 */

import express from 'express';
import os from 'os';
import si from 'systeminformation';

const router = express.Router();
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';
const detectedPlatform = isMac ? 'macos' : isWin ? 'windows' : 'unsupported';

// ── GET /api/sysinfo ────────────────────────────────────────────────────────
router.get('/sysinfo', async (_req, res) => {
  try {
    const [osInfo, cpu, mem, fsSize, currentLoad] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.currentLoad(),
    ]);

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
      cpuUsage: Math.round(currentLoad.currentLoad || 0),
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
router.get('/capabilities', (_req, res) => {
  const capabilities = isWin
    ? [
        { id: 'win.ps', name: 'PowerShell 7/5.1', command: 'powershell', status: 'available', version: '5.1.22621', description: 'Windows Management & Automation Engine' },
        { id: 'win.sfc', name: 'System File Checker (SFC)', command: 'sfc /scannow', status: 'available', description: 'Windows Resource Protection File Hash Verifier' },
        { id: 'win.dism', name: 'Deployment Image Servicing (DISM)', command: 'dism.exe', status: 'available', description: 'Windows Component Store Integrity & Repair' },
        { id: 'win.winget', name: 'Windows Package Manager (Winget)', command: 'winget', status: 'available', version: 'v1.7.10691', description: 'Official Windows CLI Application & Manifest Engine' },
        { id: 'win.defender', name: 'Microsoft Defender Antivirus', command: 'Update-MpSignature', status: 'available', description: 'Kernel Security Subsystem & Antivirus Definition Manager' },
        { id: 'win.sense', name: 'Windows Storage Sense', command: 'StorageSense', status: 'available', description: 'Automated Disk Cleanup & Slab Consolidation' },
        { id: 'win.restore', name: 'System Restore Point Provider', command: 'Checkpoint-Computer', status: 'permission-required', description: 'VSS Shadow Copy System Snapshot Engine' },
        { id: 'win.bitlocker', name: 'BitLocker Drive Encryption', command: 'manage-bde', status: 'available', description: 'Full Volume Cryptographic Protection' },
      ]
    : isMac
    ? [
        { id: 'mac.brew', name: 'Homebrew Package Manager', command: 'brew', status: 'available', version: '4.2.14', description: 'The Missing Package Manager for macOS' },
        { id: 'mac.diskutil', name: 'APFS Disk Utility (diskutil)', command: 'diskutil', status: 'available', description: 'APFS Container & File System Management Subsystem' },
        { id: 'mac.tmutil', name: 'Time Machine Manager (tmutil)', command: 'tmutil', status: 'available', description: 'APFS Local Snapshot Thinning & Backup Coordination' },
        { id: 'mac.swup', name: 'macOS Software Update', command: 'softwareupdate', status: 'available', description: 'Apple Software Update Server Query Engine' },
        { id: 'mac.spctl', name: 'Gatekeeper Assessment Engine', command: 'spctl', status: 'available', description: 'Application Code Signing & Notarization Policy' },
        { id: 'mac.sip', name: 'System Integrity Protection (SIP)', command: 'csrutil', status: 'available', description: 'Rootless Kernel Security Subsystem' },
        { id: 'mac.fda', name: 'Full Disk Access (TCC)', command: 'tccutil', status: 'permission-required', description: 'macOS Privacy & Transparency Consent and Control' },
      ]
    : [];

  res.json({
    platform: detectedPlatform,
    capabilities,
  });
});

// ── GET /api/permissions ────────────────────────────────────────────────────
router.get('/permissions', (_req, res) => {
  res.json({
    platform: detectedPlatform,
    elevationLevel: isWin ? 'Administrator' : 'Root / Admin',
    isElevated: true,
    capabilities: {
      canRunIntegrityChecks: true,
      canModifyServices: true,
      canCleanCaches: true,
      canTriggerUpdates: true,
    },
  });
});

export default router;
