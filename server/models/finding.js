/**
 * WinSuite & MacSuite v10.0 - Unified Finding & Evidence Model
 *
 * v10 changes:
 *  - Every evidence item now carries an EVIDENCE QUALITY tag (P0 #3):
 *      observed | inferred | estimated | unavailable | stale
 *    so the UI can never present an estimate as a measured fact.
 *  - Confidence is capped by the quality of the evidence that produced it, and then
 *    run through the calibration engine (P0 #4) which damps categories that have
 *    historically been over-confident against real experiment outcomes.
 *  - Legacy v8/v9 evidence objects ({source, observedValue, expectedRange}) are still
 *    accepted and are normalised to `observed` quality for backward compatibility.
 */

import {
  EVIDENCE_QUALITY,
  createEvidence,
  summarizeEvidence,
} from '../core/evidence.js';
import { calibrationEngine } from '../core/calibration.js';

/**
 * Normalises any accepted evidence shape into a v10 quality-tagged evidence item.
 * Accepts:
 *   - v10 items produced by core/evidence.js (already have `quality`)
 *   - legacy v8/v9 items { source, observedValue, expectedRange, timestamp, weight }
 */
export function normalizeEvidence(item = {}) {
  if (item && item.quality && item.qualityLabel) return item; // already v10

  const quality = item.quality
    || (item.observedValue === undefined || item.observedValue === null
      ? EVIDENCE_QUALITY.UNAVAILABLE
      : EVIDENCE_QUALITY.OBSERVED);

  return createEvidence({
    key: item.key,
    label: item.label || item.source || 'Telemetry Probe',
    quality,
    value: item.value !== undefined ? item.value : item.observedValue,
    unit: item.unit || null,
    expectedRange: item.expectedRange || 'Nominal',
    source: item.source || 'Telemetry Probe',
    collectedAt: item.collectedAt || item.timestamp || new Date().toISOString(),
    reason: item.reason || null,
    estimationMethod: item.estimationMethod || null,
  });
}

/**
 * Calculates a statistical confidence score (0 - 100), bounded by evidence quality.
 *
 * The v9 behaviour (more evidence => more confidence) is preserved, but a finding
 * built on estimates or unavailable probes can no longer reach a high score.
 *
 * @param {Array<object>} evidence Legacy or v10 evidence items
 * @returns {{ confidenceScore: number, confidenceLabel: 'High'|'Medium'|'Low', evidenceQuality: object }}
 */
export function calculateConfidence(evidence = []) {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    return {
      confidenceScore: 40,
      confidenceLabel: 'Low',
      evidenceQuality: summarizeEvidence([]),
    };
  }

  const normalized = evidence.map(normalizeEvidence);
  const quality = summarizeEvidence(normalized);

  let totalWeight = 0;
  let scoreSum = 0;

  for (const item of normalized) {
    // Trust weight from the quality layer replaces the old flat 1.0 weight.
    const weight = item.trustWeight ?? 1.0;
    if (weight === 0) continue; // unavailable evidence proves nothing
    totalWeight += weight;

    let itemScore = 75; // baseline item validity
    if (item.source && item.value !== undefined && item.value !== null) itemScore += 15;
    if (item.expectedRange) itemScore += 10;

    scoreSum += Math.min(itemScore, 100) * weight;
  }

  if (totalWeight === 0) {
    // Every single probe was unavailable — we know nothing. Never imply otherwise.
    return {
      confidenceScore: 5,
      confidenceLabel: 'Low',
      evidenceQuality: quality,
    };
  }

  const baseCalculated = Math.round(scoreSum / totalWeight);
  // Reward multiple supporting evidence points (only the ones that carry weight).
  const contributing = normalized.filter((e) => (e.trustWeight ?? 1) > 0).length;
  const multiEvidenceBonus = Math.min(contributing * 3, 10);

  let confidenceScore = Math.min(Math.max(baseCalculated + multiEvidenceBonus, 5), 99);
  // Hard ceiling: confidence can never exceed what the evidence quality supports.
  confidenceScore = Math.min(confidenceScore, quality.confidenceCeiling);

  let confidenceLabel = 'Low';
  if (confidenceScore >= 85) confidenceLabel = 'High';
  else if (confidenceScore >= 65) confidenceLabel = 'Medium';

  return { confidenceScore, confidenceLabel, evidenceQuality: quality };
}

/**
 * Creates a structured Finding instance.
 */
export function createFinding({
  id,
  category,
  severity = 'info',
  title,
  description,
  evidence = [],
  impact = 'Medium',
  remediation = [],
  reversible = true,
  requiresPrivilege = false,
  // v10 additions
  availability = 'AVAILABLE',
  hypothesis = null,
  registerPrediction = false,
}) {
  const normalizedEvidence = (Array.isArray(evidence) ? evidence : []).map(normalizeEvidence);
  const { confidenceScore, confidenceLabel, evidenceQuality } = calculateConfidence(normalizedEvidence);

  // P0 #4 — run the raw score through historical calibration for this category.
  const calibration = calibrationEngine.calibrate(category || 'unknown', confidenceScore);
  const finalConfidence = calibration.calibratedConfidence;

  let finalLabel = 'Low';
  if (finalConfidence >= 85) finalLabel = 'High';
  else if (finalConfidence >= 65) finalLabel = 'Medium';

  const findingId = id || `find-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Optionally register this causal claim so a later experiment can grade it.
  let prediction = null;
  if (registerPrediction && hypothesis) {
    prediction = calibrationEngine.recordPrediction({
      category: category || 'unknown',
      findingId,
      hypothesis,
      predictedConfidence: finalConfidence,
      evidenceBasis: evidenceQuality.basis,
    });
  }

  return {
    id: findingId,
    schemaVersion: '10.0',
    category, // 'storage' | 'memory' | 'thermal' | 'network' | 'crash' | 'security' | 'developer' | 'hardware'
    severity, // 'critical' | 'warning' | 'info' | 'healthy'
    title,
    description,
    // v10 quality-tagged evidence. `displayValue` is what the UI must print.
    evidence: normalizedEvidence,
    // Backward-compatible projection for any v9 UI code still reading these keys.
    legacyEvidence: normalizedEvidence.map((e) => ({
      source: e.source,
      observedValue: e.value,
      expectedRange: e.expectedRange,
      timestamp: e.collectedAt,
    })),
    evidenceQuality,
    evidenceBasis: evidenceQuality.basis,
    // A finding whose evidence is partly unavailable must say so out loud.
    dataCompleteness: evidenceQuality.hasUnavailable
      ? 'PARTIAL — some probes could not be read; this conclusion is based only on what was observable.'
      : 'COMPLETE',
    containsEstimates: evidenceQuality.hasEstimates,
    estimateDisclaimer: evidenceQuality.hasEstimates
      ? 'Some values are estimated contributions, not exact figures reported by the operating system.'
      : null,
    availability,
    confidence: finalConfidence,
    confidenceLabel: finalLabel,
    confidenceCalibration: calibration,
    rawConfidence: confidenceScore,
    hypothesis,
    predictionId: prediction?.predictionId || null,
    impact,
    remediation: (Array.isArray(remediation) ? remediation : []).map((r) => ({
      actionId: r.actionId,
      label: r.label,
      description: r.description,
      reversible: r.reversible ?? true,
      requiresPrivilege: r.requiresPrivilege ?? false,
    })),
    reversible,
    requiresPrivilege,
    detectedAt: new Date().toISOString(),
  };
}
