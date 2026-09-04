/**
 * WinSuite & MacSuite — Real Maintenance Executor
 *
 * UI results are derived only from backend command execution and observed output.
 * Configuration templates describe intended work; they are never treated as evidence.
 */

import type { LogEntry, RunSummary, Section } from '../types';
import type { MaintenancePlan, ExecutionEvents } from './types';
import { verifyPhaseExecution } from './verifier';
import { apiPost, createLogStream } from '../utils/api';

function getTimestamp(): string {
  return new Date().toTimeString().split(' ')[0];
}

interface PhaseResult {
  success?: boolean;
  result?: { success?: boolean; stdout?: string; stderr?: string; exitCode?: number; durationSeconds?: number };
  auditRecord?: { durationSeconds?: number; reclaimedBytes?: number };
  error?: string;
  reclaimedBytes?: number | null;
}

async function executeRealPhase(
  template: { allowedCommandId?: string; id: string; title: string; targetTools: string[] },
  sessionId: string,
  isCancelled: () => boolean,
  onLog: (entry: LogEntry) => void,
  onProgress: (pct: number) => void,
): Promise<{ status: Section['status']; result: string; duration: number; realLogs: LogEntry[]; reclaimedBytes: number | null }> {
  const logs: LogEntry[] = [];
  const started = Date.now();
  const addLog = (level: LogEntry['level'], message: string) => {
    const entry = { time: getTimestamp(), level, message } as LogEntry;
    logs.push(entry);
    onLog(entry);
  };

  if (isCancelled()) return { status: 'skipped', result: 'CANCELLED', duration: 0, realLogs: logs, reclaimedBytes: null };

  if (!template.allowedCommandId) {
    addLog('WARNING', `UNAVAILABLE — ${template.title} has no executable backend command binding.`);
    onProgress(100);
    return {
      status: 'warning',
      result: 'UNAVAILABLE — no executable backend command binding',
      duration: 0,
      realLogs: logs,
      reclaimedBytes: null,
    };
  }

  addLog('INFO', `Executing backend command: ${template.allowedCommandId}`);
  onProgress(20);

  try {
    const response = await apiPost<PhaseResult>('/actions/run-phase', {
      commandId: template.allowedCommandId,
      confirmed: true,
      sessionId,
      parameters: {},
    }, 300000);

    if (isCancelled()) {
      addLog('WARNING', 'Phase cancelled during execution.');
      await apiPost('/actions/cancel', {});
      return { status: 'skipped', result: 'CANCELLED', duration: 0, realLogs: logs, reclaimedBytes: null };
    }

    if (!response.ok || !response.data) {
      const message = response.error?.error || 'Backend command failed.';
      addLog('ERROR', message);
      if (response.error?.remediation) addLog('INFO', `Remediation: ${response.error.remediation}`);
      onProgress(100);
      return { status: 'error', result: `FAILED — ${message}`, duration: (Date.now() - started) / 1000, realLogs: logs, reclaimedBytes: null };
    }

    const data = response.data;
    const stdout = data.result?.stdout || '';
    const stderr = data.result?.stderr || '';
    for (const line of stdout.split('\n').filter(Boolean).slice(0, 50)) {
      const level = /error|fail|denied/i.test(line) ? 'ERROR' : /warn|skip|deprecat/i.test(line) ? 'WARNING' : 'INFO';
      addLog(level, line.trim());
    }
    for (const line of stderr.split('\n').filter(Boolean).slice(0, 20)) addLog('WARNING', line.trim());

    const raw = `${stdout}\n${stderr}`;
    const duration = Number.isFinite(data.result?.durationSeconds) ? data.result.durationSeconds! : Number.isFinite(data.auditRecord?.durationSeconds) ? data.auditRecord.durationSeconds! : (Date.now() - started) / 1000;
    const reclaimed = data.reclaimedBytes ?? data.auditRecord?.reclaimedBytes ?? null;
    const elevationError = /administrator|elevat|privilege|access is denied|\b740\b/i.test(raw);
    const exitCode = data.result?.exitCode;
    const succeeded = !elevationError && (data.result?.success === true || exitCode === 0);

    if (elevationError) addLog('WARNING', 'REQUIRES ELEVATION — Administrator privileges are required for this operation.');
    else if (succeeded) addLog('SUCCESS', `Command completed successfully (${duration.toFixed(1)}s).`);
    else addLog('WARNING', `Command completed without a successful exit result (${exitCode ?? 'UNAVAILABLE'}).`);

    onProgress(100);
    return {
      status: succeeded ? 'success' : elevationError ? 'warning' : 'error',
      result: succeeded ? `OBSERVED SUCCESS — ${template.allowedCommandId}` : elevationError ? 'REQUIRES ELEVATION' : `FAILED — exit code ${exitCode ?? 'UNAVAILABLE'}`,
      duration,
      realLogs: logs,
      reclaimedBytes: Number.isFinite(reclaimed) ? reclaimed : null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    addLog('ERROR', message);
    onProgress(100);
    return { status: 'error', result: `ERROR — ${message}`, duration: (Date.now() - started) / 1000, realLogs: logs, reclaimedBytes: null };
  }
}

export async function executeMaintenancePlan(
  plan: MaintenancePlan,
  events: ExecutionEvents,
  isCancelled: () => boolean,
  options: { noReboot?: boolean; diagnosticOnly?: boolean } = {},
): Promise<RunSummary> {
  const started = new Date();
  const sessionId = `session-${Date.now()}`;
  const eventSource = createLogStream(sessionId, (data) => {
    if (data.type === 'log' && data.entry) events.onLog?.(data.entry as LogEntry);
  });

  const total = plan.phases.length;
  let successful = 0;
  let cancelled = false;
  let totalReclaimedBytes = 0;
  let observedUpdateCount = 0;
  let observedIssueCount = 0;
  const verifications = [];

  events.onLog?.({ time: getTimestamp(), level: 'INFO', message: `${plan.platform === 'macos' ? 'MacSuite' : 'WinSuite'} maintenance started — ${total} planned phases.` });

  try {
    for (let i = 0; i < total; i++) {
      if (isCancelled()) { cancelled = true; break; }
      const phase = plan.phases[i];
      const template = phase.template;
      events.onPhaseStart?.(phase.phaseId, phase.title, i + 1, total);

      if (phase.skip) {
        events.onLog?.({ time: getTimestamp(), level: 'INFO', message: `[SKIP] ${phase.title}: ${phase.skipReason || 'profile policy'}` });
        events.onPhaseComplete?.(phase.phaseId, 'skipped', 'SKIPPED — not executed', 0, []);
        events.onOverallProgress?.(Math.round(((i + 1) / total) * 100));
        continue;
      }

      const result = await executeRealPhase(template, sessionId, isCancelled, (entry) => events.onLog?.(entry), (pct) => {
        events.onPhaseProgress?.(phase.phaseId, pct, []);
        events.onOverallProgress?.(Math.round(((i + pct / 100) / total) * 100));
      });

      if (result.status === 'success') successful++;
      if (result.reclaimedBytes !== null && result.reclaimedBytes > 0) totalReclaimedBytes += result.reclaimedBytes;
      if (result.status === 'error') observedIssueCount++;

      const verification = verifyPhaseExecution(template, result.status, result.realLogs);
      verifications.push(verification);
      if (verification.verified) observedUpdateCount++;

      events.onPhaseComplete?.(phase.phaseId, result.status, result.result, result.duration, result.realLogs);
    }
  } finally {
    try { eventSource?.close(); } catch {}
  }

  const durationMinutes = Math.round((Date.now() - started.getTime()) / 6000) / 10;
  const spaceReclaimedMB = totalReclaimedBytes > 0 ? Math.round(totalReclaimedBytes / 1024 / 1024) : null;
  const executedCount = plan.phases.filter((p) => !p.skip).length;
  const healthScore = executedCount > 0 ? Math.round((successful / executedCount) * 100) : null;

  const finalSummary: RunSummary = {
    healthScore,
    totalSections: total,
    passedSections: successful,
    durationMinutes,
    totalUpdated: observedUpdateCount,
    spaceReclaimed: spaceReclaimedMB,
    issuesFound: observedIssueCount,
    issuesFixed: null,
    rebootRequired: null,
    followUps: [],
    cancelled,
    mode: plan.mode,
    startedAt: started.toISOString(),
  };

  if (cancelled) events.onLog?.({ time: getTimestamp(), level: 'WARNING', message: 'Execution cancelled — report contains only observed results up to cancellation.' });
  else {
    events.onOverallProgress?.(100);
    events.onLog?.({ time: getTimestamp(), level: 'INFO', message: 'Maintenance pipeline finished. Summary contains observed backend results only.' });
  }

  return finalSummary;
}
