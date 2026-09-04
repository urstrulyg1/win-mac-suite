/**
 * WinSuite & MacSuite — Diagnostic Knowledge Graph & Reasoning Engine
 *
 * Truthfulness rule: the graph contains only relationships that were actually
 * observed on this host. There are no seeded telemetry values (no invented
 * Chrome memory figures, Docker assignments, swap sizes, edge weights, or
 * crash events). An empty graph means "no relationships observed", not
 * "everything is fine".
 */

export class DiagnosticKnowledgeGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
  }

  addNode(id, type, properties = {}) {
    this.nodes.set(id, { id, type, properties });
  }

  addEdge(source, target, relation, metadata = {}) {
    this.edges.push({ source, target, relation, metadata });
  }

  /**
   * Traverses the graph to trace the causal root-cause path for a target incident.
   * Returns an empty array when no observed relationships support the target —
   * causality is never invented.
   * @param {string} targetIncident
   */
  findCausalChain(targetIncident = 'ChromeCrashEvent') {
    const incomingEdges = this.edges.filter((e) => e.target === targetIncident);
    const chain = [];

    for (const edge of incomingEdges) {
      const sourceNode = this.nodes.get(edge.source);
      const antecedents = this.edges.filter((e) => e.target === edge.source);

      for (const ante of antecedents) {
        const rootNode = this.nodes.get(ante.source);
        const w1 = Number.isFinite(ante.metadata?.weight) ? ante.metadata.weight : null;
        const w2 = Number.isFinite(edge.metadata?.weight) ? edge.metadata.weight : null;
        chain.push({
          rootCause: rootNode?.id ?? null,
          rootType: rootNode?.type ?? null,
          intermediateSubsystem: sourceNode?.id ?? null,
          consequence: targetIncident,
          confidence: w1 !== null && w2 !== null ? Math.round(w1 * w2 * 100) : null,
          summary:
            rootNode?.id && sourceNode?.id
              ? `${rootNode.id} (${rootNode.type}) -> ${sourceNode.id} -> ${targetIncident}`
              : 'UNAVAILABLE: insufficient observed relationships to name a causal chain.',
        });
      }
    }

    return chain;
  }
}
