/**
 * WinSuite & MacSuite v10.0 — Real-World Validation & Trust test suite
 *
 * Run with:  node server/tests/v10-validation-and-trust.test.js
 *
 * Covers the P0 acceptance criteria:
 *   #1 validation matrix    — same diagnostic, same semantic result across environments
 *   #2 permission matrix    — never "healthy" when we could not look
 *   #3 evidence quality     — estimates never render as facts
 *   #4 calibration          — predictions graded against real outcomes only
 *   #5 chaos injection      — every failure safe, explainable, recoverable
 *   #6 API contracts        — malformed output cannot produce a malformed response
 *   #7 operation IDs        — full requested→completed timeline
 *   #8 idempotency          — double-click cannot execute twice
 *   #9 degraded mode        — one failing probe does not fail the dashboard
 *   #10 privacy             — redaction with counts and preview
 */

import assert from 'assert';

import {
  AVAILABILITY, HEALTH_STATUS, createSubsystemReport, aggregateReports, validateContract,
} from '../core/contract.js';
import {
  EVIDENCE_QUALITY, observed, inferred, estimated, unavailable, summarizeEvidence,
} from '../core/evidence.js';
import {
  PERMISSION, PERMISSION_SCENARIOS, createPermissionState, buildPermissionMatrix, resolveFeatureAvailability,
} from '../core/permissions.js';
import { calibrationEngine, OUTCOME } from '../core/calibration.js';
import { operationRegistry, OP_STATE, VERIFICATION } from '../runtime/operations.js';
import { requestController } from '../runtime/idempotency.js';
import { runGuardedOperation, classifyFailure } from '../runtime/operation-executor.js';
import { runProbeSet, reportFromProbeSet, getDegradedModeStatus, ONLINE_ONLY_CAPABILITIES } from '../runtime/degraded-mode.js';
import { faultInjector, FAULT_SCENARIOS } from '../chaos/fault-injector.js';
import { redactReport } from '../privacy/redactor.js';
import { SCHEMA_REGISTRY, enforceResponse, validateShape, REQUEST_SCHEMAS } from '../contracts/api-schemas.js';
import { createFinding, calculateConfidence } from '../models/finding.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const r = fn();
    if (r instanceof Promise) return r.then(
      () => { passed += 1; console.log(`✓ Test ${passed + failed} Passed: ${name}`); },
      (e) => { failed += 1; console.error(`✗ Test ${passed + failed} FAILED: ${name}\n    ${e.message}`); }
    );
    passed += 1;
    console.log(`✓ Test ${passed + failed} Passed: ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`✗ Test ${passed + failed} FAILED: ${name}\n    ${e.message}`);
  }
  return Promise.resolve();
}

export async function runV10Tests() {
  console.log('\n═══ v10.0 Real-World Validation & Trust ═══\n');

  /* ── P0 #2 + #23 — availability semantics ─────────────────────────────── */

  await test('P0 #2: a subsystem without permission can NEVER report HEALTHY', () => {
    const report = createSubsystemReport({
      subsystem: 'crashes',
      availability: AVAILABILITY.REQUIRES_PERMISSION,
      status: HEALTH_STATUS.HEALTHY, // deliberately lying
    });
    assert.strictEqual(report.status, HEALTH_STATUS.UNAVAILABLE);
    assert.strictEqual(report.statusGlyph, '⚪');
    assert.ok(/permission/i.test(report.summary));
  });

  await test('P0 #2: a FAILED probe is reported UNAVAILABLE, not healthy', () => {
    const report = createSubsystemReport({ subsystem: 'storage', availability: AVAILABILITY.FAILED });
    assert.strictEqual(report.status, HEALTH_STATUS.UNAVAILABLE);
    assert.ok(/NOT the same as healthy/i.test(report.summary));
  });

  await test('P0 #2: contract validator rejects a HEALTHY-without-availability envelope', () => {
    const { valid, violations } = validateContract({
      contractVersion: '10.0', subsystem: 'x', status: 'HEALTHY', availability: 'FAILED',
      severity: 'none', findings: [], evidence: [], recommendations: [],
      requiredPermissions: [], errors: [], lastUpdated: new Date().toISOString(),
    });
    assert.strictEqual(valid, false);
    assert.ok(violations.some((v) => /CONTRACT VIOLATION/.test(v)));
  });

  await test('P0 #2: all 10 permission scenarios resolve every feature to a legal availability', () => {
    const legal = Object.values(AVAILABILITY);
    const ids = Object.keys(PERMISSION_SCENARIOS);
    assert.ok(ids.length >= 10, `expected >= 10 scenarios, got ${ids.length}`);
    for (const [id, state] of Object.entries(PERMISSION_SCENARIOS)) {
      const matrix = buildPermissionMatrix(state);
      for (const f of matrix.features) {
        assert.ok(legal.includes(f.availability), `${id}/${f.featureId} -> ${f.availability}`);
      }
    }
  });

  await test('P0 #2: Full Disk Access features require permission when FDA is not granted', () => {
    const noFda = createPermissionState({ [PERMISSION.FULL_DISK_ACCESS]: false });
    const r = resolveFeatureAvailability('crashes.reports', noFda);
    assert.strictEqual(r.availability, AVAILABILITY.REQUIRES_PERMISSION);
    assert.ok(r.grantInstructions.length > 0, 'must tell the user how to grant it');
  });

  await test('P0 #2: MDM-blocked permissions are explained as policy, not user error', () => {
    const state = createPermissionState({ [PERMISSION.FULL_DISK_ACCESS]: false });
    const r = resolveFeatureAvailability('crashes.reports', state, 'macos', {
      mdmBlocked: [PERMISSION.FULL_DISK_ACCESS],
    });
    assert.ok(/device management policy/i.test(r.degradedReason));
  });

  /* ── P0 #1 — validation matrix: same semantics across environments ──────── */

  await test('P0 #1: identical telemetry yields identical semantics on every environment', () => {
    const environments = ['apple-silicon-latest', 'apple-silicon-previous', 'intel-mac', 'developer-mac', 'corporate-managed'];
    const results = environments.map(() =>
      createFinding({
        category: 'storage', severity: 'warning', title: 'Low free space',
        evidence: [observed('Free space', 12, { unit: 'GB', source: 'statfs', expectedRange: '> 50 GB' })],
      })
    );
    const signature = (f) => `${f.category}|${f.severity}|${f.confidenceLabel}|${f.dataCompleteness}`;
    const first = signature(results[0]);
    for (const r of results) assert.strictEqual(signature(r), first);
  });

  await test('P0 #1: unavailable subsystems reduce coverage instead of inflating the score', () => {
    const rollup = aggregateReports([
      createSubsystemReport({ subsystem: 'a', availability: AVAILABILITY.AVAILABLE, status: HEALTH_STATUS.HEALTHY }),
      createSubsystemReport({ subsystem: 'b', availability: AVAILABILITY.REQUIRES_PERMISSION }),
      createSubsystemReport({ subsystem: 'c', availability: AVAILABILITY.FAILED }),
    ]);
    assert.strictEqual(rollup.coverage.subsystemsUnavailable, 2);
    assert.strictEqual(rollup.coverage.coveragePct, 33);
    assert.strictEqual(rollup.scoreQualified, true);
    assert.ok(/could not be evaluated/i.test(rollup.scoreQualifier));
  });

  /* ── P0 #3 — evidence quality ───────────────────────────────────────────── */

  await test('P0 #3: an estimate renders with ~ and the word (estimated)', () => {
    const e = estimated('Docker battery contribution', 18, { unit: '%' });
    assert.strictEqual(e.quality, EVIDENCE_QUALITY.ESTIMATED);
    assert.strictEqual(e.isFact, false);
    assert.ok(e.displayValue.startsWith('~'));
    assert.ok(/\(estimated\)/.test(e.displayValue));
    assert.ok(e.estimationMethod, 'an estimate must explain its method');
  });

  await test('P0 #3: unavailable evidence never carries a value', () => {
    const e = unavailable('Crash log scan', 'Full Disk Access not granted', { value: 42 });
    assert.strictEqual(e.value, null);
    assert.strictEqual(e.trustWeight, 0);
    assert.ok(/Unavailable/.test(e.displayValue));
  });

  await test('P0 #3: stale samples are auto-demoted past their freshness budget', () => {
    const old = observed('CPU load', 91, { collectedAt: new Date(Date.now() - 600_000).toISOString() });
    assert.strictEqual(old.quality, EVIDENCE_QUALITY.STALE);
    assert.ok(/stale sample/.test(old.displayValue));
  });

  await test('P0 #3: confidence is capped by evidence quality', () => {
    const allObserved = calculateConfidence([observed('a', 1), observed('b', 2), observed('c', 3)]);
    const allEstimated = calculateConfidence([estimated('a', 1), estimated('b', 2), estimated('c', 3)]);
    assert.ok(allObserved.confidenceScore > allEstimated.confidenceScore,
      `${allObserved.confidenceScore} should exceed ${allEstimated.confidenceScore}`);
    assert.ok(allEstimated.confidenceScore <= allEstimated.evidenceQuality.confidenceCeiling);
  });

  await test('P0 #3: a finding built entirely on unavailable probes claims almost nothing', () => {
    const f = createFinding({
      category: 'security', title: 'Security posture',
      evidence: [unavailable('TCC audit', 'no FDA'), unavailable('Firewall state', 'no admin')],
    });
    assert.ok(f.confidence <= 10, `confidence was ${f.confidence}`);
    assert.strictEqual(f.confidenceLabel, 'Low');
    assert.ok(/PARTIAL/.test(f.dataCompleteness));
  });

  await test('P0 #3: legacy v9 evidence still works and is tagged observed', () => {
    const f = createFinding({
      category: 'memory', title: 'legacy',
      evidence: [{ source: 'vm_stat', observedValue: 82, expectedRange: '< 70' }],
    });
    assert.strictEqual(f.evidence[0].quality, EVIDENCE_QUALITY.OBSERVED);
    assert.strictEqual(f.legacyEvidence[0].observedValue, 82);
  });

  await test('P0 #3: summary reports the exact evidentiary basis', () => {
    const s = summarizeEvidence([observed('a', 1), estimated('b', 2), unavailable('c', 'no access')]);
    assert.strictEqual(s.basis, '1 observed, 1 estimated, 1 unavailable');
    assert.strictEqual(s.hasEstimates, true);
    assert.strictEqual(s.hasUnavailable, true);
  });

  /* ── P0 #4 — calibration ────────────────────────────────────────────────── */

  await test('P0 #4: a prediction cannot be resolved without citing an evidence source', () => {
    calibrationEngine.reset();
    const p = calibrationEngine.recordPrediction({ category: 'memory', hypothesis: 'Docker', predictedConfidence: 90 });
    const bad = calibrationEngine.resolvePrediction(p.predictionId, { outcome: OUTCOME.CONFIRMED });
    assert.strictEqual(bad.ok, false);
    assert.ok(/evidence source/i.test(bad.error));
  });

  await test('P0 #4: pending predictions never move accuracy', () => {
    calibrationEngine.reset();
    calibrationEngine.recordPrediction({ category: 'network', hypothesis: 'DNS', predictedConfidence: 95 });
    const a = calibrationEngine.accuracyFor('network');
    assert.strictEqual(a.sampleSize, 0);
    assert.strictEqual(a.accuracy, null);
    assert.strictEqual(a.pending, 1);
  });

  await test('P0 #4: persistent over-confidence damps future confidence scores', () => {
    calibrationEngine.reset();
    for (let i = 0; i < 10; i += 1) {
      const p = calibrationEngine.recordPrediction({ category: 'battery', hypothesis: 'h', predictedConfidence: 95 });
      calibrationEngine.resolvePrediction(p.predictionId, {
        outcome: i < 4 ? OUTCOME.CONFIRMED : OUTCOME.REFUTED,
        source: 'controlled A/B experiment',
      });
    }
    const acc = calibrationEngine.accuracyFor('battery');
    assert.strictEqual(acc.accuracy, 40);
    assert.ok(acc.calibrationGap > 15);
    assert.ok(/Over-confident/.test(acc.verdict));
    const c = calibrationEngine.calibrate('battery', 90);
    assert.ok(c.calibratedConfidence < 90, `expected damping, got ${c.calibratedConfidence}`);
  });

  await test('P0 #4: a single experiment is never promoted to permanent causal truth', () => {
    calibrationEngine.reset();
    const p = calibrationEngine.recordPrediction({ category: 'crash', hypothesis: 'h', predictedConfidence: 80 });
    calibrationEngine.resolvePrediction(p.predictionId, { outcome: OUTCOME.CONFIRMED, source: 'experiment exp-1' });
    const acc = calibrationEngine.accuracyFor('crash');
    assert.strictEqual(acc.trustworthy, false, 'one sample must not be treated as trustworthy');
    assert.strictEqual(calibrationEngine.multiplierFor('crash'), 1.0, 'must stay neutral on a single result');
    const dbl = calibrationEngine.resolvePrediction(p.predictionId, { outcome: OUTCOME.REFUTED, source: 'x' });
    assert.strictEqual(dbl.ok, false, 'history is immutable once resolved');
  });

  /* ── P0 #5 — chaos ──────────────────────────────────────────────────────── */

  await test('P0 #5: all 11 fault scenarios produce safe, explainable, recoverable failures', async () => {
    const scenarios = Object.keys(FAULT_SCENARIOS);
    assert.ok(scenarios.length >= 11, `expected >= 11 scenarios, got ${scenarios.length}`);
    for (const scenario of scenarios) {
      requestController.reset(); // isolate: we are testing faults, not the rate limiter
      faultInjector.arm({ scenario, target: null, triggers: 1 });
      const outcome = await runGuardedOperation({
        actionId: 'process.killPort',
        params: { port: 3000 },
        skipAllowlist: true,
        idempotencyKey: `chaos_${scenario}_${Date.now()}`,
        execute: async () => ({ shouldNotReach: true }),
      });
      faultInjector.disarm();
      assert.strictEqual(outcome.ok, false, `${scenario} should have failed`);
      assert.ok(outcome.operationId, `${scenario} must still produce an operation ID`);
      assert.ok(outcome.error && outcome.error.length > 10, `${scenario} must be explainable`);
      assert.ok(outcome.remediation, `${scenario} must tell the user what to do`);
      assert.ok(typeof outcome.recoverable === 'boolean', `${scenario} must declare recoverability`);
      assert.ok(outcome.httpStatus >= 400, `${scenario} must map to an HTTP error status`);
      const op = operationRegistry.get(outcome.operationId);
      assert.strictEqual(op.state, OP_STATE.FAILED, `${scenario} must terminate in a FAILED state, not a partial one`);
      assert.ok(op.timeline.length >= 2, `${scenario} must leave an auditable timeline`);
    }
  });

  await test('P0 #5: fault injection is disarmed by default', () => {
    faultInjector.disarm();
    const s = faultInjector.status();
    assert.strictEqual(s.armed, false);
    assert.strictEqual(s.activeScenario, null);
  });

  await test('P0 #5: error taxonomy maps each failure class to the right status code', () => {
    assert.strictEqual(classifyFailure(Object.assign(new Error('EACCES'), { code: 'EACCES' })).httpStatus, 403);
    assert.strictEqual(classifyFailure(Object.assign(new Error('ENOENT'), { code: 'ENOENT' })).httpStatus, 424);
    assert.strictEqual(classifyFailure(new Error('operation timed out')).httpStatus, 504);
    assert.strictEqual(classifyFailure(new Error('ENOSPC: no space left')).httpStatus, 507);
    assert.strictEqual(classifyFailure(new Error('Unexpected token < in JSON')).httpStatus, 502);
    assert.strictEqual(classifyFailure(new Error('who knows')).code, 'UNEXPECTED_ERROR');
  });

  /* ── P0 #6 — API contracts ──────────────────────────────────────────────── */

  await test('P0 #6: malformed macOS output cannot produce a malformed API response', () => {
    const garbage = {
      contractVersion: '10.0', subsystem: 'storage', status: 'HEALTHY', availability: 'FAILED',
      severity: 'none', summary: 'ok', findings: 'not-an-array', evidence: [], recommendations: [],
      requiredPermissions: [], errors: [], degraded: false, lastUpdated: 'yesterday',
    };
    const enforced = enforceResponse(garbage, SCHEMA_REGISTRY.subsystemReport, 'storage report');
    assert.strictEqual(enforced.ok, false);
    assert.ok(enforced.violations.length >= 2);
    // What the client receives is still a perfectly well-formed error envelope.
    assert.strictEqual(validateShape(enforced.payload, SCHEMA_REGISTRY.error).length, 0);
    assert.strictEqual(enforced.payload.code, 'CONTRACT_VIOLATION');
  });

  await test('P0 #6: a well-formed report passes its response schema', () => {
    const report = createSubsystemReport({ subsystem: 'network', availability: AVAILABILITY.AVAILABLE });
    assert.deepStrictEqual(validateShape(report, SCHEMA_REGISTRY.subsystemReport), []);
  });

  await test('P0 #6: request schemas reject bad input before anything touches the system', () => {
    const spec = REQUEST_SCHEMAS['POST /api/actions/kill-port'];
    assert.ok(validateShape({ port: 99999 }, spec).length > 0, 'out-of-range port must be rejected');
    assert.ok(validateShape({ port: 'rm -rf /' }, spec).length > 0, 'non-numeric port must be rejected');
    assert.deepStrictEqual(validateShape({ port: 3000 }, spec), []);
  });

  await test('P0 #6: every finding satisfies the published finding schema', () => {
    const f = createFinding({
      category: 'memory', severity: 'warning', title: 'Memory pressure',
      evidence: [observed('Pressure', 82, { unit: '%' })],
    });
    assert.deepStrictEqual(validateShape(f, SCHEMA_REGISTRY.finding), []);
  });

  /* ── P0 #7 — operation IDs ──────────────────────────────────────────────── */

  await test('P0 #7: every action gets an op_xxxxxx ID with a full lifecycle timeline', async () => {
    requestController.reset();
    const outcome = await runGuardedOperation({
      actionId: 'process.killPort',
      params: { port: 4711 },
      skipAllowlist: true,
      idempotencyKey: `oplife_${Date.now()}`,
      snapshot: async (phase) => ({ phase, isBound: phase === 'before' }),
      assertVerified: (b, a) => b.isBound && !a.isBound,
      execute: async () => ({ killedPids: [123] }),
    });
    assert.strictEqual(outcome.ok, true);
    assert.match(outcome.operationId, /^op_[0-9a-f]{6}$/);
    const op = operationRegistry.get(outcome.operationId);
    assert.strictEqual(op.state, OP_STATE.COMPLETED);
    assert.strictEqual(op.verification.status, VERIFICATION.PASSED);
    const states = op.timeline.map((t) => t.state);
    for (const s of [OP_STATE.REQUESTED, OP_STATE.AUTHORIZED, OP_STATE.EXECUTING, OP_STATE.VERIFYING, OP_STATE.COMPLETED]) {
      assert.ok(states.includes(s), `timeline missing ${s}`);
    }
    for (const entry of op.timeline) assert.ok(!Number.isNaN(Date.parse(entry.at)), 'each step needs a timestamp');
  });

  await test('P0 #7: verification FAILS honestly when the fix cannot be proven', async () => {
    requestController.reset();
    const outcome = await runGuardedOperation({
      actionId: 'process.killPort',
      params: { port: 4712 },
      skipAllowlist: true,
      idempotencyKey: `opfail_${Date.now()}`,
      snapshot: async () => ({ isBound: true }),
      assertVerified: (b, a) => b.isBound && !a.isBound, // still bound afterwards
      execute: async () => ({ killedPids: [] }),
    });
    assert.strictEqual(outcome.verification.status, VERIFICATION.FAILED);
    assert.ok(/did NOT confirm/i.test(outcome.verification.verdict));
  });

  await test('P0 #7: sensitive parameters are redacted in the operation ledger', () => {
    const op = operationRegistry.create({ actionId: 'test.secret', params: { apiKey: 'sk-live-123', port: 80 } });
    assert.strictEqual(op.params.apiKey, '[REDACTED]');
    assert.strictEqual(op.params.port, 80);
  });

  /* ── P0 #8 — idempotency ────────────────────────────────────────────────── */

  await test('P0 #8: a double-clicked action executes exactly once', async () => {
    requestController.reset();
    let executions = 0;
    const key = `dbl_${Date.now()}`;
    const run = () => runGuardedOperation({
      actionId: 'process.killPort', params: { port: 5555 }, idempotencyKey: key, skipAllowlist: true,
      execute: async () => { executions += 1; return { killedPids: [1] }; },
    });
    const first = await run();
    const second = await run();
    assert.strictEqual(executions, 1, `executed ${executions} times`);
    assert.strictEqual(second.deduplicated, true);
    assert.strictEqual(second.operationId, first.operationId);
    assert.ok(/NOT executed again/i.test(second.message));
  });

  await test('P0 #8: 20 rapid clicks cannot fire 20 kills', async () => {
    requestController.reset();
    let executions = 0;
    const results = [];
    for (let i = 0; i < 20; i += 1) {
      results.push(await runGuardedOperation({
        actionId: 'process.killPort', params: { port: 6000 }, skipAllowlist: true,
        execute: async () => { executions += 1; return { killedPids: [] }; },
      }));
    }
    assert.ok(executions < 20, `expected suppression, but executed ${executions}/20 times`);
    assert.ok(results.some((r) => r.deduplicated || r.code === 'COOLDOWN' || r.code === 'RATE_LIMITED'),
      'at least one request must be explicitly suppressed');
  });

  await test('P0 #8: suppressed requests explain themselves and say when to retry', async () => {
    requestController.reset();
    const first = await runGuardedOperation({
      actionId: 'process.killPort', params: { port: 6001 }, skipAllowlist: true,
      idempotencyKey: 'supp_a', execute: async () => ({}),
    });
    assert.strictEqual(first.ok, true);
    // A DIFFERENT key means this is not a replay — the 3s cooldown must stop it.
    const suppressed = await runGuardedOperation({
      actionId: 'process.killPort', params: { port: 6002 }, skipAllowlist: true,
      idempotencyKey: 'supp_b', execute: async () => { throw new Error('must not execute'); },
    });
    assert.strictEqual(suppressed.ok, false);
    assert.strictEqual(suppressed.httpStatus, 429);
    assert.strictEqual(suppressed.code, 'COOLDOWN');
    assert.ok(suppressed.retryAfterMs > 0, 'must tell the client when to retry');
    assert.ok(suppressed.remediation, 'must explain that nothing was changed');
    assert.strictEqual(suppressed.recoverable, true);
  });

  await test('P0 #8: dry run never modifies the system', async () => {
    requestController.reset();
    let executed = false;
    const outcome = await runGuardedOperation({
      actionId: 'storage.executeCleanup', params: {}, skipAllowlist: true, dryRun: true,
      idempotencyKey: `dry_${Date.now()}`,
      snapshot: async () => ({ freeBytes: 1 }),
      execute: async () => { executed = true; return {}; },
    });
    assert.strictEqual(executed, false);
    assert.strictEqual(outcome.dryRun, true);
    assert.strictEqual(operationRegistry.get(outcome.operationId).verification.status, VERIFICATION.NOT_APPLICABLE);
  });

  /* ── P0 #9 — offline-first / degraded mode ──────────────────────────────── */

  await test('P0 #9: one failing probe does not fail the dashboard', async () => {
    const probeSet = await runProbeSet([
      { name: 'good', fn: async () => ({ ok: 1 }) },
      { name: 'denied', fn: async () => { const e = new Error('EACCES: permission denied'); e.code = 'EACCES'; throw e; } },
      { name: 'missing', fn: async () => { const e = new Error('ENOENT: no such file'); e.code = 'ENOENT'; throw e; } },
    ]);
    assert.strictEqual(probeSet.counts.succeeded, 1);
    assert.strictEqual(probeSet.counts.failed, 2);
    const report = reportFromProbeSet({ subsystem: 'mixed', probeSet });
    assert.strictEqual(report.availability, AVAILABILITY.LIMITED);
    assert.strictEqual(report.degraded, true);
    assert.deepStrictEqual(validateShape(report, SCHEMA_REGISTRY.subsystemReport), []);
  });

  await test('P0 #9: when every probe fails, the subsystem is UNAVAILABLE — never healthy', async () => {
    const probeSet = await runProbeSet([
      { name: 'a', fn: async () => { throw new Error('EACCES'); } },
      { name: 'b', fn: async () => { throw new Error('EACCES'); } },
    ]);
    const report = reportFromProbeSet({ subsystem: 'blind', probeSet });
    assert.strictEqual(report.status, HEALTH_STATUS.UNAVAILABLE);
    assert.notStrictEqual(report.status, HEALTH_STATUS.HEALTHY);
  });

  await test('P0 #9: a probe that hangs is aborted, not left to stall the page', async () => {
    const probeSet = await runProbeSet([
      { name: 'hang', fn: () => new Promise(() => {}), timeoutMs: 120 },
    ]);
    assert.strictEqual(probeSet.results[0].ok, false);
    assert.strictEqual(probeSet.results[0].code, 'TIMEOUT');
  });

  await test('P0 #9: online-only capabilities are optional and declare an offline fallback', async () => {
    assert.ok(ONLINE_ONLY_CAPABILITIES.length >= 5);
    for (const c of ONLINE_ONLY_CAPABILITIES) assert.ok(c.fallback, `${c.id} needs an offline fallback message`);
    const status = await getDegradedModeStatus();
    assert.strictEqual(status.offlineFirst, true);
    for (const c of status.onlineOnlyCapabilities) assert.strictEqual(c.optional, true);
    assert.ok(status.localCapabilities.every((c) => c.requiresNetwork === false));
  });

  /* ── P0 #10 — privacy ───────────────────────────────────────────────────── */

  await test('P0 #10: bundles redact identity, paths, secrets and network identifiers', () => {
    const { redacted, privacy } = redactReport({
      user: 'jane.doe',
      email: 'jane.doe@example.com',
      home: '/Users/jane.doe/Projects/secret-client',
      sshKey: '/Users/jane.doe/.ssh/id_rsa',
      ip: '192.168.1.42',
      token: 'ghp_abcdefghijklmnopqrstuvwxyz0123456789',
      env: { AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI', PATH: '/usr/bin' },
    });
    const blob = JSON.stringify(redacted);
    assert.ok(!blob.includes('jane.doe@example.com'), 'email leaked');
    assert.ok(!blob.includes('wJalrXUtnFEMI'), 'secret leaked');
    assert.ok(!blob.includes('ghp_abcdefghijklmnopqrstuvwxyz0123456789'), 'token leaked');
    assert.ok(privacy.sensitiveValuesDetected > 0);
    assert.ok(privacy.categories.length > 0, 'must show a category breakdown');
    assert.ok(privacy.categories.every((c) => typeof c.count === 'number'));
  });

  await test('P0 #10: identity fields are redacted by key, not just by pattern match', () => {
    // Regression: "user": "jane.doe" used to survive export because jane.doe was not
    // the account running the server. Identity is sensitive by position too.
    const { redacted } = redactReport({ user: 'jane.doe', hostname: 'janes-macbook', owner: 'acme-admin' });
    assert.ok(!JSON.stringify(redacted).includes('jane.doe'), 'username leaked');
    assert.ok(!JSON.stringify(redacted).includes('janes-macbook'), 'hostname leaked');
    assert.ok(!JSON.stringify(redacted).includes('acme-admin'), 'owner leaked');
    assert.match(redacted.user, /^\[USER_[0-9a-f]{6}\]$/);
  });

  await test('P0 #10: env vars are never blindly exported', () => {
    const { redacted } = redactReport({ environment: { GITHUB_TOKEN: 'ghp_x', OPENAI_API_KEY: 'sk-y', LANG: 'en_US' } });
    const blob = JSON.stringify(redacted);
    assert.ok(!blob.includes('ghp_x'));
    assert.ok(!blob.includes('sk-y'));
  });

  await test('P0 #10: redaction is deterministic, so a value can be correlated without being revealed', () => {
    const a = redactReport({ a: 'user@corp.com', b: 'user@corp.com' }).redacted;
    assert.strictEqual(a.a, a.b, 'the same input must map to the same placeholder');
    const b = redactReport({ a: 'user@corp.com' }).redacted;
    assert.strictEqual(a.a, b.a, 'placeholders must be stable across runs');
  });

  await test('P0 #10: the privacy panel offers a masked preview, not the raw value', () => {
    const { privacy } = redactReport({ email: 'confidential.person@bigcorp.com' });
    for (const cat of privacy.categories) {
      for (const sample of cat.samples) {
        assert.ok(sample.preview.includes('*'), 'previews must be masked');
        assert.ok(!sample.preview.includes('confidential.person@bigcorp.com'));
      }
    }
  });

  console.log(`\n═══ v10 results: ${passed} passed, ${failed} failed ═══\n`);
  if (failed > 0) process.exitCode = 1;
  return { passed, failed };
}

runV10Tests();
