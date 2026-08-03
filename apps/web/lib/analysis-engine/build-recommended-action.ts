/**
 * Recommended Action Builder — Decision → Action string.
 * Deterministic. No LLM.
 */
import type { Decision, RecommendedAction } from './types';

const ACTION: Record<string, string> = {
  'RevenueValidation:Insufficient': '수익 구조를 먼저 검증하세요.',
  'RevenueValidation:Fragile': '수익 구조 추정을 확인한 뒤 다시 판단하세요.',
  'RevenueValidation:Ready': '이제 시장성 분석을 이어갈 수 있습니다.',
  'MarketJudgment:Ready': '이제 시장성 분석을 시작할 수 있습니다.',
  'AnalysisGate:Blocked': '고객을 먼저 확인하세요.',
};

export function buildRecommendedAction(decision: Decision): RecommendedAction {
  const key = `${decision.code}:${decision.value}`;
  return {
    decisionCode: decision.code,
    decisionValue: decision.value,
    action: ACTION[key] ?? `Rule ${decision.ruleId} 결과를 확인하세요.`,
    ruleId: decision.ruleId,
  };
}

export function buildRecommendedActions(
  decisions: Decision[],
): RecommendedAction[] {
  return decisions.map(buildRecommendedAction);
}
