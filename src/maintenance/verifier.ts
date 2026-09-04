import type { MaintenancePhaseTemplate } from '../platform/types';
import type { LogEntry, SectionStatus } from '../types';
import type { VerificationResult } from './types';

/** Evidence-only verification. Never reports a template expectation as an observed result. */
export function verifyPhaseExecution(template: MaintenancePhaseTemplate, status: SectionStatus, logs: LogEntry[]): VerificationResult {
  const hasErrors = logs.some((l) => l.level === 'ERROR');
  const hasWarnings = logs.some((l) => l.level === 'WARNING');
  const observed = logs
    .filter((l) => l.level === 'SUCCESS' || l.level === 'ERROR' || l.level === 'WARNING')
    .map((l) => l.message)
    .slice(-3);

  if (status === 'skipped') {
    return { verified: false, phaseId: template.id, summary: 'Not executed; no system result was observed.', anomaliesDetected: 0 };
  }
  if (status === 'unavailable' || status === 'permission-required') {
    return { verified: false, phaseId: template.id, summary: 'No verified system result was available for this phase.', anomaliesDetected: 1 };
  }
  if (hasErrors || status === 'error') {
    return { verified: false, phaseId: template.id, summary: observed.join(' | ') || `Execution failed for ${template.title}.`, anomaliesDetected: 1 };
  }
  if (hasWarnings || status === 'warning') {
    return { verified: false, phaseId: template.id, summary: observed.join(' | ') || 'Execution completed with warnings; no clean verification is claimed.', anomaliesDetected: 1 };
  }
  return {
    verified: status === 'success' && observed.length > 0,
    phaseId: template.id,
    summary: observed.join(' | ') || 'Command completed, but no verification output was captured.',
    anomaliesDetected: observed.length > 0 ? 0 : 1,
  };
}
