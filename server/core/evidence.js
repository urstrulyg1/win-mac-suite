/**
 * WinSuite & MacSuite v10.0 — Evidence Quality Layer
 *
 * Prevents the UI from presenting estimates as facts. Every single datum carried
 * inside a Finding is tagged with how we came to know it.
 *
 *   observed    — read directly from the system (highest trust)
 *   inferred    — derived deterministically from observed values
 *   estimated   — modelled/apportioned; macOS does not expose the true value
 *   unavailable — could not be read (permission, missing binary, offline)
 *   stale       — previously observed but older than its freshness budget
 */

export const EVIDENCE_QUALITY = {
  OBSERVED: 'observed',
  INFERRED: 'inferred',
  ESTIMATED: 'estimated',
  UNAVAILABLE: 'unavailable',
  STALE: 'stale',
};

export const QUALITY_GLYPH = {
  observed: '✓',
  inferred: '⇒',
  estimated: '~',
  unavailable: '⚠',
  stale: '⏳',
};

export const QUALITY_LABEL = {
  observed: 'Observed',
  inferred: 'Inferred',
  estimated: 'Estimated',
  unavailable: 'Unavailable',
  stale: 'Stale',
};

/** Trust weight applied to confidence maths. */
export const QUALITY_WEIGHT = {
  observed: 1.0,
  inferred: 0.8,
  estimated: 0.5,
  stale: 0.35,
  unavailable: 0.0,
};

/** Default freshness budget per quality class (ms). */
const DEFAULT_FRESHNESS_MS = 120_000;

/**
 * Creates a single evidence datum.
 */
export function createEvidence({
  key,
  label,
  quality = EVIDENCE_QUALITY.OBSERVED,
  value = null,
  unit = null,
  expectedRange = null,
  source = 'telemetry',
  collectedAt = new Date().toISOString(),
  freshnessBudgetMs = DEFAULT_FRESHNESS_MS,
  reason = null,
  estimationMethod = null,
} = {}) {
  let resolvedQuality = quality;

  // Auto-demote to stale when the sample has aged past its budget.
  const age = Date.now() - Date.parse(collectedAt);
  if (
    Number.isFinite(age) && age > freshnessBudgetMs &&
    (quality === EVIDENCE_QUALITY.OBSERVED || quality === EVIDENCE_QUALITY.INFERRED)
  ) {
    resolvedQuality = EVIDENCE_QUALITY.STALE;
  }
  // Never present a value for unavailable evidence.
  const resolvedValue = resolvedQuality === EVIDENCE_QUALITY.UNAVAILABLE ? null : value;

  return {
    key: key || (label || 'evidence').toLowerCase().replace(/\s+/g, '_'),
    label: label || key,
    quality: resolvedQuality,
    qualityLabel: QUALITY_LABEL[resolvedQuality],
    qualityGlyph: QUALITY_GLYPH[resolvedQuality],
    trustWeight: QUALITY_WEIGHT[resolvedQuality],
    value: resolvedValue,
    unit,
    // The single string the UI should print. Estimates are labelled inline so they
    // can never be mistaken for measurements.
    displayValue: formatDisplay(resolvedQuality, resolvedValue, unit, reason),
    expectedRange,
    source,
    collectedAt,
    ageMs: Number.isFinite(age) ? age : null,
    isFact: resolvedQuality === EVIDENCE_QUALITY.OBSERVED,
    reason,
    estimationMethod: resolvedQuality === EVIDENCE_QUALITY.ESTIMATED
      ? (estimationMethod || 'Apportioned from observed aggregates; macOS does not expose an exact per-source value.')
      : null,
  };
}

function formatDisplay(quality, value, unit, reason) {
  if (quality === EVIDENCE_QUALITY.UNAVAILABLE) return `Unavailable${reason ? ` — ${reason}` : ''}`;
  const base = value === null || value === undefined ? '—' : `${value}${unit ? ` ${unit}` : ''}`;
  if (quality === EVIDENCE_QUALITY.ESTIMATED) return `~${base} (estimated)`;
  if (quality === EVIDENCE_QUALITY.STALE) return `${base} (stale sample)`;
  if (quality === EVIDENCE_QUALITY.INFERRED) return `${base} (inferred)`;
  return base;
}

export function observed(label, value, opts = {}) {
  return createEvidence({ label, value, quality: EVIDENCE_QUALITY.OBSERVED, ...opts });
}
export function inferred(label, value, opts = {}) {
  return createEvidence({ label, value, quality: EVIDENCE_QUALITY.INFERRED, ...opts });
}
export function estimated(label, value, opts = {}) {
  return createEvidence({ label, value, quality: EVIDENCE_QUALITY.ESTIMATED, ...opts });
}
export function unavailable(label, reason, opts = {}) {
  return createEvidence({ label, quality: EVIDENCE_QUALITY.UNAVAILABLE, reason, ...opts });
}

/**
 * Summarises the evidentiary basis of a finding — this is what makes the UI able to
 * print "3 observed, 1 estimated, 1 unavailable" next to any conclusion.
 */
export function summarizeEvidence(evidence = []) {
  const counts = { observed: 0, inferred: 0, estimated: 0, unavailable: 0, stale: 0 };
  let weight = 0;
  for (const e of evidence) {
    counts[e.quality] = (counts[e.quality] || 0) + 1;
    weight += QUALITY_WEIGHT[e.quality] ?? 0;
  }
  const total = evidence.length || 1;
  const qualityScore = Math.round((weight / total) * 100);

  let grade = 'Weak';
  if (qualityScore >= 90) grade = 'Strong';
  else if (qualityScore >= 70) grade = 'Good';
  else if (qualityScore >= 50) grade = 'Moderate';

  return {
    counts,
    total: evidence.length,
    qualityScore,
    grade,
    // Confidence must be capped by evidence quality — you cannot be 95% sure
    // of something built on estimates.
    confidenceCeiling: Math.min(99, Math.max(35, qualityScore)),
    hasUnavailable: counts.unavailable > 0,
    hasEstimates: counts.estimated > 0,
    basis: describeBasis(counts),
  };
}

function describeBasis(c) {
  const parts = [];
  if (c.observed) parts.push(`${c.observed} observed`);
  if (c.inferred) parts.push(`${c.inferred} inferred`);
  if (c.estimated) parts.push(`${c.estimated} estimated`);
  if (c.stale) parts.push(`${c.stale} stale`);
  if (c.unavailable) parts.push(`${c.unavailable} unavailable`);
  return parts.join(', ') || 'no evidence';
}
