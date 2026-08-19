/**
 * WinSuite & MacSuite v10.1 — Diagnostic Experiment Center  [P1 #13]
 *
 * Full workflow, each stage gated:
 *
 *   Hypothesis → Evidence → Proposal → USER APPROVAL → Before snapshot
 *              → Controlled action → After snapshot → Difference → Evidence strength
 *
 * The single most important rule in this file, and the reason it exists separately from
 * the v9 experiment engine (which returned two hardcoded results):
 *
 *   A SINGLE EXPERIMENT NEVER ESTABLISHES CAUSAL TRUTH.
 *
 * One observation of "pause Docker → pressure fell" is *supporting evidence*. It is not
 * proof. Confounders exist, the workload changes, and the sample size is one. This engine
 * therefore:
 *   - grades every run as evidence STRENGTH, never as a verdict of fact;
 *   - accumulates repeated runs into a body of evidence with a replication count;
 *   - requires ≥3 consistent replications before it will even use the word "established",
 *     and still labels that as a working conclusion open to revision;
 *   - records contradicting runs and lets them *downgrade* an earlier conclusion;
 *   - refuses to grade an experiment whose before/after telemetry could not be read.
 */

import crypto from 'crypto';
import { EVIDENCE_QUALITY, createEvidence, summarizeEvidence } from '../core/evidence.js';
import { calibrationEngine, OUTCOME } from '../core/calibration.js';

export const EXPERIMENT_STAGE = {
  HYPOTHESIS: 'HYPOTHESIS',
  EVIDENCE_REVIEW: 'EVIDENCE_REVIEW',
  PROPOSED: 'PROPOSED',
  AWAITING_APPROVAL: 'AWAITING_APPROVAL',
  APPROVED: 'APPROVED',
  BASELINE_CAPTURE: 'BASELINE_CAPTURE',
  INTERVENTION: 'INTERVENTION',
  AFTER_CAPTURE: 'AFTER_CAPTURE',
  ANALYSIS: 'ANALYSIS',
  COMPLETE: 'COMPLETE',
  ABORTED: 'ABORTED',
  REJECTED: 'REJECTED',
};

/** How strongly ONE run supports the hypothesis. Never a statement of fact. */
export const EVIDENCE_STRENGTH = {
  STRONG_SUPPORT: 'Strong supporting evidence',
  MODERATE_SUPPORT: 'Moderate supporting evidence',
  WEAK_SUPPORT: 'Weak supporting evidence',
  NO_EFFECT: 'No measurable effect',
  CONTRADICTS: 'Contradicts the hypothesis',
  INCONCLUSIVE: 'Inconclusive — measurement unreliable',
};

/** Replication tiers. Note the deliberate absence of anything called "proven". */
export const CONCLUSION_TIER = {
  SINGLE_OBSERVATION: 'Single observation',
  REPLICATED: 'Replicated',
  WELL_REPLICATED: 'Well replicated',
  CONTESTED: 'Contested — replications disagree',
};

const MIN_REPLICATIONS_FOR_WORKING_CONCLUSION = 3;

/**
 * The catalogue of experiments the system knows how to propose.
 * Every one must be reversible and non-destructive — we never damage a machine to
 * learn something about it.
 */
