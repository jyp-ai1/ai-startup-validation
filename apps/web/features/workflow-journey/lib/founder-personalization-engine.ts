import { loadLearningContext } from '@/lib/agents/learning-store';

import { loadProjectRegistration } from '../components/project-registration-panel';
import type { WorkflowGoalId } from '../types';
import type { FounderBehaviorProfile } from './founder-behavior-store';
import { hasRepeatedDeferral } from './founder-behavior-store';
import type {
  BusinessProgressDimension,
  FounderIntelligenceBrief,
  GeneratedTodayAction,
} from './founder-intelligence-engine';
import { loadFounderMicroAnswers } from './founder-micro-interaction-store';

export type SuccessScoreFactor = {
  key: string;
  status: 'strong' | 'gap';
  percent?: number;
};

export type PersonalizedAiPmBrief = {
  greeting: string;
  contextLine?: string;
  memoryLine?: string;
  priorityLine?: string;
  recommendationWhy: string;
};

export type WeeklyCeoReview = {
  scoreDelta: number;
  scoreFrom: number;
  scoreTo: number;
  bestDecision?: string;
  biggestRisk?: string;
  nextWeekPriority: string;
  missedOpportunity?: string;
};

const TARGET_CUSTOMER_LABEL: Record<string, string> = {
  office: '직장인',
  student: '학생',
  enterprise: '기업',
  unknown: '아직 정하지 않은',
};

function resolveIndustryHint(ideaSummary?: string, goalLabel?: string): string | undefined {
  if (!ideaSummary && !goalLabel) return undefined;
  const text = `${ideaSummary ?? ''} ${goalLabel ?? ''}`.toLowerCase();
  if (text.includes('b2b') || text.includes('saas') || text.includes('기업')) return 'B2B SaaS';
  if (text.includes('pt') || text.includes('헬스') || text.includes('예약')) return '로컬 서비스';
  if (text.includes('ai') || text.includes('영어') || text.includes('교육')) return 'AI·교육';
  if (text.includes('반려') || text.includes('pet')) return '반려동물';
  return goalLabel;
}

export function buildExplainableScoreFactors(
  businessProgress: BusinessProgressDimension[],
  reasonKeys: string[],
): SuccessScoreFactor[] {
  const market = businessProgress.find((d) => d.key === 'market')?.percent ?? 0;
  const customer = businessProgress.find((d) => d.key === 'customer')?.percent ?? 0;
  const pricing = businessProgress.find((d) => d.key === 'pricing')?.percent ?? 0;
  const investment = businessProgress.find((d) => d.key === 'investment')?.percent ?? 0;

  const factors: SuccessScoreFactor[] = [];

  if (market >= 60) factors.push({ key: 'marketValidated', status: 'strong', percent: market });
  else factors.push({ key: 'marketEvidence', status: market >= 30 ? 'strong' : 'gap', percent: market });

  if (reasonKeys.includes('competitorDone') || reasonKeys.includes('competitorMatrix')) {
    factors.push({ key: 'competitorDone', status: 'strong' });
  } else {
    factors.push({ key: 'competitorEdge', status: 'gap' });
  }

  if (pricing >= 50) factors.push({ key: 'pricingValidated', status: 'strong', percent: pricing });
  else factors.push({ key: 'pricingValidation', status: 'gap', percent: pricing });

  if (customer >= 40) factors.push({ key: 'customerValidated', status: 'strong', percent: customer });
  else factors.push({ key: 'customerInterview', status: 'gap', percent: customer });

  if (investment >= 20) factors.push({ key: 'investmentReady', status: 'strong', percent: investment });

  return factors.slice(0, 5);
}

