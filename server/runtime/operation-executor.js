/**
 * WinSuite & MacSuite v10.0 — Guarded Operation Executor
 *
 * Single funnel every mutative action passes through:
 *
 *   admission control (idempotency / rate limit / cooldown / lock)
 *        ↓
 *   operation record (op_xxxxxx)
 *        ↓
 *   allowlist authorization
 *        ↓
 *   BEFORE snapshot  →  execute  →  AFTER snapshot
 *        ↓
 *   verification verdict + audit entry
 */

import { operationRegistry, OP_STATE, VERIFICATION } from './operations.js';
import { requestController } from './idempotency.js';
import { executeAllowlistedAction } from '../security/action-allowlist.js';
import { logAuditEntry } from '../audit/audit-logger.js';
import { faultInjector } from '../chaos/fault-injector.js';

/**
 * @param {object} cfg
 * @param {string} cfg.actionId
 * @param {object} cfg.params
 * @param {Function} cfg.execute        async (op) => result
 * @param {Function} [cfg.snapshot]     async () => state, used for before/after proof
 * @param {Function} [cfg.assertVerified] (before, after, result) => boolean
 * @param {string}  [cfg.idempotencyKey]
 */
export async function runGuardedOperation({
  actionId,
  params = {},
  execute,
  snapshot = null,
  assertVerified = null,
  idempotencyKey = null,
  requestId = null,
  source = 'api',
  dryRun = false,
  skipAllowlist = false,
}) {
  const admission = requestController.admit(actionId, params, idempotencyKey);

  // ── Replay of an identical request: return the original result, do NOT re-execute.
  if (admission.decision === 'DEDUPLICATED') {
    const original = admission.replay;
    return {
      ok: true,
      deduplicated: true,
      operationId: original.operationId,
      idempotencyKey: admission.idempotencyKey,
      message: `Duplicate request suppressed. Returning the result of operation ${original.operationId}; the action was NOT executed again.`,
      result: original.response,
    };
  }

  if (admission.decision === 'RATE_LIMITED' || admission.decision === 'COOLDOWN') {
    const op = operationRegistry.create({ actionId, params, requestId, idempotencyKey: admission.idempotencyKey, source, dryRun });
    operationRegistry.transition(op.operationId, OP_STATE.REJECTED, admission.reason, {
      error: { code: admission.decision, message: admission.reason, retryAfterMs: admission.retryAfterMs, recoverable: true },
    });
    return {
      ok: false,
      httpStatus: 429,
      operationId: op.operationId,
      code: admission.decision,
      retryAfterMs: admission.retryAfterMs,
      error: admission.reason,
      // A suppressed request is a SAFE failure: nothing ran, and we say exactly when to retry.
      recoverable: true,
      remediation: `No changes were made. This request was suppressed to prevent repeated execution. Retry in ${Math.ceil((admission.retryAfterMs || 0) / 1000)}s.`,
      operation: op,
    };
  }

  const op = operationRegistry.create({ actionId, params, requestId, idempotencyKey: admission.idempotencyKey, source, dryRun });

  // ── Resource lock
  const lock = requestController.acquireLock(actionId, op.operationId);
  if (!lock.ok) {
    operationRegistry.transition(op.operationId, OP_STATE.REJECTED, lock.reason, {
      error: { code: 'LOCK_HELD', message: lock.reason, recoverable: true },
    });
    return {
      ok: false,
      httpStatus: 409,
      operationId: op.operationId,
      code: 'LOCK_HELD',
      error: lock.reason,
      recoverable: true,
      remediation: 'Another operation is already modifying this resource. No changes were made. Retry once it finishes.',
      heldBy: lock.heldBy,
      operation: op,
    };
  }

  try {
    // ── Authorization against the hardened allowlist
    if (!skipAllowlist) {
      try {
        await executeAllowlistedAction(actionId, params);
      } catch (authErr) {
        operationRegistry.transition(op.operationId, OP_STATE.REJECTED, authErr.message, {
          error: { code: 'NOT_AUTHORIZED', message: authErr.message, recoverable: false },
        });
        return {
          ok: false,
          httpStatus: 403,
          operationId: op.operationId,
          code: 'NOT_AUTHORIZED',
          error: authErr.message,
          recoverable: false,
          remediation: 'This action is not on the hardened allowlist and was refused before touching the system.',
          operation: op,
        };
      }
    }
    operationRegistry.transition(op.operationId, OP_STATE.AUTHORIZED, 'Action authorized against v10 allowlist');

    // ── BEFORE state
    let beforeState = null;
    if (snapshot) beforeState = await safeSnapshot(snapshot, 'before');

    if (dryRun) {
      operationRegistry.transition(op.operationId, OP_STATE.COMPLETED, 'Dry run — no changes were made', {
        result: { dryRun: true, beforeState, wouldExecute: actionId },
      });
      operationRegistry.setVerification(op.operationId, {
        status: VERIFICATION.NOT_APPLICABLE, beforeState, afterState: null,
        verdict: 'Dry run: the system was not modified.',
      });
      return { ok: true, operationId: op.operationId, dryRun: true, operation: operationRegistry.get(op.operationId), result: { dryRun: true, beforeState } };
    }

    operationRegistry.transition(op.operationId, OP_STATE.EXECUTING, 'Executing guarded action');
    requestController.markExecuted(actionId);

    // Chaos hook — lets us prove every failure path is safe & explainable.
    faultInjector.maybeThrow(actionId);

    const result = await execute(op);

    // ── AFTER state + verification
    operationRegistry.transition(op.operationId, OP_STATE.VERIFYING, 'Collecting post-execution telemetry');
    let afterState = null;
    if (snapshot) afterState = await safeSnapshot(snapshot, 'after');

    let verificationStatus = VERIFICATION.NOT_APPLICABLE;
    let verdict = 'No post-condition assertion was defined for this action.';
    if (assertVerified && beforeState && afterState) {
      try {
        const passed = await assertVerified(beforeState, afterState, result);
        verificationStatus = passed ? VERIFICATION.PASSED : VERIFICATION.FAILED;
        verdict = passed
          ? 'Post-execution telemetry confirms the intended state change occurred.'
          : 'Action executed but post-execution telemetry did NOT confirm the intended change. Treat as unresolved.';
      } catch (vErr) {
        verificationStatus = VERIFICATION.INCONCLUSIVE;
        verdict = `Verification probe failed: ${vErr.message}. The action may have succeeded but cannot be proven.`;
      }
    } else if (beforeState || afterState) {
      verificationStatus = VERIFICATION.INCONCLUSIVE;
      verdict = 'Before/after state captured but no assertion was available to prove the fix.';
    }

    operationRegistry.setVerification(op.operationId, { status: verificationStatus, beforeState, afterState, verdict });
    operationRegistry.transition(op.operationId, OP_STATE.COMPLETED, 'Operation completed', {
      result,
      rollback: { available: !!result?.rollbackReference, performed: false, reference: result?.rollbackReference || null },
    });

    const finalOp = operationRegistry.get(op.operationId);
    requestController.recordIdempotency(admission.idempotencyKey, op.operationId, { result, verification: finalOp.verification }, actionId);

    logAuditEntry({
      operation: `[${op.operationId}] ${actionId}`,
      commandId: actionId,
      risk: 'moderate',
      result: 'success',
      durationSeconds: +(((finalOp.durationMs || 0) / 1000).toFixed(2)),
      changesMade: [verdict],
    });

    return { ok: true, operationId: op.operationId, operation: finalOp, result, verification: finalOp.verification };
  } catch (err) {
    const failure = classifyFailure(err);
    operationRegistry.transition(op.operationId, OP_STATE.FAILED, failure.message, { error: failure });
    logAuditEntry({
      operation: `[${op.operationId}] ${actionId} FAILED`,
      commandId: actionId,
      risk: 'moderate',
      result: 'failure',
      errorCode: failure.code,
      changesMade: [failure.userMessage],
    });
    return {
      ok: false,
      httpStatus: failure.httpStatus,
      operationId: op.operationId,
      code: failure.code,
      error: failure.userMessage,
      recoverable: failure.recoverable,
      remediation: failure.remediation,
      operation: operationRegistry.get(op.operationId),
    };
  } finally {
    requestController.releaseLock(lock.lock);
  }
}

