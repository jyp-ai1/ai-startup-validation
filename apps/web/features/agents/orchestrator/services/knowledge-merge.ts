import type {
  AgentExecutionResult,
  ConfidenceLineage,
  KnowledgeNode,
  MergedEvidenceItem,
  TaskNode,
} from './orchestrator-types';

/** Merge agent knowledge outputs into a unified graph (mock). */
export function mergeKnowledge(nodes: TaskNode[]): KnowledgeNode[] {
  const merged: KnowledgeNode[] = [];
  const seen = new Set<string>();

  for (const node of nodes) {
    if (!node.result) continue;
    for (const k of node.result.knowledge) {
      const key = `${k.agentId}-${k.labelKey}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(k);
    }
  }

  return merged;
}

/** Deduplicate evidence and compute aggregate confidence. */
export function mergeEvidence(nodes: TaskNode[]): MergedEvidenceItem[] {
  const byKey = new Map<string, MergedEvidenceItem>();

  for (const node of nodes) {
    if (!node.result) continue;
    for (const ev of node.result.evidence) {
      const key = ev.titleKey;
      const existing = byKey.get(key);
      if (!existing || ev.confidence > existing.confidence) {
        byKey.set(key, ev);
      }
    }
  }

  return [...byKey.values()];
}

export function computeEvidenceQuality(evidence: MergedEvidenceItem[]): number {
  if (evidence.length === 0) return 0;
  return Math.round(
    evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length,
  );
}

/** Build confidence lineage tree for enterprise transparency. */
export function buildConfidenceLineage(nodes: TaskNode[]): ConfidenceLineage {
  const agentNodes = nodes.filter(
    (n) => n.agentId !== 'DECISION' && n.result && n.status === 'COMPLETED',
  );

  const children: ConfidenceLineage['tree'] = agentNodes.map((n) => ({
    id: n.id,
    labelKey: n.labelKey,
    confidence: n.result!.confidence,
  }));

  const evidenceQuality = computeEvidenceQuality(
    mergeEvidence(nodes),
  );

  if (evidenceQuality > 0) {
    children.push({
      id: 'evidence-quality',
      labelKey: 'lineage.evidenceQuality',
      confidence: evidenceQuality,
    });
  }

  const total =
    children.length > 0
      ? Math.round(children.reduce((s, c) => s + c.confidence, 0) / children.length)
      : 0;

  return {
    total,
    tree: [
      {
        id: 'decision-confidence',
        labelKey: 'lineage.decisionConfidence',
        confidence: total,
        children,
      },
    ],
  };
}

export function sumCosts(nodes: TaskNode[]): { totalCostUsd: number; totalDurationMs: number } {
  let totalCostUsd = 0;
  let totalDurationMs = 0;
  for (const node of nodes) {
    if (node.cost) {
      totalCostUsd += node.cost.estimatedCostUsd;
      totalDurationMs += node.cost.durationMs;
    }
  }
  return {
    totalCostUsd: Math.round(totalCostUsd * 1000) / 1000,
    totalDurationMs,
  };
}

export function buildPriorResults(nodes: TaskNode[]): Map<string, AgentExecutionResult> {
  const map = new Map<string, AgentExecutionResult>();
  for (const node of nodes) {
    if (node.result && node.status === 'COMPLETED') {
      map.set(node.agentId, node.result);
    }
  }
  return map as Map<import('./orchestrator-types').AgentId, AgentExecutionResult>;
}
