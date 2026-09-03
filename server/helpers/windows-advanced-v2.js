/**
 * WinSuite v12.0 — Advanced Windows System Helpers (Expansion Pack)
 * Covers: Recovery, BSOD/Crash, Boot, SFC/DISM, Storage Analyzer,
 * Network Connections, WiFi, DNS, Firewall Rules, Reliability,
 * Hardware Diagnostics, Power/Battery, Privacy, WSL, Docker,
 * System Snapshot, Change Tracking, Cleanup, Snapshots.
 *
 * REAL DATA ONLY — Every function queries actual Windows state.
 * On non-Windows, returns { platform: 'unsupported' }.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const isWindows = process.platform === 'win32';

async function ps(command, timeoutMs = 15000) {
  if (!isWindows) throw new Error('Windows-only function');
  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command],
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 10 * 1024 * 1024 }
    );
    return stdout.trim();
  } catch (err) {
    if (err.killed) throw new Error(`PowerShell timed out after ${timeoutMs}ms`);
    throw err;
  }
}

async function psJson(command, timeoutMs = 20000) {
  const out = await ps(command, timeoutMs);
  if (!out) return null;
  try { return JSON.parse(out); } catch { return null; }
}

function unsupported(feature) {
  return { platform: 'unsupported', feature, available: false, note: `Feature '${feature}' requires Windows.` };
}

// ─── TOP 10 PRIORITY #1: WINDOWS UPDATE INTELLIGENCE ────────────────────────

export async function getUpdateHistory() {
  if (!isWindows) return unsupported('update-history');
  const script = `
    try {
      $session = New-Object -ComObject Microsoft.Update.Session
      $searcher = $session.CreateUpdateSearcher()
      $total = $searcher.GetTotalHistoryCount()
      $history = $searcher.QueryHistory(0, [Math]::Min($total, 50))
      $result = @()
      foreach ($entry in $history) {
        $result += @{
          title = $entry.Title
          date = $entry.Date.ToString('yyyy-MM-dd HH:mm')
          result = switch ($entry.ResultCode) { 0{'NotStarted'} 1{'InProgress'} 2{'Succeeded'} 3{'WithErrors'} 4{'Failed'} 5{'Aborted'} default{'Unknown'} }
          resultCode = $entry.ResultCode
          hResult = $entry.HResult
          description = $entry.Description
          serviceID = $entry.ServiceID
          categories = ($entry.Categories | ForEach-Object { $_.Name }) -join ', '
        }
      }
      $result | ConvertTo-Json -Compress -Depth 3
    } catch {
      @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
    }
  `;
  try {
    const result = await psJson(script, 30000);
    const items = Array.isArray(result) ? result : result ? [result] : [];
    return {
      platform: 'windows',
      count: items.length,
      history: items.map((h, i) => ({
        id: `uh-${i + 1}`,
        title: h.title || 'Unknown',
        date: h.date || null,
        result: h.result || 'Unknown',
        resultCode: h.resultCode,
        hResult: h.hResult || null,
        categories: h.categories || null,
      })),
      failed: items.filter(h => h.result === 'Failed' || h.result === 'WithErrors'),
      succeeded: items.filter(h => h.result === 'Succeeded').length,
      measurement: 'observed',
      source: 'Microsoft.Update.Session.QueryHistory',
    };
  } catch (err) {
    return { platform: 'windows', count: 0, history: [], error: err.message, measurement: 'failed' };
  }
}

export async function getUpdateDiagnostics() {
  if (!isWindows) return unsupported('update-diagnostics');
  const script = `
    $result = @{}
    # Check Windows Update service
    try {
      $svc = Get-Service wuauserv -ErrorAction Stop
      $result.wuService = @{ status = $svc.Status.ToString(); startType = $svc.StartType.ToString() }
    } catch { $result.wuService = @{ error = $_.Exception.Message } }
    # Check BITS service
    try {
      $bits = Get-Service BITS -ErrorAction Stop
      $result.bitsService = @{ status = $bits.Status.ToString(); startType = $bits.StartType.ToString() }
    } catch { $result.bitsService = @{ error = $_.Exception.Message } }
    # Check disk space
    try {
      $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
      $result.diskSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 1)
      $result.diskSpaceOk = $disk.FreeSpace -gt 5GB
    } catch {}
    # Check reboot required
    $result.rebootRequired = Test-Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired'
    # Check update cache size
    try {
      $cachePath = "$env:SystemRoot\\SoftwareDistribution\\Download"
      if (Test-Path $cachePath) {
        $cacheSize = (Get-ChildItem $cachePath -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $result.cacheSizeMB = [math]::Round($cacheSize / 1MB, 1)
      }
    } catch {}
    # Check network connectivity
    try {
      $test = Test-NetConnection -ComputerName 'windowsupdate.microsoft.com' -Port 443 -WarningAction SilentlyContinue -InformationLevel Quiet
      $result.networkOk = $test
    } catch { $result.networkOk = $null }
    # Check Crypto service
    try {
      $crypt = Get-Service CryptSvc -ErrorAction Stop
      $result.cryptoService = @{ status = $crypt.Status.ToString() }
    } catch {}
    $result | ConvertTo-Json -Compress -Depth 3
  `;
  try {
    const result = await psJson(script, 20000);
    if (!result) return { platform: 'windows', measurement: 'failed' };
    const checks = [];
    checks.push({ name: 'Windows Update Service', ok: result.wuService?.status === 'Running', details: result.wuService?.status || 'Unknown' });
    checks.push({ name: 'BITS Service', ok: result.bitsService?.status === 'Running', details: result.bitsService?.status || 'Unknown' });
    checks.push({ name: 'Crypto Service', ok: result.cryptoService?.status === 'Running', details: result.cryptoService?.status || 'Unknown' });
    checks.push({ name: 'Disk Space', ok: result.diskSpaceOk === true, details: `${result.diskSpaceGB || '?'} GB free` });
    checks.push({ name: 'Network Connectivity', ok: result.networkOk === true, details: result.networkOk === true ? 'Reachable' : result.networkOk === false ? 'Unreachable' : 'Unknown' });
    checks.push({ name: 'Reboot Required', ok: !result.rebootRequired, details: result.rebootRequired ? 'Yes — reboot needed' : 'No' });
    if (result.cacheSizeMB != null) checks.push({ name: 'Update Cache', ok: result.cacheSizeMB < 5000, details: `${result.cacheSizeMB} MB` });
    return { platform: 'windows', checks, allOk: checks.every(c => c.ok), measurement: 'observed' };
  } catch (err) {
    return { platform: 'windows', checks: [], error: err.message, measurement: 'failed' };
  }
}

export async function getFailedUpdates() {
  if (!isWindows) return unsupported('failed-updates');
  const script = `
    try {
      $session = New-Object -ComObject Microsoft.Update.Session
      $searcher = $session.CreateUpdateSearcher()
      $total = $searcher.GetTotalHistoryCount()
      $history = $searcher.QueryHistory(0, [Math]::Min($total, 100))
      $failed = $history | Where-Object { $_.ResultCode -eq 4 -or $_.ResultCode -eq 3 }
      $result = @()
      foreach ($entry in $failed) {
        $result += @{
          title = $entry.Title
          date = $entry.Date.ToString('yyyy-MM-dd HH:mm')
          hResult = '0x{0:X}' -f $entry.HResult
          resultCode = $entry.ResultCode
        }
      }
      $result | ConvertTo-Json -Compress -Depth 2
    } catch { @{ error = $_.Exception.Message } | ConvertTo-Json -Compress }
  `;
  try {
    const result = await psJson(script, 30000);
    const items = Array.isArray(result) ? result : result ? [result] : [];
    return { platform: 'windows', count: items.length, failed: items, measurement: 'observed' };
  } catch (err) {
    return { platform: 'windows', count: 0, failed: [], error: err.message };
  }
}

// ─── TOP 10 PRIORITY #2: DRIVER BACKUP / ROLLBACK ──────────────────────────

export async function getDriverBackupStatus() {
  if (!isWindows) return unsupported('driver-backup');
  const script = `
    $backupPath = "$env:SystemRoot\\System32\\DriverStore\\FileRepository"
    $result = @{ exists = (Test-Path $backupPath) }
    if ($result.exists) {
      $items = Get-ChildItem $backupPath -Directory -ErrorAction SilentlyContinue
      $result.driverStoreCount = $items.Count
      $result.sizeMB = [math]::Round(($items | Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB, 1)
    }
    # Check for pnputil exported backups
    $exportPath = "$env:USERPROFILE\\DriverBackups"
    $result.exportPathExists = Test-Path $exportPath
    if ($result.exportPathExists) {
      $exports = Get-ChildItem $exportPath -Directory -ErrorAction SilentlyContinue
      $result.exportCount = $exports.Count
    }
    $result | ConvertTo-Json -Compress
  `;
  try {
    const result = await psJson(script, 15000);
    return { platform: 'windows', ...result, measurement: 'observed' };
  } catch (err) {
    return { platform: 'windows', error: err.message, measurement: 'failed' };
  }
}

export async function getDriverSigningAudit() {
  if (!isWindows) return unsupported('driver-signing');
  const script = `
    Get-CimInstance Win32_PnPSignedDriver |
      Select-Object DeviceName, DriverProviderName, DriverVersion, IsSigned,
                    @{N='Signer';E={$_.Signer}},
                    ConfigManagerErrorCode |
      ConvertTo-Json -Compress -Depth 2
  `;
  try {
    const result = await psJson(script, 30000);
    const drivers = Array.isArray(result) ? result : result ? [result] : [];
    return {
      platform: 'windows',
      total: drivers.length,
      signed: drivers.filter(d => d.IsSigned === true).length,
      unsigned: drivers.filter(d => d.IsSigned === false || d.IsSigned == null).length,
      drivers: drivers.map((d, i) => ({
        id: `ds-${i + 1}`,
        device: d.DeviceName || 'Unknown',
        provider: d.DriverProviderName || null,
        version: d.DriverVersion || null,
        isSigned: d.IsSigned === true,
        signer: d.Signer || null,
        hasProblem: d.ConfigManagerErrorCode !== 0 && d.ConfigManagerErrorCode != null,
      })),
      measurement: 'observed',
      source: 'Win32_PnPSignedDriver signing audit',
    };
  } catch (err) {
    return { platform: 'windows', total: 0, drivers: [], error: err.message };
  }
}

export async function getProblemDevices() {
  if (!isWindows) return unsupported('problem-devices');
  const script = `
    Get-CimInstance Win32_PnPEntity |
      Where-Object { $_.ConfigManagerErrorCode -ne 0 } |
      Select-Object Name, DeviceID, ConfigManagerErrorCode, PNPClass,
                    Manufacturer, Status, StatusInfo |
      ConvertTo-Json -Compress -Depth 2
  `;
  try {
    const result = await psJson(script, 20000);
    const devices = Array.isArray(result) ? result : result ? [result] : [];
    return {
      platform: 'windows',
      count: devices.length,
      devices: devices.map((d, i) => ({
        id: `pd-${i + 1}`,
        name: d.Name || 'Unknown',
        deviceId: d.DeviceID || null,
        errorCode: d.ConfigManagerErrorCode,
        className: d.PNPClass || 'Other',
        manufacturer: d.Manufacturer || null,
        status: d.Status || 'Unknown',
      })),
      measurement: 'observed',
      source: 'Win32_PnPEntity where ConfigManagerErrorCode != 0',
    };
  } catch (err) {
    return { platform: 'windows', count: 0, devices: [], error: err.message };
  }
}

// ─── TOP 10 PRIORITY #3: BSOD & CRASH ANALYZER ─────────────────────────────

export async function getBSODAnalysis() {
  if (!isWindows) return unsupported('bsod-analysis');
  const script = `
    $result = @{ crashes = @(); minidumps = @(); summary = @{} }
    # Check minidump folder
    $miniPath = "$env:SystemRoot\\Minidump"
    if (Test-Path $miniPath) {
      $dumps = Get-ChildItem $miniPath -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 20
      foreach ($d in $dumps) {
        $result.minidumps += @{
          name = $d.Name
          sizeKB = [math]::Round($d.Length / 1KB, 1)
          date = $d.LastWriteTime.ToString('yyyy-MM-dd HH:mm')
        }
      }
    }
    # Check MEMORY.DMP
    $memDump = "$env:SystemRoot\\MEMORY.DMP"
    $result.memoryDumpExists = Test-Path $memDump
    if ($result.memoryDumpExists) {
      $result.memoryDumpSizeMB = [math]::Round((Get-Item $memDump).Length / 1MB, 1)
      $result.memoryDumpDate = (Get-Item $memDump).LastWriteTime.ToString('yyyy-MM-dd HH:mm')
    }
    # Get BugCheck events from System log
    try {
      $bugChecks = Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-WER-SystemErrorReporting'} -MaxEvents 20 -ErrorAction SilentlyContinue
      foreach ($e in $bugChecks) {
        $result.crashes += @{
          date = $e.TimeCreated.ToString('yyyy-MM-dd HH:mm')
          message = ($e.Message -split [Environment]::NewLine)[0..3] -join ' '
          id = $e.Id
        }
      }
    } catch {}
    # Get Kernel-Power events (unexpected shutdowns)
    try {
      $kp = Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Kernel-Power'; Id=41} -MaxEvents 10 -ErrorAction SilentlyContinue
      foreach ($e in $kp) {
        $result.crashes += @{
          date = $e.TimeCreated.ToString('yyyy-MM-dd HH:mm')
          message = 'Unexpected shutdown (Kernel-Power 41)'
          id = 41
          type = 'KernelPower'
        }
      }
    } catch {}
    $result.summary.totalCrashes = $result.crashes.Count
    $result.summary.totalMinidumps = $result.minidumps.Count
    $result.summary.latestCrash = ($result.crashes | Sort-Object date -Descending | Select-Object -First 1).date
    $result | ConvertTo-Json -Compress -Depth 4
  `;
  try {
    const result = await psJson(script, 20000);
    if (!result) return { platform: 'windows', measurement: 'failed' };
    return {
      platform: 'windows',
      crashes: Array.isArray(result.crashes) ? result.crashes : [],
      minidumps: Array.isArray(result.minidumps) ? result.minidumps : [],
      memoryDumpExists: result.memoryDumpExists || false,
      memoryDumpSizeMB: result.memoryDumpSizeMB || null,
      summary: result.summary || {},
      measurement: 'observed',
      source: 'Event Log (BugCheck + Kernel-Power 41) + Minidump folder',
    };
  } catch (err) {
    return { platform: 'windows', crashes: [], minidumps: [], error: err.message };
  }
}

export async function getAppCrashes() {
  if (!isWindows) return unsupported('app-crashes');
  const script = `
    $result = @()
    try {
      $events = Get-WinEvent -FilterHashtable @{
        LogName='Application'
        ProviderName='Application Error'
      } -MaxEvents 50 -ErrorAction SilentlyContinue
      foreach ($e in $events) {
        $lines = $e.Message -split [Environment]::NewLine
        $result += @{
          date = $e.TimeCreated.ToString('yyyy-MM-dd HH:mm')
          application = ($lines | Where-Object { $_ -match 'Faulting application' } | ForEach-Object { ($_ -replace '.*name: ','') -replace ',.*','' }) | Select-Object -First 1
          faultingModule = ($lines | Where-Object { $_ -match 'Faulting module' } | ForEach-Object { ($_ -replace '.*name: ','') -replace ',.*','' }) | Select-Object -First 1
          exceptionCode = ($lines | Where-Object { $_ -match 'Exception code' } | ForEach-Object { ($_ -replace '.*code: ','').Trim() }) | Select-Object -First 1
          message = $lines[0]
        }
      }
    } catch {}
    # Also check WER
    try {
      $wer = Get-WinEvent -FilterHashtable @{
        LogName='Application'
        ProviderName='Windows Error Reporting'
      } -MaxEvents 30 -ErrorAction SilentlyContinue
      foreach ($e in $wer) {
        $result += @{
          date = $e.TimeCreated.ToString('yyyy-MM-dd HH:mm')
          application = ($e.Message -split [Environment]::NewLine)[0]
          message = 'WER Report'
          type = 'WER'
        }
      }
    } catch {}
    $result | ConvertTo-Json -Compress -Depth 3
  `;
  try {
    const result = await psJson(script, 20000);
    const items = Array.isArray(result) ? result : result ? [result] : [];
    // Group by application
    const grouped = {};
    for (const crash of items) {
      const app = crash.application || 'Unknown';
      if (!grouped[app]) grouped[app] = { application: app, crashCount: 0, crashes: [], latestCrash: null };
      grouped[app].crashCount++;
      grouped[app].crashes.push(crash);
      if (!grouped[app].latestCrash || crash.date > grouped[app].latestCrash) grouped[app].latestCrash = crash.date;
    }
    return {
      platform: 'windows',
      totalCrashes: items.length,
      applications: Object.values(grouped).sort((a, b) => b.crashCount - a.crashCount),
      measurement: 'observed',
      source: 'Application Error + Windows Error Reporting events',
    };
  } catch (err) {
    return { platform: 'windows', totalCrashes: 0, applications: [], error: err.message };
  }
}

// ─── TOP 10 PRIORITY #4: BOOT PERFORMANCE ANALYZER ─────────────────────────

export async function getBootPerformance() {
  if (!isWindows) return unsupported('boot-performance');
  const script = `
    $result = @{ phases = @(); startupApps = @(); bootEvents = @() }
    # Get boot duration from Diagnostics-Performance log
    try {
      $bootEvent = Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Diagnostics-Performance/Operational'; Id=100} -MaxEvents 5 -ErrorAction SilentlyContinue
      foreach ($e in $bootEvent) {
        $xml = [xml]$e.ToXml()
        $bootTime = ($xml.Event.EventData.Data | Where-Object { $_.Name -eq 'BootTime' }).'#text'
        $degradation = ($xml.Event.EventData.Data | Where-Object { $_.Name -eq 'BootTimeDegradation' }).'#text'
        $result.phases += @{
          date = $e.TimeCreated.ToString('yyyy-MM-dd HH:mm')
          bootTimeMs = [int]$bootTime
          bootTimeSec = [math]::Round([int]$bootTime / 1000, 1)
          degradationMs = [int]$degradation
        }
      }
    } catch {}
    # Get startup app durations (Event ID 101 = app startup delay)
    try {
      $startupEvents = Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Diagnostics-Performance/Operational'; Id=101} -MaxEvents 20 -ErrorAction SilentlyContinue
      foreach ($e in $startupEvents) {
        $xml = [xml]$e.ToXml()
        $name = ($xml.Event.EventData.Data | Where-Object { $_.Name -eq 'FileName' }).'#text'
        $time = ($xml.Event.EventData.Data | Where-Object { $_.Name -eq 'StartTime' }).'#text'
        $degradation = ($xml.Event.EventData.Data | Where-Object { $_.Name -eq 'StartTimeDegradation' }).'#text'
        $result.startupApps += @{
          name = $name
          startTimeMs = [int]$time
          degradationMs = [int]$degradation
          date = $e.TimeCreated.ToString('yyyy-MM-dd HH:mm')
        }
      }
    } catch {}
    # Last boot time from OS
    try {
      $os = Get-CimInstance Win32_OperatingSystem
      $result.lastBootTime = $os.LastBootUpTime.ToString('yyyy-MM-dd HH:mm:ss')
      $result.uptimeHours = [math]::Round(((Get-Date) - $os.LastBootUpTime).TotalHours, 1)
    } catch {}
    $result | ConvertTo-Json -Compress -Depth 4
  `;
  try {
    const result = await psJson(script, 20000);
    if (!result) return { platform: 'windows', measurement: 'failed' };
    return {
      platform: 'windows',
      bootHistory: Array.isArray(result.phases) ? result.phases : [],
      startupApps: Array.isArray(result.startupApps) ? result.startupApps.sort((a, b) => b.startTimeMs - a.startTimeMs) : [],
      lastBootTime: result.lastBootTime || null,
      uptimeHours: result.uptimeHours || null,
      latestBoot: result.phases?.[0] || null,
      measurement: 'observed',
      source: 'Diagnostics-Performance/Operational log (Event IDs 100, 101)',
    };
  } catch (err) {
    return { platform: 'windows', bootHistory: [], startupApps: [], error: err.message };
  }
}

// ─── TOP 10 PRIORITY #5: SFC / DISM HEALTH CENTER ──────────────────────────

export async function getSystemIntegrity() {
  if (!isWindows) return unsupported('system-integrity');
  const script = `
    $result = @{}
    # DISM CheckHealth (fast, no repair)
    try {
      $dism = & dism /Online /Cleanup-Image /CheckHealth 2>&1
      $output = $dism -join [Environment]::NewLine
      $result.dismCheckHealth = @{
        output = $output.Substring(0, [Math]::Min($output.Length, 500))
        noCorruption = $output -match 'No component store corruption'
        corruptionDetected = $output -match 'Component store corruption detected'
      }
    } catch { $result.dismCheckHealth = @{ error = $_.Exception.Message } }
    # CBS log check (SFC results are stored here)
    try {
      $cbsLog = "$env:SystemRoot\\Logs\\CBS\\CBS.log"
      if (Test-Path $cbsLog) {
        $lastSfc = Get-Content $cbsLog -Tail 50 -ErrorAction SilentlyContinue
        $corruptFiles = $lastSfc | Where-Object { $_ -match 'Cannot repair' -or $_ -match 'corrupt' } | Select-Object -First 10
        $result.cbsLog = @{
          exists = $true
          corruptEntries = $corruptFiles
          corruptCount = ($corruptFiles | Measure-Object).Count
        }
      }
    } catch {}
    # Component store size
    try {
      $storePath = "$env:SystemRoot\\WinSxS"
      if (Test-Path $storePath) {
        $size = (Get-ChildItem $storePath -ErrorAction SilentlyContinue | Measure-Object).Count
        $result.componentStore = @{ folderCount = $size }
      }
    } catch {}
    $result | ConvertTo-Json -Compress -Depth 4
  `;
  try {
    const result = await psJson(script, 60000);
    if (!result) return { platform: 'windows', measurement: 'failed' };
    return {
      platform: 'windows',
      dismCheckHealth: result.dismCheckHealth || null,
      cbsLog: result.cbsLog || null,
      componentStore: result.componentStore || null,
      measurement: 'observed',
      source: 'DISM /CheckHealth + CBS log analysis',
    };
  } catch (err) {
    return { platform: 'windows', error: err.message, measurement: 'failed' };
  }
}

// ─── TOP 10 PRIORITY #6: ADVANCED STORAGE ANALYZER ─────────────────────────

export async function getStorageOverview() {
  if (!isWindows) return unsupported('storage-overview');
  const script = `
    $result = @{ drives = @(); tempFiles = @(); recycleBin = @{} }
    # All drives
    Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object {
      $result.drives += @{
        letter = $_.DeviceID
        label = $_.VolumeName
        totalGB = [math]::Round($_.Size / 1GB, 1)
        freeGB = [math]::Round($_.FreeSpace / 1GB, 1)
        usedGB = [math]::Round(($_.Size - $_.FreeSpace) / 1GB, 1)
        usedPercent = if ($_.Size -gt 0) { [math]::Round(($_.Size - $_.FreeSpace) / $_.Size * 100, 1) } else { 0 }
        fileSystem = $_.FileSystem
      }
    }
    # Temp folders
    $tempPaths = @($env:TEMP, "$env:SystemRoot\\Temp")
    foreach ($tp in $tempPaths) {
      if (Test-Path $tp) {
        $size = (Get-ChildItem $tp -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $count = (Get-ChildItem $tp -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
        $result.tempFiles += @{ path = $tp; sizeMB = [math]::Round($size / 1MB, 1); fileCount = $count }
      }
    }
    # Recycle bin
    try {
      $shell = New-Object -ComObject Shell.Application
      $rb = $shell.Namespace(0xA)
      $rbItems = $rb.Items()
      $result.recycleBin = @{
        itemCount = $rbItems.Count
        sizeEstimateMB = 'Requires enumeration'
      }
    } catch { $result.recycleBin = @{ error = $_.Exception.Message } }
    # Windows Update cache
    try {
      $wuPath = "$env:SystemRoot\\SoftwareDistribution\\Download"
      if (Test-Path $wuPath) {
        $wuSize = (Get-ChildItem $wuPath -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $result.wuCacheMB = [math]::Round($wuSize / 1MB, 1)
      }
    } catch {}
    # Crash dumps
    try {
      $dumpPaths = @("$env:SystemRoot\\Minidump", "$env:LOCALAPPDATA\\CrashDumps")
      $dumpSize = 0
      foreach ($dp in $dumpPaths) {
        if (Test-Path $dp) {
          $dumpSize += (Get-ChildItem $dp -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        }
      }
      $result.crashDumpsMB = [math]::Round($dumpSize / 1MB, 1)
    } catch {}
    $result | ConvertTo-Json -Compress -Depth 4
  `;
  try {
    const result = await psJson(script, 30000);
    if (!result) return { platform: 'windows', measurement: 'failed' };
    return {
      platform: 'windows',
      drives: Array.isArray(result.drives) ? result.drives : [],
      tempFiles: Array.isArray(result.tempFiles) ? result.tempFiles : [],
      recycleBin: result.recycleBin || {},
      wuCacheMB: result.wuCacheMB || null,
      crashDumpsMB: result.crashDumpsMB || null,
      measurement: 'observed',
      source: 'Win32_LogicalDisk + filesystem analysis',
    };
  } catch (err) {
    return { platform: 'windows', drives: [], error: err.message };
  }
}

export async function getDuplicateFiles(scanPath, maxResults = 50) {
  // SECURITY: Validate path BEFORE platform check — defense in depth.
  const ALLOWED_SCAN_DIRS = {
    downloads: '$env:USERPROFILE\\Downloads',
    documents: '$env:USERPROFILE\\Documents',
    desktop: '$env:USERPROFILE\\Desktop',
    videos: '$env:USERPROFILE\\Videos',
    pictures: '$env:USERPROFILE\\Pictures',
    temp: '$env:TEMP',
  };
  const key = (scanPath || 'downloads').toLowerCase().replace(/[^a-z]/g, '');
  if (!ALLOWED_SCAN_DIRS[key]) {
    return {
      platform: isWindows ? 'windows' : 'unsupported',
      error: 'VALIDATION_FAILED',
      message: `Invalid scan path. Allowed: ${Object.keys(ALLOWED_SCAN_DIRS).join(', ')}`,
      allowedPaths: Object.keys(ALLOWED_SCAN_DIRS),
    };
  }
  if (!isWindows) return unsupported('duplicate-files');

  const psPath = ALLOWED_SCAN_DIRS[key];
  const safeMax = Math.min(Math.max(parseInt(maxResults) || 50, 1), 200);

  const script = `
    $path = [System.Environment]::ExpandEnvironmentVariables('${psPath}')
    if (-not (Test-Path $path)) {
      @{ error = "Path not found"; path = $path } | ConvertTo-Json -Compress
      return
    }
    $files = Get-ChildItem $path -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Length -gt 1024 } |
      Select-Object Name, FullName, Length, LastWriteTime |
      Group-Object Name, Length |
      Where-Object { $_.Count -gt 1 } |
      Select-Object -First ${safeMax}
    $result = @()
    foreach ($group in $files) {
      $result += @{
        name = ($group.Group[0]).Name
        sizeMB = [math]::Round(($group.Group[0]).Length / 1MB, 2)
        count = $group.Count
        paths = ($group.Group | ForEach-Object { $_.FullName })
      }
    }
    $result | ConvertTo-Json -Compress -Depth 3
  `;
  try {
    const result = await psJson(script, 60000);
    const items = Array.isArray(result) ? result : result ? [result] : [];
    return {
      platform: 'windows',
      scanPath: scanPath || 'Downloads',
      duplicateGroups: items.length,
      totalWastedMB: items.reduce((sum, g) => sum + (g.sizeMB * (g.count - 1)), 0),
      duplicates: items.map((d, i) => ({
        id: `dup-${i + 1}`,
        name: d.name,
        sizeMB: d.sizeMB,
        count: d.count,
        paths: Array.isArray(d.paths) ? d.paths : [d.paths],
      })),
      measurement: 'observed',
    };
  } catch (err) {
    return { platform: 'windows', duplicateGroups: 0, duplicates: [], error: err.message };
  }
}

export async function getDiskHealth() {
  if (!isWindows) return unsupported('disk-health');
  const script = `
    $result = @()
    try {
      Get-PhysicalDisk | ForEach-Object {
        $result += @{
          friendlyName = $_.FriendlyName
          mediaType = $_.MediaType.ToString()
          busType = $_.BusType.ToString()
          healthStatus = $_.HealthStatus.ToString()
          operationalStatus = $_.OperationalStatus.ToString()
          sizeGB = [math]::Round($_.Size / 1GB, 1)
          firmwareVersion = $_.FirmwareVersion
          model = $_.Model
        }
      }
    } catch {}
    # SMART data (where available via MSFT_PhysicalDisk)
    try {
      Get-CimInstance -Namespace root\\Microsoft\\Windows\\Storage -ClassName MSFT_PhysicalDisk -ErrorAction SilentlyContinue | ForEach-Object {
        $existing = $result | Where-Object { $_.friendlyName -eq $_.FriendlyName }
        if ($existing) {
          $existing.wear = $_.Wear
          $existing.temperature = $_.Temperature
        }
      }
    } catch {}
    $result | ConvertTo-Json -Compress -Depth 3
  `;
  try {
    const result = await psJson(script, 15000);
    const disks = Array.isArray(result) ? result : result ? [result] : [];
    return {
      platform: 'windows',
      count: disks.length,
      disks: disks.map((d, i) => ({
        id: `disk-${i + 1}`,
        name: d.friendlyName || 'Unknown',
        model: d.model || null,
        mediaType: d.mediaType || 'Unknown',
        busType: d.busType || null,
        healthStatus: d.healthStatus || 'Unknown',
        operationalStatus: d.operationalStatus || 'Unknown',
        sizeGB: d.sizeGB || null,
        firmware: d.firmwareVersion || null,
        wear: d.wear || null,
        temperature: d.temperature || null,
      })),
      measurement: 'observed',
      source: 'Get-PhysicalDisk + MSFT_PhysicalDisk',
    };
  } catch (err) {
    return { platform: 'windows', count: 0, disks: [], error: err.message };
  }
}

// ─── TOP 10 PRIORITY #7: NETWORK CONNECTIONS + PORT ANALYZER ────────────────

export async function getNetworkConnections() {
  if (!isWindows) return unsupported('network-connections');
  const script = `
    Get-NetTCPConnection -ErrorAction SilentlyContinue |
      Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort, State,
                    OwningProcess, @{N='ProcessName';E={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName}},
                    @{N='ProcessPath';E={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).Path}} |
      Sort-Object State, LocalPort |
      Select-Object -First 200 |
      ConvertTo-Json -Compress -Depth 2
  `;
  try {
    const result = await psJson(script, 20000);
    const conns = Array.isArray(result) ? result : result ? [result] : [];
    const summary = {
      total: conns.length,
      listening: conns.filter(c => c.State === 'Listen').length,
      established: conns.filter(c => c.State === 'Established').length,
      timeWait: conns.filter(c => c.State === 'TimeWait').length,
      closeWait: conns.filter(c => c.State === 'CloseWait').length,
    };
    return {
      platform: 'windows',
      summary,
      connections: conns.map((c, i) => ({
        id: `conn-${i + 1}`,
        localAddress: c.LocalAddress || '0.0.0.0',
        localPort: c.LocalPort || 0,
        remoteAddress: c.RemoteAddress || null,
        remotePort: c.RemotePort || null,
        state: c.State || 'Unknown',
        pid: c.OwningProcess || null,
        processName: c.ProcessName || null,
        processPath: c.ProcessPath || null,
      })),
      measurement: 'observed',
      source: 'Get-NetTCPConnection',
    };
  } catch (err) {
    return { platform: 'windows', summary: {}, connections: [], error: err.message };
  }
}

export async function getListeningPorts() {
  if (!isWindows) return unsupported('listening-ports');
  const script = `
    Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
      Select-Object LocalAddress, LocalPort, OwningProcess,
                    @{N='ProcessName';E={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName}},
                    @{N='ProcessPath';E={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).Path}},
                    @{N='CommandLine';E={(Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)" -ErrorAction SilentlyContinue).CommandLine}} |
      Sort-Object LocalPort |
      ConvertTo-Json -Compress -Depth 2
  `;
  try {
    const result = await psJson(script, 15000);
    const ports = Array.isArray(result) ? result : result ? [result] : [];
    return {
      platform: 'windows',
      count: ports.length,
      ports: ports.map((p, i) => ({
        id: `lp-${i + 1}`,
        address: p.LocalAddress || '0.0.0.0',
        port: p.LocalPort,
        pid: p.OwningProcess,
        processName: p.ProcessName || null,
        processPath: p.ProcessPath || null,
        commandLine: p.CommandLine || null,
      })),
      measurement: 'observed',
      source: 'Get-NetTCPConnection -State Listen',
    };
  } catch (err) {
    return { platform: 'windows', count: 0, ports: [], error: err.message };
  }
}

export async function getWiFiNetworks() {
  if (!isWindows) return unsupported('wifi-networks');
  try {
    const { stdout } = await execFileAsync('netsh', ['wlan', 'show', 'networks', 'mode=bssid'], {
      timeout: 10000, windowsHide: true, maxBuffer: 2 * 1024 * 1024
    });
    const networks = [];
    const blocks = stdout.split(/\n\s*\n/);
    for (const block of blocks) {
      const nameMatch = block.match(/SSID\s+\d+\s+:\s+(.+)/);
      if (!nameMatch) continue;
      const signal = block.match(/Signal\s+:\s+(\d+)%/);
      const channel = block.match(/Channel\s+:\s+(\d+)/);
      const band = block.match(/Band\s+:\s+(.+)/);
      const auth = block.match(/Authentication\s+:\s+(.+)/);
      networks.push({
        ssid: nameMatch[1].trim(),
        signal: signal ? parseInt(signal[1]) : null,
        channel: channel ? parseInt(channel[1]) : null,
        band: band ? band[1].trim() : null,
        authentication: auth ? auth[1].trim() : null,
      });
    }
    // Get current connection
    let currentSSID = null;
    try {
      const { stdout: iwOut } = await execFileAsync('netsh', ['wlan', 'show', 'interfaces'], { timeout: 5000, windowsHide: true });
      const currentMatch = iwOut.match(/SSID\s+:\s+(.+)/);
      if (currentMatch) currentSSID = currentMatch[1].trim();
    } catch {}
    return { platform: 'windows', count: networks.length, currentSSID, networks, measurement: 'observed', source: 'netsh wlan' };
  } catch (err) {
    return { platform: 'windows', count: 0, networks: [], error: err.message };
  }
}

export async function getDNSDiagnostics() {
  if (!isWindows) return unsupported('dns-diagnostics');
  const script = `
    $result = @{ checks = @(); configuredDNS = @(); cacheStats = @{} }
    # Configured DNS servers
    try {
      Get-DnsClientServerAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.ServerAddresses.Count -gt 0 } |
        ForEach-Object {
          $result.configuredDNS += @{
            interface = $_.InterfaceAlias
            servers = $_.ServerAddresses
          }
        }
    } catch {}
    # DNS cache stats
    try {
      $cache = ipconfig /displaydns 2>&1
      $entries = ($cache | Select-String 'Record Name' | Measure-Object).Count
      $result.cacheStats = @{ entryCount = $entries }
    } catch {}
    # Test resolution
    try {
      $testDomains = @('dns.google', 'one.one.one.one', 'windowsupdate.microsoft.com')
      $result.resolutionTests = @()
      foreach ($domain in $testDomains) {
        try {
          $sw = [System.Diagnostics.Stopwatch]::StartNew()
          $resolved = [System.Net.Dns]::GetHostAddresses($domain)
          $sw.Stop()
          $result.resolutionTests += @{ domain = $domain; success = $true; timeMs = $sw.ElapsedMilliseconds; addresses = ($resolved | Select-Object -First 3 | ForEach-Object { $_.ToString() }) }
        } catch {
          $result.resolutionTests += @{ domain = $domain; success = $false; error = $_.Exception.Message }
        }
      }
    } catch {}
    # Gateway connectivity
    try {
      $gw = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Select-Object -First 1).NextHop
      if ($gw) {
        $ping = Test-Connection -ComputerName $gw -Count 2 -Quiet -ErrorAction SilentlyContinue
        $result.gatewayReachable = $ping
        $result.gatewayAddress = $gw
      }
    } catch {}
    $result | ConvertTo-Json -Compress -Depth 4
  `;
  try {
    const result = await psJson(script, 20000);
    if (!result) return { platform: 'windows', measurement: 'failed' };
    return {
      platform: 'windows',
      configuredDNS: Array.isArray(result.configuredDNS) ? result.configuredDNS : [],
      cacheStats: result.cacheStats || {},
      resolutionTests: Array.isArray(result.resolutionTests) ? result.resolutionTests : [],
      gatewayReachable: result.gatewayReachable ?? null,
      gatewayAddress: result.gatewayAddress || null,
      measurement: 'observed',
    };
  } catch (err) {
    return { platform: 'windows', error: err.message };
  }
}

export async function getFirewallRules() {
  if (!isWindows) return unsupported('firewall-rules');
  const script = `
    $raw = Get-NetFirewallRule -ErrorAction SilentlyContinue | Select-Object -First 80 Name, DisplayName, Direction, Action, Enabled, Profile
    $rules = @()
    foreach ($r in $raw) {
      $rules += @{
        Name = $r.Name
        DisplayName = if ($r.DisplayName) { $r.DisplayName } else { $r.Name }
        Direction = switch ($r.Direction) { 1 { 'Inbound' } 2 { 'Outbound' } default { [string]$r.Direction } }
        Action = switch ($r.Action) { 2 { 'Allow' } 4 { 'Block' } default { [string]$r.Action } }
        Enabled = ($r.Enabled -eq 1 -or $r.Enabled -eq 'True' -or $r.Enabled -eq $true)
        Profile = [string]$r.Profile
      }
    }
    $summary = @{
      total = $rules.Count
      inbound = ($rules | Where-Object Direction -eq 'Inbound').Count
      outbound = ($rules | Where-Object Direction -eq 'Outbound').Count
      enabled = ($rules | Where-Object Enabled -eq $true).Count
      disabled = ($rules | Where-Object Enabled -eq $false).Count
      allow = ($rules | Where-Object Action -eq 'Allow').Count
      block = ($rules | Where-Object Action -eq 'Block').Count
    }
    @{
      summary = $summary
      rules = $rules
    } | ConvertTo-Json -Compress -Depth 3
  `;
  try {
    const result = await psJson(script, 10000);
    if (!result) return { platform: 'windows', measurement: 'failed' };
    const rules = Array.isArray(result.rules) ? result.rules : result.rules ? [result.rules] : [];
    return {
      platform: 'windows',
      summary: result.summary || {},
      rules: rules.map((r, i) => ({
        id: `fw-${i + 1}`,
        name: r.DisplayName || r.Name,
        direction: r.Direction || null,
        action: r.Action || null,
        enabled: r.Enabled === 'True' || r.Enabled === true,
        profile: r.Profile || null,
        program: r.Program || null,
        localPort: r.LocalPort || null,
        remotePort: r.RemotePort || null,
        protocol: r.Protocol || null,
      })),
      measurement: 'observed',
      source: 'Get-NetFirewallRule',
    };
  } catch (err) {
    return { platform: 'windows', summary: {}, rules: [], error: err.message };
  }
}

// ─── TOP 10 PRIORITY #8: RELIABILITY / EVENT INTELLIGENCE ───────────────────

export async function getReliabilityTimeline() {
  if (!isWindows) return unsupported('reliability-timeline');
  const script = `
    $result = @{ days = @(); summary = @{} }
    try {
      $stabilityIndex = (Get-CimInstance Win32_ReliabilityStabilityMetrics -ErrorAction SilentlyContinue |
        Sort-Object TimeGenerated -Descending | Select-Object -First 1).SystemStabilityIndex
      $result.summary.stabilityIndex = $stabilityIndex
    } catch {}
    # Get reliability records for last 14 days
    try {
      $records = Get-CimInstance Win32_ReliabilityRecords -ErrorAction SilentlyContinue |
        Where-Object { $_.TimeGenerated -gt (Get-Date).AddDays(-14) } |
        Sort-Object TimeGenerated -Descending |
        Select-Object -First 100
      $grouped = @{}
      foreach ($r in $records) {
        $day = $r.TimeGenerated.ToString('yyyy-MM-dd')
        if (-not $grouped[$day]) { $grouped[$day] = @{ date = $day; events = @(); errors = 0; warnings = 0; info = 0 } }
        $severity = switch ($r.EventIdentifier) { { $_ -ge 400 -and $_ -lt 500 } { 'error' } { $_ -ge 300 -and $_ -lt 400 } { 'warning' } default { 'info' } }
        $grouped[$day].events += @{
          source = $r.SourceName
          message = ($r.Message -split [Environment]::NewLine)[0]
          eventCode = $r.EventIdentifier
          severity = $severity
          time = $r.TimeGenerated.ToString('HH:mm')
        }
        if ($severity -eq 'error') { $grouped[$day].errors++ }
        elseif ($severity -eq 'warning') { $grouped[$day].warnings++ }
        else { $grouped[$day].info++ }
      }
      $result.days = $grouped.Values | Sort-Object date -Descending
    } catch { $result.summary.error = $_.Exception.Message }
    $result | ConvertTo-Json -Compress -Depth 5
  `;
  try {
    const result = await psJson(script, 30000);
    if (!result) return { platform: 'windows', measurement: 'failed' };
    return {
      platform: 'windows',
      stabilityIndex: result.summary?.stabilityIndex ?? null,
      days: Array.isArray(result.days) ? result.days : [],
      measurement: 'observed',
      source: 'Win32_ReliabilityRecords + Win32_ReliabilityStabilityMetrics',
    };
  } catch (err) {
    return { platform: 'windows', days: [], error: err.message };
  }
}

// ─── TOP 10 PRIORITY #9: SYSTEM SNAPSHOT + CHANGE TRACKING ──────────────────

export async function createSystemSnapshot() {
  if (!isWindows) return unsupported('system-snapshot');
  const script = `
    $result = @{
      timestamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
      os = @{}
      hardware = @{}
      apps = @{}
      services = @{}
      startup = @{}
      network = @{}
      security = @{}
      storage = @{}
      developer = @{}
    }
    # OS info
    try {
      $os = Get-CimInstance Win32_OperatingSystem
      $result.os = @{ version = $os.Version; build = $os.BuildNumber; caption = $os.Caption; lastBoot = $os.LastBootUpTime.ToString('yyyy-MM-dd HH:mm') }
    } catch {}
    # Apps count
    try {
      $paths = @('HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', 'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*')
      $apps = $paths | ForEach-Object { Get-ItemProperty $_ -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName } }
      $result.apps = @{ count = ($apps | Measure-Object).Count; names = ($apps | Select-Object -ExpandProperty DisplayName | Sort-Object) }
    } catch {}
    # Services summary
    try {
      $svcs = Get-Service
      $result.services = @{ total = $svcs.Count; running = ($svcs | Where-Object Status -eq 'Running').Count; stopped = ($svcs | Where-Object Status -eq 'Stopped').Count }
    } catch {}
    # Drivers count + problems
    try {
      $drvs = Get-CimInstance Win32_PnPSignedDriver
      $result.drivers = @{ total = $drvs.Count; problems = ($drvs | Where-Object { $_.ConfigManagerErrorCode -ne 0 -and $_.ConfigManagerErrorCode -ne $null }).Count }
    } catch {}
    # Network
    try {
      $adapters = Get-NetAdapter | Where-Object Status -eq 'Up'
      $result.network = @{ activeAdapters = $adapters.Count; names = ($adapters | Select-Object -ExpandProperty Name) }
    } catch {}
    # Storage
    try {
      Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object {
        $result.storage[$_.DeviceID] = @{ totalGB = [math]::Round($_.Size / 1GB, 1); freeGB = [math]::Round($_.FreeSpace / 1GB, 1) }
      }
    } catch {}
    # Startup items
    try {
      $startup = Get-CimInstance Win32_StartupCommand
      $result.startup = @{ count = $startup.Count; names = ($startup | Select-Object -ExpandProperty Name) }
    } catch {}
    $result | ConvertTo-Json -Compress -Depth 4
  `;
  try {
    const result = await psJson(script, 30000);
    if (!result) return { platform: 'windows', measurement: 'failed' };
    return { platform: 'windows', snapshot: result, measurement: 'observed', source: 'Multi-probe system snapshot' };
  } catch (err) {
    return { platform: 'windows', error: err.message };
  }
}

// ─── TOP 10 PRIORITY #10: UNIFIED ACTION CENTER ────────────────────────────
// (This is an aggregation endpoint — see routes file)

// ─── RECOVERY CENTER ────────────────────────────────────────────────────────

export async function getRecoveryStatus() {
  if (!isWindows) return unsupported('recovery');
  const script = `
    $result = @{
      systemRestore = @{}
      restorePoints = @()
      recoveryEnvironment = @{}
      safeMode = @{}
      bootConfig = @{}
    }
    # System Restore status
    try {
      $sr = Get-ComputerRestorePoint -ErrorAction Stop
      $result.restorePoints = @()
      foreach ($rp in ($sr | Sort-Object CreationTime -Descending | Select-Object -First 10)) {
        $result.restorePoints += @{
          sequenceNumber = $rp.SequenceNumber
          description = $rp.Description
          type = switch ($rp.RestorePointType) { 0 {'BeginSystemChange'} 1 {'Application'} 7 {'DeviceDriver'} 10 {'DeviceDriver'} 12 {'ModifySettings'} 13 {'Cancel'} default {"Type$($rp.RestorePointType)"} }
          date = $rp.CreationTime.ToString('yyyy-MM-dd HH:mm')
        }
      }
      $result.systemRestore.enabled = $true
      $result.systemRestore.pointCount = $sr.Count
    } catch {
      $result.systemRestore.enabled = $false
      $result.systemRestore.error = $_.Exception.Message
    }
    # Recovery environment
    try {
      $reagentc = & reagentc /info 2>&1
      $reStr = $reagentc -join [Environment]::NewLine
      $result.recoveryEnvironment = @{
        enabled = $reStr -match 'Enabled'
        output = $reStr.Substring(0, [Math]::Min($reStr.Length, 500))
      }
    } catch { $result.recoveryEnvironment.error = $_.Exception.Message }
    # Safe mode check
    try {
      $bootMode = & bcdedit /enum '{current}' 2>&1
      $bootStr = $bootMode -join [Environment]::NewLine
      $result.safeMode = @{
        currentlyInSafeMode = (Get-CimInstance Win32_ComputerSystem).BootupState -ne 'Normal boot'
        bootState = (Get-CimInstance Win32_ComputerSystem).BootupState
      }
    } catch {}
    # Boot configuration
    try {
      $bcd = & bcdedit /enum 2>&1
      $result.bootConfig.output = ($bcd -join [Environment]::NewLine).Substring(0, [Math]::Min(($bcd -join [Environment]::NewLine).Length, 800))
    } catch {}
    $result | ConvertTo-Json -Compress -Depth 5
  `;
  try {
    const result = await psJson(script, 20000);
    if (!result) return { platform: 'windows', measurement: 'failed' };
    return {
      platform: 'windows',
      systemRestore: result.systemRestore || {},
      restorePoints: Array.isArray(result.restorePoints) ? result.restorePoints : [],
      recoveryEnvironment: result.recoveryEnvironment || {},
      safeMode: result.safeMode || {},
      bootConfig: result.bootConfig || {},
      measurement: 'observed',
      source: 'Get-ComputerRestorePoint + reagentc + bcdedit',
    };
  } catch (err) {
    return { platform: 'windows', error: err.message };
  }
}

// ─── HARDWARE DIAGNOSTICS ───────────────────────────────────────────────────

export async function getHardwareDiagnostics() {
  if (!isWindows) return unsupported('hardware-diagnostics');
  const script = `
    $result = @{ cpu = @(); gpu = @(); ram = @(); audio = @(); bluetooth = @(); usb = @() }
    # CPU
    try {
      Get-CimInstance Win32_Processor | ForEach-Object {
        $result.cpu += @{
          name = $_.Name; cores = $_.NumberOfCores; threads = $_.NumberOfLogicalProcessors
          maxClockMHz = $_.MaxClockSpeed; currentLoad = $_.LoadPercentage
          manufacturer = $_.Manufacturer; architecture = $_.Architecture
        }
      }
    } catch {}
    # GPU
    try {
      Get-CimInstance Win32_VideoController | ForEach-Object {
        $result.gpu += @{
          name = $_.Name; driverVersion = $_.DriverVersion; vramMB = [math]::Round($_.AdapterRAM / 1MB, 0)
          resolution = "$($_.CurrentHorizontalResolution)x$($_.CurrentVerticalResolution)"
          refreshRate = $_.CurrentRefreshRate; status = $_.Status
        }
      }
    } catch {}
    # RAM
    try {
      $cs = Get-CimInstance Win32_ComputerSystem
      $os = Get-CimInstance Win32_OperatingSystem
      $result.ram = @{
        totalGB = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1)
        availableGB = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
        usedGB = [math]::Round(($cs.TotalPhysicalMemory - $os.FreePhysicalMemory * 1024) / 1GB, 1)
        usedPercent = [math]::Round(($cs.TotalPhysicalMemory - $os.FreePhysicalMemory * 1024) / $cs.TotalPhysicalMemory * 100, 1)
        commitTotalGB = [math]::Round($os.TotalVirtualMemorySize / 1MB, 1)
        commitFreeGB = [math]::Round($os.FreeVirtualMemory / 1MB, 1)
        pageFileMB = [math]::Round($os.SizeStoredInPagingFiles / 1KB, 0)
      }
      # Physical memory modules
      $result.ram.modules = @()
      Get-CimInstance Win32_PhysicalMemory -ErrorAction SilentlyContinue | ForEach-Object {
        $result.ram.modules += @{
          slot = $_.BankLabel; sizeGB = [math]::Round($_.Capacity / 1GB, 1)
          speedMHz = $_.Speed; manufacturer = $_.Manufacturer; type = $_.SMBIOSMemoryType
        }
      }
    } catch {}
    # Audio
    try {
      Get-CimInstance Win32_SoundDevice -ErrorAction SilentlyContinue | ForEach-Object {
        $result.audio += @{ name = $_.Name; status = $_.Status; manufacturer = $_.Manufacturer }
      }
    } catch {}
    # Bluetooth
    try {
      Get-CimInstance Win32_PnPEntity -Filter "PNPClass='Bluetooth'" -ErrorAction SilentlyContinue | Select-Object -First 5 | ForEach-Object {
        $result.bluetooth += @{ name = $_.Name; status = $_.Status; deviceId = $_.DeviceID }
      }
    } catch {}
    # USB controllers
    try {
      Get-CimInstance Win32_USBController -ErrorAction SilentlyContinue | Select-Object -First 10 | ForEach-Object {
        $result.usb += @{ name = $_.Name; status = $_.Status; manufacturer = $_.Manufacturer }
      }
    } catch {}
    $result | ConvertTo-Json -Compress -Depth 5
  `;
  try {
    const result = await psJson(script, 20000);
    if (!result) return { platform: 'windows', measurement: 'failed' };
    return {
      platform: 'windows',
      cpu: Array.isArray(result.cpu) ? result.cpu : [],
      gpu: Array.isArray(result.gpu) ? result.gpu : [],
      ram: result.ram || {},
      audio: Array.isArray(result.audio) ? result.audio : [],
      bluetooth: Array.isArray(result.bluetooth) ? result.bluetooth : [],
      usb: Array.isArray(result.usb) ? result.usb : [],
      measurement: 'observed',
      source: 'Win32_Processor + VideoController + PhysicalMemory + SoundDevice + Bluetooth + USB',
    };
  } catch (err) {
    return { platform: 'windows', error: err.message };
  }
}

export async function getPrinters() {
  if (!isWindows) return unsupported('printers');
  const script = `
    $result = @()
    try {
      Get-Printer -ErrorAction SilentlyContinue | ForEach-Object {
        $result += @{
          name = $_.Name; portName = $_.PortName; driverName = $_.DriverName
          shared = $_.Shared; printerStatus = $_.PrinterStatus
          type = $_.Type.ToString()
        }
      }
    } catch {}
    # Spooler service
    try {
      $spooler = Get-Service Spooler -ErrorAction Stop
      @{ printers = $result; spooler = @{ status = $spooler.Status.ToString() } } | ConvertTo-Json -Compress -Depth 3
    } catch {
      @{ printers = $result; spooler = @{ error = $_.Exception.Message } } | ConvertTo-Json -Compress -Depth 3
    }
  `;
  try {
    const result = await psJson(script, 15000);
    if (!result) return { platform: 'windows', measurement: 'failed' };
    const printers = Array.isArray(result.printers) ? result.printers : result.printers ? [result.printers] : [];
    return {
      platform: 'windows',
      count: printers.length,
      printers: printers.map((p, i) => ({
        id: `prn-${i + 1}`, name: p.name, port: p.portName, driver: p.driverName,
        shared: !!p.shared, status: p.printerStatus, type: p.type,
      })),
      spooler: result.spooler || {},
      measurement: 'observed',
    };
  } catch (err) {
    return { platform: 'windows', count: 0, printers: [], error: err.message };
  }
}

// ─── POWER & BATTERY ────────────────────────────────────────────────────────

export async function getPowerBattery() {
  if (!isWindows) return unsupported('power-battery');
  const script = `
    $result = @{ battery = @{}; powerPlan = @{}; wakeEvents = @() }
    # Battery
    try {
      $bat = Get-CimInstance Win32_Battery -ErrorAction Stop
      $result.battery = @{
        present = $true
        status = $bat.Status
        chargePercent = $bat.EstimatedChargeRemaining
        health = $bat.BatteryStatus
        designCapacity = $bat.DesignCapacity
        fullChargeCapacity = $bat.FullChargeCapacity
        name = $bat.Name
        manufacturer = $bat.Manufacturer
      }
      if ($bat.DesignCapacity -and $bat.FullChargeCapacity) {
        $result.battery.healthPercent = [math]::Round($bat.FullChargeCapacity / $bat.DesignCapacity * 100, 1)
      }
    } catch { $result.battery = @{ present = false } }
    # Power plan
    try {
      $plan = powercfg /getactivescheme 2>&1
      $result.powerPlan.active = ($plan -join ' ').Trim()
      $plans = powercfg /list 2>&1
      $result.powerPlan.available = ($plans | Where-Object { $_ -match 'Power Scheme' } | ForEach-Object { $_.Trim() })
    } catch {}
    # Wake events
    try {
      $wake = powercfg /lastwake 2>&1
      $result.powerPlan.lastWake = ($wake -join [Environment]::NewLine).Substring(0, [Math]::Min(($wake -join [Environment]::NewLine).Length, 500))
    } catch {}
    try {
      $wakeArmed = powercfg /devicequery wake_armed 2>&1
      $result.powerPlan.wakeArmedDevices = ($wakeArmed | Where-Object { $_.Trim() -and $_ -notmatch 'NONE' } | ForEach-Object { $_.Trim() })
    } catch {}
    $result | ConvertTo-Json -Compress -Depth 4
  `;
  try {
    const result = await psJson(script, 15000);
    if (!result) return { platform: 'windows', measurement: 'failed' };
    return { platform: 'windows', ...result, measurement: 'observed', source: 'Win32_Battery + powercfg' };
  } catch (err) {
    return { platform: 'windows', error: err.message };
  }
}

// ─── PRIVACY CENTER ─────────────────────────────────────────────────────────

export async function getPrivacyAudit() {
  if (!isWindows) return unsupported('privacy-audit');
  const script = `
    $result = @{ camera = @{}; microphone = @{}; location = @{}; diagnostics = @{}; advertising = @{} }
    # Camera access
    try {
      $cam = Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam' -ErrorAction SilentlyContinue
      $result.camera = @{ enabled = $cam.Value -eq 'Allow' }
    } catch {}
    # Microphone access
    try {
      $mic = Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone' -ErrorAction SilentlyContinue
      $result.microphone = @{ enabled = $mic.Value -eq 'Allow' }
    } catch {}
    # Location
    try {
      $loc = Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location' -ErrorAction SilentlyContinue
      $result.location = @{ enabled = $loc.Value -eq 'Allow' }
    } catch {}
    # Diagnostics/telemetry level
    try {
      $diag = Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection' -ErrorAction SilentlyContinue
      $result.diagnostics = @{ level = $diag.AllowTelemetry; levelName = switch ($diag.AllowTelemetry) { 0 {'Security'} 1 {'Basic'} 2 {'Enhanced'} 3 {'Full'} default {'Unknown'} } }
    } catch {}
    # Advertising ID
    try {
      $adv = Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo' -ErrorAction SilentlyContinue
      $result.advertising = @{ enabled = $adv.Enabled -eq 1; id = if ($adv.Enabled -eq 1) { $adv.Id } else { 'Disabled' } }
    } catch {}
    $result | ConvertTo-Json -Compress -Depth 4
  `;
  try {
    const result = await psJson(script, 15000);
    if (!result) return { platform: 'windows', measurement: 'failed' };
    return { platform: 'windows', ...result, measurement: 'observed', source: 'Registry privacy settings audit' };
  } catch (err) {
    return { platform: 'windows', error: err.message };
  }
}

// ─── WSL MANAGER ────────────────────────────────────────────────────────────

export async function getWSLStatus() {
  if (!isWindows) return unsupported('wsl');
  try {
    const { stdout } = await execFileAsync('wsl', ['--list', '--verbose'], { timeout: 10000, windowsHide: true });
    const lines = stdout.split('\n').filter(l => l.trim() && !l.startsWith('NAME'));
    const distros = lines.map(line => {
      const parts = line.trim().split(/\s+/).filter(Boolean);
      return {
        name: parts[0] || 'Unknown',
        state: parts[1] || 'Unknown',
        version: parts[2] ? `WSL${parts[2]}` : 'Unknown',
      };
    });
    // Get default distro
    let defaultDistro = null;
    try {
      const { stdout: defOut } = await execFileAsync('wsl', ['--status'], { timeout: 5000, windowsHide: true });
      const defMatch = defOut.match(/Default Distribution:\s+(.+)/i);
      if (defMatch) defaultDistro = defMatch[1].trim();
    } catch {}
    return {
      platform: 'windows',
      installed: true,
      distroCount: distros.length,
      defaultDistro,
      distros,
      measurement: 'observed',
      source: 'wsl --list --verbose',
    };
  } catch (err) {
    const notInstalled = err.code === 'ENOENT' || /not found|ENOENT/i.test(err.message);
    return {
      platform: 'windows',
      installed: !notInstalled,
      distroCount: 0,
      distros: [],
      measurement: notInstalled ? 'unavailable' : 'failed',
      note: notInstalled ? 'WSL is not installed' : err.message,
    };
  }
}

// ─── DOCKER HEALTH ──────────────────────────────────────────────────────────

export async function getDockerHealth() {
  if (!isWindows) return unsupported('docker');
  const result = { platform: 'windows', engine: {}, containers: [], images: [], volumes: [] };
  try {
    const { stdout: versionOut } = await execFileAsync('docker', ['version', '--format', '{{.Server.Version}}'], { timeout: 10000, windowsHide: true });
    result.engine.version = versionOut.trim();
    result.engine.running = true;
  } catch (err) {
    result.engine.running = false;
    result.engine.error = err.code === 'ENOENT' ? 'Docker not installed' : err.message;
    result.measurement = 'unavailable';
    return result;
  }
  try {
    const { stdout } = await execFileAsync('docker', ['ps', '-a', '--format', '{{.ID}}|{{.Names}}|{{.Status}}|{{.Image}}|{{.Ports}}'], { timeout: 10000, windowsHide: true });
    result.containers = stdout.split('\n').filter(Boolean).map(line => {
      const [id, name, status, image, ports] = line.split('|');
      return { id, name, status, image, ports };
    });
    result.containerCount = result.containers.length;
    result.runningCount = result.containers.filter(c => c.status?.includes('Up')).length;
  } catch {}
  try {
    const { stdout } = await execFileAsync('docker', ['images', '--format', '{{.Repository}}:{{.Tag}}|{{.Size}}|{{.ID}}'], { timeout: 10000, windowsHide: true });
    result.images = stdout.split('\n').filter(Boolean).map(line => {
      const [repo, size, id] = line.split('|');
      return { repository: repo, size, id };
    });
    result.imageCount = result.images.length;
  } catch {}
  result.measurement = 'observed';
  result.source = 'docker CLI';
  return result;
}

// ─── ENVIRONMENT HEALTH (Enhanced) ──────────────────────────────────────────

export async function getEnvironmentHealth() {
  if (!isWindows) return unsupported('environment-health');
  const script = `
    $result = @{ path = @(); envVars = @{} }
    # PATH entries
    $env:PATH -split ';' | Where-Object { $_.Trim() } | ForEach-Object {
      $exists = Test-Path $_
      $result.path += @{ path = $_; exists = $exists }
    }
    # Key environment variables
    $keys = @('JAVA_HOME', 'GOROOT', 'GOPATH', 'PYTHONPATH', 'NODE_PATH', 'RUSTUP_HOME', 'CARGO_HOME', 'ANDROID_HOME', 'DOTNET_ROOT')
    foreach ($k in $keys) {
      $val = [Environment]::GetEnvironmentVariable($k, 'User')
      if (-not $val) { $val = [Environment]::GetEnvironmentVariable($k, 'Machine') }
      if ($val) {
        $result.envVars[$k] = @{ value = $val; exists = (Test-Path $val) }
      }
    }
    $result | ConvertTo-Json -Compress -Depth 3
  `;
  try {
    const result = await psJson(script, 15000);
    if (!result) return { platform: 'windows', measurement: 'failed' };
    const pathEntries = Array.isArray(result.path) ? result.path : [];
    return {
      platform: 'windows',
      pathEntries: pathEntries.length,
      invalidPaths: pathEntries.filter(p => !p.exists).length,
      path: pathEntries,
      envVars: result.envVars || {},
      measurement: 'observed',
    };
  } catch (err) {
    return { platform: 'windows', error: err.message };
  }
}

// ─── CLEANUP ADVISOR ────────────────────────────────────────────────────────

export async function getCleanupAdvisor() {
  if (!isWindows) return unsupported('cleanup-advisor');
  const script = `
    $result = @{ safeToClean = @(); potentiallyRisky = @(); totalSafeMB = 0; totalRiskyMB = 0 }
    # Safe: Windows Temp
    try {
      $wt = "$env:SystemRoot\\Temp"
      if (Test-Path $wt) {
        $size = (Get-ChildItem $wt -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $result.safeToClean += @{ category = 'Windows Temp'; path = $wt; sizeMB = [math]::Round($size / 1MB, 1); risk = 'safe' }
      }
    } catch {}
    # Safe: User Temp
    try {
      $ut = $env:TEMP
      if (Test-Path $ut) {
        $size = (Get-ChildItem $ut -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $result.safeToClean += @{ category = 'User Temp'; path = $ut; sizeMB = [math]::Round($size / 1MB, 1); risk = 'safe' }
      }
    } catch {}
    # Safe: Crash dumps
    try {
      $dumpPaths = @("$env:SystemRoot\\Minidump", "$env:LOCALAPPDATA\\CrashDumps")
      $totalDump = 0
      foreach ($dp in $dumpPaths) {
        if (Test-Path $dp) { $totalDump += (Get-ChildItem $dp -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum }
      }
      if ($totalDump -gt 0) { $result.safeToClean += @{ category = 'Crash Dumps'; sizeMB = [math]::Round($totalDump / 1MB, 1); risk = 'safe' } }
    } catch {}
    # Safe: Windows Update cache
    try {
      $wuPath = "$env:SystemRoot\\SoftwareDistribution\\Download"
      if (Test-Path $wuPath) {
        $size = (Get-ChildItem $wuPath -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $result.safeToClean += @{ category = 'Windows Update Cache'; path = $wuPath; sizeMB = [math]::Round($size / 1MB, 1); risk = 'safe' }
      }
    } catch {}
    # Risky: Browser caches
    $browserPaths = @(
      @{ name = 'Chrome Cache'; path = "$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Cache" },
      @{ name = 'Edge Cache'; path = "$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\Cache" },
      @{ name = 'Firefox Cache'; path = "$env:LOCALAPPDATA\\Mozilla\\Firefox\\Profiles" }
    )
    foreach ($bp in $browserPaths) {
      try {
        if (Test-Path $bp.path) {
          $size = (Get-ChildItem $bp.path -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
          if ($size -gt 1MB) { $result.potentiallyRisky += @{ category = $bp.name; path = $bp.path; sizeMB = [math]::Round($size / 1MB, 1); risk = 'moderate' } }
        }
      } catch {}
    }
    # Risky: Downloads folder (just report size)
    try {
      $dl = "$env:USERPROFILE\\Downloads"
      if (Test-Path $dl) {
        $size = (Get-ChildItem $dl -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        if ($size -gt 10MB) { $result.potentiallyRisky += @{ category = 'Downloads Folder'; path = $dl; sizeMB = [math]::Round($size / 1MB, 1); risk = 'review' } }
      }
    } catch {}
    $result.totalSafeMB = ($result.safeToClean | Measure-Object -Property sizeMB -Sum).Sum
    $result.totalRiskyMB = ($result.potentiallyRisky | Measure-Object -Property sizeMB -Sum).Sum
    $result | ConvertTo-Json -Compress -Depth 4
  `;
  try {
    const result = await psJson(script, 60000);
    if (!result) return { platform: 'windows', measurement: 'failed' };
    return { platform: 'windows', ...result, measurement: 'observed', source: 'Filesystem analysis of temp/cache/download locations' };
  } catch (err) {
    return { platform: 'windows', error: err.message };
  }
}

// ─── SERVICE DEPENDENCY ANALYSIS ────────────────────────────────────────────

export async function getServiceDependencies() {
  if (!isWindows) return unsupported('service-dependencies');
  const script = `
    $services = Get-CimInstance Win32_Service | Select-Object Name, DisplayName, State, StartMode, PathName, ProcessId
    $depMap = @{}
    foreach ($svc in $services) {
      try {
        $deps = sc.exe qc $svc.Name 2>&1
        $depLine = $deps | Where-Object { $_ -match 'DEPENDENCIES' }
        $depNames = if ($depLine) {
          ($depLine -replace '.*DEPENDENCIES\s*:\s*','').Trim() -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -and $_ -ne 'NONE' }
        } else { @() }
        $depMap[$svc.Name] = @{
          name = $svc.Name; displayName = $svc.DisplayName; state = $svc.State
          startMode = $svc.StartMode; dependencies = $depNames
          hasExecutable = if ($svc.PathName) { Test-Path ($svc.PathName -replace '"','' -replace '\s+.*$','') } else { $false }
          pathName = $svc.PathName
        }
      } catch {
        $depMap[$svc.Name] = @{ name = $svc.Name; displayName = $svc.DisplayName; state = $svc.State; error = $_.Exception.Message }
      }
    }
    # Detect problem services
    $problems = $depMap.Values | Where-Object {
      ($_.state -ne 'Running' -and $_.startMode -eq 'Auto') -or
      ($_.hasExecutable -eq $false -and $_.pathName)
    }
    @{
      total = $depMap.Count
      problems = ($problems | Measure-Object).Count
      services = $depMap.Values | Select-Object -First 100
      problemServices = $problems | Select-Object -First 20
    } | ConvertTo-Json -Compress -Depth 4
  `;
  try {
    const result = await psJson(script, 60000);
    if (!result) return { platform: 'windows', measurement: 'failed' };
    return {
      platform: 'windows',
      total: result.total || 0,
      problems: result.problems || 0,
      services: Array.isArray(result.services) ? result.services : result.services ? [result.services] : [],
      problemServices: Array.isArray(result.problemServices) ? result.problemServices : result.problemServices ? [result.problemServices] : [],
      measurement: 'observed',
      source: 'Win32_Service + sc.exe dependency query',
    };
  } catch (err) {
    return { platform: 'windows', error: err.message };
  }
}

// ─── SCHEDULED TASK ANALYSIS (Enhanced) ─────────────────────────────────────

export async function getScheduledTaskAnalysis() {
  if (!isWindows) return unsupported('task-analysis');
  const script = `
    $tasks = Get-ScheduledTask -ErrorAction SilentlyContinue
    $result = @{
      total = $tasks.Count
      enabled = ($tasks | Where-Object State -eq 'Ready').Count
      disabled = ($tasks | Where-Object State -eq 'Disabled').Count
      running = ($tasks | Where-Object State -eq 'Running').Count
      suspicious = @()
      failed = @()
      tasks = @()
    }
    foreach ($t in ($tasks | Select-Object -First 100)) {
      $info = Get-ScheduledTaskInfo $t -ErrorAction SilentlyContinue
      $entry = @{
        name = $t.TaskName; path = $t.TaskPath; state = $t.State.ToString()
        author = $t.Author; lastResult = $info.LastTaskResult
        lastRun = if ($info.LastRunTime) { $info.LastRunTime.ToString('yyyy-MM-dd HH:mm') } else { $null }
        nextRun = if ($info.NextRunTime) { $info.NextRunTime.ToString('yyyy-MM-dd HH:mm') } else { $null }
      }
      # Check for potential issues
      if ($info.LastTaskResult -and $info.LastTaskResult -ne 0 -and $info.LastTaskResult -ne 267011) {
        $entry.hasError = $true
        $result.failed += $entry
      }
      $result.tasks += $entry
    }
    $result | ConvertTo-Json -Compress -Depth 4
  `;
  try {
    const result = await psJson(script, 30000);
    if (!result) return { platform: 'windows', measurement: 'failed' };
    return {
      platform: 'windows',
      total: result.total || 0,
      enabled: result.enabled || 0,
      disabled: result.disabled || 0,
      running: result.running || 0,
      failed: Array.isArray(result.failed) ? result.failed : [],
      tasks: Array.isArray(result.tasks) ? result.tasks : [],
      measurement: 'observed',
      source: 'Get-ScheduledTask + Get-ScheduledTaskInfo',
    };
  } catch (err) {
    return { platform: 'windows', error: err.message };
  }
}
