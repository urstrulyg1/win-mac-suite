import type { PlatformConfig, MaintenancePhaseTemplate, QuickAction } from './types';

// Static plan metadata only. Runtime results come exclusively from backend command execution.
export const WINDOWS_PHASES: MaintenancePhaseTemplate[] = [
  { id: 'apps', number: 1, title: 'Application & Package Updates', description: 'Winget, Chocolatey, Scoop, Python Pip, Node NPM', icon: 'Package', category: 'packages', riskLevel: 'safe', requiresElevation: false, allowedCommandId: 'win.winget.upgrade', targetTools: ['Winget', 'Chocolatey', 'Scoop', 'Pip', 'NPM'], skipModes: ['ScanOnly', 'CleanupOnly'], minDuration: 3, maxDuration: 6 },
  { id: 'defender', number: 2, title: 'Microsoft Defender Security Signatures', description: 'Virus, spyware, and network protection definitions refresh', icon: 'ShieldCheck', category: 'security', riskLevel: 'safe', requiresElevation: true, allowedCommandId: 'win.defender.update', targetTools: ['MpCmdRun', 'Update-MpSignature'], skipModes: ['ScanOnly', 'CleanupOnly'], minDuration: 2, maxDuration: 4 },
  { id: 'windows-update', number: 3, title: 'Windows Update (OS Patches)', description: 'Cumulative security & quality patches via PSWindowsUpdate', icon: 'Download', category: 'system', riskLevel: 'safe', requiresElevation: false, allowedCommandId: 'win.update.audit', targetTools: ['PSWindowsUpdate', 'Windows Update Agent'], skipModes: ['ScanOnly', 'CleanupOnly'], minDuration: 4, maxDuration: 8 },
  { id: 'store', number: 4, title: 'Microsoft Store Applications', description: 'UWP & Store app package update worker', icon: 'Store', category: 'store', riskLevel: 'safe', requiresElevation: false, allowedCommandId: 'win.store.scan', targetTools: ['Winget msstore', 'MDM Worker'], skipModes: ['ScanOnly', 'CleanupOnly'], minDuration: 2, maxDuration: 5 },
  { id: 'hardware', number: 5, title: 'Hardware Driver Diagnostics & PnP Scan', description: 'Device Manager error codes & Plug-and-Play enumeration', icon: 'Cpu', category: 'hardware', riskLevel: 'safe', requiresElevation: false, allowedCommandId: 'win.hardware.scan', targetTools: ['PnP Util', 'Device Manager API', 'WMI Win32_PnPEntity'], skipModes: ['CleanupOnly'], minDuration: 3, maxDuration: 5 },
  { id: 'drivers', number: 6, title: 'Optional & Driver Quality Updates', description: 'Manufacturer driver packages and optional quality fixes', icon: 'HardDrive', category: 'drivers', riskLevel: 'safe', requiresElevation: false, allowedCommandId: 'win.drivers.audit', targetTools: ['Windows Update Driver Catalog', 'pnputil'], skipModes: ['ScanOnly', 'CleanupOnly'], minDuration: 3, maxDuration: 6 },
  { id: 'integrity', number: 7, title: 'System File Integrity Verification', description: 'SFC /scannow & DISM Component Store verification', icon: 'FileCheck', category: 'integrity', riskLevel: 'moderate', requiresElevation: true, allowedCommandId: 'win.sfc', targetTools: ['sfc', 'dism'], skipModes: ['Quick', 'CleanupOnly'], minDuration: 4, maxDuration: 9 },
  { id: 'update-cache', number: 8, title: 'Update Cache & Component Cleanup', description: 'SoftwareDistribution cache & DISM component store cleanup', icon: 'FolderSync', category: 'cleanup', riskLevel: 'moderate', requiresElevation: true, allowedCommandId: 'win.dism.cleanup', targetTools: ['DISM /StartComponentCleanup', 'wuauserv cache'], skipModes: ['ScanOnly'], minDuration: 3, maxDuration: 7 },
  { id: 'disk-cleanup', number: 9, title: 'Disk & System Cache Cleanup', description: 'Temp files, crash dumps, WER logs, DNS resolver cache, Recycle Bin', icon: 'Trash', category: 'cleanup', riskLevel: 'safe', requiresElevation: false, allowedCommandId: 'win.storage.tempclean', targetTools: ['Cleanmgr', 'Temp purger', 'ipconfig /flushdns'], skipModes: ['ScanOnly'], minDuration: 3, maxDuration: 6 },
  { id: 'optimization', number: 10, title: 'Drive Optimization & Storage Sense', description: 'SSD TRIM, defrag re-trim, Storage Sense, startup services audit', icon: 'Gauge', category: 'optimization', riskLevel: 'safe', requiresElevation: true, allowedCommandId: 'win.defrag.trim', targetTools: ['defrag /O', 'fsutil behavior', 'Storage Sense'], skipModes: ['ScanOnly'], minDuration: 3, maxDuration: 6 },
];

