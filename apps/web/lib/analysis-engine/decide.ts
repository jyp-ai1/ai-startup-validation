/**
 * Rule Engine — Stage · Type · Evidence → Decisions. No LLM.
 */
import { ANALYSIS_RULES } from './rules';
import type {
  AnalysisInput,
  Decision,
  EvidenceId,
  EvidenceStatus,
  RuleContext,
} from './types';

function statusOf(evidence: AnalysisInput['evidence'], id: EvidenceId): EvidenceStatus {
  return evidence[id] ?? 'unknown';
}

export function createRuleContext(input: AnalysisInput): RuleContext {
  return {
    input,
    status: (id) => statusOf(input.evidence, id),
  };
}

/**
 * Run all rules; keep first Decision per code (deterministic order).
 */
export function decide(input: AnalysisInput): Decision[] {
  const ctx = createRuleContext(input);
  const byCode = new Map<Decision['code'], Decision>();

  for (const rule of ANALYSIS_RULES) {
    const decision = rule.apply(ctx);
    if (!decision) continue;
    if (!byCode.has(decision.code)) {
      byCode.set(decision.code, decision);
    }
  }

  // Stable sort by code name for reproducible arrays
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}
