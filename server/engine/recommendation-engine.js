/**
 * WinSuite & MacSuite — Universal Recommendation Center & Ranker
 *
 * Truthfulness rule: recommendations are produced only from observed findings
 * supplied by the caller. This module never invents reclaim sizes (no 14.2 GB
 * / 12.4 GB estimates), impact/confidence/safety scores, or named culprits
 * (no Adobe/Teams assertions). With no observed findings it returns an empty
 * ranking — an empty list means "nothing evidenced", not "nothing wrong".
 */

export class RecommendationEngine {
  static getRankedRecommendations(observedFindings = []) {
    if (!Array.isArray(observedFindings) || observedFindings.length === 0) {
      return [];
    }

    return observedFindings
      .filter((f) => f && typeof f.title === 'string')
      .map((f) => ({
        id: f.id ?? null,
        title: f.title,
        description: f.description ?? 'UNAVAILABLE: no description was observed.',
        impact: Number.isFinite(f.impact) ? f.impact : null,
        confidence: Number.isFinite(f.confidence) ? f.confidence : null,
        safety: Number.isFinite(f.safety) ? f.safety : null,
        category: f.category ?? null,
        actionId: f.actionId ?? null,
        reclaimedEstimate: null,
        compositeScore:
          Number.isFinite(f.impact) && Number.isFinite(f.confidence) && Number.isFinite(f.safety)
            ? Math.round(f.impact * 0.4 + f.confidence * 0.3 + f.safety * 0.3)
            : null,
        rankBadge: 'Observed finding',
      }))
      .sort((a, b) => (b.compositeScore ?? -1) - (a.compositeScore ?? -1));
  }
}
