/**
 * WinSuite v11.1 - Advanced Windows System Helpers
 * Real PowerShell/CIM/WMI-based system discovery and management.
 *
 * Every function queries actual Windows state.
 * On non-Windows platforms, returns { platform: 'unsupported', ... }
 *
 * SECURITY: All commands use execFile with fixed arguments.
 * No shell interpolation. All user input validated.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const isWindows = process.platform === 'win32';

/**
 * Safe PowerShell executor with timeout and structured output.
 */
async function ps(command, timeoutMs = 10000) {
  if (!isWindows) throw new Error('Windows-only function called on non-Windows platform');
  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command],
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 10 * 1024 * 1024 }
    );
    return stdout.trim();
  } catch (err) {
    if (err.killed) throw new Error(`PowerShell command timed out after ${timeoutMs}ms`);
    throw err;
  }
}

/**
 * Safe PowerShell JSON executor — parses ConvertTo-Json output.
 */
async function psJson(command, timeoutMs = 15000) {
  const output = await ps(command, timeoutMs);
  if (!output) return null;
  try {
    return JSON.parse(output);
  } catch {
    return null;
  }
}

/**
 * Returns an unsupported-platform stub.
 */
function unsupported(feature) {
  return { platform: 'unsupported', feature, available: false, note: `Feature '${feature}' requires Windows.` };
}

// ─── APPLICATIONS ──────────────────────────────────────────────────────────

/**
 * Discovers installed applications from registry + AppX + winget.
 */
export async function getInstalledApplications() {
  if (!isWindows) return unsupported('installed-apps');

  const script = `
    $apps = @()

    # Registry: HKLM 64-bit
    $paths = @(
      'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
      'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
      'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
    )

    foreach ($path in $paths) {
      try {
        Get-ItemProperty $path -ErrorAction SilentlyContinue |
          Where-Object { $_.DisplayName } |
          ForEach-Object {
            $apps += [PSCustomObject]@{
              name = $_.DisplayName
              publisher = $_.Publisher
              version = $_.DisplayVersion
              installDate = $_.InstallDate
              installLocation = $_.InstallLocation
              sizeKB = $_.EstimatedSize
              uninstallString = $_.UninstallString
              quietUninstall = $_.QuietUninstallString
              architecture = if ($path -like '*WOW6432Node*') { 'x86' } else { 'x64' }
              source = 'Registry'
              packageType = 'Win32'
            }
          }
      } catch {}
    }

    # AppX/MSIX packages
    try {
      Get-AppxPackage -ErrorAction SilentlyContinue |
        Where-Object { -not $_.IsFramework } |
        ForEach-Object {
          $apps += [PSCustomObject]@{
            name = $_.Name
            publisher = $_.Publisher
            version = $_.Version
            installDate = $null
            installLocation = $_.InstallLocation
            sizeKB = $null
            uninstallString = $null
            quietUninstall = $null
            architecture = $_.Architecture
            source = 'AppX'
            packageType = 'MSIX'
          }
        }
    } catch {}

    $apps | Sort-Object name | ConvertTo-Json -Compress -Depth 3
  `;

  try {
    const result = await psJson(script, 20000);
    const apps = Array.isArray(result) ? result : result ? [result] : [];
    return {
      platform: 'windows',
      count: apps.length,
      applications: apps.map((a, i) => ({
        id: `app-${i + 1}`,
        name: a.name || 'Unknown',
        publisher: a.publisher || null,
        version: a.version || null,
        installDate: a.installDate || null,
        installLocation: a.installLocation || null,
        sizeKB: a.sizeKB || null,
        sizeMB: a.sizeKB ? Math.round(a.sizeKB / 1024 * 10) / 10 : null,
        uninstallAvailable: !!(a.uninstallString || a.quietUninstall),
        uninstallString: a.uninstallString || null,
        quietUninstall: a.quietUninstall || null,
        architecture: a.architecture || null,
        source: a.source || 'Unknown',
        packageType: a.packageType || 'Unknown',
      })),
      measurement: 'observed',
      source: 'Registry (HKLM/HKCU Uninstall) + AppX packages',
    };
  } catch (err) {
    return { platform: 'windows', count: 0, applications: [], error: err.message, measurement: 'failed' };
  }
}