export const EXPERIMENT_CATALOGUE = {
  'exp.pause-docker': {
    id: 'exp.pause-docker',
    title: 'Pause Docker and observe memory pressure',
    category: 'memory',
    hypothesisTemplate: 'Docker is contributing significantly to memory pressure.',
    intervention: { actionId: 'experiment.pauseDocker', label: 'Pause Docker Desktop', reversible: true, destructive: false },
    reversal: { actionId: 'experiment.resumeDocker', label: 'Resume Docker Desktop' },
    metrics: ['memoryPressurePct', 'swapUsedGB'],
    primaryMetric: 'memoryPressurePct',
    direction: 'decrease',
    meaningfulDelta: 15,
    durationSec: 45,
    risk: 'Low — running containers are paused, not destroyed, and are resumed automatically.',
    confounders: [
      'Other applications may release memory during the same window.',
      'macOS may reclaim compressed pages independently of the intervention.',
      'A single run cannot separate Docker from a co-varying workload.',
    ],
  },
  'exp.quit-browser-tabs': {
    id: 'exp.quit-browser-tabs',
    title: 'Suspend background browser tabs and observe memory',
    category: 'memory',
    hypothesisTemplate: 'Browser tabs are a primary contributor to memory pressure.',
    intervention: { actionId: 'experiment.suspendTabs', label: 'Suspend background tabs', reversible: true, destructive: false },
    reversal: { actionId: 'experiment.restoreTabs', label: 'Restore tabs' },
    metrics: ['memoryPressurePct', 'topMemoryConsumerGB'],
    primaryMetric: 'memoryPressurePct',
    direction: 'decrease',
    meaningfulDelta: 10,
    durationSec: 30,
    risk: 'Low — tabs are suspended, not closed; page state is preserved.',
    confounders: ['Tab suspension frees memory gradually; a short window may understate the effect.'],
  },
  'exp.flush-dns': {
    id: 'exp.flush-dns',
    title: 'Flush the DNS resolver cache and re-measure resolution latency',
    category: 'network',
    hypothesisTemplate: 'Stale resolver cache entries are causing slow or failing name resolution.',
    intervention: { actionId: 'network.flushDNS', label: 'Flush resolver cache', reversible: true, destructive: false },
    reversal: null,
    metrics: ['dnsLatencyMs'],
    primaryMetric: 'dnsLatencyMs',
    direction: 'decrease',
    meaningfulDelta: 100,
    durationSec: 15,
    risk: 'Low — the cache repopulates automatically on next lookup.',
    confounders: [
      'The upstream resolver may have recovered independently during the window.',
      'Network conditions vary between the before and after samples.',
    ],
  },
  'exp.reproduce': {
    id: 'exp.reproduce',
    title: 'Reproduce the problem while monitoring',
    category: 'performance',
    hypothesisTemplate: 'A specific user action reproducibly triggers the degradation.',
    intervention: { actionId: 'reproduce.start', label: 'User performs the triggering action', reversible: true, destructive: false },
    reversal: null,
    metrics: ['memoryPressurePct', 'sustainedCpuPct', 'diskQueueDepth', 'thermalPressure'],
    primaryMetric: 'memoryPressurePct',
    direction: 'increase',
    meaningfulDelta: 15,
    durationSec: 120,
    risk: 'None — this is passive observation while the user works normally.',
    confounders: ['Background activity unrelated to the user action may coincide with the window.'],
  },
};

/** Accumulated cross-run evidence, keyed by hypothesis. This is the institutional memory. */
class EvidenceLedger {
  constructor() { this.byHypothesis = new Map(); }
  reset() { this.byHypothesis.clear(); }

  record(hypothesisKey, run) {
    if (!this.byHypothesis.has(hypothesisKey)) {
      this.byHypothesis.set(hypothesisKey, { hypothesisKey, runs: [], firstObserved: run.completedAt, lastObserved: run.completedAt });
    }
    const body = this.byHypothesis.get(hypothesisKey);
    body.runs.push(run);
    body.lastObserved = run.completedAt;
    return this.summarize(hypothesisKey);
  }

