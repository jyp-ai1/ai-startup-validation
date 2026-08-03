/**
 * S14 Presenter — Engine Recommended Action → Action · Why · CTA.
 * No new Rules. Why/CTA are Presenter projections of Engine Decision+Insight.
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
  headline: string;
  decisions: Array<{ summary: string; ruleId: string }>;
  insights: Array<{ claim: string; basis: string[]; ruleId: string }>;
  recommended: AnalysisActionPresenter | null;
};

const CTA_BY_DECISION: Record<string, string> = {
  'RevenueValidation:Insufficient': '인터뷰 계획 만들기',
  'RevenueValidation:Fragile': '수익 근거 확인하기',
  'MarketJudgment:Ready': '시장성 다음 단계로',
  'AnalysisGate:Blocked': '고객 확인하기',
  'ProblemFit:Supported': '다음 Evidence 확인',
};

function primaryAction(
  result: AnalysisResult,
): { decision: Decision; insight: Insight; action: RecommendedAction } | null {
  const preferred =
    result.actions.find((a) => a.decisionValue === 'Insufficient' || a.decisionValue === 'Blocked') ??
    result.actions.find((a) => a.decisionValue === 'Fragile') ??
    result.actions[0];
  if (!preferred) return null;
  const decision = result.decisions.find((d) => d.ruleId === preferred.ruleId);
  const insight = result.insights.find((i) => i.ruleId === preferred.ruleId);
  if (!decision || !insight) return null;
  return { decision, insight, action: preferred };
}

function whyFromInsight(insight: Insight): string {
  return insight.claim;
}

function ctaFor(decision: Decision): string {
  return (
    CTA_BY_DECISION[`${decision.code}:${decision.value}`] ?? '다음 액션 진행'
  );
}

export function presentAnalysisScreen(result: AnalysisResult): AnalysisScreenPresenter {
  const primary = primaryAction(result);
  return {
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
    recommended: primary
      ? {
          action: primary.action.action,
          why: whyFromInsight(primary.insight),
          cta: ctaFor(primary.decision),
          ruleId: primary.action.ruleId,
          decisionCode: primary.decision.code,
          decisionValue: primary.decision.value,
        }
      : null,
  };
}