export function buildPersonalizedAiPmBrief(
  brief: Pick<
    FounderIntelligenceBrief,
    'successScore' | 'todayActions' | 'totalEtaMinutes' | 'businessProgress' | 'dailyReview'
  >,
  behavior: FounderBehaviorProfile | null,
  goalId: WorkflowGoalId,
  primaryAction?: GeneratedTodayAction,
): PersonalizedAiPmBrief {
  const registration = loadProjectRegistration();
  const micro = loadFounderMicroAnswers();
  const learning = behavior ? loadLearningContext(behavior.projectId) : null;
  const industry = resolveIndustryHint(
    behavior?.ideaSummary ?? registration?.ideaOneLiner,
    behavior?.goalLabel,
  );
  const gapKey = behavior?.currentGapKey ?? 'vocGap';
  const actionTitle = primaryAction?.title ?? '오늘의 핵심 액션';
  const minutes = primaryAction?.etaMinutes ?? brief.totalEtaMinutes;
  const impact = primaryAction?.goImpact ?? 4;

  let memoryLine: string | undefined;
  if (hasRepeatedDeferral(behavior, gapKey)) {
    if (gapKey === 'vocGap') {
      memoryLine = `지난주에도 고객 인터뷰를 미뤘습니다. 이번에는 3명만 인터뷰하면 가격 전략을 결정할 수 있습니다.`;
    } else if (gapKey === 'competitorGap') {
      memoryLine = `경쟁 분석은 진행했지만 차별화 검증이 미뤄지고 있습니다. 이번에는 ${minutes}분만 투자하면 정리할 수 있습니다.`;
    } else {
      memoryLine = `지난 ${Math.max(2, behavior?.gapWeeksUnchanged ?? 2)}주 동안 같은 검증이 남아 있습니다. 오늘은 끝내겠습니다.`;
    }
  } else if (behavior && behavior.visitCount > 1) {
    memoryLine = `시장 분석은 꾸준히 하셨지만, ${gapKey === 'vocGap' ? '고객 인터뷰' : '핵심 검증'}는 아직 부족합니다. 그래서 오늘은 그것부터 끝내겠습니다.`;
  }

  let contextLine: string | undefined;
  if (industry) {
    const customerHint = micro.targetCustomer
      ? `${TARGET_CUSTOMER_LABEL[micro.targetCustomer] ?? micro.targetCustomer} 고객`
      : undefined;
    contextLine = customerHint
      ? `대표님은 ${industry}를 만들고 있습니다. 주 고객은 ${customerHint}입니다.`
      : `대표님은 ${industry}를 만들고 있습니다.`;
  }

  const topSignal = learning?.signals?.[0]?.recommendation;
  const recommendationWhy =
    topSignal ??
    (gapKey === 'vocGap' || gapKey.includes('voc')
      ? `제가 오늘은 가격 검증을 먼저 추천드립니다.\n\n이유는 대표님 아이디어는 기술보다 가격이 경쟁력의 핵심이기 때문입니다.`
      : `제가 오늘은 ${actionTitle}을 먼저 추천드립니다.\n\n이유는 지금 단계에서 이것이 GO 가능성을 가장 빠르게 올리기 때문입니다.`);

  const priorityLine =
    gapKey === 'vocGap'
      ? `이번 주는 경쟁사보다 고객 인터뷰가 더 중요합니다.`
      : undefined;

  return {
    greeting: '대표님.',
    contextLine,
    memoryLine,
    priorityLine,
    recommendationWhy: `${recommendationWhy}\n\n예상 ${minutes}분 · 사업 성공확률 +${impact}%`,
  };
}

export function buildWeeklyCeoReview(
  brief: Pick<
    FounderIntelligenceBrief,
    'successScore' | 'todayActions' | 'dailyReview' | 'businessProgress'
  >,
  behavior: FounderBehaviorProfile | null,
): WeeklyCeoReview {
  const snapshots = behavior?.scoreSnapshots ?? [];
  const scoreTo = brief.successScore.percent;
  const scoreFrom =
    snapshots.length >= 2
      ? snapshots[snapshots.length - 2]!.score
      : Math.max(0, scoreTo - brief.successScore.delta);

  const primary = brief.todayActions[0];
  const risk =
    brief.businessProgress.find((d) => d.percent < 40)?.key === 'customer'
      ? 'customerInterview'
      : brief.businessProgress.find((d) => d.percent < 40)?.key === 'pricing'
        ? 'pricingValidation'
        : 'marketEvidence';

  return {
    scoreDelta: scoreTo - scoreFrom,
    scoreFrom,
    scoreTo,
    bestDecision: brief.dailyReview.advances?.[0] ?? '시장·경쟁 분석을 꾸준히 진행',
    biggestRisk: risk,
    nextWeekPriority: primary?.title ?? brief.dailyReview.tomorrowFocus ?? '가격 검증',
    missedOpportunity:
      behavior && hasRepeatedDeferral(behavior, behavior.currentGapKey)
        ? 'customerInterview'
        : undefined,
  };
}

export function buildPersonalizedMorningLines(
  personalized: PersonalizedAiPmBrief,
  morningBrief?: string,
): string[] {
  const lines: string[] = [personalized.greeting];
  if (personalized.contextLine) lines.push(personalized.contextLine);
  if (personalized.memoryLine) lines.push(personalized.memoryLine);
  if (personalized.priorityLine) lines.push(personalized.priorityLine);
  if (morningBrief && !personalized.memoryLine) lines.push(morningBrief);
  lines.push(personalized.recommendationWhy);
  return lines;
}
