/**
 * Evidence quality layer.
 * A datum is never considered an observation unless the caller supplies evidence
 * from a real runtime probe or command result.
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

export const QUALITY_WEIGHT = {
  observed: 1.0,
  inferred: 0.8,
  estimated: 0.5,
  stale: 0.35,
  unavailable: 0.0,
};

const DEFAULT_FRESHNESS_MS = 120_000;

export function createEvidence({
  key,
  label,
  quality = EVIDENCE_QUALITY.UNAVAILABLE,
  value = null,
  unit = null,
  expectedRange = null,
  source = null,
  collectedAt = new Date().toISOString(),
  freshnessBudgetMs = DEFAULT_FRESHNESS_MS,
  reason = null,
  estimationMethod = null,
} = {}) {
  let resolvedQuality = quality;
  const parsedCollectedAt = Date.parse(collectedAt);
  const age = Number.isFinite(parsedCollectedAt) ? Date.now() - parsedCollectedAt : null;

  if (
    age !== null && age > freshnessBudgetMs &&
    (quality === EVIDENCE_QUALITY.OBSERVED || quality === EVIDENCE_QUALITY.INFERRED)
  ) {
    resolvedQuality = EVIDENCE_QUALITY.STALE;
  }

  const resolvedValue = resolvedQuality === EVIDENCE_QUALITY.UNAVAILABLE || resolvedQuality === EVIDENCE_QUALITY.STALE
    ? (resolvedQuality === EVIDENCE_QUALITY.UNAVAILABLE ? null : value)
    : value;

  return {
    key: key || (label || 'evidence').toLowerCase().replace(/\s+/g, '_'),
    label: label || key,
    quality: resolvedQuality,
    qualityLabel: QUALITY_LABEL[resolvedQuality],
    qualityGlyph: QUALITY_GLYPH[resolvedQuality],
    trustWeight: QUALITY_WEIGHT[resolvedQuality],
    value: resolvedValue,
    unit,
    displayValue: formatDisplay(resolvedQuality, resolvedValue, unit, reason),
    expectedRange,
    source,
    collectedAt,
    ageMs: age,
    isFact: resolvedQuality === EVIDENCE_QUALITY.OBSERVED,
    reason,
    estimationMethod: resolvedQuality === EVIDENCE_QUALITY.ESTIMATED ? (estimationMethod || 'UNAVAILABLE: estimation method not supplied by caller.') : null,
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
  return createEvidence({ label, quality: EVIDENCE_QUALITY.UNAVAILABLE, value: null, reason, ...opts });
}

export function summarizeEvidence(evidence = []) {
  const counts = { observed: 0, inferred: 0, estimated: 0, unavailable: 0, stale: 0 };
  let weight = 0;
  for (const e of evidence) {
    counts[e.quality] = (counts[e.quality] || 0) + 1;
    weight += QUALITY_WEIGHT[e.quality] ?? 0;
  }
  const total = evidence.length;
  const qualityScore = total > 0 ? Math.round((weight / total) * 100) : 0;

  let grade = 'Weak';
  if (qualityScore >= 90) grade = 'Strong';
  else if (qualityScore >= 70) grade = 'Good';
  else if (qualityScore >= 50) grade = 'Moderate';

  return {
    counts,
    total,
    qualityScore,
    grade,
    confidenceCeiling: qualityScore,
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
