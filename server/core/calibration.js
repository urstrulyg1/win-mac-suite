/**
 * WinSuite & MacSuite v10.0 — Diagnostic Confidence Calibration (P0 #4)
 *
 * A confidence number is worthless unless we check it against reality.
 * Every time the engine predicts a cause, we record the prediction. When an
 * experiment / repair / verification later produces a ground-truth outcome we
 * resolve that prediction and update per-category accuracy.
 *
 * The calibrated multiplier is then fed back into future confidence scores, so a
 * category that has historically been over-confident gets damped automatically.
 *
 * IMPORTANT: this never invents outcomes. A prediction stays PENDING until a real
 * observation resolves it, and PENDING predictions do not move accuracy.
 */

import crypto from 'crypto';

export const CALIBRATION_CATEGORY = {
  MEMORY: 'memory',
  NETWORK: 'network',
  BATTERY: 'battery',
  CRASH: 'crash',
  STORAGE: 'storage',
  THERMAL: 'thermal',
  SECURITY: 'security',
  DEVELOPER: 'developer',
};

export const OUTCOME = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',       // prediction matched reality
  REFUTED: 'REFUTED',           // reality contradicted the prediction
  INCONCLUSIVE: 'INCONCLUSIVE', // experiment ran but could not decide
  ABANDONED: 'ABANDONED',       // never resolved (expired)
};

/** Predictions older than this with no outcome are abandoned, not counted. */
const PREDICTION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RECORDS = 1000;

/** Confidence buckets used for reliability-diagram style calibration. */
const BUCKETS = [
  { min: 0, max: 49, label: '0-49%' },
  { min: 50, max: 64, label: '50-64%' },
  { min: 65, max: 79, label: '65-79%' },
  { min: 80, max: 89, label: '80-89%' },
  { min: 90, max: 100, label: '90-100%' },
];

function bucketFor(confidence) {
  return BUCKETS.find((b) => confidence >= b.min && confidence <= b.max) || BUCKETS[0];
}

class CalibrationEngine {
  constructor() {
    /** @type {Map<string, object>} */
    this.records = new Map();
    this.order = [];
  }

  /**
   * Record a prediction the diagnostic engine just made.
   * Call this at the moment a Finding with a causal claim is produced.
   */
  recordPrediction({
    category,
    findingId = null,
    hypothesis,
    predictedConfidence,
    evidenceBasis = null,
    experimentId = null,
  }) {
    const id = `pred_${crypto.randomBytes(4).toString('hex')}`;
    const record = {
      predictionId: id,
      category: category || 'unknown',
      findingId,
      hypothesis: hypothesis || 'unspecified hypothesis',
      predictedConfidence: clamp(predictedConfidence, 0, 100),
      confidenceBucket: bucketFor(clamp(predictedConfidence, 0, 100)).label,
      evidenceBasis,
      experimentId,
      outcome: OUTCOME.PENDING,
      outcomeSource: null,
      outcomeNote: null,
      predictedAt: new Date().toISOString(),
      resolvedAt: null,
    };
    this.records.set(id, record);
    this.order.push(id);
    if (this.order.length > MAX_RECORDS) {
      const drop = this.order.shift();
      this.records.delete(drop);
    }
    return record;
  }

  /**
   * Resolve a prediction with a REAL observed outcome.
   * `source` must describe where the truth came from (experiment, verification probe,
   * user confirmation) — we never resolve from model opinion.
   */
  resolvePrediction(predictionId, { outcome, source, note = null } = {}) {
    const rec = this.records.get(predictionId);
    if (!rec) return { ok: false, error: `Unknown prediction ${predictionId}` };
    if (rec.outcome !== OUTCOME.PENDING) {
      return { ok: false, error: `Prediction ${predictionId} already resolved as ${rec.outcome}` };
    }
    if (!Object.values(OUTCOME).includes(outcome) || outcome === OUTCOME.PENDING) {
      return { ok: false, error: `Invalid outcome "${outcome}"` };
    }
    if (!source) {
      return { ok: false, error: 'An outcome must cite its evidence source; predictions cannot be resolved without one.' };
    }
    rec.outcome = outcome;
    rec.outcomeSource = source;
    rec.outcomeNote = note;
    rec.resolvedAt = new Date().toISOString();
    return { ok: true, prediction: rec };
  }

  /** Expire predictions nothing ever came back to resolve. */
  expireStale(now = Date.now()) {
    let expired = 0;
    for (const rec of this.records.values()) {
      if (rec.outcome !== OUTCOME.PENDING) continue;
      if (now - Date.parse(rec.predictedAt) > PREDICTION_TTL_MS) {
        rec.outcome = OUTCOME.ABANDONED;
        rec.resolvedAt = new Date(now).toISOString();
        rec.outcomeNote = 'No ground-truth outcome was ever observed; excluded from accuracy.';
        expired += 1;
      }
    }
    return expired;
  }

