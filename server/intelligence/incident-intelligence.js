/**
 * WinSuite & MacSuite v10.1 — Incident Intelligence Center  [P1 #11, #6 causal timeline]
 *
 * An incident is the unit of truth in this product. It is the thing that persists across
 * diagnostics, accumulates evidence, gets experimented on, gets repaired, and gets
 * verified — with every step attributable to an operation ID.
 *
 * Lifecycle (v10.1 supersedes the v9 six-state model):
 *   DETECTED → INVESTIGATING → CONFIRMED → REPAIRING → VERIFYING → RESOLVED
 *                                                                 ↘ UNRESOLVED
 *
 * Non-negotiables encoded here:
 *  - Status transitions are validated. You cannot jump from DETECTED to RESOLVED; a
 *    repair that was never verified cannot claim resolution.
 *  - CONFIRMED requires an actual confirming observation, not merely high confidence.
 *  - Every timeline entry carries its own evidence quality, so a causal chain built on
 *    estimates renders differently from one built on observations.
 *  - Correlation strength is computed from temporal proximity and repetition; it is never
 *    asserted, and it is never upgraded to causation without an experiment.
 */

import crypto from 'crypto';
import { EVIDENCE_QUALITY, createEvidence, summarizeEvidence } from '../core/evidence.js';
import { analyzeCauses } from './causal-reasoner.js';

export const INCIDENT_STATUS = {
  DETECTED: 'DETECTED',
  INVESTIGATING: 'INVESTIGATING',
  CONFIRMED: 'CONFIRMED',
  REPAIRING: 'REPAIRING',
  VERIFYING: 'VERIFYING',
  RESOLVED: 'RESOLVED',
  UNRESOLVED: 'UNRESOLVED',
};

/** Legal transitions. Anything else throws — the lifecycle is a real state machine. */
const TRANSITIONS = {
  DETECTED: ['INVESTIGATING', 'UNRESOLVED'],
  INVESTIGATING: ['CONFIRMED', 'UNRESOLVED', 'DETECTED'],
  CONFIRMED: ['REPAIRING', 'INVESTIGATING', 'UNRESOLVED'],
  REPAIRING: ['VERIFYING', 'UNRESOLVED'],
  VERIFYING: ['RESOLVED', 'UNRESOLVED', 'CONFIRMED'],
  RESOLVED: ['DETECTED'],       // recurrence reopens
  UNRESOLVED: ['INVESTIGATING', 'DETECTED'],
};

export const CORRELATION_STRENGTH = {
  STRONG: 'Strong',
  MODERATE: 'Moderate',
  WEAK: 'Weak',
  NONE: 'None',
  INSUFFICIENT_DATA: 'Insufficient data',
};

/**
 * Computes correlation strength between a trigger event and a symptom event.
 * Purely mechanical: temporal proximity + how often the pairing has repeated.
 * Never returns a causal claim.
 */
export function computeCorrelation({ triggerAt, symptomAt, priorCooccurrences = 0, priorTriggerOccurrences = 0 }) {
  const t = Date.parse(triggerAt);
  const s = Date.parse(symptomAt);
  if (!Number.isFinite(t) || !Number.isFinite(s)) {
    return { strength: CORRELATION_STRENGTH.INSUFFICIENT_DATA, lagSeconds: null, score: 0, basis: 'Timestamps unavailable.' };
  }
  const lagSeconds = Math.round((s - t) / 1000);
  if (lagSeconds < 0) {
    return {
      strength: CORRELATION_STRENGTH.NONE,
      lagSeconds,
      score: 0,
      basis: `The symptom preceded the candidate trigger by ${Math.abs(lagSeconds)}s, so the trigger cannot be its cause.`,
    };
  }

  // Temporal component: tight coupling within ~2 minutes is meaningful, decaying after.
  let temporal;
  if (lagSeconds <= 120) temporal = 1.0;
  else if (lagSeconds <= 300) temporal = 0.7;
  else if (lagSeconds <= 900) temporal = 0.4;
  else temporal = 0.15;

  // Repetition component: has this pairing happened before?
  const repetition = priorTriggerOccurrences > 0
    ? Math.min(1, priorCooccurrences / priorTriggerOccurrences)
    : 0;

  // Weighted: a single tight coincidence is suggestive; a repeated one is compelling.
  const score = Math.round((temporal * 0.6 + repetition * 0.4) * 100);

  let strength;
  if (priorTriggerOccurrences < 2 && lagSeconds > 300) strength = CORRELATION_STRENGTH.INSUFFICIENT_DATA;
  else if (score >= 75) strength = CORRELATION_STRENGTH.STRONG;
  else if (score >= 50) strength = CORRELATION_STRENGTH.MODERATE;
  else if (score >= 25) strength = CORRELATION_STRENGTH.WEAK;
  else strength = CORRELATION_STRENGTH.NONE;

  return {
    strength,
    score,
    lagSeconds,
    basis: buildCorrelationBasis({ lagSeconds, priorCooccurrences, priorTriggerOccurrences, temporal, repetition }),
    // The line that stops correlation being read as causation.
    causalDisclaimer:
      'Correlation describes timing only. It does not establish that the trigger caused the symptom — run a controlled experiment to test that.',
  };
}

