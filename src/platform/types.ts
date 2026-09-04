import type { RunMode } from '../types';

export type PlatformType = 'windows' | 'macos' | 'unsupported';
export type RiskLevel = 'safe' | 'moderate' | 'advanced';
export type CapabilityStatus = 'available' | 'unavailable' | 'permission-required' | 'unsupported' | 'not-installed';

export interface CommandCapability {
  name: string;
  command: string;
  status: CapabilityStatus;
  version?: string;
  description: string;
}

export interface PlatformCapabilities {
  winget?: CapabilityStatus; chocolatey?: CapabilityStatus; scoop?: CapabilityStatus;
  homebrew?: CapabilityStatus; macports?: CapabilityStatus; mas?: CapabilityStatus;
  pip?: CapabilityStatus; npm?: CapabilityStatus;
  powershell?: CapabilityStatus; getWinEvent?: CapabilityStatus; getService?: CapabilityStatus;
  getPnpDevice?: CapabilityStatus; sfc?: CapabilityStatus; dism?: CapabilityStatus;
  storageSense?: CapabilityStatus; systemRestore?: CapabilityStatus;
  softwareupdate?: CapabilityStatus; diskutil?: CapabilityStatus; launchctl?: CapabilityStatus;
  tmutil?: CapabilityStatus; systemProfiler?: CapabilityStatus; mdutil?: CapabilityStatus;
  xcode?: CapabilityStatus; cocoapods?: CapabilityStatus; gatekeeper?: CapabilityStatus;
  xprotect?: CapabilityStatus; sip?: CapabilityStatus; fileVault?: CapabilityStatus;
  fullDiskAccess?: CapabilityStatus;
  [key: string]: CapabilityStatus | undefined;
}

export interface OperationRiskMetadata {
  id: string; name: string; risk: RiskLevel; requiresAdmin: boolean;
  requiresConfirmation: boolean; reversible: boolean; impactDescription: string;
}

export interface OperationAuditRecord {
  id: string; timestamp: string; operation: string; commandId?: string;
  platform: 'windows' | 'macos'; user: string; risk: RiskLevel;
  permissionLevel: 'Administrator' | 'Root' | 'Standard User';
  result: 'success' | 'warning' | 'error' | 'cancelled';
  durationSeconds: number; changesMade: string[]; reclaimedBytes?: number;
  outputLogSnippet?: string;
}

export interface QuickAction {
  id: string; icon: string; label: string; accent: string; desc: string;
  mode: RunMode; phaseTarget?: string;
}

/** Static execution metadata only. Observed results are supplied by the backend at runtime. */
export interface MaintenancePhaseTemplate {
  id: string; number: number; title: string; description: string; icon: string;
  category: 'packages' | 'security' | 'system' | 'store' | 'hardware' | 'drivers' | 'integrity' | 'cleanup' | 'storage' | 'optimization';
  riskLevel: RiskLevel; requiresElevation: boolean; allowedCommandId?: string;
  targetTools: string[]; skipModes: RunMode[]; minDuration: number; maxDuration: number;
}

export interface PlatformConfig {
  platform: PlatformType; productName: string; version: string; subtitle: string;
  tagline: string; osFamily: string; badgeIcon: string; accentColor: string;
  packageManagerName: string; securityEngineName: string; integrityToolName: string;
  systemUpdateName: string; storeName: string; storageOptimizationName: string;
  quickActions: QuickAction[]; phases: MaintenancePhaseTemplate[];
  modeDescriptions: Record<RunMode, { label: string; description: string; icon: string; color: string }>;
  riskGuidelines: Record<RiskLevel, { label: string; description: string; color: string; badge: string }>;
}

export interface SystemRecommendation {
  id: string; category: string; severity: 'high' | 'medium' | 'low'; title: string;
  description: string; impact: string; actionLabel: string; actionTarget: string;
}
export interface SystemProcess { pid: number; name: string; cpu: number; mem: number; user: string; command?: string; }
export interface StartupItem {
  id: string; name: string; location: string;
  type: 'Registry' | 'Folder' | 'ScheduledTask' | 'LoginItem' | 'LaunchAgent' | 'LaunchDaemon';
  path: string; enabled: boolean; impact: 'High' | 'Medium' | 'Low' | 'Unknown';
}
export interface ServiceItem {
  id: string; name: string; displayName?: string;
  status: 'Running' | 'Stopped' | 'Paused'; startupType: string; user: string; description: string;
}
export interface NetworkDiagResult {
  online: boolean; defaultGateway: string; dnsResolutionTimeMs: number;
  gatewayLatencyMs: number; externalLatencyMs: number; packetLossPct: number;
  activeAdapter: { name: string; type: string; ip: string; speed: number };
  bluetooth?: { available: boolean; state: string };
}
