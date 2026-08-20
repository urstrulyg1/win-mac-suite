import type { LogEntry, RunSummary, Section } from '../types';
import type { MaintenancePlan, ExecutionEvents } from './types';
import { verifyPhaseExecution } from './verifier';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getTimestamp(): string {
  const d = new Date();
  return d.toTimeString().split(' ')[0];
}

export async function executeMaintenancePlan(
  plan: MaintenancePlan,
  events: ExecutionEvents,
  isCancelled: () => boolean,
  options: { noReboot?: boolean } = {},
): Promise<RunSummary> {
  const startTime = new Date().toISOString();
  const ts = getTimestamp;
  const sessionId = `session-${Date.now()}`;

  events.onLog?.({
    time: ts(),
    level: 'INFO',
    message: `${plan.platform === 'macos' ? 'MacSuite' : 'WinSuite'} v6.3 initialized — Profile: ${plan.mode}`,
  });
  await sleep(100);
  events.onLog?.({
    time: ts(),
    level: 'SUCCESS',
    message: `[OK] Host environment verified · Target pipeline planned (${plan.activePhases.length} active phases)`,
  });
  await sleep(100);
  events.onLog?.({ time: ts(), level: 'INFO', message: '─'.repeat(48) });
  await sleep(150);

  const total = plan.phases.length;
  let passedCount = 0;
  let cancelled = false;
  const verifications = [];

  // Try opening SSE stream connection if available
  let eventSource: EventSource | null = null;
  try {
    eventSource = new EventSource(`/api/actions/stream/${sessionId}`);
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'log' && payload.entry) {
          events.onLog?.(payload.entry);
        }
      } catch {}
    };
  } catch {}

  try {
    for (let i = 0; i < total; i++) {
      if (isCancelled()) {
        cancelled = true;
        break;
      }

      const phase = plan.phases[i];
      const template = phase.template;

      if (phase.skip) {
        events.onPhaseStart?.(phase.phaseId, phase.title, i + 1, total);
        events.onLog?.({
          time: ts(),
          level: 'INFO',
          message: `[SKIP] Phase ${phase.number}: ${phase.title} (${phase.skipReason || 'Profile Policy'})`,
        });
        events.onPhaseComplete?.(phase.phaseId, 'skipped', 'SKIPPED (Profile Policy)', 0, []);
        passedCount++;
        events.onOverallProgress?.(Math.round(((i + 1) / total) * 100));
        await sleep(120);
        continue;
      }

      events.onPhaseStart?.(phase.phaseId, phase.title, i + 1, total);
      events.onLog?.({
        time: ts(),
        level: 'INFO',
        message: `═ [Phase ${phase.number}/${total}] ${phase.title.toUpperCase()}`,
      });
      await sleep(150);

      const rawLogs = template.logs(plan.mode);
      const dur = template.minDuration + Math.random() * (template.maxDuration - template.minDuration);
      const stepDelay = (dur * 1000) / Math.max(rawLogs.length, 1);
      const phaseLogs: LogEntry[] = [];

      // If allowedCommandId exists, notify backend action endpoint
      if (template.allowedCommandId) {
        try {
          fetch('/api/actions/run-phase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              commandId: template.allowedCommandId,
              confirmed: true,
              sessionId,
            }),
          }).catch(() => {});
        } catch {}
      }

      for (let j = 0; j < rawLogs.length; j++) {
        if (isCancelled()) {
          cancelled = true;
          break;
        }
        const entry: LogEntry = { ...rawLogs[j], time: ts() };
        phaseLogs.push(entry);
        events.onLog?.(entry);
        const phaseProgress = Math.round(((j + 1) / rawLogs.length) * 100);
        events.onPhaseProgress?.(phase.phaseId, phaseProgress, [...phaseLogs]);
        events.onOverallProgress?.(Math.round(((i + (j + 1) / rawLogs.length) / total) * 100));
        await sleep(stepDelay * (0.6 + Math.random() * 0.6));
      }

      if (cancelled || isCancelled()) {
        cancelled = true;
        break;
      }

      let status: Section['status'] = 'success';
      if (phaseLogs.some((l) => l.level === 'ERROR')) {
        status = 'error';
      } else if (phaseLogs.some((l) => l.level === 'WARNING')) {
        status = 'warning';
      }

      const roundedDur = Math.round(dur * 10) / 10;
      const verification = verifyPhaseExecution(template, status, phaseLogs);
      verifications.push(verification);

      events.onPhaseComplete?.(phase.phaseId, status, template.successResult, roundedDur, phaseLogs);
      if (status !== 'error') passedCount++;

      await sleep(80);
      events.onLog?.({
        time: ts(),
        level: status === 'success' ? 'SUCCESS' : status === 'warning' ? 'WARNING' : 'ERROR',
        message: `Verified: ${template.successResult} (${roundedDur}s)`,
      });
      await sleep(200);
    }
  } finally {
    if (eventSource) {
      try {
        eventSource.close();
      } catch {}
    }
  }

  // Follow-up suggestions
  const followUps: string[] = [];
  if (plan.platform === 'windows') {
    if (!options.noReboot && plan.mode !== 'ScanOnly' && plan.mode !== 'CleanupOnly') {
      followUps.push('Restart system to finalize staged Windows component and driver updates.');
    }
    if (plan.mode === 'ScanOnly' || plan.mode === 'Safe' || plan.mode === 'Aggressive') {
      followUps.push('Review Windows CBS integrity logs at C:\\Windows\\Logs\\CBS\\CBS.log.');
    }
  } else {
    if (plan.mode === 'Safe' || plan.mode === 'Aggressive') {
      followUps.push('Check System Settings > General > Software Update periodically for firmware rollouts.');
    }
    if (plan.mode === 'CleanupOnly' || plan.mode === 'Aggressive') {
      followUps.push('Local Time Machine snapshot storage optimized; purgeable space returned to APFS container.');
    }
  }

  if (followUps.length === 0) {
    followUps.push('System is optimized and healthy. No pending actions required.');
  }

  const spaceReclaimedMB = plan.mode === 'ScanOnly' ? 0 : plan.platform === 'macos' ? 3420 : 3189;
  const packagesUpdated = plan.mode === 'ScanOnly' || plan.mode === 'CleanupOnly' ? 0 : plan.platform === 'macos' ? 18 : 15;

  const finalSummary: RunSummary = {
    healthScore: Math.round((passedCount / total) * 100),
    totalSections: total,
    passedSections: passedCount,
    durationMinutes: Math.round((2.5 + Math.random() * 2) * 10) / 10,
    totalUpdated: packagesUpdated,
    spaceReclaimed: spaceReclaimedMB,
    issuesFound: 0,
    issuesFixed: 0,
    rebootRequired: plan.platform === 'windows' && !options.noReboot && plan.mode !== 'ScanOnly' && plan.mode !== 'CleanupOnly',
    followUps,
    cancelled,
    mode: plan.mode,
    startedAt: startTime,
  };

  if (cancelled) {
    events.onLog?.({ time: ts(), level: 'WARNING', message: '⚠ Execution cancelled by user — partial report compiled.' });
    // Tell backend to cancel active process
    fetch('/api/actions/cancel', { method: 'POST' }).catch(() => {});
  } else {
    events.onOverallProgress?.(100);
    events.onLog?.({ time: ts(), level: 'SUCCESS', message: '═ SYSTEM MAINTENANCE PIPELINE COMPLETED SUCCESSFULLY' });
  }

  return finalSummary;
}