  /** Per-category accuracy. Only CONFIRMED/REFUTED count toward the denominator. */
  accuracyFor(category) {
    const scoped = [...this.records.values()].filter((r) => r.category === category);
    const decided = scoped.filter((r) => r.outcome === OUTCOME.CONFIRMED || r.outcome === OUTCOME.REFUTED);
    const confirmed = decided.filter((r) => r.outcome === OUTCOME.CONFIRMED);
    const pending = scoped.filter((r) => r.outcome === OUTCOME.PENDING).length;
    const inconclusive = scoped.filter((r) => r.outcome === OUTCOME.INCONCLUSIVE).length;

    const sampleSize = decided.length;
    const accuracy = sampleSize > 0 ? Math.round((confirmed.length / sampleSize) * 100) : null;
    const meanPredicted = sampleSize > 0
      ? Math.round(decided.reduce((s, r) => s + r.predictedConfidence, 0) / sampleSize)
      : null;

    // Positive = over-confident, negative = under-confident.
    const calibrationGap = accuracy !== null && meanPredicted !== null ? meanPredicted - accuracy : null;

    return {
      category,
      sampleSize,
      pending,
      inconclusive,
      confirmed: confirmed.length,
      refuted: sampleSize - confirmed.length,
      accuracy,
      meanPredictedConfidence: meanPredicted,
      calibrationGap,
      // Below this many resolved predictions we refuse to draw conclusions.
      trustworthy: sampleSize >= 5,
      verdict: describeCalibration(sampleSize, calibrationGap),
    };
  }

  /**
   * The multiplier applied to a raw confidence score for this category.
   * Neutral (1.0) until we have enough resolved predictions to justify moving it,
   * and always clamped so calibration can nudge but never fabricate certainty.
   */
  multiplierFor(category) {
    const a = this.accuracyFor(category);
    if (!a.trustworthy || a.calibrationGap === null) return 1.0;
    // Over-confident by 20 points -> multiply by ~0.8
    const raw = 1 - a.calibrationGap / 100;
    return +clamp(raw, 0.6, 1.15).toFixed(3);
  }

  /** Apply calibration to a raw confidence score. */
  calibrate(category, rawConfidence) {
    const multiplier = this.multiplierFor(category);
    const a = this.accuracyFor(category);
    const calibrated = Math.round(clamp(rawConfidence * multiplier, 5, 99));
    return {
      rawConfidence: Math.round(rawConfidence),
      calibratedConfidence: calibrated,
      multiplier,
      adjusted: calibrated !== Math.round(rawConfidence),
      basis: a.trustworthy
        ? `Calibrated against ${a.sampleSize} resolved ${category} predictions (historical accuracy ${a.accuracy}%).`
        : `Not enough resolved ${category} predictions (${a.sampleSize}/5) to calibrate; showing the raw score.`,
    };
  }

  /** Reliability diagram data: predicted confidence vs. actual hit rate. */
  reliabilityDiagram() {
    return BUCKETS.map((b) => {
      const inBucket = [...this.records.values()].filter(
        (r) => r.confidenceBucket === b.label &&
          (r.outcome === OUTCOME.CONFIRMED || r.outcome === OUTCOME.REFUTED)
      );
      const confirmed = inBucket.filter((r) => r.outcome === OUTCOME.CONFIRMED).length;
      return {
        bucket: b.label,
        sampleSize: inBucket.length,
        actualAccuracy: inBucket.length ? Math.round((confirmed / inBucket.length) * 100) : null,
        wellCalibrated: inBucket.length >= 5
          ? Math.abs(Math.round((confirmed / inBucket.length) * 100) - (b.min + b.max) / 2) <= 10
          : null,
      };
    });
  }

  /** Full calibration report for the API / UI. */
  report() {
    this.expireStale();
    const categories = Object.values(CALIBRATION_CATEGORY).map((c) => this.accuracyFor(c));
    const withData = categories.filter((c) => c.sampleSize > 0);
    const totalResolved = withData.reduce((s, c) => s + c.sampleSize, 0);
    const totalConfirmed = withData.reduce((s, c) => s + c.confirmed, 0);

    return {
      version: '10.0',
      overallAccuracy: totalResolved ? Math.round((totalConfirmed / totalResolved) * 100) : null,
      totalPredictions: this.records.size,
      totalResolved,
      pending: [...this.records.values()].filter((r) => r.outcome === OUTCOME.PENDING).length,
      categories,
      reliabilityDiagram: this.reliabilityDiagram(),
      note: totalResolved === 0
        ? 'No predictions have been resolved by a real experiment yet. Confidence scores are uncalibrated and shown raw.'
        : 'Accuracy is measured only against predictions resolved by observed outcomes; pending predictions are excluded.',
      generatedAt: new Date().toISOString(),
    };
  }

  listPredictions({ category = null, outcome = null, limit = 100 } = {}) {
    let list = [...this.records.values()].reverse();
    if (category) list = list.filter((r) => r.category === category);
    if (outcome) list = list.filter((r) => r.outcome === outcome);
    return list.slice(0, limit);
  }

  reset() {
    this.records.clear();
    this.order = [];
  }
}

function describeCalibration(sampleSize, gap) {
  if (sampleSize < 5) return 'Insufficient resolved predictions to judge calibration.';
  if (gap === null) return 'Unknown.';
  if (gap > 15) return `Over-confident by ${gap} points — scores in this category are being damped.`;
  if (gap < -15) return `Under-confident by ${Math.abs(gap)} points — scores in this category are being lifted.`;
  return 'Well calibrated.';
}

function clamp(n, lo, hi) {
  const v = Number(n);
  if (!Number.isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

export const calibrationEngine = new CalibrationEngine();