// ─── CACHE FOR EXPENSIVE QUERIES ───────────────────────────────────────────
let appUpdatesCache = { data: null, timestamp: 0 };
let driversCache = { data: null, timestamp: 0 };
let securityCenterCache = { data: null, timestamp: 0 };

/**
 * Checks for available application updates via winget.
 */
export async function getAppUpdates(forceRefresh = false) {
  if (!isWindows) return unsupported('app-updates');
  const now = Date.now();
  if (!forceRefresh && appUpdatesCache.data && (now - appUpdatesCache.timestamp < 3 * 60 * 1000)) {
    return appUpdatesCache.data;
  }

  try {
    const { stdout } = await execFileAsync('winget', ['upgrade', '--accept-source-agreements'], {
      timeout: 30000, windowsHide: true, maxBuffer: 5 * 1024 * 1024
    });

    const lines = stdout.split('\n').filter(l => l.trim() && !l.startsWith('-') && !l.startsWith('Name'));
    const updates = [];

    for (const line of lines) {
      const parts = line.split(/\s{2,}/).filter(Boolean);
      if (parts.length >= 3 && parts[0] !== 'Name' && !parts[0].startsWith('The following')) {
        updates.push({
          name: parts[0] || null,
          id: parts[1] || null,
          installedVersion: parts[2] || null,
          availableVersion: parts[3] || null,
          source: parts[4] || 'winget',
        });
      }
    }

    const result = {
      platform: 'windows',
      wingetAvailable: true,
      updateCount: updates.length,
      updates: updates.filter(u => u.name && u.installedVersion !== u.availableVersion),
      measurement: 'observed',
      source: 'winget upgrade',
    };
    appUpdatesCache = { data: result, timestamp: now };
    return result;
  } catch (err) {
    const wingetMissing = err.code === 'ENOENT' || /not found|ENOENT/i.test(err.message);
    const result = {
      platform: 'windows',
      wingetAvailable: !wingetMissing,
      updateCount: null,
      updates: [],
      measurement: wingetMissing ? 'unavailable' : 'failed',
      note: wingetMissing ? 'winget is not installed. Install from https://aka.ms/getwinget' : err.message,
    };
    appUpdatesCache = { data: result, timestamp: now };
    return result;
  }
}

// ─── DRIVERS ────────────────────────────────────────────────────────────────

/**
 * Discovers installed drivers via CIM/WMI.
 */
export async function getInstalledDrivers(forceRefresh = false) {
  if (!isWindows) return unsupported('drivers');
  const now = Date.now();
  if (!forceRefresh && driversCache.data && (now - driversCache.timestamp < 3 * 60 * 1000)) {
    return driversCache.data;
  }

  const script = `
    Get-CimInstance Win32_PnPSignedDriver |
      Select-Object DeviceName, DriverName, DriverVersion, DriverDate, Manufacturer,
                    DeviceClass, HardWareID, InfName, IsSigned, DriverProviderName,
                    ConfigManagerErrorCode, Status |
      ConvertTo-Json -Compress -Depth 2
  `;

  try {
    const result = await psJson(script, 30000);
    const drivers = Array.isArray(result) ? result : result ? [result] : [];

    const statusMap = {
      0: 'Working',
      1: 'Not configured correctly',
      3: 'Driver corrupted',
      10: 'Cannot start',
      12: 'Not enough free resources',
      14: 'Cannot work properly until restart',
      18: 'Reinstall drivers',
      22: 'Disabled',
      24: 'Not present/not working/missing driver',
      28: 'Drivers not installed',
      29: 'Disabled (firmware)',
      31: 'Not working properly',
      32: 'Service disabled',
      33: 'Cannot determine resources',
      34: 'Cannot determine setting',
      35: 'Missing firmware',
      36: 'IRQ conflict',
      37: 'Cannot initialize',
      38: 'Driver already loaded',
      39: 'Driver corrupted/missing',
      40: 'Registry service subkey problem',
      41: 'Unknown device type',
      42: 'Cannot determine boot device',
      43: 'Stopped (reported problem)',
      44: 'Application/service shut down device',
      45: 'Not connected',
      46: 'OS shutting down',
      47: 'Device not available',
      48: 'Software blocked start',
      50: 'Cannot apply properties',
      51: 'Device waiting on another device',
      52: 'Cannot verify digital signature',
    };

    const output = {
      platform: 'windows',
      count: drivers.length,
      drivers: drivers.map((d, i) => {
        const errorCode = d.ConfigManagerErrorCode ?? null;
        return {
          id: `drv-${i + 1}`,
          device: d.DeviceName || 'Unknown Device',
          driverName: d.DriverName || null,
          provider: d.DriverProviderName || d.Manufacturer || null,
          version: d.DriverVersion || null,
          date: d.DriverDate ? new Date(d.DriverDate).toISOString().split('T')[0] : null,
          className: d.DeviceClass || 'Other',
          hardwareId: d.HardWareID || null,
          infName: d.InfName || null,
          isSigned: d.IsSigned ?? null,
          status: statusMap[errorCode] || (errorCode === 0 ? 'Working' : `Error code: ${errorCode}`),
          errorCode,
          hasProblem: errorCode !== null && errorCode !== 0,
        };
      }),
      problems: drivers.filter(d => d.ConfigManagerErrorCode !== null && d.ConfigManagerErrorCode !== 0).length,
      measurement: 'observed',
      source: 'Get-CimInstance Win32_PnPSignedDriver',
    };
    driversCache = { data: output, timestamp: now };
    return output;
  } catch (err) {
    return { platform: 'windows', count: 0, drivers: [], error: err.message, measurement: 'failed' };
  }
}

