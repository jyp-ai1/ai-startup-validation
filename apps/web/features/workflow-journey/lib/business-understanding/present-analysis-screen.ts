/**
 * S14/S15 Presenter — Engine → Judgment · Evidence · Hero Action (one CTA).
 * S15: Decision Fatigue removal — secondary actions behind 「더보기」.
 */
import type { AnalysisResult, Decision, Insight, RecommendedAction } from '@/lib/analysis-engine/types';

export type AnalysisActionPresenter = {
  action: string;
  why: string;
  cta: string;
  ruleId: string;
  decisionCode: string;
  decisionValue: string;
};

export type AnalysisScreenPresenter = {
  /** One-line AI judgment */
  judgment: string;
  /** Evidence claims (max 3 for primary surface) */
  evidence: string[];
  /** Single Hero Action */
  hero: AnalysisActionPresenter | null;
  /** Folded secondary actions (not Hero) */
  secondary: AnalysisActionPresenter[];
  /** Supporting meta — not primary UI */
  supportingScoreHint: string | null;
  /** @deprecated keep for callers; prefer judgment */
  headline: string;
  decisions: Array<{ summary: string; ruleId: string }>;
  insights: Array<{ claim: string; basis: string[]; ruleId: string }>;
  recommended: AnalysisActionPresenter | null;
};

const CTA_BY_DECISION: Record<string, string> = {
  'RevenueValidation:Insufficient': '수익구조 검증하기',
  'RevenueValidation:Fragile': '수익 근거 확인하기',
  'MarketJudgment:Ready': '시장성 다음 단계로',
  'AnalysisGate:Blocked': '고객 확인하기',
  'ProblemFit:Supported': '다음 Evidence 확인',
};

function presentAction(
  decision: Decision,
  insight: Insight,
  action: RecommendedAction,
): AnalysisActionPresenter {
  return {
    action: action.action,
    why: insight.claim,
    cta:
      CTA_BY_DECISION[`${decision.code}:${decision.value}`] ?? '다음 액션 진행',
    ruleId: action.ruleId,
    decisionCode: decision.code,
    decisionValue: decision.value,
  };
}

function rankedActions(result: AnalysisResult): AnalysisActionPresenter[] {
  const ordered = [
    ...result.actions.filter(
      (a) => a.decisionValue === 'Insufficient' || a.decisionValue === 'Blocked',
    ),
    ...result.actions.filter((a) => a.decisionValue === 'Fragile'),
    ...result.actions.filter(
      (a) =>
        a.decisionValue !== 'Insufficient' &&
        a.decisionValue !== 'Blocked' &&
        a.decisionValue !== 'Fragile',
    ),
  ];
  const seen = new Set<string>();
  const out: AnalysisActionPresenter[] = [];
  for (const action of ordered) {
    if (seen.has(action.ruleId)) continue;
    seen.add(action.ruleId);
    const decision = result.decisions.find((d) => d.ruleId === action.ruleId);
    const insight = result.insights.find((i) => i.ruleId === action.ruleId);
    if (!decision || !insight) continue;
    out.push(presentAction(decision, insight, action));
  }
  return out;
}

export function presentAnalysisScreen(result: AnalysisResult): AnalysisScreenPresenter {
  const actions = rankedActions(result);
  const hero = actions[0] ?? null;
  const secondary = actions.slice(1);
  const primaryDecision = result.decisions.find((d) => d.ruleId === hero?.ruleId) ?? result.decisions[0];
  const judgment = primaryDecision
    ? `${primaryDecision.code} = ${primaryDecision.value}`
    : '판단 준비 중';

  const evidence = result.insights.map((i) => i.claim).slice(0, 3);

  return {
    judgment,
    evidence,
    hero,
    secondary,
    supportingScoreHint: null,
    headline: '시장성 분석 결과',
    decisions: result.decisions.map((d) => ({
      summary: `${d.code} = ${d.value}`,
      ruleId: d.ruleId,
    })),
    insights: result.insights.map((i) => ({
      claim: i.claim,
      basis: i.basisEvidenceIds,
      ruleId: i.ruleId,
    })),
    recommended: hero,
  };
}
