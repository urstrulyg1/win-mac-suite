export type RunMode = 'Safe' | 'Aggressive' | 'Quick' | 'ScanOnly' | 'CleanupOnly' | 'Custom';

export type SectionStatus = 'pending' | 'running' | 'success' | 'warning' | 'error' | 'skipped' | 'unavailable' | 'permission-required';

export interface Section {
  id: string;
  number: number;
  title: string;
  description: string;
  icon: string;
  status: SectionStatus;
  progress: number;
  duration: number;
  result: string;
  logs: LogEntry[];
  details?: Record<string, string | number>;
  requiresElevation?: boolean;
  riskLevel?: 'safe' | 'moderate' | 'advanced';
  allowedCommandId?: string;
  selected?: boolean;
}

export interface LogEntry {
  time: string;
  level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  message: string;
}

export interface SystemInfo {
  hostName: string;
  user: string;
  os: string;
  build: string;
  processor: string;
  ramGB: number | null;
  freeDiskGB: number | null;
  totalDiskGB: number | null;
  isOnline: boolean | null;
  cpuUsage: number | null;
  memoryUsage: number | null;
  uptime: string;
  cpuTemp?: number | null;
  cpuTempFormatted?: string;
}

export interface BeforeAfterSnapshot {
  timestamp: string;
  healthScore: number | null;
  diskPercentUsed: number | null;
  freeDiskGB: number | null;
  startupCount: number | null;
  issuesCount: number | null;
}

export interface RunSummary {
  healthScore: number | null;
  totalSections: number;
  passedSections: number;
  durationMinutes: number;
  totalUpdated: number | null;
  spaceReclaimed: number | null;
  issuesFound: number | null;
  issuesFixed: number | null;
  rebootRequired: boolean | null;
  followUps: string[];
  cancelled?: boolean;
  mode?: RunMode;
  startedAt?: string;
  beforeSnapshot?: BeforeAfterSnapshot;
  afterSnapshot?: BeforeAfterSnapshot;
}

export interface OperationAuditRecord {
  id: string;
  timestamp: string;
  operation: string;
  commandId?: string;
  platform: 'windows' | 'macos';
  user: string;
  risk: 'safe' | 'moderate' | 'advanced';
  permissionLevel: 'Administrator' | 'Root' | 'Standard User';
  result: 'success' | 'warning' | 'error' | 'cancelled' | 'timeout';
  durationSeconds: number;
  changesMade: string[];
  reclaimedBytes?: number;
  errorCode?: string;
  outputLogSnippet?: string;
}

export interface SystemRecommendation {
  id: string;
  category: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  actionLabel: string;
  actionTarget: string;
  estimatedBenefit?: string;
}

export type AppPhase = 'landing' | 'configuring' | 'running' | 'complete' | 'reports';
