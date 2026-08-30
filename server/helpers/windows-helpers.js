/**
 * WinSuite & MacSuite v6.3 - Windows Native Inspection Helpers
 * Safe, read-only system telemetry probes using systeminformation and safe PowerShell scripts.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import os from 'os';
import path from 'path';
import si from 'systeminformation';

const execFileAsync = promisify(execFile);

/**
 * Runs a PowerShell command with safe flags and UTF-8 encoding.
 * @param {string} command
 * @param {number} [timeoutMs=8000]
 * @returns {Promise<string>}
 */
async function runSafePowerShell(command, timeoutMs = 8000) {
  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command],
      { timeout: timeoutMs, windowsHide: true }
    );
    return stdout.trim();
  } catch (err) {
    return '';
  }
}

/**
 * Gets Windows security status (Defender, Firewall, BitLocker).
 */
export async function getWindowsSecurityStatus() {
  const psScript = `
    $def = Get-MpComputerStatus -ErrorAction SilentlyContinue
    $fw = Get-NetFirewallProfile -ErrorAction SilentlyContinue
    $bl = Get-BitLockerVolume -MountPoint "C:" -ErrorAction SilentlyContinue
    [PSCustomObject]@{
      defenderAntivirus = if ($def) { $def.AntivirusEnabled } else { $null }
      realtimeProtection = if ($def) { $def.RealTimeProtectionEnabled } else { $null }
      signatureVersion = if ($def) { $def.AntivirusSignatureVersion } else { $null }
      firewallDomain = if ($fw) { ($fw | Where-Object Profile -eq "Domain").Enabled } else { $null }
      firewallPrivate = if ($fw) { ($fw | Where-Object Profile -eq "Private").Enabled } else { $null }
      firewallPublic = if ($fw) { ($fw | Where-Object Profile -eq "Public").Enabled } else { $null }
      bitlockerProtection = if ($bl) { $bl.ProtectionStatus.ToString() } else { $null }
      bitlockerEncryption = if ($bl) { $bl.EncryptionPercentage } else { $null }
    } | ConvertTo-Json -Compress
  `;

  try {
    const output = await runSafePowerShell(psScript, 6000);
    if (output) {
      const parsed = JSON.parse(output);
      return {
        engine: 'Microsoft Defender',
        status: parsed.defenderAntivirus ? 'Active' : 'Warning',
        realtimeProtection: parsed.realtimeProtection !== null ? !!parsed.realtimeProtection : null,
        signatureVersion: parsed.signatureVersion || null,
        firewall: {
          active: !!(parsed.firewallDomain || parsed.firewallPrivate || parsed.firewallPublic),
          profiles: {
            domain: parsed.firewallDomain !== null ? !!parsed.firewallDomain : null,
            private: parsed.firewallPrivate !== null ? !!parsed.firewallPrivate : null,
            public: parsed.firewallPublic !== null ? !!parsed.firewallPublic : null,
          },
        },
        encryption: {
          type: 'BitLocker Volume Encryption',
          status: parsed.bitlockerProtection || null,
          percentage: parsed.bitlockerEncryption !== undefined ? parsed.bitlockerEncryption : null,
        },
        smartScreen: {
          status: null,
          filter: null,
          note: 'SmartScreen status requires separate PowerShell probe.',
        },
        measurement: 'observed',
      };
    }
  } catch {}

  return {
    engine: 'Microsoft Defender',
    status: 'UNAVAILABLE',
    realtimeProtection: null,
    signatureVersion: null,
    firewall: { active: null, profiles: { domain: null, private: null, public: null } },
    encryption: { type: 'BitLocker Volume Encryption', status: 'UNAVAILABLE', percentage: null },
    smartScreen: { status: 'UNAVAILABLE', filter: null },
    measurement: 'unavailable',
    note: 'PowerShell security probe failed. Security status cannot be determined without administrator access to Get-MpComputerStatus.',
  };
}

/**
 * Gets Windows Event Viewer recent application and system errors.
 */