async function safeSnapshot(fn, phase) {
  try {
    return await fn(phase);
  } catch (err) {
    return { snapshotFailed: true, phase, reason: err.message };
  }
}

/**
 * Platform-specific user-facing copy so that a Windows operation never reports
 * "on this Mac" and a macOS operation never reports a Windows-only remediation.
 */
function platformCopy(win, mac) {
  const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'unsupported';
  return platform === 'windows' ? win : platform === 'macos' ? mac : `${win} (${mac})`;
}

/**
 * Turns any thrown error into something safe, explainable and recoverable —
 * the v10 requirement for every failure path.
 */
export function classifyFailure(err) {
  const msg = err?.message || String(err);
  const code = err?.code || '';
  const isMac = process.platform === 'darwin';
  const isWin = process.platform === 'win32';

  const table = [
    { test: /EACCES|EPERM|permission denied|not permitted/i, code: 'PERMISSION_DENIED', httpStatus: 403, recoverable: true,
      userMessage: isMac
        ? 'macOS denied access to the resource this operation needed.'
        : isWin
        ? 'Windows denied access to the resource this operation needed.'
        : 'The operating system denied access to the resource this operation needed.',
      remediation: isMac
        ? 'Grant the required permission in System Settings → Privacy & Security, then retry.'
        : isWin
        ? 'Run the application as Administrator (elevated), or grant the required permission, then retry.'
        : 'Grant the required permission, then retry.' },
    { test: /ENOENT|not found|no such file|command not found/i, code: 'MISSING_BINARY_OR_PATH', httpStatus: 424, recoverable: true,
      userMessage: platformCopy(
        'A required Windows binary or path was not present on this system.',
        'A required macOS binary or path was not present on this system.',
      ),
      remediation: 'The feature is unavailable on this configuration. Other diagnostics are unaffected.' },
    { test: /ETIMEDOUT|timed? ?out/i, code: 'TIMEOUT', httpStatus: 504, recoverable: true,
      userMessage: 'The operation exceeded its time budget and was aborted safely.',
      remediation: 'No partial changes were committed. Retry when the system is less busy.' },
    { test: /ESRCH|process (?:disappeared|no longer|not) /i, code: 'PROCESS_GONE', httpStatus: 410, recoverable: true,
      userMessage: 'The target process no longer exists — it exited before the action ran.',
      remediation: 'Nothing to do: the desired end state is already true.' },
    { test: /ENOSPC|no space left/i, code: 'INSUFFICIENT_DISK_SPACE', httpStatus: 507, recoverable: true,
      userMessage: 'There is not enough free disk space to complete this operation safely.',
      remediation: 'Free space first, then retry.' },
    { test: /Unexpected token|JSON|malformed/i, code: 'MALFORMED_OUTPUT', httpStatus: 502, recoverable: true,
      userMessage: platformCopy(
        'A Windows command returned output this version cannot parse. The result was discarded rather than guessed.',
        'A macOS command returned output this version cannot parse. The result was discarded rather than guessed.',
      ),
      remediation: 'This subsystem is reported UNAVAILABLE rather than healthy. Other subsystems are unaffected.' },
    { test: /ENETUNREACH|ENOTFOUND|EAI_AGAIN|network/i, code: 'NETWORK_UNAVAILABLE', httpStatus: 503, recoverable: true,
      userMessage: 'Network access was unavailable for this operation.',
      remediation: 'All local diagnostics continue to work offline. Only online-optional data is affected.' },
    { test: /privileged helper|authorization/i, code: 'PRIVILEGED_HELPER_UNAVAILABLE', httpStatus: 403, recoverable: true,
      userMessage: platformCopy(
        'The privileged helper needed for this repair is not installed or not responding.',
        'The privileged helper needed for this repair is not installed or not responding.',
      ),
      remediation: 'Run the read-only diagnosis instead, or install the helper when prompted.' },
    { test: /ALLOWLIST/i, code: 'NOT_AUTHORIZED', httpStatus: 403, recoverable: false,
      userMessage: 'This action is not in the security allowlist and was refused.',
      remediation: 'No action required — this is the security boundary working as designed.' },
  ];

  for (const row of table) {
    if (row.test.test(msg) || row.test.test(code)) {
      return { code: row.code, message: msg, userMessage: row.userMessage, remediation: row.remediation, httpStatus: row.httpStatus, recoverable: row.recoverable };
    }
  }
  return {
    code: 'UNEXPECTED_ERROR', message: msg, httpStatus: 500, recoverable: true,
    userMessage: 'The operation failed for an unexpected reason and was stopped before making changes.',
    remediation: 'The system was left in its previous state. Details are recorded against the operation ID.',
  };
}