  /**
   * Aggregates every run for a hypothesis into a working conclusion.
   * Deliberately conservative wording at every tier.
   */
  summarize(hypothesisKey) {
    const body = this.byHypothesis.get(hypothesisKey);
    if (!body) return null;

    const graded = body.runs.filter((r) => r.strength !== EVIDENCE_STRENGTH.INCONCLUSIVE);
    const supporting = graded.filter((r) =>
      [EVIDENCE_STRENGTH.STRONG_SUPPORT, EVIDENCE_STRENGTH.MODERATE_SUPPORT, EVIDENCE_STRENGTH.WEAK_SUPPORT].includes(r.strength));
    const contradicting = graded.filter((r) => r.strength === EVIDENCE_STRENGTH.CONTRADICTS);
    const nullResults = graded.filter((r) => r.strength === EVIDENCE_STRENGTH.NO_EFFECT);

    let tier;
    if (contradicting.length > 0 && supporting.length > 0) tier = CONCLUSION_TIER.CONTESTED;
    else if (supporting.length >= MIN_REPLICATIONS_FOR_WORKING_CONCLUSION) tier = CONCLUSION_TIER.WELL_REPLICATED;
    else if (supporting.length >= 2) tier = CONCLUSION_TIER.REPLICATED;
    else tier = CONCLUSION_TIER.SINGLE_OBSERVATION;

    const deltas = supporting.map((r) => r.primaryDelta).filter((d) => typeof d === 'number');
    const meanDelta = deltas.length ? Number((deltas.reduce((a, b) => a + b, 0) / deltas.length).toFixed(1)) : null;

    return {
      hypothesisKey,
      totalRuns: body.runs.length,
      gradedRuns: graded.length,
      supportingRuns: supporting.length,
      contradictingRuns: contradicting.length,
      nullRuns: nullResults.length,
      inconclusiveRuns: body.runs.length - graded.length,
      replicationTier: tier,
      meanPrimaryDelta: meanDelta,
      firstObserved: body.firstObserved,
      lastObserved: body.lastObserved,
      /** The strongest sentence the system is permitted to say about this hypothesis. */
      workingConclusion: buildWorkingConclusion(tier, supporting.length, contradicting.length, meanDelta),
      /** Always present. There is no tier at which this disappears. */
      epistemicStatus:
        'This is a working conclusion drawn from repeated observation, not established causal fact. It remains open to revision by further evidence.',
      history: body.runs.map((r) => ({
        experimentId: r.experimentId,
        completedAt: r.completedAt,
        strength: r.strength,
        primaryDelta: r.primaryDelta,
        operationId: r.operationId,
      })),
    };
  }

  get(hypothesisKey) { return this.summarize(hypothesisKey); }
  all() { return Array.from(this.byHypothesis.keys()).map((k) => this.summarize(k)); }
}

function buildWorkingConclusion(tier, supporting, contradicting, meanDelta) {
  const d = meanDelta === null ? '' : ` Mean effect across supporting runs: ${meanDelta > 0 ? '+' : ''}${meanDelta}.`;
  switch (tier) {
    case CONCLUSION_TIER.CONTESTED:
      return `Evidence is contested: ${supporting} run(s) support the hypothesis and ${contradicting} contradict it. No conclusion can be drawn; the effect may depend on conditions not yet identified.${d}`;
    case CONCLUSION_TIER.WELL_REPLICATED:
      return `Consistently reproduced across ${supporting} independent runs. This is a strong working conclusion, but it remains an inference from repeated correlation rather than a demonstrated mechanism.${d}`;
    case CONCLUSION_TIER.REPLICATED:
      return `Reproduced in ${supporting} runs. Suggestive, but below the ${MIN_REPLICATIONS_FOR_WORKING_CONCLUSION}-run threshold at which this system will treat a relationship as a working conclusion.${d}`;
    default:
      return `Observed once. A single run is supporting evidence only — it cannot distinguish the intervention from a coincidental change in workload.${d}`;
  }
}

export const evidenceLedger = new EvidenceLedger();

class ExperimentCenter {
  constructor() {
    this.experiments = new Map();
  }
  reset() { this.experiments.clear(); evidenceLedger.reset(); }

