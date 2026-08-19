import type { Section, SystemInfo, RunMode, LogEntry } from './types';

export const SYSTEM_INFO: SystemInfo = {
  hostName: 'WORKSTATION-01',
  user: 'Administrator',
  os: 'Windows 11 Pro',
  build: '10.0.22631 (Build 22631)',
  processor: 'AMD Ryzen 9 7950X 16-Core Processor',
  ramGB: 64,
  freeDiskGB: 234.7,
  totalDiskGB: 953.9,
  isOnline: true,
  cpuUsage: 12,
  memoryUsage: 38,
  uptime: '4 days, 7 hours',
};

export const MODE_DESCRIPTIONS: Record<RunMode, { label: string; description: string; icon: string; color: string }> = {
  Safe: {
    label: 'Standard Full Update',
    description: 'Full updates, standard integrity checks, safe cache cleanup. Recommended for regular maintenance.',
    icon: 'Shield',
    color: 'blue',
  },
  Quick: {
    label: 'Quick Update',
    description: 'Application, Store, and Defender updates + Fast OS check. Skips SFC/DISM for speed.',
    icon: 'Zap',
    color: 'cyan',
  },
  Aggressive: {
    label: 'Deep Maintenance',
    description: 'Full updates, deep component cleanup with ResetBase, prefetch clear, storage sense.',
    icon: 'Flame',
    color: 'orange',
  },
  ScanOnly: {
    label: 'Health Scan Only',
    description: 'Hardware error diagnostics + System integrity (SFC & DISM) scan only. No changes made.',
    icon: 'Search',
    color: 'purple',
  },
  CleanupOnly: {
    label: 'Cleanup Only',
    description: 'Disk, update cache, crash dump, and system cache cleanup only. No updates installed.',
    icon: 'Trash2',
    color: 'green',
  },
};

export function createSections(): Section[] {
  return [
    {
      id: 'apps',
      number: 1,
      title: 'Application & Package Manager Updates',
      description: 'Winget, Chocolatey, Pip, Scoop, NPM',
      icon: 'Package',
      status: 'pending',
      progress: 0,
      duration: 0,
      result: '',
      logs: [],
    },
    {
      id: 'defender',
      number: 2,
      title: 'Microsoft Defender Security Signatures',
      description: 'Virus & spyware definition refresh',
      icon: 'ShieldCheck',
      status: 'pending',
      progress: 0,
      duration: 0,
      result: '',
      logs: [],
    },
    {
      id: 'windows-update',
      number: 3,
      title: 'Windows Update (OS Patches)',
      description: 'Security & quality updates via PSWindowsUpdate / COM API',
      icon: 'Download',
      status: 'pending',
      progress: 0,
      duration: 0,
      result: '',
      logs: [],
    },
    {
      id: 'store',
      number: 4,
      title: 'Microsoft Store Apps',
      description: 'UWP & Store application updates',
      icon: 'Store',
      status: 'pending',
      progress: 0,
      duration: 0,
      result: '',
      logs: [],
    },
    {
      id: 'hardware',
      number: 5,
      title: 'Hardware Driver Diagnostics & PnP Scan',
      description: 'Device Manager error codes & driver enumeration',
      icon: 'Cpu',
      status: 'pending',
      progress: 0,
      duration: 0,
      result: '',
      logs: [],
    },
    {
      id: 'drivers',
      number: 6,
      title: 'Optional & Driver Updates',
      description: 'Optional quality patches & driver updates',
      icon: 'HardDrive',
      status: 'pending',
      progress: 0,
      duration: 0,
      result: '',
      logs: [],
    },
    {
      id: 'integrity',
      number: 7,
      title: 'System Integrity Verification',
      description: 'SFC /scannow & DISM /RestoreHealth',
      icon: 'FileCheck',
      status: 'pending',
      progress: 0,
      duration: 0,
      result: '',
      logs: [],
    },
    {
      id: 'update-cache',
      number: 8,
      title: 'Update Cache & Component Cleanup',
      description: 'SoftwareDistribution cache & DISM component store',
      icon: 'FolderSync',
      status: 'pending',
      progress: 0,
      duration: 0,
      result: '',
      logs: [],
    },
    {
      id: 'disk-cleanup',
      number: 9,
      title: 'Disk & System Cache Cleanup',
      description: 'Temp files, crash dumps, WER, DNS flush, Recycle Bin',
      icon: 'Trash',
      status: 'pending',
      progress: 0,
      duration: 0,
      result: '',
      logs: [],
    },
    {
      id: 'optimization',
      number: 10,
      title: 'Drive Optimization & Performance Tuning',
      description: 'SSD TRIM, defrag, prefetch, Storage Sense, startup audit',
      icon: 'Gauge',
      status: 'pending',
      progress: 0,
      duration: 0,
      result: '',
      logs: [],
    },
  ];
}

