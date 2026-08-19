/**
 * WinSuite & MacSuite v10.0 — Idempotency, Action Locks, Cooldowns & Rate Limits
 *
 * Protects destructive/mutative endpoints from UI double-clicks, retry storms and
 * accidental repeated execution. `process.killPort` must not run 20 times because
 * a component re-rendered.
 */

import crypto from 'crypto';

/** Per-action policy. cooldownMs = minimum spacing; windowMs/maxInWindow = rate limit. */
export const ACTION_POLICIES = {
  'process.killPort':      { cooldownMs: 3000,  windowMs: 60_000, maxInWindow: 10, lock: 'process',  idempotent: true,  destructive: true },
  'network.flushDNS':      { cooldownMs: 5000,  windowMs: 60_000, maxInWindow: 6,  lock: 'network',  idempotent: true,  destructive: false },
  'storage.purgeRam':      { cooldownMs: 15_000,windowMs: 300_000,maxInWindow: 4,  lock: 'memory',   idempotent: true,  destructive: false },
  'storage.cleanXcode':    { cooldownMs: 10_000,windowMs: 300_000,maxInWindow: 3,  lock: 'storage',  idempotent: true,  destructive: true },
  'storage.cleanDocker':   { cooldownMs: 10_000,windowMs: 300_000,maxInWindow: 3,  lock: 'storage',  idempotent: true,  destructive: true },
  'storage.executeCleanup':{ cooldownMs: 10_000,windowMs: 300_000,maxInWindow: 3,  lock: 'storage',  idempotent: true,  destructive: true },
  'cleanup.restore':       { cooldownMs: 2000,  windowMs: 60_000, maxInWindow: 10, lock: 'storage',  idempotent: true,  destructive: false },
  'experiment.run':        { cooldownMs: 5000,  windowMs: 300_000,maxInWindow: 12, lock: 'experiment', idempotent: false, destructive: false },
  'reproduce.start':       { cooldownMs: 3000,  windowMs: 300_000,maxInWindow: 10, lock: 'reproduce', idempotent: false, destructive: false },
  'support.bundle':        { cooldownMs: 5000,  windowMs: 300_000,maxInWindow: 6,  lock: null,       idempotent: true,  destructive: false },
  default:                 { cooldownMs: 1000,  windowMs: 60_000, maxInWindow: 30, lock: null,       idempotent: false, destructive: false },
};

export function policyFor(actionId) {
  return ACTION_POLICIES[actionId] || ACTION_POLICIES.default;
}

class RequestController {
  constructor() {
    this.idempotencyCache = new Map(); // key -> { operationId, response, at, actionId }
    this.locks = new Map();            // lockName -> { operationId, actionId, at }
    this.lastRun = new Map();          // actionId -> timestamp
    this.window = new Map();           // actionId -> timestamps[]
    this.idempotencyTtlMs = 10 * 60 * 1000;
  }

  /** Deterministic key when the client did not supply one. */
  deriveKey(actionId, params = {}) {
    const canonical = JSON.stringify({ actionId, params: sortObject(params) });
    return `auto_${crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 16)}`;
  }

  checkIdempotency(key) {
    if (!key) return null;
    const hit = this.idempotencyCache.get(key);
    if (!hit) return null;
    if (Date.now() - hit.at > this.idempotencyTtlMs) {
      this.idempotencyCache.delete(key);
      return null;
    }
    return hit;
  }

  recordIdempotency(key, operationId, response, actionId) {
    if (!key) return;
    this.idempotencyCache.set(key, { operationId, response, at: Date.now(), actionId });
  }

  checkCooldown(actionId) {
    const p = policyFor(actionId);
    const last = this.lastRun.get(actionId);
    if (!last) return { ok: true };
    const elapsed = Date.now() - last;
    if (elapsed < p.cooldownMs) {
      return {
        ok: false,
        retryAfterMs: p.cooldownMs - elapsed,
        reason: `Action "${actionId}" is cooling down. Retry in ${Math.ceil((p.cooldownMs - elapsed) / 1000)}s.`,
      };
    }
    return { ok: true };
  }

  checkRateLimit(actionId) {
    const p = policyFor(actionId);
    const now = Date.now();
    const hits = (this.window.get(actionId) || []).filter((t) => now - t < p.windowMs);
    this.window.set(actionId, hits);
    if (hits.length >= p.maxInWindow) {
      const retryAfterMs = p.windowMs - (now - hits[0]);
      return {
        ok: false,
        retryAfterMs,
        reason: `Rate limit exceeded for "${actionId}": ${p.maxInWindow} executions per ${Math.round(p.windowMs / 1000)}s.`,
      };
    }
    return { ok: true };
  }

  acquireLock(actionId, operationId) {
    const p = policyFor(actionId);
    if (!p.lock) return { ok: true, lock: null };
    const held = this.locks.get(p.lock);
    if (held) {
      return {
        ok: false,
        reason: `Resource lock "${p.lock}" is held by operation ${held.operationId} (${held.actionId}).`,
        heldBy: held,
      };
    }
    this.locks.set(p.lock, { operationId, actionId, at: Date.now() });
    return { ok: true, lock: p.lock };
  }

  releaseLock(lockName) {
    if (lockName) this.locks.delete(lockName);
  }

  markExecuted(actionId) {
    const now = Date.now();
    this.lastRun.set(actionId, now);
    const hits = this.window.get(actionId) || [];
    hits.push(now);
    this.window.set(actionId, hits);
  }

  /** Full admission control decision for one action request. */
  admit(actionId, params, providedKey) {
    const key = providedKey || (policyFor(actionId).idempotent ? this.deriveKey(actionId, params) : null);

    const replay = this.checkIdempotency(key);
    if (replay) {
      return { decision: 'DEDUPLICATED', idempotencyKey: key, replay };
    }
    const rate = this.checkRateLimit(actionId);
    if (!rate.ok) return { decision: 'RATE_LIMITED', idempotencyKey: key, ...rate };

    const cool = this.checkCooldown(actionId);
    if (!cool.ok) return { decision: 'COOLDOWN', idempotencyKey: key, ...cool };

    return { decision: 'ADMIT', idempotencyKey: key };
  }

  snapshot() {
    return {
      activeLocks: Array.from(this.locks.entries()).map(([name, v]) => ({ lock: name, ...v })),
      idempotencyEntries: this.idempotencyCache.size,
      policies: ACTION_POLICIES,
    };
  }

  reset() {
    this.idempotencyCache.clear();
    this.locks.clear();
    this.lastRun.clear();
    this.window.clear();
  }
}

function sortObject(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  return Object.keys(obj).sort().reduce((acc, k) => { acc[k] = sortObject(obj[k]); return acc; }, {});
}

export const requestController = new RequestController();