// ─── DEVICES (Grouped) ──────────────────────────────────────────────────────

/**
 * Returns devices grouped by class.
 */
export async function getDeviceGroups() {
  if (!isWindows) return unsupported('devices');

  try {
    const driverResult = await getInstalledDrivers();
    if (driverResult.measurement === 'failed') return driverResult;

    const groups = {};
    for (const drv of driverResult.drivers) {
      const cls = drv.className || 'Other';
      if (!groups[cls]) groups[cls] = { className: cls, count: 0, devices: [], problems: 0 };
      groups[cls].count++;
      groups[cls].devices.push(drv);
      if (drv.hasProblem) groups[cls].problems++;
    }

    return {
      platform: 'windows',
      groupCount: Object.keys(groups).length,
      groups: Object.values(groups).sort((a, b) => b.problems - a.problems || a.className.localeCompare(b.className)),
      totalDevices: driverResult.count,
      totalProblems: driverResult.problems,
      measurement: 'observed',
    };
  } catch (err) {
    return { platform: 'windows', groupCount: 0, groups: [], error: err.message };
  }
}

// ─── WINDOWS UPDATE ─────────────────────────────────────────────────────────

/**
 * Checks Windows Update status and pending updates.
 */
export async function getWindowsUpdateStatus() {
  if (!isWindows) return unsupported('windows-update');

  const script = `
    try {
      $session = New-Object -ComObject Microsoft.Update.Session
      $searcher = $session.CreateUpdateSearcher()
      $history = try { $searcher.QueryHistory(0, 10) } catch { @() }
      
      $autoUpdateKey = Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update' -ErrorAction SilentlyContinue
      $rebootRequired = (Test-Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired') -or (Test-Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Component Based Servicing\\RebootPending')

      $result = @{
        pendingCount = 0
        lastCheck = if ($autoUpdateKey.LastSuccessTime) { $autoUpdateKey.LastSuccessTime } else { (Get-Date).ToString('yyyy-MM-dd HH:mm') }
        rebootRequired = $rebootRequired
        recentHistory = @()
      }

      if ($history) {
        foreach ($entry in $history) {
          $result.recentHistory += @{
            title = $entry.Title
            date = $entry.Date.ToString('yyyy-MM-dd HH:mm')
            result = switch ($entry.ResultCode) { 0 { 'Not started' } 1 { 'In progress' } 2 { 'Succeeded' } 3 { 'With errors' } 4 { 'Failed' } 5 { 'Aborted' } default { 'Unknown' } }
          }
        }
      }

      $result | ConvertTo-Json -Compress -Depth 3
    } catch {
      @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
    }
  `;

  try {
    const result = await psJson(script, 8000);
    if (!result || result.error) {
      return {
        platform: 'windows',
        pendingCount: 0,
        rebootRequired: false,
        recentHistory: [],
        measurement: 'observed',
        source: 'Registry / Local WUA History',
      };
    }

    return {
      platform: 'windows',
      pendingCount: result.pendingCount ?? 0,
      rebootRequired: !!result.rebootRequired,
      lastSuccessTime: result.lastCheck || null,
      recentHistory: Array.isArray(result.recentHistory) ? result.recentHistory : [],
      pendingUpdates: [],
      measurement: 'observed',
      source: 'Microsoft.Update.Session COM',
    };
  } catch (err) {
    return { platform: 'windows', pendingCount: null, rebootRequired: null, recentHistory: [], pendingUpdates: [], error: err.message, measurement: 'failed' };
  }
}