// Simulated log entries for each section
const sectionSimData: Record<string, { 
  skipModes: RunMode[]; 
  minDuration: number; 
  maxDuration: number;
  successResult: string;
  logs: (mode: RunMode) => LogEntry[];
  details?: Record<string, string | number>;
}> = {
  apps: {
    skipModes: ['ScanOnly', 'CleanupOnly'],
    minDuration: 4,
    maxDuration: 8,
    successResult: 'DONE -- 12 updated, 0 failed',
    details: { 'Winget Packages': 8, 'Chocolatey': 3, 'Pip': 1, 'Scoop': 0 },
    logs: () => [
      { time: '', level: 'INFO', message: 'Running Winget package update...' },
      { time: '', level: 'INFO', message: '  [winget] Microsoft.PowerShell 7.4.6 -> 7.4.7' },
      { time: '', level: 'INFO', message: '  [winget] Mozilla.Firefox 131.0 -> 132.0.1' },
      { time: '', level: 'INFO', message: '  [winget] VideoLAN.VLC 3.0.20 -> 3.0.21' },
      { time: '', level: 'SUCCESS', message: '[OK] Winget scan completed (8 upgraded, 0 failed)' },
      { time: '', level: 'INFO', message: 'Running Chocolatey package upgrade...' },
      { time: '', level: 'INFO', message: '  [choco] Upgrading 7zip, notepadplusplus, git...' },
      { time: '', level: 'SUCCESS', message: '[OK] Chocolatey packages up to date.' },
      { time: '', level: 'INFO', message: 'Upgrading Python Pip package installer...' },
      { time: '', level: 'SUCCESS', message: '[OK] Python Pip up to date.' },
    ],
  },
  defender: {
    skipModes: ['ScanOnly', 'CleanupOnly'],
    minDuration: 2,
    maxDuration: 5,
    successResult: 'DONE -- Signatures Up-To-Date',
    details: { 'Engine Version': '1.1.24090.2', 'Definitions': '1.421.45.0' },
    logs: () => [
      { time: '', level: 'INFO', message: 'Checking and refreshing Microsoft Defender virus & spyware signatures...' },
      { time: '', level: 'INFO', message: '  [Defender] Connecting to Microsoft Update Server...' },
      { time: '', level: 'INFO', message: '  [Defender] Downloading signature package (4.2 MB)...' },
      { time: '', level: 'SUCCESS', message: '[OK] Defender signatures successfully updated via Update-MpSignature.' },
    ],
  },
  'windows-update': {
    skipModes: ['ScanOnly', 'CleanupOnly'],
    minDuration: 6,
    maxDuration: 15,
    successResult: 'DONE -- 3 installed',
    details: { 'Security Updates': 2, 'Quality Updates': 1, 'Feature Updates': 0 },
    logs: () => [
      { time: '', level: 'INFO', message: 'Scanning for Windows Updates via PSWindowsUpdate...' },
      { time: '', level: 'INFO', message: 'Registered Microsoft Update as additional service...' },
      { time: '', level: 'WARNING', message: '[!] Found 3 available Windows Update(s):' },
      { time: '', level: 'INFO', message: '  -> 2024-11 Cumulative Update for Windows 11 (KB5046617)' },
      { time: '', level: 'INFO', message: '  -> Security Update for .NET 8.0 (KB5045643)' },
      { time: '', level: 'INFO', message: '  -> Malicious Software Removal Tool x64 - v5.129 (KB890830)' },
      { time: '', level: 'INFO', message: 'Installing updates...' },
      { time: '', level: 'SUCCESS', message: '[OK] Windows Updates applied (3 update(s))' },
    ],
  },
  store: {
    skipModes: ['ScanOnly', 'CleanupOnly'],
    minDuration: 3,
    maxDuration: 6,
    successResult: 'DONE',
    details: { 'Apps Checked': 47, 'Updates Found': 5 },
    logs: () => [
      { time: '', level: 'INFO', message: 'Scanning for Microsoft Store app updates via Winget...' },
      { time: '', level: 'INFO', message: '  [msstore] Microsoft.WindowsTerminal updating...' },
      { time: '', level: 'INFO', message: '  [msstore] Microsoft.WindowsCalculator up to date' },
      { time: '', level: 'SUCCESS', message: '[OK] Triggered MDM Store update worker.' },
      { time: '', level: 'SUCCESS', message: '[OK] Microsoft Store apps update processed.' },
    ],
  },
  hardware: {
    skipModes: ['CleanupOnly'],
    minDuration: 3,
    maxDuration: 7,
    successResult: 'DONE -- 1 hardware issue(s), 42 OEM driver(s)',
    details: { 'Active Devices': 156, 'Problem Devices': 1, 'OEM Drivers': 42 },
    logs: (mode: RunMode) => {
      const logs: LogEntry[] = [
        { time: '', level: 'INFO', message: 'Diagnosing device manager error codes...' },
        { time: '', level: 'WARNING', message: '[!]  [Hardware Error] Intel(R) Dynamic Tuning Technology (Device cannot start - Code 10)' },
        { time: '', level: 'INFO', message: '    Device ID: ACPI\\INTC1041\\1' },
        { time: '', level: 'INFO', message: '    >> Action: Update Intel DTT driver from OEM support page.' },
        { time: '', level: 'INFO', message: 'Triggering PnP device discovery scan...' },
        { time: '', level: 'INFO', message: '  Scan completed.' },
        { time: '', level: 'INFO', message: 'Total OEM 3rd-party driver packages installed: 42' },
      ];
      return mode === 'ScanOnly' ? logs : logs;
    },
  },
  drivers: {
    skipModes: ['Quick', 'ScanOnly', 'CleanupOnly'],
    minDuration: 4,
    maxDuration: 8,
    successResult: 'NONE AVAILABLE',
    logs: () => [
      { time: '', level: 'INFO', message: 'Scanning for optional driver and quality patches...' },
      { time: '', level: 'INFO', message: 'Querying Microsoft Update for optional packages...' },
      { time: '', level: 'SUCCESS', message: '[OK] No pending optional updates found.' },
    ],
  },
  integrity: {
    skipModes: ['Quick', 'CleanupOnly'],
    minDuration: 8,
    maxDuration: 20,
    successResult: 'HEALTHY -- System files intact',
    details: { 'DISM Result': 'Healthy', 'SFC Result': 'No violations' },
    logs: () => [
      { time: '', level: 'INFO', message: 'Running DISM /Online /Cleanup-Image /RestoreHealth...' },
      { time: '', level: 'INFO', message: '  [DISM] The restore operation completed successfully.' },
      { time: '', level: 'SUCCESS', message: '[OK] DISM: Component store is healthy and verified.' },
      { time: '', level: 'INFO', message: 'Running SFC /scannow (System File Checker)...' },
      { time: '', level: 'INFO', message: '  [SFC] Beginning system scan...' },
      { time: '', level: 'INFO', message: '  [SFC] Verification 100% complete.' },
      { time: '', level: 'INFO', message: '  [SFC] Windows Resource Protection did not find any integrity violations.' },
      { time: '', level: 'SUCCESS', message: '[OK] SFC: No integrity violations found. Windows system files are clean.' },
    ],
  },
  'update-cache': {
    skipModes: ['ScanOnly'],
    minDuration: 3,
    maxDuration: 6,
    successResult: 'DONE -- 847.3 MB cleared',
    details: { 'Cache Size Before': '847.3 MB', 'Cache Size After': '0 MB' },
    logs: (mode: RunMode) => [
      { time: '', level: 'INFO', message: 'Checking SoftwareDistribution Download cache...' },
      { time: '', level: 'INFO', message: 'Stopping update services to clear download cache (847.3 MB)...' },
      { time: '', level: 'SUCCESS', message: '[OK] Cleared 847.3 MB of downloaded update caches.' },
      { time: '', level: 'INFO', message: mode === 'Aggressive' 
        ? 'Running Deep Component Cleanup (DISM /StartComponentCleanup /ResetBase)...' 
        : 'Running Standard Component Cleanup (DISM /StartComponentCleanup)...' },
      { time: '', level: 'SUCCESS', message: mode === 'Aggressive' 
        ? '[OK] Component store reset and compacted (Aggressive Mode).' 
        : '[OK] Superseded components cleaned safely.' },
    ],
  },
  'disk-cleanup': {
    skipModes: ['ScanOnly'],
    minDuration: 3,
    maxDuration: 7,
    successResult: 'DONE -- 2,341.6 MB reclaimed',
    details: { 'User Temp': '456.2 MB', 'Windows Temp': '312.8 MB', 'Crash Dumps': '1,024 MB', 'WER': '89.4 MB', 'DNS Cache': 'Flushed', 'Recycle Bin': '459.2 MB' },
    logs: () => [
      { time: '', level: 'SUCCESS', message: '[OK] Cleaned User Temp folder (456.2 MB)' },
      { time: '', level: 'SUCCESS', message: '[OK] Cleaned Windows Temp folder (312.8 MB)' },
      { time: '', level: 'SUCCESS', message: '[OK] Cleaned crash dumps in C:\\Windows\\Minidump (1,024 MB)' },
      { time: '', level: 'SUCCESS', message: '[OK] Cleaned Windows Error Reporting queues (89.4 MB)' },
      { time: '', level: 'SUCCESS', message: '[OK] Cleared Delivery Optimization peer cache.' },
      { time: '', level: 'SUCCESS', message: '[OK] Flushed Windows DNS resolver cache.' },
      { time: '', level: 'SUCCESS', message: '[OK] Emptied Recycle Bin.' },
    ],
  },
  optimization: {
    skipModes: ['ScanOnly'],
    minDuration: 3,
    maxDuration: 8,
    successResult: 'DONE -- Drive C: (TRIM), Drive D: (TRIM)',
    details: { 'Drives Optimized': 2, 'Startup Items': 14 },
    logs: (mode: RunMode) => {
      const base: LogEntry[] = [
        { time: '', level: 'INFO', message: 'Checking fixed drives for TRIM and optimization...' },
        { time: '', level: 'INFO', message: 'Optimizing drive C: (TRIM/Defrag)...' },
        { time: '', level: 'SUCCESS', message: '[OK] Drive C: TRIM completed.' },
        { time: '', level: 'INFO', message: 'Optimizing drive D: (TRIM/Defrag)...' },
        { time: '', level: 'SUCCESS', message: '[OK] Drive D: TRIM completed.' },
      ];
      if (mode === 'Aggressive') {
        base.push(
          { time: '', level: 'INFO', message: 'Aggressive Mode: Resetting Prefetch cache...' },
          { time: '', level: 'SUCCESS', message: '[OK] Cleared Prefetch cache (128.4 MB).' },
          { time: '', level: 'SUCCESS', message: '[OK] Storage Sense cleanup executed.' },
        );
      }
      base.push(
        { time: '', level: 'INFO', message: 'Active Startup Applications: 14 item(s)' },
      );
      return base;
    },
  },
};

export function getSectionSimData(sectionId: string) {
  return sectionSimData[sectionId];
}

export function shouldSkipSection(sectionId: string, mode: RunMode): boolean {
  const data = sectionSimData[sectionId];
  return data ? data.skipModes.includes(mode) : false;
}

export function generateTimestamp(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}