  /**
   * Stage 1-3: build a proposal from a hypothesis plus the evidence that motivated it.
   * Nothing runs. The proposal explicitly states what will be changed and how to undo it.
   */
  propose({ catalogueId, incidentId = null, hypothesis = null, motivatingEvidence = [], subject = null }) {
    const spec = EXPERIMENT_CATALOGUE[catalogueId];
    if (!spec) throw new Error(`Unknown experiment: ${catalogueId}`);

    const id = `exp_${crypto.randomBytes(4).toString('hex')}`;
    const resolvedHypothesis = hypothesis || (subject
      ? spec.hypothesisTemplate.replace(/^\w+/, subject)
      : spec.hypothesisTemplate);

    const evidence = motivatingEvidence.map((e) =>
      (e && e.quality ? e : createEvidence({ label: e?.label || 'Motivating observation', value: e?.value, quality: e?.quality || EVIDENCE_QUALITY.OBSERVED, source: e?.source })));
    const quality = summarizeEvidence(evidence);

    const exp = {
      experimentId: id,
      catalogueId,
      incidentId,
      stage: EXPERIMENT_STAGE.AWAITING_APPROVAL,
      title: spec.title,
      category: spec.category,
      hypothesis: resolvedHypothesis,
      hypothesisKey: `${catalogueId}::${resolvedHypothesis}`,
      motivatingEvidence: evidence,
      evidenceQuality: quality,
      proposal: {
        whatWillHappen: spec.intervention.label,
        actionId: spec.intervention.actionId,
        reversible: spec.intervention.reversible,
        destructive: spec.intervention.destructive,
        howToUndo: spec.reversal ? spec.reversal.label : 'No undo required — the change is transient.',
        estimatedDurationSec: spec.durationSec,
        metricsWatched: spec.metrics,
        primaryMetric: spec.primaryMetric,
        risk: spec.risk,
        /** Surfaced BEFORE approval so consent is informed. */
        knownConfounders: spec.confounders,
        limitation:
          'A single experiment cannot establish causation. The result will be recorded as evidence of a given strength and combined with any previous runs.',
      },
      approval: null,
      before: null,
      after: null,
      result: null,
      operationId: null,
      predictionId: null,
      createdAt: new Date().toISOString(),
      history: [{ stage: EXPERIMENT_STAGE.PROPOSED, at: new Date().toISOString() }],
    };

    // Register the causal claim with the calibration engine so the outcome grades it.
    const pred = calibrationEngine.recordPrediction({
      category: spec.category,
      hypothesis: resolvedHypothesis,
      predictedConfidence: quality.confidenceCeiling,
      evidenceBasis: quality.basis,
      experimentId: id,
    });
    exp.predictionId = pred.predictionId;

    this.experiments.set(id, exp);
    return exp;
  }

  /** Stage 4: explicit user approval. No experiment runs without it. */
  approve(experimentId, { approvedBy = 'user', note = null } = {}) {
    const exp = this.experiments.get(experimentId);
    if (!exp) throw new Error(`Unknown experiment: ${experimentId}`);
    if (exp.stage !== EXPERIMENT_STAGE.AWAITING_APPROVAL) {
      throw new Error(`Experiment ${experimentId} is in stage ${exp.stage} and cannot be approved.`);
    }
    exp.approval = { approved: true, approvedBy, note, at: new Date().toISOString() };
    exp.stage = EXPERIMENT_STAGE.APPROVED;
    exp.history.push({ stage: EXPERIMENT_STAGE.APPROVED, at: exp.approval.at });
    return exp;
  }

  reject(experimentId, { reason = 'Declined by user' } = {}) {
    const exp = this.experiments.get(experimentId);
    if (!exp) throw new Error(`Unknown experiment: ${experimentId}`);
    exp.stage = EXPERIMENT_STAGE.REJECTED;
    exp.approval = { approved: false, reason, at: new Date().toISOString() };
    exp.history.push({ stage: EXPERIMENT_STAGE.REJECTED, at: exp.approval.at });
    // A rejected experiment leaves its prediction unresolved rather than assuming anything.
    calibrationEngine.resolvePrediction(exp.predictionId, {
      outcome: OUTCOME.ABANDONED,
      source: 'user declined the experiment',
      note: reason,
    });
    return exp;
  }

  /** Stage 5: baseline snapshot. */
  captureBefore(experimentId, telemetry) {
    const exp = this.experiments.get(experimentId);
    if (!exp) throw new Error(`Unknown experiment: ${experimentId}`);
    if (exp.stage !== EXPERIMENT_STAGE.APPROVED) {
      throw new Error(`Cannot capture a baseline for ${experimentId}: it has not been approved (stage ${exp.stage}).`);
    }
    exp.before = { capturedAt: new Date().toISOString(), telemetry: { ...telemetry } };
    exp.stage = EXPERIMENT_STAGE.BASELINE_CAPTURE;
    exp.history.push({ stage: EXPERIMENT_STAGE.BASELINE_CAPTURE, at: exp.before.capturedAt });
    return exp;
  }

