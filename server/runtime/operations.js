/**
 * WinSuite & MacSuite v10.0 — Operation Registry
 *
 * Every mutative action gets an Operation ID and a full lifecycle record:
 *   requested → authorized → executing → verifying → completed | failed | rejected
 *
 * This is what makes "Operation completed successfully" a provable statement
 * rather than a UI toast, and it makes debugging the app itself tractable.
 */

import crypto from 'crypto';

export const OP_STATE = {
  REQUESTED: 'REQUESTED',
  AUTHORIZED: 'AUTHORIZED',
  EXECUTING: 'EXECUTING',
  VERIFYING: 'VERIFYING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
  DEDUPLICATED: 'DEDUPLICATED',
  ROLLED_BACK: 'ROLLED_BACK',
};

export const VERIFICATION = {
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  INCONCLUSIVE: 'INCONCLUSIVE',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
};

const MAX_OPERATIONS = 500;

class OperationRegistry {
  constructor() {
    this.operations = new Map();
    this.order = [];
  }

  newOperationId() {
    return `op_${crypto.randomBytes(3).toString('hex')}`;
  }

  create({ actionId, params = {}, requestId = null, idempotencyKey = null, source = 'ui', dryRun = false }) {
    const id = this.newOperationId();
    const now = new Date().toISOString();
    const op = {
      operationId: id,
      actionId,
      params: redactParams(params),
      requestId: requestId || `req_${crypto.randomBytes(4).toString('hex')}`,
      idempotencyKey,
      source,
      dryRun,
      state: OP_STATE.REQUESTED,
      timeline: [{ state: OP_STATE.REQUESTED, at: now, note: 'Operation requested by client' }],
      requestedAt: now,
      authorizedAt: null,
      startedAt: null,
      completedAt: null,
      durationMs: null,
      verification: { status: VERIFICATION.NOT_APPLICABLE, beforeState: null, afterState: null, verdict: null },
      result: null,
      error: null,
      rollback: { available: false, performed: false, reference: null },
    };
    this.operations.set(id, op);
    this.order.unshift(id);
    if (this.order.length > MAX_OPERATIONS) {
      const dropped = this.order.pop();
      this.operations.delete(dropped);
    }
    return op;
  }

  transition(operationId, state, note = null, patch = {}) {
    const op = this.operations.get(operationId);
    if (!op) return null;
    const at = new Date().toISOString();
    op.state = state;
    op.timeline.push({ state, at, note });
    if (state === OP_STATE.AUTHORIZED) op.authorizedAt = at;
    if (state === OP_STATE.EXECUTING) op.startedAt = at;
    if ([OP_STATE.COMPLETED, OP_STATE.FAILED, OP_STATE.REJECTED, OP_STATE.ROLLED_BACK].includes(state)) {
      op.completedAt = at;
      op.durationMs = Date.parse(at) - Date.parse(op.requestedAt);
    }
    Object.assign(op, patch);
    return op;
  }

  setVerification(operationId, { status, beforeState = null, afterState = null, verdict = null }) {
    const op = this.operations.get(operationId);
    if (!op) return null;
    op.verification = { status, beforeState, afterState, verdict, verifiedAt: new Date().toISOString() };
    return op;
  }

  get(operationId) { return this.operations.get(operationId) || null; }

  list({ limit = 50, actionId = null, state = null } = {}) {
    return this.order
      .map((id) => this.operations.get(id))
      .filter(Boolean)
      .filter((op) => (actionId ? op.actionId === actionId : true))
      .filter((op) => (state ? op.state === state : true))
      .slice(0, limit);
  }

  findByIdempotencyKey(key) {
    if (!key) return null;
    for (const id of this.order) {
      const op = this.operations.get(id);
      if (op?.idempotencyKey === key) return op;
    }
    return null;
  }

  stats() {
    const ops = this.list({ limit: MAX_OPERATIONS });
    const byState = {};
    for (const o of ops) byState[o.state] = (byState[o.state] || 0) + 1;
    const completed = ops.filter((o) => o.state === OP_STATE.COMPLETED);
    const verified = completed.filter((o) => o.verification.status === VERIFICATION.PASSED);
    return {
      total: ops.length,
      byState,
      verifiedPct: completed.length ? Math.round((verified.length / completed.length) * 100) : null,
      avgDurationMs: completed.length
        ? Math.round(completed.reduce((s, o) => s + (o.durationMs || 0), 0) / completed.length)
        : null,
    };
  }
}

/** Never persist secrets that arrive as action params. */
function redactParams(params) {
  const out = {};
  for (const [k, v] of Object.entries(params || {})) {
    if (/token|secret|password|key|auth/i.test(k)) out[k] = '[REDACTED]';
    else out[k] = v;
  }
  return out;
}

export const operationRegistry = new OperationRegistry();
