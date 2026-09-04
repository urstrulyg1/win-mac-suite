import type { PlatformConfig, MaintenancePhaseTemplate, QuickAction } from './types';

// Static plan metadata only. Runtime results come exclusively from backend command execution.
export const MACOS_PHASES: MaintenancePhaseTemplate[] = [
  { id: 'packages', number: 1, title: 'Package Updates & CLI Environments', description: 'Homebrew formulae & casks, MacPorts, Python Pip3, Node NPM globals', icon: 'Package', category: 'packages', riskLevel: 'safe', requiresElevation: false, allowedCommandId: 'mac.brew.upgrade', targetTools: ['brew', 'port', 'pip3', 'npm'], skipModes: ['ScanOnly', 'CleanupOnly'], minDuration: 3, maxDuration: 6 },
  { id: 'security-status', number: 2, title: 'Apple Security Signatures & Gatekeeper', description: 'XProtect definitions, MRT malware removal definitions, Gatekeeper status', icon: 'ShieldCheck', category: 'security', riskLevel: 'safe', requiresElevation: false, allowedCommandId: 'mac.spctl.status', targetTools: ['XProtect', 'MRT', 'Gatekeeper', 'spctl'], skipModes: ['ScanOnly', 'CleanupOnly'], minDuration: 2, maxDuration: 4 },
  { id: 'macos-updates', number: 3, title: 'macOS Software Update (System Patches)', description: 'Core macOS updates and security response patches via softwareupdate', icon: 'Download', category: 'system', riskLevel: 'safe', requiresElevation: true, allowedCommandId: 'mac.softwareupdate.check', targetTools: ['softwareupdate'], skipModes: ['ScanOnly', 'CleanupOnly'], minDuration: 4, maxDuration: 8 },
  { id: 'app-updates', number: 4, title: 'Mac App Store Applications', description: 'Mac App Store app updates via mas CLI and app worker', icon: 'Store', category: 'store', riskLevel: 'safe', requiresElevation: false, allowedCommandId: 'mac.system_profiler.apps', targetTools: ['system_profiler SPApplicationsDataType', 'mas CLI'], skipModes: ['ScanOnly', 'CleanupOnly'], minDuration: 2, maxDuration: 5 },
  { id: 'hardware-diag', number: 5, title: 'Hardware & Apple Silicon Diagnostics', description: 'IOKit device scan, thermal pressure state, and battery health audit', icon: 'Cpu', category: 'hardware', riskLevel: 'safe', requiresElevation: false, allowedCommandId: 'mac.system_profiler.hardware', targetTools: ['system_profiler', 'pmset -g batt', 'thermal status'], skipModes: ['CleanupOnly'], minDuration: 3, maxDuration: 5 },
  { id: 'background-items', number: 6, title: 'Background Items & LaunchDaemons Audit', description: 'Audit LaunchDaemons, LaunchAgents, Login Items, and background extensions', icon: 'HardDrive', category: 'drivers', riskLevel: 'safe', requiresElevation: false, allowedCommandId: 'mac.launchctl.list', targetTools: ['launchctl', 'sfltool', 'Login Items API'], skipModes: ['ScanOnly', 'CleanupOnly'], minDuration: 3, maxDuration: 6 },
  { id: 'apfs-integrity', number: 7, title: 'APFS Volume Integrity & File System Check', description: 'APFS container verification, First Aid scan, and SIP status validation', icon: 'FileCheck', category: 'integrity', riskLevel: 'moderate', requiresElevation: true, allowedCommandId: 'mac.diskutil.verify', targetTools: ['diskutil verifyVolume', 'csrutil status', 'fsck_apfs'], skipModes: ['Quick', 'CleanupOnly'], minDuration: 4, maxDuration: 9 },
  { id: 'cache-cleanup', number: 8, title: 'System & User Library Cache Purge', description: '~/Library/Caches, Xcode DerivedData, CocoaPods, and Homebrew download cache', icon: 'FolderSync', category: 'cleanup', riskLevel: 'safe', requiresElevation: false, allowedCommandId: 'mac.brew.cleanup', targetTools: ['~/Library/Caches', 'brew cleanup', 'DerivedData'], skipModes: ['ScanOnly'], minDuration: 3, maxDuration: 7 },
  { id: 'timemachine-snapshots', number: 9, title: 'Time Machine Snapshot Thinning & Purgeable Space', description: 'Thin local APFS backup snapshots and reclaim purgeable system storage', icon: 'Trash', category: 'cleanup', riskLevel: 'advanced', requiresElevation: true, allowedCommandId: 'mac.tmutil.thin', targetTools: ['tmutil thinlocalsnapshots', 'APFS purgeable space'], skipModes: ['ScanOnly'], minDuration: 3, maxDuration: 6 },
  { id: 'memory-trim', number: 10, title: 'Storage Optimization & APFS TRIM', description: 'SSD block TRIM dispatch, font cache refresh, and inactive memory consolidation', icon: 'Gauge', category: 'optimization', riskLevel: 'safe', requiresElevation: true, allowedCommandId: 'mac.diskutil.trim', targetTools: ['diskutil apfs trim', 'atsutil databases', 'dscacheutil -flushcache'], skipModes: ['ScanOnly'], minDuration: 3, maxDuration: 6 },
];