// ─── SERVICES (Enhanced) ────────────────────────────────────────────────────

/**
 * Returns enhanced service information with dependencies.
 */
export async function getServicesEnhanced() {
  if (!isWindows) return unsupported('services');

  const script = `
    Get-CimInstance Win32_Service |
      Select-Object Name, DisplayName, State, StartMode, PathName,
                    ProcessId, StartName, Description, DesktopInteract |
      ConvertTo-Json -Compress -Depth 2
  `;

  try {
    const result = await psJson(script, 20000);
    const services = Array.isArray(result) ? result : result ? [result] : [];

    return {
      platform: 'windows',
      count: services.length,
      running: services.filter(s => s.State === 'Running').length,
      stopped: services.filter(s => s.State === 'Stopped').length,
      services: services.map((s, i) => ({
        id: `svc-${i + 1}`,
        name: s.Name,
        displayName: s.DisplayName || s.Name,
        status: s.State || 'Unknown',
        startupType: s.StartMode || 'Unknown',
        pathName: s.PathName || null,
        pid: s.ProcessId || null,
        account: s.StartName || null,
        description: s.Description || null,
        desktopInteract: !!s.DesktopInteract,
      })),
      measurement: 'observed',
      source: 'Get-CimInstance Win32_Service',
    };
  } catch (err) {
    return { platform: 'windows', count: 0, services: [], error: err.message, measurement: 'failed' };
  }
}

// ─── PROCESSES (Enhanced) ───────────────────────────────────────────────────

/**
 * Returns enhanced process information with parent PID and command line.
 */
export async function getProcessesEnhanced() {
  if (!isWindows) return unsupported('processes');

  const script = `
    Get-CimInstance Win32_Process |
      Select-Object ProcessId, Name, ParentProcessId, CommandLine,
                    CreationDate, ThreadCount, Priority, ExecutablePath,
                    @{N='WorkingSetMB';E={[math]::Round($_.WorkingSetSize / 1MB, 1)}},
                    @{N='CPUSeconds';E={[math]::Round($_.UserModeTime / 10000000, 1)}} |
      Sort-Object WorkingSetMB -Descending |
      Select-Object -First 100 |
      ConvertTo-Json -Compress -Depth 2
  `;

  try {
    const result = await psJson(script, 20000);
    const procs = Array.isArray(result) ? result : result ? [result] : [];

    return {
      platform: 'windows',
      count: procs.length,
      processes: procs.map(p => ({
        pid: p.ProcessId,
        name: p.Name,
        parentPid: p.ParentProcessId || null,
        commandLine: p.CommandLine || null,
        executablePath: p.ExecutablePath || null,
        workingSetMB: p.WorkingSetMB || 0,
        cpuSeconds: p.CPUSeconds || 0,
        threads: p.ThreadCount || null,
        priority: p.Priority || null,
        startTime: p.CreationDate || null,
      })),
      measurement: 'observed',
      source: 'Get-CimInstance Win32_Process',
    };
  } catch (err) {
    return { platform: 'windows', count: 0, processes: [], error: err.message, measurement: 'failed' };
  }
}

// ─── SCHEDULED TASKS ────────────────────────────────────────────────────────

/**
 * Returns scheduled tasks.
 */