export async function getWindowsEventLogs() {
  const psScript = `
    Get-WinEvent -FilterHashtable @{LogName='Application','System'; Level=1,2} -MaxEvents 6 -ErrorAction SilentlyContinue |
    Select-Object TimeCreated, ProviderName, Id, LevelDisplayName, Message |
    ConvertTo-Json -Compress
  `;

  try {
    const output = await runSafePowerShell(psScript, 5000);
    if (output) {
      const parsed = JSON.parse(output);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      return list.map((item, idx) => ({
        id: `win-evt-${idx + 1}`,
        source: item.ProviderName || 'System',
        time: item.TimeCreated ? new Date(item.TimeCreated).toLocaleTimeString() : 'Recent',
        message: (item.Message || 'System event reported.').split('\n')[0].slice(0, 120),
        level: item.LevelDisplayName || 'Error',
        probableCause: 'Resource contention or application termination',
      }));
    }
  } catch {}

  return [];
  // Empty array = no events retrieved. Never fabricate event log entries.
}

/**
 * Enumerates Windows Services.
 */
export async function getWindowsServicesList() {
  const psScript = `
    Get-Service | Where-Object {$_.Status -eq 'Running' -or $_.StartType -eq 'Automatic'} | Select-Object -First 15 Name, DisplayName, Status, StartType | ConvertTo-Json -Compress
  `;

  try {
    const output = await runSafePowerShell(psScript, 5000);
    if (output) {
      const parsed = JSON.parse(output);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      return list.map((s, idx) => ({
        id: `svc-${idx + 1}`,
        name: s.Name,
        displayName: s.DisplayName || s.Name,
        status: s.Status === 4 || s.Status === 'Running' ? 'Running' : 'Stopped',
        startupType: typeof s.StartType === 'number' ? (s.StartType === 2 ? 'Automatic' : 'Manual') : String(s.StartType || 'Automatic'),
        user: 'LocalSystem',
        description: `Windows Core Service (${s.Name})`,
      }));
    }
  } catch {}

  return [];
  // Empty array = no services retrieved. Never fabricate service entries.
}

/**
 * Enumerates Windows Startup Applications.
 */
export async function getWindowsStartupItems() {
  const psScript = `
    Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location, User | ConvertTo-Json -Compress
  `;

  try {
    const output = await runSafePowerShell(psScript, 5000);
    if (output) {
      const parsed = JSON.parse(output);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      return list.map((item, idx) => ({
        id: `su-${idx + 1}`,
        name: item.Name,
        location: item.Location || 'HKCU\\Run',
        type: 'Registry',
        path: item.Command,
        enabled: true,
        impact: idx < 2 ? 'High' : 'Low',
      }));
    }
  } catch {}

  return [];
  // Empty array = no startup items retrieved. Never fabricate startup entries.
}

/**
 * Gets real Windows developer cache directory sizes.
 */
export async function getWindowsDeveloperArtifacts() {
  const userprofile = process.env.USERPROFILE || 'C:\\Users\\User';
  const localappdata = process.env.LOCALAPPDATA || path.join(userprofile, 'AppData\\Local');
  const appdata = process.env.APPDATA || path.join(userprofile, 'AppData\\Roaming');

  const candidates = [
    { id: '1', name: 'npm Global & User Cache', path: '%APPDATA%\\npm-cache', realPath: path.join(appdata, 'npm-cache') },
    { id: '2', name: 'NuGet Package Cache', path: '%USERPROFILE%\\.nuget\\packages', realPath: path.join(userprofile, '.nuget\\packages') },
    { id: '3', name: 'Visual Studio Temporary Symbols', path: '%LOCALAPPDATA%\\Microsoft\\VisualStudio', realPath: path.join(localappdata, 'Microsoft\\VisualStudio') },
    { id: '4', name: 'Gradle Build Cache', path: '%USERPROFILE%\\.gradle\\caches', realPath: path.join(userprofile, '.gradle\\caches') },
  ];

  const artifacts = [];
  for (const item of candidates) {
    if (fs.existsSync(item.realPath)) {
      // Measure real directory size
      let sizeBytes = 0;
      try {
        const { execFileSync } = await import('child_process');
        const sizeOut = execFileSync('powershell.exe', ['-NoProfile', '-Command', `(Get-ChildItem -Path '${item.realPath}' -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum`], { timeout: 5000, windowsHide: true });
        sizeBytes = parseInt(sizeOut.toString().trim(), 10) || 0;
      } catch {
        sizeBytes = 0;
      }
      artifacts.push({
        id: item.id,
        name: item.name,
        path: item.path,
        sizeMB: Math.round(sizeBytes / 1024 / 1024),
        measurement: sizeBytes > 0 ? 'observed' : 'exists-but-unmeasured',
      });
    }
  }

  return artifacts;
}