  /** Stage 6-7: record the intervention and the after snapshot. */
  captureAfter(experimentId, telemetry, { operationId = null } = {}) {
    const exp = this.experiments.get(experimentId);
    if (!exp) throw new Error(`Unknown experiment: ${experimentId}`);
    if (!exp.before) throw new Error(`Cannot capture an after-state for ${experimentId}: no baseline was recorded.`);
    exp.after = { capturedAt: new Date().toISOString(), telemetry: { ...telemetry } };
    exp.operationId = operationId;
    exp.stage = EXPERIMENT_STAGE.AFTER_CAPTURE;
    exp.history.push({ stage: EXPERIMENT_STAGE.AFTER_CAPTURE, at: exp.after.capturedAt, operationId });
    return exp;
  }

  /**
   * Stage 8-9: compute the difference and grade the EVIDENCE STRENGTH.
   * This is where the "no permanent causal truth" rule is enforced.
   */
  analyze(experimentId) {
    const exp = this.experiments.get(experimentId);
    if (!exp) throw new Error(`Unknown experiment: ${experimentId}`);
    if (!exp.before || !exp.after) throw new Error(`Experiment ${experimentId} lacks before/after snapshots.`);

    const spec = EXPERIMENT_CATALOGUE[exp.catalogueId];
    const deltas = {};
    let unreadable = 0;

    for (const metric of spec.metrics) {
      const b = exp.before.telemetry[metric];
      const a = exp.after.telemetry[metric];
      const bn = typeof b === 'number' ? b : null;
      const an = typeof a === 'number' ? a : null;
      if (bn === null || an === null) {
        unreadable += 1;
        deltas[metric] = { before: b ?? null, after: a ?? null, delta: null, readable: false };
      } else {
        deltas[metric] = {
          before: bn,
          after: an,
          delta: Number((an - bn).toFixed(2)),
          pctChange: bn !== 0 ? Number((((an - bn) / bn) * 100).toFixed(1)) : null,
          readable: true,
        };
      }
    }

    const primary = deltas[spec.primaryMetric];
    let strength;
    let rationale;

    if (!primary || !primary.readable) {
      // Cannot grade what we could not measure.
      strength = EVIDENCE_STRENGTH.INCONCLUSIVE;
      rationale = `The primary metric "${spec.primaryMetric}" could not be read in both snapshots, so this run produces no evidence either way.`;
    } else {
      const observed = primary.delta;
      const wanted = spec.direction === 'decrease' ? -Math.abs(spec.meaningfulDelta) : Math.abs(spec.meaningfulDelta);
      const movedRightWay = spec.direction === 'decrease' ? observed < 0 : observed > 0;
      const magnitude = Math.abs(observed);
      const threshold = Math.abs(spec.meaningfulDelta);

      if (!movedRightWay && magnitude >= threshold) {
        strength = EVIDENCE_STRENGTH.CONTRADICTS;
        rationale = `${spec.primaryMetric} moved ${observed > 0 ? 'up' : 'down'} by ${magnitude}, the opposite of what the hypothesis predicts.`;
      } else if (magnitude < threshold * 0.34) {
        strength = EVIDENCE_STRENGTH.NO_EFFECT;
        rationale = `${spec.primaryMetric} changed by only ${observed}, which is within normal variation for this metric.`;
      } else if (magnitude >= threshold * 2) {
        strength = EVIDENCE_STRENGTH.STRONG_SUPPORT;
        rationale = `${spec.primaryMetric} moved ${observed} (from ${primary.before} to ${primary.after}), more than double the ${threshold} threshold for a meaningful effect.`;
      } else if (magnitude >= threshold) {
        strength = EVIDENCE_STRENGTH.MODERATE_SUPPORT;
        rationale = `${spec.primaryMetric} moved ${observed} (from ${primary.before} to ${primary.after}), exceeding the ${threshold} threshold for a meaningful effect.`;
      } else {
        strength = EVIDENCE_STRENGTH.WEAK_SUPPORT;
        rationale = `${spec.primaryMetric} moved ${observed}, in the predicted direction but below the ${threshold} threshold for a clearly meaningful effect.`;
      }
      void wanted;
    }

    const run = {
      experimentId,
      completedAt: new Date().toISOString(),
      strength,
      primaryDelta: primary?.readable ? primary.delta : null,
      operationId: exp.operationId,
    };

    // Fold into the cross-run ledger BEFORE forming any conclusion.
    const body = evidenceLedger.record(exp.hypothesisKey, run);

    // Grade the original prediction against reality.
    const outcome = strength === EVIDENCE_STRENGTH.INCONCLUSIVE ? OUTCOME.INCONCLUSIVE
      : strength === EVIDENCE_STRENGTH.CONTRADICTS ? OUTCOME.REFUTED
      : strength === EVIDENCE_STRENGTH.NO_EFFECT ? OUTCOME.REFUTED
      : OUTCOME.CONFIRMED;
    calibrationEngine.resolvePrediction(exp.predictionId, {
      outcome,
      source: `experiment ${experimentId} before/after telemetry`,
      note: rationale,
    });

    exp.result = {
      strength,
      rationale,
      deltas,
      unreadableMetrics: unreadable,
      supportsHypothesis: [EVIDENCE_STRENGTH.STRONG_SUPPORT, EVIDENCE_STRENGTH.MODERATE_SUPPORT, EVIDENCE_STRENGTH.WEAK_SUPPORT].includes(strength),
      durationSec: Math.round((Date.parse(exp.after.capturedAt) - Date.parse(exp.before.capturedAt)) / 1000),

      // ── The anti-overclaim block. Always present, in every single result. ──
      causalStatus: {
        establishesCausation: false,
        statement:
          'This experiment does NOT establish permanent causal truth by itself. It is one observation, recorded as evidence of the strength shown above.',
        confounders: spec.confounders,
        replication: {
          runsSoFar: body.totalRuns,
          supportingRuns: body.supportingRuns,
          contradictingRuns: body.contradictingRuns,
          tier: body.replicationTier,
          runsNeededForWorkingConclusion: Math.max(0, MIN_REPLICATIONS_FOR_WORKING_CONCLUSION - body.supportingRuns),
        },
        workingConclusion: body.workingConclusion,
        epistemicStatus: body.epistemicStatus,
      },
      evidenceBody: body,
    };
    exp.stage = EXPERIMENT_STAGE.COMPLETE;
    exp.history.push({ stage: EXPERIMENT_STAGE.COMPLETE, at: run.completedAt });
    return exp;
  }

