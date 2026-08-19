/**
 * WinSuite & MacSuite v10.1 — Causal Reasoner ("Why?" and "Why NOT?")  [P1 #12]
 *
 * Answering "why is my Mac slow?" with a single cause is a guess wearing a confident hat.
 * This engine instead evaluates EVERY candidate cause against observed telemetry and
 * reports the full ranking — including the ones it rejected and precisely why.
 *
 * Design rules, all of which fall out of the v10 "AI is never the source of truth" law:
 *
 *  1. A hypothesis is scored ONLY by evaluating its declared discriminators against real
 *     telemetry. There is no free-text reasoning step and no model in the loop.
 *  2. A discriminator whose telemetry key is MISSING does not count as evidence against
 *     the hypothesis. It is recorded as `indeterminate` and it lowers coverage. Absence of
 *     evidence is never rendered as evidence of absence.
 *  3. Rejection must be explainable in one sentence citing the observed value that ruled
 *     it out — "Why NOT thermal?" must answer with a number, not a vibe.
 *  4. Confidence is capped by the evidence quality of the telemetry that fed it, and by
 *     how much of the discriminator set we could actually evaluate.
 */

import { EVIDENCE_QUALITY, createEvidence, summarizeEvidence } from '../core/evidence.js';

/** Outcome of testing one discriminator against telemetry. */
export const DISCRIMINATOR_RESULT = {
  SUPPORTS: 'supports',       // observed value matches the pattern this cause predicts
  CONTRADICTS: 'contradicts', // observed value is incompatible with this cause
  NEUTRAL: 'neutral',         // evaluated, but not diagnostic either way
  INDETERMINATE: 'indeterminate', // telemetry unavailable — NOT evidence against
};

export const VERDICT = {
  LIKELY: 'LIKELY',
  POSSIBLE: 'POSSIBLE',
  UNLIKELY: 'UNLIKELY',
  RULED_OUT: 'RULED_OUT',
  INDETERMINATE: 'INDETERMINATE',
};

/**
 * A discriminator is a single testable proposition about telemetry.
 *
 * `test` receives the resolved telemetry value and returns one of DISCRIMINATOR_RESULT.
 * `explain` produces the human sentence, and it receives the observed value so the
 * explanation always quotes a real number.
 */