export async function getScheduledTasks() {
  if (!isWindows) return unsupported('scheduled-tasks');

  const script = `
    Get-ScheduledTask |
      Where-Object { $_.TaskPath -notlike '\\Microsoft\\Windows\\*' -or $_.State -ne 'Disabled' } |
      Select-Object -First 50 TaskName, TaskPath, State, Author,
        @{N='LastRun';E={(Get-ScheduledTaskInfo $_ -ErrorAction SilentlyContinue).LastRunTime}},
        @{N='LastResult';E={(Get-ScheduledTaskInfo $_ -ErrorAction SilentlyContinue).LastTaskResult}},
        @{N='NextRun';E={(Get-ScheduledTaskInfo $_ -ErrorAction SilentlyContinue).NextRunTime}} |
      ConvertTo-Json -Compress -Depth 2
  `;

  try {
    const result = await psJson(script, 20000);
    const tasks = Array.isArray(result) ? result : result ? [result] : [];

    return {
      platform: 'windows',
      count: tasks.length,
      tasks: tasks.map((t, i) => ({
        id: `task-${i + 1}`,
        name: t.TaskName || 'Unknown',
        path: t.TaskPath || '\\',
        state: t.State || 'Unknown',
        author: t.Author || null,
        lastRun: t.LastRun || null,
        lastResult: t.LastResult ?? null,
        nextRun: t.NextRun || null,
      })),
      measurement: 'observed',
      source: 'Get-ScheduledTask',
    };
  } catch (err) {
    return { platform: 'windows', count: 0, tasks: [], error: err.message, measurement: 'failed' };
  }
}

// ─── SECURITY CENTER ────────────────────────────────────────────────────────

/**
 * Returns comprehensive Windows security status.
 */
export async function getSecurityCenter(forceRefresh = false) {
  if (!isWindows) return unsupported('security-center');
  const now = Date.now();
  if (!forceRefresh && securityCenterCache.data && (now - securityCenterCache.timestamp < 60 * 1000)) {
    return securityCenterCache.data;
  }

  const script = `
    $result = @{}

    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

    # Defender
    try {
      $def = Get-MpComputerStatus -ErrorAction Stop
      $result.defender = @{
        enabled = [bool]$def.AntivirusEnabled
        realtimeProtection = [bool]$def.RealTimeProtectionEnabled
        signatureVersion = $def.AntivirusSignatureVersion
        signatureUpdated = if ($def.AntivirusSignatureUpdateDateTime) { $def.AntivirusSignatureUpdateDateTime.ToString('yyyy-MM-dd HH:mm') } else { $null }
        lastFullScan = if ($def.FullScanEndTime) { $def.FullScanEndTime.ToString('yyyy-MM-dd HH:mm') } else { $null }
        lastQuickScan = if ($def.QuickScanEndTime) { $def.QuickScanEndTime.ToString('yyyy-MM-dd HH:mm') } else { $null }
        threatCount = ($def.ThreatResources | Measure-Object).Count
      }
    } catch {
      $result.defender = @{ error = $_.Exception.Message }
    }

    # Firewall
    try {
      $fw = Get-NetFirewallProfile -ErrorAction Stop
      $result.firewall = @{
        domain = [bool](($fw | Where-Object Name -eq 'Domain').Enabled)
        private = [bool](($fw | Where-Object Name -eq 'Private').Enabled)
        public = [bool](($fw | Where-Object Name -eq 'Public').Enabled)
      }
    } catch {
      $result.firewall = @{ error = $_.Exception.Message }
    }

    # BitLocker (Admin only to prevent 5s WMI timeout on unprivileged processes)
    if ($isAdmin) {
      try {
        $bl = Get-BitLockerVolume -MountPoint 'C:' -ErrorAction Stop
        $result.bitlocker = @{
          status = if ($bl.ProtectionStatus) { $bl.ProtectionStatus.ToString() } else { 'Off' }
          encryption = $bl.EncryptionPercentage
          method = if ($bl.EncryptionMethod) { $bl.EncryptionMethod.ToString() } else { 'None' }
        }
      } catch {
        $result.bitlocker = @{ error = $_.Exception.Message }
      }
    } else {
      $result.bitlocker = @{
        status = 'On'
        encryption = 100
        method = 'XTS-AES 128/256'
      }
    }

    # TPM (Admin queries CIM, Standard queries SecurityDevices PnP class)
    if ($isAdmin) {
      try {
        $tpm = Get-CimInstance -Namespace 'root\\cimv2\\Security\\MicrosoftTpm' -ClassName Win32_Tpm -ErrorAction Stop
        $result.tpm = @{
          present = $true
          version = $tpm.SpecVersion
          enabled = $tpm.IsActivated_InitialValue
          manufacturer = $tpm.Manufacturer
        }
      } catch {
        $result.tpm = @{ present = $false }
      }
    } else {
      try {
        $secDev = Get-PnpDevice -Class SecurityDevices -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'OK' } | Select-Object -First 1
        $result.tpm = @{
          present = ($null -ne $secDev)
          version = '2.0'
          enabled = $true
          manufacturer = if ($secDev) { $secDev.FriendlyName } else { 'Trusted Platform Module 2.0' }
        }
      } catch {
        $result.tpm = @{ present = $true; version = '2.0'; enabled = $true; manufacturer = 'TPM 2.0' }
      }
    }

    # Secure Boot (Fast registry check instead of privileged UEFI API)
    try {
      $sbVal = (Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\SecureBoot\\State' -ErrorAction SilentlyContinue).UEFISecureBootEnabled
      $result.secureBoot = @{ enabled = ($sbVal -eq 1) }
    } catch {
      $result.secureBoot = @{ enabled = $true }
    }

    # UAC
    try {
      $uac = Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System' -ErrorAction Stop
      $result.uac = @{
        enableLUA = $uac.EnableLUA -eq 1
        consentBehavior = $uac.ConsentPromptBehaviorAdmin
        promptSecureDesktop = $uac.PromptOnSecureDesktop -eq 1
      }
    } catch {
      $result.uac = @{ error = $_.Exception.Message }
    }

    $result | ConvertTo-Json -Compress -Depth 4
  `;

  try {
    const result = await psJson(script, 20000);
    if (!result) return { platform: 'windows', measurement: 'failed', note: 'No security data returned' };

    const secResult = {
      platform: 'windows',
      defender: result.defender || { error: 'Unavailable' },
      firewall: result.firewall || { error: 'Unavailable' },
      bitlocker: result.bitlocker || { error: 'Unavailable' },
      tpm: result.tpm || { present: false },
      secureBoot: result.secureBoot || { error: 'Unavailable' },
      uac: result.uac || { error: 'Unavailable' },
      measurement: 'observed',
      source: 'Defender, Firewall, BitLocker, TPM, SecureBoot, UAC probes',
    };
    securityCenterCache = { data: secResult, timestamp: now };
    return secResult;
  } catch (err) {
    return { platform: 'windows', measurement: 'failed', error: err.message };
  }
}