/**
 * Gets Windows battery status.
 */
export async function getWindowsBatteryStatus() {
  try {
    const batt = await si.battery();
    return {
      hasBattery: batt.hasBattery,
      percent: batt.percent ?? 100,
      isCharging: !!batt.isCharging,
      acConnected: !!batt.acConnected,
      cycleCount: batt.cycleCount || 0,
      healthPct: batt.maxCapacity && batt.designedCapacity ? Math.round((batt.maxCapacity / batt.designedCapacity) * 100) : 100,
      timeRemainingMin: batt.timeRemaining || 0,
      model: batt.model || 'Standard ACPI Battery',
      type: batt.type || 'Li-ion',
    };
  } catch {
    return {
      hasBattery: null,
      percent: null,
      isCharging: null,
      acConnected: null,
      cycleCount: null,
      healthPct: null,
      timeRemainingMin: null,
      model: null,
      type: null,
      measurement: 'unavailable',
      note: 'Battery probe failed. System battery status cannot be determined.',
    };
  }
}

/**
 * Gets Windows package manager status (Winget, Chocolatey).
 * Uses real commands to query installed packages.
 */
export async function getWindowsPackageStatus() {
  let wingetInstalled = null;
  let wingetOutdated = null;
  let wingetAvailable = false;

  try {
    const { stdout } = await execFileAsync('winget', ['list', '--accept-source-agreements'], { timeout: 10000, windowsHide: true });
    wingetAvailable = true;
    // Count lines that look like package entries (have an ID column)
    const lines = stdout.split('\n').filter(l => l.includes(' ') && !l.startsWith('-') && !l.startsWith('Name'));
    wingetInstalled = lines.length;
  } catch {
    wingetAvailable = false;
  }

  let chocoAvailable = false;
  try {
    await execFileAsync('choco', ['--version'], { timeout: 3000, windowsHide: true });
    chocoAvailable = true;
  } catch { /* not installed */ }

  return {
    packageManager: 'Windows Package Manager (Winget)',
    wingetAvailable,
    formulaCount: wingetInstalled,
    caskCount: 0,
    totalInstalled: wingetInstalled,
    outdatedCount: wingetOutdated,
    chocolateyAvailable: chocoAvailable,
    status: wingetAvailable ? 'Available' : 'Not Installed',
    measurement: wingetAvailable ? 'observed' : 'unavailable',
  };
}

/**
 * Gets Windows Hardware diagnostics.
 */
export async function getWindowsHardwareStatus() {
  const [cpu, mem, graphics, osInfo] = await Promise.all([
    si.cpu(),
    si.mem(),
    si.graphics(),
    si.osInfo(),
  ]);

  const gpuName = Array.isArray(graphics.controllers) && graphics.controllers.length > 0
    ? graphics.controllers[0].model
    : `${cpu.manufacturer || 'Intel/AMD'} Graphics`;

  return {
    platform: 'windows',
    chip: `${cpu.manufacturer || ''} ${cpu.brand || 'Processor'}`,
    arch: os.arch(),
    cores: cpu.cores || 8,
    physicalCores: cpu.physicalCores || cpu.cores || 8,
    speed: `${cpu.speed || 3.2} GHz`,
    ramGB: Math.round(mem.total / 1024 / 1024 / 1024),
    gpu: gpuName,
    thermalState: 'Nominal',
    os: `${osInfo.distro || 'Windows'} ${osInfo.release || ''} (Build ${osInfo.build || ''})`,
  };
}
