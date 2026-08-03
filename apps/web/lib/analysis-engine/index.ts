/**
 * Analysis Engine entry — deterministic orchestration.
 */
import { buildInsights } from './build-insight';
import { buildRecommendedActions } from './build-recommended-action';
import { decide } from './decide';
import type { AnalysisInput, AnalysisResult } from './types';

export function runAnalysis(input: AnalysisInput): AnalysisResult {
  const decisions = decide(input);
  const insights = buildInsights(decisions, input);
  const actions = buildRecommendedActions(decisions);

  return {
    input: structuredClone(input),
    decisions,
    insights,
    actions,
  };
}

export { decide } from './decide';
export { buildInsight, buildInsights } from './build-insight';
export {
  buildRecommendedAction,
  buildRecommendedActions,
} from './build-recommended-action';
export { ANALYSIS_RULES, listRuleIds } from './rules';
export type * from './types';