function buildCorrelationBasis({ lagSeconds, priorCooccurrences, priorTriggerOccurrences }) {
  const parts = [`Symptom began ${lagSeconds}s after the trigger.`];
  if (priorTriggerOccurrences > 0) {
    const pct = Math.round((priorCooccurrences / priorTriggerOccurrences) * 100);
    parts.push(`This pairing has occurred in ${priorCooccurrences} of ${priorTriggerOccurrences} prior observations (${pct}%).`);
  } else {
    parts.push('No prior occurrences of this trigger are on record, so repetition cannot be assessed.');
  }
  return parts.join(' ');
}

let seq = 1000;
function nextIncidentId() { return `inc-${++seq}`; }

class IncidentIntelligence {
  constructor() {
    /** @type {Map<string, object>} */
    this.incidents = new Map();
  }

  /** Test isolation. */
  reset() { this.incidents.clear(); seq = 1000; }

  /**
   * Opens a new incident in DETECTED. An incident always starts as an observation,
   * never as a conclusion.
   */
  open({
    title,
    category = 'performance',
    severity = 'medium',
    detectedAt = new Date().toISOString(),
    symptom = null,
    subsystems = [],
    telemetry = null,
  }) {
    const id = nextIncidentId();
    const inc = {
      id,
      schemaVersion: '10.1',
      title,
      category,
      severity,
      status: INCIDENT_STATUS.DETECTED,
      firstObserved: detectedAt,
      lastObserved: detectedAt,
      occurrenceCount: 1,
      symptom,
      correlatedSubsystems: subsystems,
      timeline: [],
      evidence: [],
      causeAnalysis: null,
      experiments: [],
      repairs: [],
      verification: null,
      operationIds: [],
      statusHistory: [{ status: INCIDENT_STATUS.DETECTED, at: detectedAt, note: 'Incident detected from telemetry.', operationId: null }],
      resolutionNote: null,
    };
    this.incidents.set(id, inc);

    if (telemetry) this.analyze(id, telemetry);
    return inc;
  }

  get(id) { return this.incidents.get(id) || null; }
  list() { return Array.from(this.incidents.values()); }

  /** Records a repeat sighting rather than opening a duplicate. */
  observeAgain(id, at = new Date().toISOString()) {
    const inc = this.incidents.get(id);
    if (!inc) return null;
    inc.lastObserved = at;
    inc.occurrenceCount += 1;
    return inc;
  }

  /**
   * Runs the causal reasoner over telemetry and attaches the ranked candidates
   * (including the ruled-out ones) to the incident.
   */
  analyze(id, telemetry, question) {
    const inc = this.incidents.get(id);
    if (!inc) return null;
    inc.causeAnalysis = analyzeCauses(telemetry, question ? { question } : undefined);

    // Analysing means we are investigating. Only transition if legal.
    if (inc.status === INCIDENT_STATUS.DETECTED) {
      this.transition(id, INCIDENT_STATUS.INVESTIGATING, 'Candidate causes ranked against telemetry.');
    }
    return inc;
  }

  /**
   * Appends a causal-timeline event. Each event carries its own evidence quality
   * and its correlation to the preceding event.
   */
  addTimelineEvent(id, {
    at,
    label,
    detail = null,
    source = 'system telemetry',
    quality = EVIDENCE_QUALITY.OBSERVED,
    value = null,
    subsystem = null,
    isTrigger = false,
    isSymptom = false,
    priorCooccurrences = 0,
    priorTriggerOccurrences = 0,
  }) {
    const inc = this.incidents.get(id);
    if (!inc) return null;

    const ev = createEvidence({ label, value, quality, source, collectedAt: at });
    const previous = inc.timeline[inc.timeline.length - 1] || null;

    const entry = {
      eventId: `evt_${crypto.randomBytes(3).toString('hex')}`,
      at,
      label,
      detail,
      subsystem,
      isTrigger,
      isSymptom,
      // Evidence drill-down target: clicking an event opens this.
      evidence: ev,
      quality: ev.quality,
      qualityLabel: ev.qualityLabel,
      displayValue: ev.displayValue,
      source,
      correlationToPrevious: previous
        ? computeCorrelation({
            triggerAt: previous.at,
            symptomAt: at,
            priorCooccurrences,
            priorTriggerOccurrences,
          })
        : null,
    };

    inc.timeline.push(entry);
    inc.evidence.push(ev);
    inc.lastObserved = at > inc.lastObserved ? at : inc.lastObserved;
    return entry;
  }