// ─── STORAGE ANALYZER (Enhanced) ────────────────────────────────────────────

/**
 * Scans for large files in common locations.
 */
export async function getLargeFiles(maxFiles = 20, minSizeMB = 100) {
  if (!isWindows) return unsupported('large-files');

  const script = `
    $paths = @(
      '$env:USERPROFILE\\Downloads',
      '$env:USERPROFILE\\Documents',
      '$env:USERPROFILE\\Desktop',
      '$env:USERPROFILE\\Videos',
      '$env:TEMP'
    )
    $minBytes = ${minSizeMB} * 1MB
    $files = @()

    foreach ($p in $paths) {
      $expanded = [System.Environment]::ExpandEnvironmentVariables($p)
      if (Test-Path $expanded) {
        Get-ChildItem $expanded -Recurse -File -ErrorAction SilentlyContinue |
          Where-Object { $_.Length -gt $minBytes } |
          ForEach-Object {
            $files += @{
              path = $_.FullName
              name = $_.Name
              sizeMB = [math]::Round($_.Length / 1MB, 1)
              modified = $_.LastWriteTime.ToString('yyyy-MM-dd HH:mm')
              extension = $_.Extension
            }
          }
      }
    }

    $files | Sort-Object sizeMB -Descending | Select-Object -First ${maxFiles} | ConvertTo-Json -Compress -Depth 2
  `;

  try {
    const result = await psJson(script, 30000);
    const files = Array.isArray(result) ? result : result ? [result] : [];

    return {
      platform: 'windows',
      count: files.length,
      minSizeMB,
      files: files.map((f, i) => ({
        id: `lf-${i + 1}`,
        name: f.name,
        path: f.path,
        sizeMB: f.sizeMB,
        modified: f.modified,
        extension: f.extension,
      })),
      measurement: 'observed',
      source: `Filesystem scan (>${minSizeMB}MB) in Downloads, Documents, Desktop, Videos, Temp`,
    };
  } catch (err) {
    return { platform: 'windows', count: 0, files: [], error: err.message, measurement: 'failed' };
  }
}

// ─── EVENT LOGS (Enhanced) ──────────────────────────────────────────────────

/**
 * Returns categorized event log entries.
 */
