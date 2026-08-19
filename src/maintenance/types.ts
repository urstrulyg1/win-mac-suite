import type { RunMode, Section, LogEntry, RunSummary } from '../types';
import type { RiskLevel, PlatformType, PlatformCapabilities, MaintenancePhaseTemplate } from '../platform/types';

export interface PlannedPhase {
  template: MaintenancePhaseTemplate;
  phaseId: string;
  number: number;
  title: string;
  description: string;
  skip: boolean;
  skipReason?: string;
  riskLevel: RiskLevel;
  requiresElevation: boolean;
  targetTools: string[];
}

export interface MaintenancePlan {
  mode: RunMode;
  platform: PlatformType;
  totalPhases: number;
  activePhases: PlannedPhase[];
  skippedPhases: PlannedPhase[];
  phases: PlannedPhase[];
  estimatedDurationSeconds: number;
  highestRiskLevel: RiskLevel;
  requiresElevation: boolean;
}

export interface ExecutionEvents {
  onPhaseStart?: (phaseId: string, phaseName: string, phaseIndex: number, total: number) => void;
  onPhaseProgress?: (phaseId: string, progress: number, currentLogs: LogEntry[]) => void;
  onPhaseComplete?: (phaseId: string, status: Section['status'], result: string, duration: number, logs: LogEntry[]) => void;
  onLog?: (entry: LogEntry) => void;
  onOverallProgress?: (progress: number) => void;
}

export interface VerificationResult {
  verified: boolean;
  phaseId: string;
  summary: string;
  anomaliesDetected: number;
}