function d({ key, label, weight = 1, decisive = false, test, explain }) {
  return { key, label, weight, decisive, test, explain };
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * The hypothesis catalogue for "why is my Mac slow?".
 *
 * `decisive: true` means a CONTRADICTS result on this discriminator rules the hypothesis
 * out entirely rather than merely lowering its score. This is what lets the engine say
 * "Why NOT CPU? CPU never exceeded 22% sustained" instead of ranking it at 8%.
 */
export const SLOWNESS_HYPOTHESES = [
  {
    id: 'memory_pressure',
    category: 'memory',
    label: 'Memory pressure',
    mechanism:
      'When physical memory is exhausted macOS compresses and then swaps pages to disk. Every swapped page fault costs milliseconds instead of nanoseconds, which the user experiences as system-wide stalling.',
    discriminators: [
      d({
        key: 'memoryPressurePct',
        label: 'Memory pressure',
        weight: 3,
        decisive: true,
        test: (v) => (num(v) === null ? DISCRIMINATOR_RESULT.INDETERMINATE : v >= 75 ? DISCRIMINATOR_RESULT.SUPPORTS : v < 60 ? DISCRIMINATOR_RESULT.CONTRADICTS : DISCRIMINATOR_RESULT.NEUTRAL),
        explain: (v, r) =>
          r === DISCRIMINATOR_RESULT.SUPPORTS ? `Memory pressure is ${v}%, above the 75% threshold where macOS begins aggressive compression.`
          : r === DISCRIMINATOR_RESULT.CONTRADICTS ? `Memory pressure is only ${v}%, well below the 60% level at which pressure-induced slowness becomes plausible.`
          : r === DISCRIMINATOR_RESULT.INDETERMINATE ? 'Memory pressure could not be read.'
          : `Memory pressure is ${v}% — elevated but not conclusive on its own.`,
      }),
      d({
        key: 'swapUsedGB',
        label: 'Swap in use',
        weight: 2,
        test: (v) => (num(v) === null ? DISCRIMINATOR_RESULT.INDETERMINATE : v >= 2 ? DISCRIMINATOR_RESULT.SUPPORTS : v < 0.5 ? DISCRIMINATOR_RESULT.CONTRADICTS : DISCRIMINATOR_RESULT.NEUTRAL),
        explain: (v, r) =>
          r === DISCRIMINATOR_RESULT.SUPPORTS ? `${v} GB has been paged to swap, confirming physical memory was genuinely exhausted rather than merely full of cache.`
          : r === DISCRIMINATOR_RESULT.CONTRADICTS ? `Only ${v} GB of swap is in use, so the system is not paging.`
          : r === DISCRIMINATOR_RESULT.INDETERMINATE ? 'Swap usage could not be read.'
          : `${v} GB of swap is in use.`,
      }),
      d({
        key: 'pageInsPerSec',
        label: 'Page-in rate',
        weight: 2,
        test: (v) => (num(v) === null ? DISCRIMINATOR_RESULT.INDETERMINATE : v >= 500 ? DISCRIMINATOR_RESULT.SUPPORTS : v < 50 ? DISCRIMINATOR_RESULT.CONTRADICTS : DISCRIMINATOR_RESULT.NEUTRAL),
        explain: (v, r) =>
          r === DISCRIMINATOR_RESULT.SUPPORTS ? `${v} page-ins/sec means the system is actively reading swapped memory back from disk — this is the mechanism that produces the stalling.`
          : r === DISCRIMINATOR_RESULT.CONTRADICTS ? `Page-in rate is ${v}/sec. Swap may be allocated but it is not being actively thrashed.`
          : r === DISCRIMINATOR_RESULT.INDETERMINATE ? 'Page-in rate could not be sampled.'
          : `Page-in rate is ${v}/sec.`,
      }),
      d({
        key: 'topMemoryConsumerGB',
        label: 'Largest memory consumer',
        weight: 1,
        test: (v) => (num(v) === null ? DISCRIMINATOR_RESULT.INDETERMINATE : v >= 4 ? DISCRIMINATOR_RESULT.SUPPORTS : DISCRIMINATOR_RESULT.NEUTRAL),
        explain: (v, r) =>
          r === DISCRIMINATOR_RESULT.SUPPORTS ? `A single process is holding ${v} GB, giving the pressure an identifiable owner.`
          : r === DISCRIMINATOR_RESULT.INDETERMINATE ? 'Per-process memory could not be enumerated.'
          : `Largest single consumer is ${v} GB.`,
      }),
    ],
  },
  {
    id: 'disk_io',
    category: 'storage',
    label: 'Disk I/O saturation',
    mechanism:
      'A saturated storage queue makes every file operation wait. Because macOS reads binaries and frameworks lazily, this appears as apps hanging on launch or beachballing on save.',
    discriminators: [
      d({
        key: 'diskQueueDepth',
        label: 'Disk queue depth',
        weight: 3,
        decisive: true,
        test: (v) => (num(v) === null ? DISCRIMINATOR_RESULT.INDETERMINATE : v >= 8 ? DISCRIMINATOR_RESULT.SUPPORTS : v < 2 ? DISCRIMINATOR_RESULT.CONTRADICTS : DISCRIMINATOR_RESULT.NEUTRAL),
        explain: (v, r) =>
          r === DISCRIMINATOR_RESULT.SUPPORTS ? `Average queue depth is ${v}; requests are stacking up faster than the SSD retires them.`
          : r === DISCRIMINATOR_RESULT.CONTRADICTS ? `Average disk queue depth is ${v}, meaning the storage device is keeping up with demand and is not a bottleneck.`
          : r === DISCRIMINATOR_RESULT.INDETERMINATE ? 'Disk queue depth could not be sampled.'
          : `Queue depth is ${v}.`,
      }),
      d({
        key: 'diskUtilPct',
        label: 'Disk busy time',
        weight: 2,
        test: (v) => (num(v) === null ? DISCRIMINATOR_RESULT.INDETERMINATE : v >= 85 ? DISCRIMINATOR_RESULT.SUPPORTS : v < 40 ? DISCRIMINATOR_RESULT.CONTRADICTS : DISCRIMINATOR_RESULT.NEUTRAL),
        explain: (v, r) =>
          r === DISCRIMINATOR_RESULT.SUPPORTS ? `The volume was busy ${v}% of the sample window.`
          : r === DISCRIMINATOR_RESULT.CONTRADICTS ? `The volume was busy only ${v}% of the sample window.`
          : r === DISCRIMINATOR_RESULT.INDETERMINATE ? 'Disk utilisation could not be sampled.'
          : `Volume busy ${v}% of the window.`,
      }),
      d({
        key: 'freeDiskPct',
        label: 'Free space',
        weight: 1,
        test: (v) => (num(v) === null ? DISCRIMINATOR_RESULT.INDETERMINATE : v <= 8 ? DISCRIMINATOR_RESULT.SUPPORTS : DISCRIMINATOR_RESULT.NEUTRAL),
        explain: (v, r) =>
          r === DISCRIMINATOR_RESULT.SUPPORTS ? `Only ${v}% free — APFS needs headroom, and below ~8% write amplification degrades throughput.`
          : r === DISCRIMINATOR_RESULT.INDETERMINATE ? 'Free space could not be read.'
          : `${v}% of the volume is free, which is adequate headroom.`,
      }),
    ],
  },
  {
    id: 'cpu_saturation',
    category: 'performance',
    label: 'CPU saturation',
    mechanism:
      'When runnable threads exceed available cores, everything time-slices. The tell is a sustained run-queue length, not a momentary spike.',
    discriminators: [
      d({
        key: 'sustainedCpuPct',
        label: 'Sustained CPU',
        weight: 3,
        decisive: true,
        test: (v) => (num(v) === null ? DISCRIMINATOR_RESULT.INDETERMINATE : v >= 85 ? DISCRIMINATOR_RESULT.SUPPORTS : v < 60 ? DISCRIMINATOR_RESULT.CONTRADICTS : DISCRIMINATOR_RESULT.NEUTRAL),
        explain: (v, r) =>
          r === DISCRIMINATOR_RESULT.SUPPORTS ? `CPU held ${v}% sustained across the sample window.`
          : r === DISCRIMINATOR_RESULT.CONTRADICTS ? `CPU averaged ${v}% sustained, never approaching the saturation threshold. Momentary spikes are normal and do not cause persistent slowness.`
          : r === DISCRIMINATOR_RESULT.INDETERMINATE ? 'Sustained CPU could not be sampled.'
          : `CPU averaged ${v}% sustained.`,
      }),
      d({
        key: 'runQueueLength',
        label: 'Run queue',
        weight: 2,
        test: (v) => (num(v) === null ? DISCRIMINATOR_RESULT.INDETERMINATE : v >= 4 ? DISCRIMINATOR_RESULT.SUPPORTS : v <= 1 ? DISCRIMINATOR_RESULT.CONTRADICTS : DISCRIMINATOR_RESULT.NEUTRAL),
        explain: (v, r) =>
          r === DISCRIMINATOR_RESULT.SUPPORTS ? `Run queue averaged ${v} threads waiting per core.`
          : r === DISCRIMINATOR_RESULT.CONTRADICTS ? `Run queue averaged ${v}, so threads were not waiting for a core.`
          : r === DISCRIMINATOR_RESULT.INDETERMINATE ? 'Run queue length could not be sampled.'
          : `Run queue averaged ${v}.`,
      }),
    ],
  },
  {
    id: 'thermal_throttling',
    category: 'thermal',
    label: 'Thermal throttling',
    mechanism:
      'Sustained heat causes the SoC to reduce clocks to stay within its thermal envelope. The signature is high CPU demand paired with falling delivered performance.',
    discriminators: [
      d({
        key: 'thermalPressure',
        label: 'Thermal pressure',
        weight: 3,
        decisive: true,
        test: (v) => {
          if (v === null || v === undefined) return DISCRIMINATOR_RESULT.INDETERMINATE;
          const s = String(v).toLowerCase();
          if (s === 'nominal' || s === 'normal') return DISCRIMINATOR_RESULT.CONTRADICTS;
          if (s === 'heavy' || s === 'trapping' || s === 'sleeping' || s === 'serious') return DISCRIMINATOR_RESULT.SUPPORTS;
          if (s === 'fair' || s === 'moderate') return DISCRIMINATOR_RESULT.NEUTRAL;
          return DISCRIMINATOR_RESULT.INDETERMINATE;
        },
        explain: (v, r) =>
          r === DISCRIMINATOR_RESULT.SUPPORTS ? `macOS reports thermal pressure "${v}", meaning the scheduler is actively limiting performance.`
          : r === DISCRIMINATOR_RESULT.CONTRADICTS ? `macOS reports thermal pressure "${v}" for the entire window — the system never entered a throttling state, so heat cannot explain the slowness.`
          : r === DISCRIMINATOR_RESULT.INDETERMINATE ? 'Thermal pressure could not be read.'
          : `Thermal pressure is "${v}".`,
      }),
      d({
        key: 'cpuThrottleEvents',
        label: 'Throttle events',
        weight: 2,
        test: (v) => (num(v) === null ? DISCRIMINATOR_RESULT.INDETERMINATE : v > 0 ? DISCRIMINATOR_RESULT.SUPPORTS : DISCRIMINATOR_RESULT.CONTRADICTS),
        explain: (v, r) =>
          r === DISCRIMINATOR_RESULT.SUPPORTS ? `${v} throttling events were recorded in the window.`
          : r === DISCRIMINATOR_RESULT.CONTRADICTS ? 'Zero throttling events were recorded in the window.'
          : 'Throttle event counters could not be read.',
      }),
    ],
  },
  {
    id: 'startup_load',
    category: 'startup',
    label: 'Background/startup agent load',
    mechanism:
      'Login items and launch agents run continuously and compete for the same CPU, memory and I/O the foreground app needs.',
    discriminators: [
      d({
        key: 'launchAgentCount',
        label: 'Launch agents',
        weight: 2,
        test: (v) => (num(v) === null ? DISCRIMINATOR_RESULT.INDETERMINATE : v >= 25 ? DISCRIMINATOR_RESULT.SUPPORTS : v < 10 ? DISCRIMINATOR_RESULT.CONTRADICTS : DISCRIMINATOR_RESULT.NEUTRAL),
        explain: (v, r) =>
          r === DISCRIMINATOR_RESULT.SUPPORTS ? `${v} third-party launch agents are registered.`
          : r === DISCRIMINATOR_RESULT.CONTRADICTS ? `Only ${v} third-party launch agents are registered, which is a light background load.`
          : r === DISCRIMINATOR_RESULT.INDETERMINATE ? 'Launch agents could not be enumerated.'
          : `${v} launch agents registered.`,
      }),
      d({
        key: 'backgroundCpuPct',
        label: 'Background CPU share',
        weight: 2,
        test: (v) => (num(v) === null ? DISCRIMINATOR_RESULT.INDETERMINATE : v >= 30 ? DISCRIMINATOR_RESULT.SUPPORTS : v < 10 ? DISCRIMINATOR_RESULT.CONTRADICTS : DISCRIMINATOR_RESULT.NEUTRAL),
        explain: (v, r) =>
          r === DISCRIMINATOR_RESULT.SUPPORTS ? `Background processes consumed ${v}% of total CPU.`
          : r === DISCRIMINATOR_RESULT.CONTRADICTS ? `Background processes consumed only ${v}% of total CPU.`
          : r === DISCRIMINATOR_RESULT.INDETERMINATE ? 'Background CPU share could not be attributed.'
          : `Background processes used ${v}% of CPU.`,
      }),
    ],
  },
  {
    id: 'spotlight_indexing',
    category: 'storage',
    label: 'Spotlight re-indexing',
    mechanism:
      'mds_stores rebuilds the metadata index after large file changes or migrations, consuming CPU and I/O until it completes. It is self-limiting.',
    discriminators: [
      d({
        key: 'mdsCpuPct',
        label: 'mds_stores CPU',
        weight: 3,
        decisive: true,
        test: (v) => (num(v) === null ? DISCRIMINATOR_RESULT.INDETERMINATE : v >= 40 ? DISCRIMINATOR_RESULT.SUPPORTS : v < 10 ? DISCRIMINATOR_RESULT.CONTRADICTS : DISCRIMINATOR_RESULT.NEUTRAL),
        explain: (v, r) =>
          r === DISCRIMINATOR_RESULT.SUPPORTS ? `mds_stores is using ${v}% CPU, indicating an active re-index.`
          : r === DISCRIMINATOR_RESULT.CONTRADICTS ? `mds_stores is using ${v}% CPU, so Spotlight is idle and not responsible.`
          : r === DISCRIMINATOR_RESULT.INDETERMINATE ? 'Spotlight indexer CPU could not be sampled.'
          : `mds_stores using ${v}% CPU.`,
      }),
    ],
  },
];

/**
 * Resolves a telemetry key into { value, quality }.
 * Accepts raw scalars or v10 evidence-shaped objects, so callers can pass either
 * a flat telemetry bag or fully-qualified evidence.
 */
function resolveTelemetry(telemetry, key) {
  const raw = telemetry?.[key];
  if (raw === undefined || raw === null) {
    return { value: null, quality: EVIDENCE_QUALITY.UNAVAILABLE, source: null, reason: `No telemetry for "${key}"` };
  }
  if (typeof raw === 'object' && 'quality' in raw) {
    return { value: raw.value, quality: raw.quality, source: raw.source || null, reason: raw.reason || null };
  }
  return { value: raw, quality: EVIDENCE_QUALITY.OBSERVED, source: `telemetry.${key}`, reason: null };
}

/**
 * Evaluates a single hypothesis against telemetry.
 */
function evaluateHypothesis(hypothesis, telemetry) {
  const supporting = [];
  const contradicting = [];
  const neutral = [];
  const indeterminate = [];
  const evidence = [];

  let supportWeight = 0;
  let contradictWeight = 0;
  let evaluableWeight = 0;
  let ruledOutBy = null;

  for (const disc of hypothesis.discriminators) {
    const { value, quality, source, reason } = resolveTelemetry(telemetry, disc.key);
    const result = quality === EVIDENCE_QUALITY.UNAVAILABLE
      ? DISCRIMINATOR_RESULT.INDETERMINATE
      : disc.test(value);

    const sentence = disc.explain(value, result);
    const entry = {
      key: disc.key,
      label: disc.label,
      observedValue: value,
      quality,
      result,
      weight: disc.weight,
      decisive: disc.decisive,
      explanation: sentence,
    };

    // Evidence is only recorded for discriminators we could actually evaluate.
    evidence.push(
      createEvidence({
        key: disc.key,
        label: disc.label,
        quality,
        value,
        source: source || 'telemetry',
        reason: quality === EVIDENCE_QUALITY.UNAVAILABLE ? reason : null,
      })
    );

    switch (result) {
      case DISCRIMINATOR_RESULT.SUPPORTS:
        supporting.push(entry);
        supportWeight += disc.weight;
        evaluableWeight += disc.weight;
        break;
      case DISCRIMINATOR_RESULT.CONTRADICTS:
        contradicting.push(entry);
        contradictWeight += disc.weight;
        evaluableWeight += disc.weight;
        // A decisive contradiction rules the hypothesis out outright.
        if (disc.decisive && !ruledOutBy) ruledOutBy = entry;
        break;
      case DISCRIMINATOR_RESULT.NEUTRAL:
        neutral.push(entry);
        evaluableWeight += disc.weight;
        break;
      default:
        // Indeterminate: reduces coverage, never counts against the hypothesis.
        indeterminate.push(entry);
    }
  }

  const totalWeight = hypothesis.discriminators.reduce((s, x) => s + x.weight, 0);
  const coveragePct = totalWeight ? Math.round((evaluableWeight / totalWeight) * 100) : 0;

  // Score is computed only over what we could evaluate.
  let score = evaluableWeight > 0 ? Math.round((supportWeight / evaluableWeight) * 100) : 0;

  const quality = summarizeEvidence(evidence);
  // Confidence cannot exceed evidence quality, nor the fraction of the theory we tested.
  let confidence = Math.min(score, quality.confidenceCeiling, coveragePct === 0 ? 0 : Math.max(coveragePct, 35));

  let verdict;
  if (ruledOutBy) {
    verdict = VERDICT.RULED_OUT;
    score = Math.min(score, 10);
    confidence = Math.min(confidence, 10);
  } else if (evaluableWeight === 0) {
    verdict = VERDICT.INDETERMINATE;
    score = 0;
    confidence = 0;
  } else if (score >= 70) verdict = VERDICT.LIKELY;
  else if (score >= 35) verdict = VERDICT.POSSIBLE;
  else verdict = VERDICT.UNLIKELY;

  return {
    id: hypothesis.id,
    label: hypothesis.label,
    category: hypothesis.category,
    mechanism: hypothesis.mechanism,
    score,
    confidence,
    verdict,
    coveragePct,
    evidenceQuality: quality,
    evidenceBasis: quality.basis,
    supporting,
    contradicting,
    neutral,
    indeterminate,
    evidence,
    ruledOutBy,
    /** The one-line answer to "Why?" or "Why NOT?" for this candidate. */
    reasoning: buildReasoning({ hypothesis, verdict, supporting, contradicting, indeterminate, ruledOutBy, coveragePct }),
  };
}

function buildReasoning({ hypothesis, verdict, supporting, contradicting, indeterminate, ruledOutBy, coveragePct }) {
  if (verdict === VERDICT.RULED_OUT) {
    return {
      question: `Why NOT ${hypothesis.label.toLowerCase()}?`,
      answer: ruledOutBy.explanation,
      basis: [ruledOutBy.explanation, ...contradicting.filter((c) => c !== ruledOutBy).map((c) => c.explanation)],
      caveat: indeterminate.length
        ? `${indeterminate.length} check(s) could not be evaluated, but the decisive measurement was available and excludes this cause.`
        : null,
    };
  }
  if (verdict === VERDICT.INDETERMINATE) {
    return {
      question: `Why can't you tell me about ${hypothesis.label.toLowerCase()}?`,
      answer: `None of the ${indeterminate.length} measurements needed to test this could be read, so it can be neither confirmed nor excluded.`,
      basis: indeterminate.map((i) => i.explanation),
      caveat: 'This cause remains open. It is not being reported as absent.',
    };
  }
  const positive = supporting.map((s) => s.explanation);
  const negative = contradicting.map((c) => c.explanation);
  return {
    question: `Why ${hypothesis.label.toLowerCase()}?`,
    answer: positive[0] || 'No individual measurement strongly supports this, but nothing excludes it either.',
    basis: positive,
    counterpoints: negative,
    caveat: coveragePct < 100
      ? `Only ${coveragePct}% of the checks for this cause could be evaluated; confidence is capped accordingly.`
      : null,
  };
}

/**
 * The public entry point.
 *
 * @param {object} telemetry Flat bag of telemetry values (raw scalars or evidence objects)
 * @param {object} opts
 * @param {string} opts.question User-facing question being answered
 * @param {Array}  opts.hypotheses Override the catalogue (used by tests / other symptoms)
 * @returns {object} Full ranked analysis including rejected candidates
 */
export function analyzeCauses(telemetry = {}, { question = 'Why is my Mac slow?', hypotheses = SLOWNESS_HYPOTHESES } = {}) {
  const evaluated = hypotheses.map((h) => evaluateHypothesis(h, telemetry));

  // Rank: viable candidates by score, then ruled-out, then indeterminate.
  const rank = (v) => (v === VERDICT.RULED_OUT ? 2 : v === VERDICT.INDETERMINATE ? 3 : 1);
  const ranked = [...evaluated].sort((a, b) => rank(a.verdict) - rank(b.verdict) || b.score - a.score);

  const viable = ranked.filter((r) => r.verdict === VERDICT.LIKELY || r.verdict === VERDICT.POSSIBLE);
  const ruledOut = ranked.filter((r) => r.verdict === VERDICT.RULED_OUT);
  const unlikely = ranked.filter((r) => r.verdict === VERDICT.UNLIKELY);
  const undetermined = ranked.filter((r) => r.verdict === VERDICT.INDETERMINATE);

  const leading = viable[0] || null;
  const runnerUp = viable[1] || null;

  // A leading cause is only "primary" if it clearly beats the next candidate.
  const margin = leading && runnerUp ? leading.score - runnerUp.score : leading ? 100 : 0;
  const isDecisive = Boolean(leading) && margin >= 25 && leading.verdict === VERDICT.LIKELY;

  const avgCoverage = evaluated.length
    ? Math.round(evaluated.reduce((s, e) => s + e.coveragePct, 0) / evaluated.length)
    : 0;

  return {
    schemaVersion: '10.1',
    question,
    /** Ranked bar-chart data the UI renders directly. */
    ranking: ranked.map((r) => ({
      id: r.id,
      label: r.label,
      score: r.score,
      confidence: r.confidence,
      verdict: r.verdict,
      bar: '█'.repeat(Math.max(0, Math.round(r.score / 10))) || '',
      coveragePct: r.coveragePct,
    })),
    leadingCause: leading
      ? { id: leading.id, label: leading.label, score: leading.score, confidence: leading.confidence, reasoning: leading.reasoning }
      : null,
    /**
     * The engine refuses to name a single cause when two candidates are close.
     * Ambiguity is reported, not resolved by picking the higher number.
     */
    isDecisive,
    ambiguity: !isDecisive && leading && runnerUp
      ? `"${leading.label}" and "${runnerUp.label}" score within ${margin} points of each other. Both remain open; run an experiment to separate them.`
      : !leading
        ? 'No candidate cause is supported by the available telemetry.'
        : null,
    candidates: ranked,
    viable,
    unlikely,
    /** This is the "Why NOT?" section — the differentiating output. */
    ruledOut: ruledOut.map((r) => ({
      id: r.id,
      label: r.label,
      question: r.reasoning.question,
      answer: r.reasoning.answer,
      decisiveMeasurement: r.ruledOutBy
        ? { label: r.ruledOutBy.label, observedValue: r.ruledOutBy.observedValue, quality: r.ruledOutBy.quality }
        : null,
    })),
    undetermined: undetermined.map((r) => ({
      id: r.id,
      label: r.label,
      reason: r.reasoning.answer,
      missingTelemetry: r.indeterminate.map((i) => i.key),
    })),
    coverage: {
      hypothesesEvaluated: evaluated.length,
      averageDiscriminatorCoveragePct: avgCoverage,
      fullyEvaluated: evaluated.filter((e) => e.coveragePct === 100).length,
      /** Honesty gate: a low-coverage analysis must not be presented as a diagnosis. */
      analysisIsComplete: avgCoverage >= 80 && undetermined.length === 0,
      qualifier:
        undetermined.length > 0
          ? `${undetermined.length} candidate cause(s) could not be evaluated at all. They are neither confirmed nor excluded.`
          : avgCoverage < 80
            ? `Only ${avgCoverage}% of diagnostic checks could be evaluated. This ranking is provisional.`
            : 'All candidate causes were evaluated against available telemetry.',
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Renders the analysis as the exact plain-text block the product spec asks for.
 * Kept server-side so the CLI, the support bundle and the UI cannot drift apart.
 */
export function renderAnalysisText(analysis) {
  const lines = [];
  lines.push('LIKELY CAUSES');
  lines.push('');

  const width = Math.max(...analysis.ranking.map((r) => r.label.length), 12);
  for (const r of analysis.ranking) {
    if (r.verdict === VERDICT.INDETERMINATE) continue;
    const pad = r.label.padEnd(width + 2, ' ');
    const pct = String(`${r.score}%`).padStart(4, ' ');
    lines.push(`${pad}${pct}  ${r.bar}`);
  }

  const leading = analysis.candidates.find((c) => c.id === analysis.leadingCause?.id);
  if (leading) {
    lines.push('');
    lines.push(`Why ${leading.label.toLowerCase()}?`);
    for (const s of leading.supporting) lines.push(`✓ ${s.explanation}`);
  }

  for (const r of analysis.ruledOut) {
    lines.push('');
    lines.push(`Why NOT ${r.label.toLowerCase()}?`);
    lines.push(`✓ ${r.answer}`);
  }

  for (const u of analysis.undetermined) {
    lines.push('');
    lines.push(`${u.label} — cannot be assessed`);
    lines.push(`⚠ ${u.reason}`);
  }

  if (!analysis.coverage.analysisIsComplete) {
    lines.push('');
    lines.push(`NOTE: ${analysis.coverage.qualifier}`);
  }
  return lines.join('\n');
}