  /**
   * Validated status transition. Illegal transitions throw rather than silently
   * corrupting the lifecycle.
   */
  transition(id, next, note = null, { operationId = null, force = false } = {}) {
    const inc = this.incidents.get(id);
    if (!inc) return null;
    const allowed = TRANSITIONS[inc.status] || [];
    if (!allowed.includes(next) && !force) {
      throw new Error(
        `Illegal incident transition ${inc.status} → ${next} for ${id}. Allowed: ${allowed.join(', ') || 'none'}.`
      );
    }

    // CONFIRMED demands a real confirming observation.
    if (next === INCIDENT_STATUS.CONFIRMED) {
      const hasSupport = Boolean(inc.causeAnalysis?.leadingCause) || inc.experiments.some((e) => e.supportsHypothesis);
      if (!hasSupport && !force) {
        throw new Error(
          `Cannot confirm ${id}: no leading cause and no supporting experiment. Confidence alone does not confirm an incident.`
        );
      }
    }
    // RESOLVED demands verification that actually passed.
    if (next === INCIDENT_STATUS.RESOLVED && !force) {
      if (!inc.verification || inc.verification.status !== 'PASSED') {
        throw new Error(
          `Cannot resolve ${id}: post-repair verification has not passed. An unverified repair cannot close an incident.`
        );
      }
    }

    inc.status = next;
    inc.statusHistory.push({ status: next, at: new Date().toISOString(), note, operationId });
    if (operationId && !inc.operationIds.includes(operationId)) inc.operationIds.push(operationId);
    return inc;
  }

  /** Attaches an experiment result (from the experiment engine). */
  attachExperiment(id, experiment) {
    const inc = this.incidents.get(id);
    if (!inc) return null;
    // An experiment is attached at proposal time and again once analysed, so the
    // same experimentId must replace its earlier revision rather than appear twice.
    const existing = inc.experiments.findIndex((e) => e.experimentId === experiment.experimentId);
    if (existing >= 0) inc.experiments[existing] = experiment;
    else inc.experiments.push(experiment);
    if (experiment.operationId && !inc.operationIds.includes(experiment.operationId)) {
      inc.operationIds.push(experiment.operationId);
    }
    return inc;
  }

  /** Attaches a repair operation. */
  attachRepair(id, { operationId, actionId, label, at = new Date().toISOString(), reversible = true, result = null }) {
    const inc = this.incidents.get(id);
    if (!inc) return null;
    inc.repairs.push({ operationId, actionId, label, at, reversible, result });
    if (operationId && !inc.operationIds.includes(operationId)) inc.operationIds.push(operationId);
    return inc;
  }

  /** Records before/after verification for the repair. */
  setVerification(id, { status, beforeState, afterState, verdict, operationId = null }) {
    const inc = this.incidents.get(id);
    if (!inc) return null;
    inc.verification = {
      status,
      beforeState,
      afterState,
      verdict,
      operationId,
      verifiedAt: new Date().toISOString(),
    };
    if (operationId && !inc.operationIds.includes(operationId)) inc.operationIds.push(operationId);
    return inc;
  }

  /**
   * Builds the full detail view the Incident Intelligence Center renders.
   */
  detail(id) {
    const inc = this.incidents.get(id);
    if (!inc) return null;

    const quality = summarizeEvidence(inc.evidence);
    const analysis = inc.causeAnalysis;

    const chain = inc.timeline.map((e, i) => ({
      ...e,
      isFirst: i === 0,
      isLast: i === inc.timeline.length - 1,
      arrow: i < inc.timeline.length - 1 ? '↓' : null,
    }));

    // Overall correlation strength for the chain = weakest observed link.
    const links = inc.timeline.map((e) => e.correlationToPrevious).filter(Boolean);
    const order = [
      CORRELATION_STRENGTH.NONE,
      CORRELATION_STRENGTH.INSUFFICIENT_DATA,
      CORRELATION_STRENGTH.WEAK,
      CORRELATION_STRENGTH.MODERATE,
      CORRELATION_STRENGTH.STRONG,
    ];
    const chainStrength = links.length
      ? links.reduce((worst, l) => (order.indexOf(l.strength) < order.indexOf(worst) ? l.strength : worst), CORRELATION_STRENGTH.STRONG)
      : CORRELATION_STRENGTH.INSUFFICIENT_DATA;

    return {
      schemaVersion: '10.1',
      id: inc.id,
      title: inc.title,
      category: inc.category,
      severity: inc.severity,
      status: inc.status,
      statusLabel: statusLabel(inc.status),
      lifecycle: {
        stages: Object.values(INCIDENT_STATUS).filter((s) => s !== INCIDENT_STATUS.UNRESOLVED),
        current: inc.status,
        history: inc.statusHistory,
        nextLegalStates: TRANSITIONS[inc.status] || [],
      },
      firstObserved: inc.firstObserved,
      lastObserved: inc.lastObserved,
      occurrenceCount: inc.occurrenceCount,
      symptom: inc.symptom,
      correlatedSubsystems: inc.correlatedSubsystems,

      // ── Cause analysis, including what was ruled out ──
      rootCauseCandidates: analysis?.ranking || [],
      leadingCause: analysis?.leadingCause || null,
      isDecisive: analysis?.isDecisive ?? false,
      ambiguity: analysis?.ambiguity || null,
      ruledOut: analysis?.ruledOut || [],
      undetermined: analysis?.undetermined || [],

      // ── Evidence ──
      evidenceCount: inc.evidence.length,
      evidenceQuality: quality,
      evidenceBasis: quality.basis,
      containsEstimates: quality.hasEstimates,
      dataCompleteness: quality.hasUnavailable
        ? 'PARTIAL — some probes could not be read. Conclusions cover only what was observable.'
        : 'COMPLETE',

      // ── Causal timeline ──
      timeline: chain,
      correlation: {
        chainStrength,
        links: links.length,
        disclaimer:
          'Timing correlation is not proof of causation. Confirm with a controlled experiment before treating any link as causal.',
      },

      // ── What has been done ──
      experiments: inc.experiments,
      repairs: inc.repairs,
      verification: inc.verification,
      operationIds: inc.operationIds,

      recommendedActions: buildRecommendedActions(inc, analysis),
      resolutionNote: inc.resolutionNote,
    };
  }
}

