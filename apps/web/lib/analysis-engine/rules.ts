/**
 * S13 Rule catalog — pure functions, no LLM.
 * Every shipped rule id must have a matching Acceptance test.
 */
import type {
  Decision,
  EvidenceId,
  RuleContext,
} from './types';

export type AnalysisRule = {
  id: string;
  /** Human-stable name for traces only (not UI copy) */
  name: string;
  apply: (ctx: RuleContext) => Decision | null;
};

function refs(...ids: EvidenceId[]): EvidenceId[] {
  return ids;
}

/** R-01: Confirmed customer+problem, unknown revenue → Revenue Insufficient */
export const R_01: AnalysisRule = {
  id: 'R-01',
  name: 'revenue_insufficient_when_unknown',
  apply(ctx) {
    if (
      ctx.status('customer') === 'confirmed' &&
      ctx.status('problem') === 'confirmed' &&
      ctx.status('revenue') === 'unknown'
    ) {
      return {
        code: 'RevenueValidation',
        value: 'Insufficient',
        ruleId: 'R-01',
        evidenceRefs: refs('customer', 'problem', 'revenue'),
      };
    }
    return null;
  },
};

/** R-02: Assumed-only revenue (not confirmed) while customer confirmed → Fragile */
export const R_02: AnalysisRule = {
  id: 'R-02',
  name: 'revenue_fragile_when_assumed',
  apply(ctx) {
    if (
      ctx.status('customer') === 'confirmed' &&
      ctx.status('revenue') === 'assumed' &&
      ctx.status('problem') !== 'unknown'
    ) {
      return {
        code: 'RevenueValidation',
        value: 'Fragile',
        ruleId: 'R-02',
        evidenceRefs: refs('customer', 'revenue'),
      };
    }
    return null;
  },
};

/** R-03: Revenue+customer confirmed → MarketJudgment Ready (seed) */
export const R_03: AnalysisRule = {
  id: 'R-03',
  name: 'market_ready_when_revenue_and_customer',
  apply(ctx) {
    if (
      ctx.status('customer') === 'confirmed' &&
      ctx.status('revenue') === 'confirmed'
    ) {
      return {
        code: 'MarketJudgment',
        value: 'Ready',
        ruleId: 'R-03',
        evidenceRefs: refs('customer', 'revenue'),
      };
    }
    return null;
  },
};

/**
 * R-04 vacated (CPO Fold 2026-08-04).
 * ProblemFit is Insight language only — not a Decision Family.
 * @see docs/sprints/S13_RULE_ORIGIN_R04_R06.md
 */

/** R-05: Customer unknown → AnalysisGate Blocked */
export const R_05: AnalysisRule = {
  id: 'R-05',
  name: 'gate_blocked_when_customer_unknown',
  apply(ctx) {
    if (ctx.status('customer') === 'unknown') {
      return {
        code: 'AnalysisGate',
        value: 'Blocked',
        ruleId: 'R-05',
        evidenceRefs: refs('customer'),
      };
    }
    return null;
  },
};

/** R-06: Idea stage + payer unknown with confirmed customer → Revenue Insufficient (payer path) */
export const R_06: AnalysisRule = {
  id: 'R-06',
  name: 'idea_payer_unknown_insufficient',
  apply(ctx) {
    if (
      ctx.input.stage === 'idea' &&
      ctx.status('customer') === 'confirmed' &&
      ctx.status('payer') === 'unknown' &&
      ctx.status('revenue') !== 'confirmed'
    ) {
      return {
        code: 'RevenueValidation',
        value: 'Insufficient',
        ruleId: 'R-06',
        evidenceRefs: refs('customer', 'payer'),
      };
    }
    return null;
  },
};

/**
 * Ordered catalog. First matching rule per Decision.code wins
 * (higher-priority specificity listed earlier where needed).
 */
export const ANALYSIS_RULES: AnalysisRule[] = [
  R_05,
  R_03,
  R_01,
  R_02,
  R_06,
];

export function listRuleIds(): string[] {
  return ANALYSIS_RULES.map((r) => r.id);
}
