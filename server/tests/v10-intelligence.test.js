/**
 * WinSuite & MacSuite v10.1 — Intelligence layer suite (P1-A)
 *
 * Run with:  node server/tests/v10-intelligence.test.js
 *
 * These tests are about EPISTEMICS, not features. They exist to stop the system from
 * ever becoming the source of truth: every assertion below fails if the code starts
 * inventing measurements, converting a single experiment into fact, treating missing
 * data as good news, or presenting correlation as causation.
 *
 * Covers:
 *   #1 incident lifecycle  — Detected → Investigating → Confirmed → Repairing →
 *                            Verifying → Resolved/Unresolved, illegal jumps refused
 *   #2 "Why NOT?"          — rejections are explained; missing data is indeterminate
 *   #3 experiments         — approval gate, before/after, evidence strength, never proof
 *   #4 causal timeline     — correlation strength is disclaimed, chain = weakest link
 */

import assert from 'assert';

import { analyzeCauses, renderAnalysisText } from '../intelligence/causal-reasoner.js';
import { collectTelemetry, DISCRIMINATOR_KEYS } from '../intelligence/telemetry-collector.js';
import {
  incidentIntelligence, INCIDENT_STATUS, computeCorrelation, CORRELATION_STRENGTH,
} from '../intelligence/incident-intelligence.js';
import {
  experimentCenter, evidenceLedger, EXPERIMENT_STAGE, EVIDENCE_STRENGTH,
} from '../intelligence/experiment-center.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`✓ Test ${passed + failed} Passed: ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`✗ Test ${passed + failed} FAILED: ${name}\n    ${e.message}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`✓ Test ${passed + failed} Passed: ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`✗ Test ${passed + failed} FAILED: ${name}\n    ${e.message}`);
  }
}

/** A complete, unambiguous telemetry sample: memory is the cause, everything else is not. */
const FULL_TELEMETRY = {
  memoryPressurePct: 94, swapUsedGB: 4.2, pageInsPerSec: 180, topMemoryConsumerGB: 6.1,
  diskQueueDepth: 1.1, diskUtilPct: 31, freeDiskPct: 42,
  sustainedCpuPct: 18, runQueueLength: 1.2,
  thermalPressure: 'nominal', cpuThrottleEvents: 0,
  launchAgentCount: 22, backgroundCpuPct: 4,
  mdsCpuPct: 1,
};