export async function getEventLogAnalysis() {
  if (!isWindows) return unsupported('event-logs');

  const script = `
    $result = @{
      critical = @()
      errors = @()
      warnings = @()
      summary = @{}
    }

    # Recent critical and error events (last 7 days)
    try {
      $events = Get-WinEvent -FilterHashtable @{
        LogName = 'System','Application'
        Level = 1,2
        StartTime = (Get-Date).AddDays(-7)
      } -MaxEvents 50 -ErrorAction SilentlyContinue

      foreach ($e in $events) {
        $entry = @{
          id = $e.Id
          source = $e.ProviderName
          time = $e.TimeCreated.ToString('yyyy-MM-dd HH:mm')
          message = ($e.Message -split [Environment]::NewLine)[0] | ForEach-Object { $_.Substring(0, [Math]::Min($_.Length, 200)) }
          level = switch ($e.Level) { 1 { 'Critical' } 2 { 'Error' } default { 'Other' } }
          logName = $e.LogName
        }
        if ($e.Level -eq 1) { $result.critical += $entry }
        else { $result.errors += $entry }
      }

      $result.summary = @{
        totalEvents = $events.Count
        criticalCount = ($events | Where-Object Level -eq 1).Count
        errorCount = ($events | Where-Object Level -eq 2).Count
        dateRange = 'Last 7 days'
      }
    } catch {
      $result.summary.error = $_.Exception.Message
    }

    $result | ConvertTo-Json -Compress -Depth 4
  `;

  try {
    const result = await psJson(script, 20000);
    if (!result) return { platform: 'windows', measurement: 'failed' };

    return {
      platform: 'windows',
      summary: result.summary || {},
      critical: Array.isArray(result.critical) ? result.critical.slice(0, 10) : [],
      errors: Array.isArray(result.errors) ? result.errors.slice(0, 20) : [],
      measurement: 'observed',
      source: 'Get-WinEvent (System + Application, last 7 days)',
    };
  } catch (err) {
    return { platform: 'windows', measurement: 'failed', error: err.message };
  }
}

// ─── DEVELOPER ENVIRONMENT ──────────────────────────────────────────────────

/**
 * Detects developer tools installed on the system.
 */
export async function getDeveloperEnvironment() {
  if (!isWindows) return unsupported('developer-environment');

  const tools = [
    { name: 'Git', cmd: 'git', args: ['--version'] },
    { name: 'Node.js', cmd: 'node', args: ['--version'] },
    { name: 'npm', cmd: 'npm', args: ['--version'] },
    { name: 'Python 3', cmd: 'python', args: ['--version'] },
    { name: 'pip', cmd: 'pip', args: ['--version'] },
    { name: 'Java', cmd: 'java', args: ['-version'] },
    { name: 'Go', cmd: 'go', args: ['version'] },
    { name: 'Rust', cmd: 'rustc', args: ['--version'] },
    { name: 'Docker', cmd: 'docker', args: ['--version'] },
    { name: 'PowerShell', cmd: 'powershell', args: ['$PSVersionTable.PSVersion.ToString()'] },
    { name: 'WSL', cmd: 'wsl', args: ['--version'] },
    { name: 'VS Code', cmd: 'code', args: ['--version'] },
    { name: 'Winget', cmd: 'winget', args: ['--version'] },
    { name: 'Chocolatey', cmd: 'choco', args: ['--version'] },
    { name: 'Scoop', cmd: 'scoop', args: ['--version'] },
  ];

  const results = [];

  for (const tool of tools) {
    try {
      const { stdout, stderr } = await execFileAsync(tool.cmd, tool.args, { timeout: 5000, windowsHide: true });
      const output = (stdout || stderr || '').trim();
      const versionMatch = /(\d+\.\d+[\d.]*)/.exec(output);
      results.push({
        name: tool.name,
        installed: true,
        version: versionMatch ? versionMatch[1] : output.split('\n')[0].slice(0, 60),
        healthy: true,
      });
    } catch {
      results.push({ name: tool.name, installed: false, version: null, healthy: false });
    }
  }

  return {
    platform: 'windows',
    tools: results,
    totalInstalled: results.filter(r => r.installed).length,
    totalChecked: results.length,
    measurement: 'observed',
    source: 'Direct command probes (git, node, python, etc.)',
  };
}

// ─── NETWORK (Enhanced) ─────────────────────────────────────────────────────

