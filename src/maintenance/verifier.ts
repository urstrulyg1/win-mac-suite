import type { MaintenancePhaseTemplate } from '../platform/types';
import type { LogEntry, SectionStatus } from '../types';
import type { VerificationResult } from './types';

export function verifyPhaseExecution(
  template: MaintenancePhaseTemplate,
  status: SectionStatus,
  logs: LogEntry[],
): VerificationResult {
  const hasErrors = logs.some((l) => l.level === 'ERROR');
  const hasWarnings = logs.some((l) => l.level === 'WARNING');

  if (status === 'skipped') {
    return {
      verified: true,
      phaseId: template.id,
      summary: 'Phase safely bypassed per execution profile policy.',
      anomaliesDetected: 0,
    };
  }

  if (hasErrors || status === 'error') {
    return {
      verified: false,
      phaseId: template.id,
      summary: `Verification detected errors during ${template.title}. Check phase logs for remediation steps.`,
      anomaliesDetected: 1,
    };
  }

  return {
    verified: true,
    phaseId: template.id,
    summary: template.verificationSummary,
    anomaliesDetected: hasWarnings ? 1 : 0,
  };
}