export const MACOS_QUICK_ACTIONS: QuickAction[] = [
  { id: 'quick', icon: 'Zap', label: 'Quick Update', accent: '#06b6d4', desc: 'Homebrew packages & security checks', mode: 'Quick' },
  { id: 'health-scan', icon: 'Shield', label: 'Health Scan', accent: '#3b82f6', desc: 'APFS First Aid & hardware diagnostics', mode: 'ScanOnly' },
  { id: 'full-update', icon: 'Download', label: 'Full Update', accent: '#8b5cf6', desc: 'Standard comprehensive Mac update cycle', mode: 'Safe' },
  { id: 'deep-clean', icon: 'HardDrive', label: 'Deep Clean', accent: '#f59e0b', desc: 'Cache purge & snapshot maintenance', mode: 'CleanupOnly' },
];

const MODE_DESCRIPTIONS = {
  Safe: { label: 'Standard Full Update', description: 'Package updates, APFS checks, and safe cache maintenance.', icon: 'Shield', color: 'blue' },
  Quick: { label: 'Quick Update', description: 'Package and security updates with deep disk checks skipped.', icon: 'Zap', color: 'cyan' },
  Aggressive: { label: 'Deep Maintenance', description: 'Full updates, snapshot maintenance, and deep cleanup with confirmation.', icon: 'Flame', color: 'orange' },
  ScanOnly: { label: 'Health Scan Only', description: 'Hardware and filesystem diagnostics. Non-destructive.', icon: 'Search', color: 'purple' },
  CleanupOnly: { label: 'Cleanup Only', description: 'Cache and snapshot cleanup without software updates.', icon: 'Trash2', color: 'green' },
  Custom: { label: 'Custom Maintenance', description: 'Select individual maintenance phases.', icon: 'Layers', color: 'indigo' },
};

export const MACOS_CONFIG: PlatformConfig = {
  platform: 'macos', productName: 'MacSuite', version: '16.1.1', subtitle: 'macOS System Maintenance & Diagnostics',
  tagline: 'Intelligent, capability-aware Mac optimization & performance engine', osFamily: 'macOS', badgeIcon: 'Apple', accentColor: '#06b6d4',
  packageManagerName: 'Homebrew / MacPorts / mas', securityEngineName: 'XProtect & Gatekeeper', integrityToolName: 'APFS First Aid & SIP',
  systemUpdateName: 'macOS Software Update', storeName: 'Mac App Store', storageOptimizationName: 'APFS TRIM & Snapshot Thinning',
  quickActions: MACOS_QUICK_ACTIONS, phases: MACOS_PHASES, modeDescriptions: MODE_DESCRIPTIONS,
  riskGuidelines: {
    safe: { label: 'Safe', description: 'Non-destructive operation.', color: '#16a34a', badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' },
    moderate: { label: 'Moderate', description: 'System integrity or cache operation.', color: '#d97706', badge: 'bg-amber-500/10 text-amber-500 border-amber-500/25' },
    advanced: { label: 'Advanced', description: 'System-level operation requiring explicit confirmation.', color: '#dc2626', badge: 'bg-red-500/10 text-red-500 border-red-500/25' },
  },
};
