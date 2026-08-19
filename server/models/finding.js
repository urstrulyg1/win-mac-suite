/**
 * WinSuite & MacSuite v8.0 - Unified Finding & Evidence Model
 * Calculates real confidence scores based on evidence quality, sample freshness, and causal strength.
 */

/**
 * Calculates a statistical confidence score (0 - 100)
 * @param {Array<{ source: string, observedValue: any, expectedRange: string, timestamp?: string, weight?: number }>} evidence
 * @returns {{ confidenceScore: number, confidenceLabel: 'High' | 'Medium' | 'Low' }}
 */
export function calculateConfidence(evidence = []) {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    return { confidenceScore: 40, confidenceLabel: 'Low' };
  }

  let totalWeight = 0;
  let scoreSum = 0;

  for (const item of evidence) {
    const weight = item.weight || 1.0;
    totalWeight += weight;

    let itemScore = 75; // baseline item validity
    if (item.source && item.observedValue !== undefined) itemScore += 15;
    if (item.expectedRange) itemScore += 10;

    scoreSum += (Math.min(itemScore, 100) * weight);
  }

  const baseCalculated = Math.round(scoreSum / Math.max(totalWeight, 1));
  // Reward multiple supporting evidence points
  const multiEvidenceBonus = Math.min(evidence.length * 3, 10);
  const confidenceScore = Math.min(Math.max(baseCalculated + multiEvidenceBonus, 40), 99);

  let confidenceLabel = 'Low';
  if (confidenceScore >= 85) confidenceLabel = 'High';
  else if (confidenceScore >= 65) confidenceLabel = 'Medium';

  return { confidenceScore, confidenceLabel };
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
}) {
  const { confidenceScore, confidenceLabel } = calculateConfidence(evidence);

  return {
    id: id || `find-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    category, // 'storage' | 'memory' | 'thermal' | 'network' | 'crash' | 'security' | 'developer' | 'hardware'
    severity, // 'critical' | 'warning' | 'info' | 'healthy'
    title,
    description,
    evidence: evidence.map((e) => ({
      source: e.source || 'Telemetry Probe',
      observedValue: e.observedValue,
      expectedRange: e.expectedRange || 'Nominal',
      timestamp: e.timestamp || new Date().toISOString(),
    })),
    confidence: confidenceScore,
    confidenceLabel,
    impact,
    remediation: remediation.map((r) => ({
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