export async function runIntelligenceTests() {
  console.log('\n═══ v10.1 Intelligence layer (P1-A) ═══\n');

  incidentIntelligence.reset();
  experimentCenter.reset();

  /* ────────────── #2 "Why NOT?" reasoning ────────────── */

  test('#2 the leading cause is ranked with a percentage and a supporting explanation', () => {
    const a = analyzeCauses(FULL_TELEMETRY);
    assert.strictEqual(a.leadingCause.id, 'memory_pressure');
    assert.ok(a.leadingCause.confidence > 50, 'a decisive cause needs a real confidence figure');
    assert.ok(a.leadingCause.reasoning.basis.length >= 2, 'must say WHY, with evidence');
    assert.match(a.leadingCause.reasoning.question, /^Why memory pressure\?/i);
    assert.ok(a.ranking[0].bar.includes('█'), 'ranking renders a bar for comparison');
  });

  test('#2 rejected causes carry an explicit "Why NOT" reason, not just a low score', () => {
    const a = analyzeCauses(FULL_TELEMETRY);
    const ids = a.ruledOut.map((r) => r.id);
    for (const expected of ['cpu_saturation', 'thermal_throttling']) {
      assert.ok(ids.includes(expected), `${expected} should have been ruled out`);
    }
    for (const r of a.ruledOut) {
      assert.match(r.question, /^Why NOT /i, `${r.id} must be phrased as a rejection`);
      assert.ok(r.answer && r.answer.length > 20, `${r.id} must explain why it was rejected`);
      assert.ok(r.decisiveMeasurement, `${r.id} rejection must cite the measurement that settled it`);
    }
    const text = renderAnalysisText(a);
    assert.match(text, /Why NOT cpu saturation\?/i);
    assert.match(text, /Why NOT thermal throttling\?/i);
  });

  test('#2 missing telemetry makes a cause INDETERMINATE — never "ruled out", never "fine"', () => {
    // Only memory data is available. CPU/thermal/etc must not be silently cleared.
    const a = analyzeCauses({ memoryPressurePct: 94, swapUsedGB: 4.2 });
    const undetermined = a.undetermined.map((u) => u.id);
    assert.ok(undetermined.includes('cpu_saturation'), 'unmeasured CPU cannot be excluded');
    assert.ok(undetermined.includes('thermal_throttling'), 'unmeasured thermals cannot be excluded');
    for (const u of a.undetermined) {
      assert.ok(!a.ruledOut.some((r) => r.id === u.id), 'indeterminate must never appear as ruled out');
    }
    assert.strictEqual(a.ruledOut.length, 0, 'nothing can be ruled out with no data to rule it out');
    assert.strictEqual(a.coverage.analysisIsComplete, false, 'incomplete telemetry must be disclosed');
    assert.ok(a.coverage.averageDiscriminatorCoveragePct < 100);
    assert.ok(a.coverage.qualifier, 'coverage loss must come with a plain-language qualifier');
    assert.match(renderAnalysisText(a), /cannot be assessed|neither confirmed nor excluded/i);
  });

  test('#2 a cause is only decisive when it clearly beats the runner-up', () => {
    const decisive = analyzeCauses(FULL_TELEMETRY);
    assert.strictEqual(decisive.isDecisive, true);
    // Nothing measured at all ⇒ nothing decisive.
    const blind = analyzeCauses({});
    assert.strictEqual(blind.isDecisive, false, 'no data can never produce a decisive answer');
    assert.strictEqual(blind.leadingCause, null, 'no data must not nominate a leading cause');
  });

  /* ────────────── #1 Incident lifecycle ────────────── */

  test('#1 a new incident starts at DETECTED and lists only its legal next states', () => {
    // Opened WITHOUT telemetry: nothing has been analysed yet, so it stays DETECTED.
    const inc = incidentIntelligence.open({ title: 'Slowdown', severity: 'HIGH' });
    const d = incidentIntelligence.detail(inc.id);
    assert.strictEqual(d.status, INCIDENT_STATUS.DETECTED);
    assert.deepStrictEqual(d.lifecycle.nextLegalStates, ['INVESTIGATING', 'UNRESOLVED']);
    assert.deepStrictEqual(
      d.lifecycle.stages,
      ['DETECTED', 'INVESTIGATING', 'CONFIRMED', 'REPAIRING', 'VERIFYING', 'RESOLVED'],
      'the v10 lifecycle replaces the v9 INCIDENT_STATUS enum',
    );
  });

  test('#1 skipping the lifecycle is refused (cannot resolve what was never investigated)', () => {
    const inc = incidentIntelligence.open({ title: 'Skipper' });
    assert.throws(
      () => incidentIntelligence.transition(inc.id, INCIDENT_STATUS.RESOLVED),
      /Illegal incident transition/i,
    );
    assert.strictEqual(incidentIntelligence.get(inc.id).status, INCIDENT_STATUS.DETECTED);
  });

  test('#1 RESOLVED requires a PASSED verification — a repair is not a resolution', () => {
    // Supplying telemetry at open() runs the analysis, which advances DETECTED →
    // INVESTIGATING on its own; re-issuing INVESTIGATING would be an illegal no-op.
    const inc = incidentIntelligence.open({ title: 'Needs proof', telemetry: FULL_TELEMETRY });
    assert.strictEqual(inc.status, INCIDENT_STATUS.INVESTIGATING);
    incidentIntelligence.transition(inc.id, INCIDENT_STATUS.CONFIRMED);
    incidentIntelligence.transition(inc.id, INCIDENT_STATUS.REPAIRING);
    incidentIntelligence.transition(inc.id, INCIDENT_STATUS.VERIFYING);
    assert.throws(
      () => incidentIntelligence.transition(inc.id, INCIDENT_STATUS.RESOLVED),
      /verif/i,
      'resolution without passing verification must be refused',
    );

    incidentIntelligence.setVerification(inc.id, {
      status: 'PASSED', beforeState: { memoryPressurePct: 94 },
      afterState: { memoryPressurePct: 55 }, verdict: 'Pressure returned to normal.',
    });
    const ok = incidentIntelligence.transition(inc.id, INCIDENT_STATUS.RESOLVED);
    assert.strictEqual(ok.status, INCIDENT_STATUS.RESOLVED);
  });

  test('#1 an unresolvable incident can end as UNRESOLVED rather than being forced closed', () => {
    const inc = incidentIntelligence.open({ title: 'Dead end' });
    incidentIntelligence.transition(inc.id, INCIDENT_STATUS.UNRESOLVED, 'Root cause not identified.');
    const d = incidentIntelligence.detail(inc.id);
    assert.strictEqual(d.status, INCIDENT_STATUS.UNRESOLVED);
    assert.ok(d.lifecycle.history.length >= 2, 'the full status history is retained');
  });

  test('#1 recommended actions are withheld while the cause is still ambiguous', () => {
    const ambiguous = incidentIntelligence.open({
      title: 'Unclear', telemetry: { memoryPressurePct: 40 },
    });
    const d = incidentIntelligence.detail(ambiguous.id);
    assert.strictEqual(d.isDecisive, false);
    assert.strictEqual(d.recommendedActions.available, false,
      'an indecisive diagnosis must not produce confident recommendations');
    assert.strictEqual(d.recommendedActions.actions.length, 0);
    assert.ok(d.recommendedActions.reason, 'the user must be told WHY no action is offered');
  });

  /* ────────────── #4 Correlation / causal timeline ────────────── */

  test('#4 correlation is reported with strength AND an explicit non-causal disclaimer', () => {
    const c = computeCorrelation({
      triggerAt: '2026-08-19T10:00:00Z',
      symptomAt: '2026-08-19T10:00:20Z',
      priorCooccurrences: 8,
      priorTriggerOccurrences: 9,
    });
    assert.ok([CORRELATION_STRENGTH.STRONG, CORRELATION_STRENGTH.MODERATE].includes(c.strength));
    assert.ok(c.causalDisclaimer, 'every correlation must carry its disclaimer');
    assert.match(c.causalDisclaimer, /not|cause/i);
  });

  test('#4 an effect preceding its supposed trigger scores NONE, not a weak match', () => {
    const c = computeCorrelation({
      triggerAt: '2026-08-19T10:00:30Z',
      symptomAt: '2026-08-19T10:00:00Z', // symptom first
      priorCooccurrences: 9,
      priorTriggerOccurrences: 9,
    });
    assert.strictEqual(c.strength, CORRELATION_STRENGTH.NONE, 'the arrow of time is not negotiable');
  });

  test('#4 the timeline chain is only as strong as its weakest link', () => {
    const inc = incidentIntelligence.open({ title: 'Chain', telemetry: FULL_TELEMETRY });
    incidentIntelligence.addTimelineEvent(inc.id, { at: '2026-08-19T10:00:00Z', label: 'Docker started' });
    incidentIntelligence.addTimelineEvent(inc.id, {
      at: '2026-08-19T10:00:15Z', label: 'Memory pressure rose',
      priorCooccurrences: 9, priorTriggerOccurrences: 9,
    });
    incidentIntelligence.addTimelineEvent(inc.id, {
      at: '2026-08-19T14:00:00Z', label: 'Beachball reported', // hours later ⇒ weak link
    });
    const d = incidentIntelligence.detail(inc.id);
    assert.strictEqual(d.timeline.length, 3);
    assert.ok(d.timeline[0].arrow === '↓', 'events render as a chain');
    assert.ok(
      [CORRELATION_STRENGTH.WEAK, CORRELATION_STRENGTH.NONE, CORRELATION_STRENGTH.INSUFFICIENT_DATA]
        .includes(d.correlation.chainStrength),
      'one weak link must drag the whole chain down',
    );
  });

  /* ────────────── #3 Experiments ────────────── */

  test('#3 an experiment cannot run before the user approves it', () => {
    const exp = experimentCenter.propose({ catalogueId: 'exp.pause-docker' });
    assert.strictEqual(exp.stage, EXPERIMENT_STAGE.AWAITING_APPROVAL);
    assert.throws(
      () => experimentCenter.captureBefore(exp.experimentId, { memoryPressurePct: 87 }),
      /approv/i,
      'no measurement may be taken before consent',
    );
  });

  test('#3 a full run yields evidence strength and refuses to call it proof', () => {
    const exp = experimentCenter.propose({ catalogueId: 'exp.pause-docker' });
    experimentCenter.approve(exp.experimentId, { approvedBy: 'user' });
    experimentCenter.captureBefore(exp.experimentId, { memoryPressurePct: 87 });
    experimentCenter.captureAfter(exp.experimentId, { memoryPressurePct: 61 }, { operationId: 'op_abc' });
    const done = experimentCenter.analyze(exp.experimentId);

    assert.strictEqual(done.stage, EXPERIMENT_STAGE.COMPLETE);
    assert.strictEqual(done.result.causalStatus.establishesCausation, false, 'never causation from one run');
    assert.match(done.result.causalStatus.statement, /does NOT establish permanent causal truth/i);
    assert.ok([EVIDENCE_STRENGTH.MODERATE_SUPPORT, EVIDENCE_STRENGTH.STRONG_SUPPORT].includes(done.result.strength));
    const text = experimentCenter.renderResultText(exp.experimentId);
    assert.match(text, /does NOT establish permanent\s*\ncausal truth/i);
  });

  test('#3 a contradicting repeat downgrades the conclusion instead of being discarded', () => {
    experimentCenter.reset();
    const run = (before, after) => {
      const e = experimentCenter.propose({ catalogueId: 'exp.pause-docker' });
      experimentCenter.approve(e.experimentId, {});
      experimentCenter.captureBefore(e.experimentId, { memoryPressurePct: before });
      experimentCenter.captureAfter(e.experimentId, { memoryPressurePct: after });
      return experimentCenter.analyze(e.experimentId);
    };
    run(87, 61);            // supporting
    const second = run(87, 88); // no effect / contradicting
    const body = evidenceLedger.all()[0];
    assert.ok(body.totalRuns >= 2, 'every run is retained as history');
    assert.ok(
      body.contradictingRuns + body.nullRuns >= 1,
      'a disagreeing result must be recorded, not dropped',
    );
    assert.ok(
      /cannot|contest|inconsist|not|single/i.test(body.workingConclusion),
      `a mixed body of evidence must not read as settled: "${body.workingConclusion}"`,
    );
    assert.strictEqual(second.result.causalStatus.establishesCausation, false);
  });

  test('#3 an unmeasurable outcome is INCONCLUSIVE rather than a null result', () => {
    const e = experimentCenter.propose({ catalogueId: 'exp.pause-docker' });
    experimentCenter.approve(e.experimentId, {});
    experimentCenter.captureBefore(e.experimentId, { memoryPressurePct: 87 });
    experimentCenter.captureAfter(e.experimentId, { memoryPressurePct: null });
    const done = experimentCenter.analyze(e.experimentId);
    assert.strictEqual(done.result.strength, EVIDENCE_STRENGTH.INCONCLUSIVE);
    assert.strictEqual(done.result.causalStatus.establishesCausation, false);
  });

  /* ────────────── telemetry collection honesty ────────────── */

  // The reasoner's guarantees are worthless if the numbers reaching it were invented.
  // These tests pin the collector's contract: measure or say nothing.

  await testAsync('collector emits only keys it genuinely measured — no zero-filling', async () => {
    const c = await collectTelemetry();
    for (const [key, value] of Object.entries(c.telemetry)) {
      assert.ok(DISCRIMINATOR_KEYS.includes(key), `"${key}" is not a discriminator the reasoner understands`);
      assert.ok(value !== null && value !== undefined, `"${key}" was emitted with an empty value instead of being omitted`);
    }
    // Every key is accounted for: either measured, or explicitly listed as unavailable.
    for (const key of DISCRIMINATOR_KEYS) {
      const measured = key in c.telemetry;
      const declaredMissing = c.unavailable.some((u) => u.key === key);
      assert.ok(measured !== declaredMissing || measured, `"${key}" is neither measured nor declared unavailable`);
      assert.ok(measured || declaredMissing, `"${key}" vanished silently — it must be measured or declared missing`);
    }
  });

  await testAsync('every unmeasurable input carries a REASON, never a silent omission', async () => {
    const c = await collectTelemetry();
    for (const u of c.unavailable) {
      assert.ok(u.reason && u.reason.length > 10, `"${u.key}" is unavailable without explaining why`);
    }
    assert.strictEqual(
      c.coverage.discriminatorsMeasured + c.unavailable.length, DISCRIMINATOR_KEYS.length,
      'measured + unavailable must account for every discriminator',
    );
  });

  await testAsync('incomplete coverage produces a stated qualifier, never a clean bill of health', async () => {
    const c = await collectTelemetry();
    if (!c.coverage.isComplete) {
      assert.ok(c.coverage.qualifier, 'partial coverage must be disclosed in words');
      assert.match(c.coverage.qualifier, /could not be measured/i);
      assert.match(c.coverage.qualifier, /neither confirmed nor excluded/i);
    } else {
      assert.strictEqual(c.coverage.qualifier, null);
    }
  });

  await testAsync('a derived value is labelled inferred — it never masquerades as observed', async () => {
    const c = await collectTelemetry();
    for (const ev of c.evidence) {
      assert.ok(['observed', 'inferred', 'estimated', 'unavailable', 'stale'].includes(ev.quality),
        `evidence "${ev.key}" has no recognised quality`);
      // Anything not directly read from a kernel/system interface must say so.
      if (ev.quality === 'inferred') {
        assert.ok(ev.reason, `inferred value "${ev.key}" must state the limitation of the derivation`);
      }
      if (ev.quality === 'unavailable') {
        assert.strictEqual(ev.value, null, `unavailable evidence "${ev.key}" must not carry a value`);
      }
    }
  });

  await testAsync('reasoning over collected telemetry never invents a cause it could not test', async () => {
    const c = await collectTelemetry();
    const a = analyzeCauses(c.telemetry);
    // Anything the collector could not measure must not turn into a confident rejection.
    const missingKeys = new Set(c.unavailable.map((u) => u.key));
    for (const r of a.ruledOut) {
      const dm = r.decisiveMeasurement;
      if (dm) {
        assert.ok(!missingKeys.has(dm.key), `"${r.id}" was ruled out using "${dm.key}", which was never measured`);
      }
    }
    // With partial coverage the analysis must admit incompleteness.
    if (!c.coverage.isComplete) {
      assert.strictEqual(a.coverage.analysisIsComplete, false);
    }
  });

  console.log(`\n═══ intelligence results: ${passed} passed, ${failed} failed ═══\n`);
  if (failed > 0) process.exitCode = 1;
  return { passed, failed };
}

await runIntelligenceTests();