function statusLabel(status) {
  return {
    DETECTED: 'Detected — observed but not yet investigated',
    INVESTIGATING: 'Investigating — candidate causes being ranked',
    CONFIRMED: 'Confirmed — a cause is supported by evidence',
    REPAIRING: 'Repairing — remediation in progress',
    VERIFYING: 'Verifying — checking the repair actually worked',
    RESOLVED: 'Resolved — repair verified against telemetry',
    UNRESOLVED: 'Unresolved — could not be diagnosed or repaired',
  }[status] || status;
}

/**
 * Recommended actions are derived from the leading cause, and are deliberately
 * suppressed when the analysis is ambiguous — recommending a fix for a cause you
 * have not established is how a tool destroys a user's trust.
 */
function buildRecommendedActions(inc, analysis) {
  if (!analysis) {
    return { available: false, reason: 'No cause analysis has been run for this incident yet.', actions: [] };
  }
  if (!analysis.leadingCause) {
    return { available: false, reason: analysis.coverage.qualifier, actions: [] };
  }
  if (!analysis.isDecisive) {
    return {
      available: false,
      reason: analysis.ambiguity,
      // Ambiguity has its own correct action: disambiguate.
      actions: [{
        actionId: 'experiment.run',
        label: 'Run an experiment to separate the candidates',
        rationale: analysis.ambiguity,
        reversible: true,
        destructive: false,
      }],
    };
  }

  const byCause = {
    memory_pressure: [
      { actionId: 'experiment.run', label: 'Test the leading contributor by pausing it', rationale: 'Confirms the attribution before anything is changed permanently.', reversible: true, destructive: false },
      { actionId: 'storage.purgeRam', label: 'Purge inactive memory buffers', rationale: 'Reclaims inactive pages without quitting applications.', reversible: true, destructive: false },
    ],
    disk_io: [
      { actionId: 'storage.cleanXcode', label: 'Reclaim developer build caches', rationale: 'Restores APFS headroom, which reduces write amplification.', reversible: false, destructive: true },
    ],
    cpu_saturation: [
      { actionId: 'process.inspect', label: 'Inspect the top CPU consumer', rationale: 'Identify the specific process before terminating anything.', reversible: true, destructive: false },
    ],
    thermal_throttling: [
      { actionId: 'thermal.inspect', label: 'Review thermal history and correlated workloads', rationale: 'Thermal events usually correlate with a specific recurring workload.', reversible: true, destructive: false },
    ],
    startup_load: [
      { actionId: 'startup.review', label: 'Review login items and launch agents', rationale: 'Background agents compete for the resources the foreground app needs.', reversible: true, destructive: false },
    ],
    spotlight_indexing: [
      { actionId: 'noop.wait', label: 'Wait for indexing to complete', rationale: 'Spotlight re-indexing is self-limiting; intervening usually restarts it.', reversible: true, destructive: false },
    ],
  };

  return {
    available: true,
    basedOn: analysis.leadingCause.label,
    confidence: analysis.leadingCause.confidence,
    reason: analysis.leadingCause.reasoning.answer,
    actions: byCause[analysis.leadingCause.id] || [],
  };
}

export const incidentIntelligence = new IncidentIntelligence();