  get(experimentId) { return this.experiments.get(experimentId) || null; }
  list() { return Array.from(this.experiments.values()); }

  /** Renders the spec's example text block. */
  renderResultText(experimentId) {
    const exp = this.experiments.get(experimentId);
    if (!exp?.result) return null;
    const spec = EXPERIMENT_CATALOGUE[exp.catalogueId];
    const lines = [];
    lines.push(`Hypothesis: ${exp.hypothesis}`);
    lines.push('');
    lines.push('Before');
    for (const m of spec.metrics) {
      const d = exp.result.deltas[m];
      lines.push(`${m}: ${d.readable ? d.before : 'unavailable'}`);
    }
    lines.push('');
    lines.push('Experiment');
    lines.push(spec.intervention.label);
    lines.push('');
    lines.push('After');
    for (const m of spec.metrics) {
      const d = exp.result.deltas[m];
      lines.push(`${m}: ${d.readable ? d.after : 'unavailable'}`);
    }
    lines.push('');
    lines.push('Result');
    lines.push(`${exp.result.supportsHypothesis ? '✓' : '✗'} ${exp.result.strength}`);
    lines.push('');
    lines.push('Important:');
    lines.push('This experiment does NOT establish permanent');
    lines.push('causal truth by itself.');
    lines.push('');
    lines.push(`Replication: ${exp.result.causalStatus.replication.tier} (${exp.result.causalStatus.replication.supportingRuns} supporting run(s))`);
    return lines.join('\n');
  }
}

export const experimentCenter = new ExperimentCenter();