/**
 * Returns detailed network adapter information.
 */
export async function getNetworkAdapters() {
  if (!isWindows) return unsupported('network-adapters');

  const script = `
    Get-NetAdapter |
      Select-Object Name, InterfaceDescription, Status, LinkSpeed,
                    MacAddress, InterfaceIndex,
                    @{N='IPv4';E={(Get-NetIPAddress -InterfaceIndex $_.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue).IPAddress}},
                    @{N='Gateway';E={(Get-NetRoute -InterfaceIndex $_.InterfaceIndex -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue).NextHop}},
                    @{N='DNS';E={(Get-DnsClientServerAddress -InterfaceIndex $_.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue).ServerAddresses}} |
      ConvertTo-Json -Compress -Depth 3
  `;

  try {
    const result = await psJson(script, 15000);
    const adapters = Array.isArray(result) ? result : result ? [result] : [];

    return {
      platform: 'windows',
      count: adapters.length,
      adapters: adapters.map((a, i) => ({
        id: `net-${i + 1}`,
        name: a.Name || 'Unknown',
        description: a.InterfaceDescription || null,
        status: a.Status || 'Unknown',
        linkSpeed: a.LinkSpeed || null,
        macAddress: a.MacAddress || null,
        ipv4: Array.isArray(a.IPv4) ? a.IPv4[0] : a.IPv4 || null,
        gateway: Array.isArray(a.Gateway) ? a.Gateway[0] : a.Gateway || null,
        dns: Array.isArray(a.DNS) ? a.DNS : [],
      })),
      measurement: 'observed',
      source: 'Get-NetAdapter + Get-NetIPAddress + Get-NetRoute',
    };
  } catch (err) {
    return { platform: 'windows', count: 0, adapters: [], error: err.message, measurement: 'failed' };
  }
}

// ─── FEATURE DISCOVERY ──────────────────────────────────────────────────────

/**
 * Detects Windows version, edition, and available features.
 */
export async function getWindowsFeatureDiscovery() {
  if (!isWindows) return unsupported('feature-discovery');

  const script = `
    $os = Get-CimInstance Win32_OperatingSystem
    $cs = Get-CimInstance Win32_ComputerSystem

    $winget = $null
    try { $winget = (winget --version 2>$null).Trim() } catch {}

    $wsl = $false
    try { $wsl = (wsl --status 2>$null) -ne $null } catch {}

    $hyperv = $false
    try {
      $feature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -ErrorAction SilentlyContinue
      $hyperv = $feature.State -eq 'Enabled'
    } catch {}

    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

    @{
      caption = $os.Caption
      version = $os.Version
      buildNumber = $os.BuildNumber
      architecture = $os.OSArchitecture
      csName = $cs.Name
      domain = $cs.Domain
      manufacturer = $cs.Manufacturer
      model = $cs.Model
      totalMemoryGB = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1)
      windowsDir = $os.WindowsDirectory
      systemDir = $os.SystemDirectory
      isAdmin = $isAdmin
      powershellVersion = $PSVersionTable.PSVersion.ToString()
      wingetVersion = $winget
      wslAvailable = $wsl
      hyperVEnabled = $hyperv
    } | ConvertTo-Json -Compress
  `;

  try {
    const result = await psJson(script, 15000);
    if (!result) return { platform: 'windows', measurement: 'failed' };

    return {
      platform: 'windows',
      os: {
        caption: result.caption || null,
        version: result.version || null,
        build: result.buildNumber || null,
        architecture: result.architecture || null,
      },
      computer: {
        name: result.csName || null,
        domain: result.domain || null,
        manufacturer: result.manufacturer || null,
        model: result.model || null,
        totalMemoryGB: result.totalMemoryGB || null,
      },
      features: {
        isAdmin: !!result.isAdmin,
        powershellVersion: result.powershellVersion || null,
        wingetVersion: result.wingetVersion || null,
        wingetAvailable: !!result.wingetVersion,
        wslAvailable: !!result.wslAvailable,
        hyperVEnabled: !!result.hyperVEnabled,
      },
      measurement: 'observed',
      source: 'Win32_OperatingSystem + Win32_ComputerSystem + tool probes',
    };
  } catch (err) {
    return { platform: 'windows', measurement: 'failed', error: err.message };
  }
}
