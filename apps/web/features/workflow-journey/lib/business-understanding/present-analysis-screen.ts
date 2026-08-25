/**
 * S14/S15 Presenter — Engine → Judgment · ≤3 reasons · 1 critical gap · Hero Action (one CTA).
 * S15 / Long Sprint W10: Decision Fatigue — secondary never Hero; score supporting only.
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
  /** Evidence / reasons (max 3 for primary surface) */
  evidence: string[];
  /** Alias of evidence for Evidence-first copy */
  reasons: string[];
  /** Single most important remaining gap (or null when clear) */
  criticalGap: string | null;
  /** Single Hero Action — Decision Fatigue: exactly 0 or 1 primary CTA */
  hero: AnalysisActionPresenter | null;
  /** Folded secondary actions (not Hero — never buttons on primary surface) */
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

function humanJudgment(decision: Decision | undefined): string {
  if (!decision) return '판단 준비 중';
  if (decision.value === 'Blocked' || decision.value === 'Insufficient') {
    return `지금은 HOLD — ${decision.code}이(가) 아직 부족합니다.`;
  }
  if (decision.value === 'Fragile') {
    return `조건부 진행 — ${decision.code} 근거가 약합니다.`;
  }
  if (decision.value === 'Ready' || decision.value === 'Supported') {
    return `GO 방향 — ${decision.code} 기준으로 다음 행동이 분명합니다.`;
  }
  return `${decision.code}: ${decision.value}`;
}

export function presentAnalysisScreen(result: AnalysisResult): AnalysisScreenPresenter {
  const actions = rankedActions(result);
  const hero = actions[0] ?? null;
  const secondary = actions.slice(1);
  const primaryDecision =
    result.decisions.find((d) => d.ruleId === hero?.ruleId) ?? result.decisions[0];
  const judgment = humanJudgment(primaryDecision);

  const reasons = result.insights.map((i) => i.claim).slice(0, 3);
  const criticalGap =
    hero &&
    (hero.decisionValue === 'Insufficient' ||
      hero.decisionValue === 'Blocked' ||
      hero.decisionValue === 'Fragile')
      ? hero.action
      : null;

  const blockedOrFragile = result.decisions.filter(
    (d) =>
      d.value === 'Blocked' || d.value === 'Insufficient' || d.value === 'Fragile',
  ).length;
  const supportingScoreHint =
    result.decisions.length > 0
      ? `지원 신호 · 결정 ${result.decisions.length} · 주의 ${blockedOrFragile} (점수는 보조)`
      : null;

  return {
    judgment,
    evidence: reasons,
    reasons,
    criticalGap,
    hero,
    secondary,
    supportingScoreHint,
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

/** Decision Fatigue guard — primary surface may expose at most one Hero CTA. */
export function assertSingleHeroCta(presenter: AnalysisScreenPresenter): boolean {
  return presenter.hero === null || presenter.recommended === presenter.hero;
}
