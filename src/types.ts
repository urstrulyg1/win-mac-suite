export type RunMode = 'Safe' | 'Aggressive' | 'Quick' | 'ScanOnly' | 'CleanupOnly';

export type SectionStatus = 'pending' | 'running' | 'success' | 'warning' | 'error' | 'skipped';

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
  ramGB: number;
  freeDiskGB: number;
  totalDiskGB: number;
  isOnline: boolean;
  cpuUsage: number;
  memoryUsage: number;
  uptime: string;
}

export interface RunSummary {
  healthScore: number;
  totalSections: number;
  passedSections: number;
  durationMinutes: number;
  totalUpdated: number;
  spaceReclaimed: number;
  issuesFound: number;
  issuesFixed: number;
  rebootRequired: boolean;
  followUps: string[];
}

export type AppPhase = 'landing' | 'configuring' | 'running' | 'complete';