export const WINDOWS_QUICK_ACTIONS: QuickAction[] = [
  { id: 'quick', icon: 'Zap', label: 'Quick Update', accent: '#06b6d4', desc: 'Winget apps & Defender definitions', mode: 'Quick' },
  { id: 'health-scan', icon: 'Shield', label: 'Health Scan', accent: '#3b82f6', desc: 'SFC & DISM integrity checks', mode: 'ScanOnly' },
  { id: 'full-update', icon: 'Download', label: 'Full Update', accent: '#8b5cf6', desc: 'Standard comprehensive update cycle', mode: 'Safe' },
  { id: 'deep-clean', icon: 'HardDrive', label: 'Deep Clean', accent: '#f59e0b', desc: 'SoftwareDistribution & junk cleanup', mode: 'CleanupOnly' },
];

const MODE_DESCRIPTIONS = {
  Safe: { label: 'Standard Full Update', description: 'Full updates, standard integrity checks, safe cache cleanup.', icon: 'Shield', color: 'blue' },
  Quick: { label: 'Quick Update', description: 'Application, Store, and Defender updates.', icon: 'Zap', color: 'cyan' },
  Aggressive: { label: 'Deep Maintenance', description: 'Full updates, component cleanup, and volume maintenance with confirmation.', icon: 'Flame', color: 'orange' },
  ScanOnly: { label: 'Health Scan Only', description: 'Hardware diagnostics and integrity scans. Non-destructive.', icon: 'Search', color: 'purple' },
  CleanupOnly: { label: 'Cleanup Only', description: 'Disk and update-cache cleanup. No software updates.', icon: 'Trash2', color: 'green' },
  Custom: { label: 'Custom Maintenance', description: 'Select individual maintenance phases.', icon: 'Layers', color: 'indigo' },
};

export const WINDOWS_CONFIG: PlatformConfig = {
  platform: 'windows', productName: 'WinSuite', version: '16.1.1', subtitle: 'Windows System Maintenance & Diagnostics',
  tagline: 'Intelligent, capability-aware PC optimization & health management', osFamily: 'Windows', badgeIcon: 'Monitor', accentColor: '#2563eb',
  packageManagerName: 'Winget / Chocolatey / Scoop', securityEngineName: 'Microsoft Defender', integrityToolName: 'SFC & DISM',
  systemUpdateName: 'Windows Update (KB)', storeName: 'Microsoft Store', storageOptimizationName: 'SSD TRIM & Storage Sense',
  quickActions: WINDOWS_QUICK_ACTIONS, phases: WINDOWS_PHASES, modeDescriptions: MODE_DESCRIPTIONS,
  riskGuidelines: {
    safe: { label: 'Safe', description: 'Non-destructive operation.', color: '#16a34a', badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' },
    moderate: { label: 'Moderate', description: 'System integrity or cache operation.', color: '#d97706', badge: 'bg-amber-500/10 text-amber-500 border-amber-500/25' },
    advanced: { label: 'Advanced', description: 'System-level operation requiring explicit confirmation.', color: '#dc2626', badge: 'bg-red-500/10 text-red-500 border-red-500/25' },
  },
};
