import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import { extractDocumentEntities } from '../domain/extract-document-entities';
import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';

export type AiPmRiskDimension = 'customer' | 'market' | 'bm' | 'competitor' | 'problem';

export type AiPmDocumentSignal = 'present' | 'weak' | 'missing';

export type AiPmRiskScore = {
  issueId: AiPmLoopIssueId;
  dimension: AiPmRiskDimension;
  label: string;
  score: number;
  rationale: string;
  documentSignal: AiPmDocumentSignal;
};

export type AiPmFirstQuestion = {
  issueId: AiPmLoopIssueId;
  questionKey: string;
};

export type AiPmDynamicDiagnosis = {
  riskScores: AiPmRiskScore[];
  primaryIssueId: AiPmLoopIssueId | null;
  topRiskIssueIds: AiPmLoopIssueId[];
  firstQuestion: AiPmFirstQuestion | null;
  confidencePercent: number;
  confidenceRationale: string;
};

const ISSUE_LABELS: Record<AiPmLoopIssueId, string> = {
  customer_definition: '고객',
  market_validation: '시장',
  bm_design: '수익모델',
  competitor_analysis: '경쟁사',
  problem_definition: '문제',
};

const FIRST_QUESTION_KEYS: Record<AiPmLoopIssueId, string> = {
  customer_definition: 'issues.customer_definition.question',
  problem_definition: 'issues.problem_definition.question',
  bm_design: 'issues.bm_design.question',
  competitor_analysis: 'issues.competitor_analysis.question',
  market_validation: 'issues.market_validation.question',
};

const REVENUE_KEYWORDS = [
  '수익',
  'revenue',
  '매출',
  '구독',
  'subscription',
  'bm',
  '비즈니스 모델',
  '요금',
  '가격',
  '수수료',
  '라이선스',
];

const MARKET_STRENGTH_KEYWORDS = /\d|만\s*개|억|%|침투|성장|tam|sam| CAGR|시장 규모/i;

function hasCustomerSection(documentText: string): boolean {
  return /(?:^|\n)\s*(?:고객|타겟|타깃|customer|target)\s*[:：]/im.test(documentText);
}

function isSpecificCustomerLabel(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return /관리자|팀장|담당|매니저|실무|owner|manager|director|engineer|operator/i.test(
    value.trim(),
  );
}

function isBroadCustomerLabel(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  if (isSpecificCustomerLabel(value)) return false;
  return /중소|중소기업|기업|일반|b2b|b2c|스타트업|사업자|제조/i.test(value.trim());
}

function scoreCustomerGap(
  understanding: BusinessUnderstanding,
  entities: LaunchLensDomainContext | null | undefined,
  documentText: string,
): AiPmRiskScore {
  const issueId = 'customer_definition' as const;
  const hasSection = hasCustomerSection(documentText);

  if (!hasSection && understanding.customer.status === 'unknown') {
    return {
      issueId,
      dimension: 'customer',
      label: ISSUE_LABELS[issueId],
      score: 92,
      documentSignal: 'missing',
      rationale: '문서에 고객·타깃 섹션이 없습니다.',
    };
  }

  if (
    understanding.customer.status === 'unknown' ||
    (understanding.customer.status === 'needs_confirmation' && understanding.customerMentions.length === 0)
  ) {
    return {
      issueId,
      dimension: 'customer',
      label: ISSUE_LABELS[issueId],
      score: 90,
      documentSignal: 'missing',
      rationale: '문서에서 실제 고객을 특정하지 못했습니다.',
    };
  }

  if (
    understanding.customerMentions.length >= 2 ||
    understanding.customer.status === 'needs_confirmation' ||
    isBroadCustomerLabel(entities?.customer.value ?? understanding.customer.value)
  ) {
    return {
      issueId,
      dimension: 'customer',
      label: ISSUE_LABELS[issueId],
      score: 88,
      documentSignal: 'weak',
      rationale: '고객 표현이 넓거나 여러 후보로만 적혀 있습니다.',
    };
  }

  if (understanding.customer.status === 'document' && understanding.customerMentions.length <= 1) {
    return {
      issueId,
      dimension: 'customer',
      label: ISSUE_LABELS[issueId],
      score: 18,
      documentSignal: 'present',
      rationale: '문서에 구체적인 고객 표현이 있습니다.',
    };
  }

  return {
    issueId,
    dimension: 'customer',
    label: ISSUE_LABELS[issueId],
    score: 70,
    documentSignal: 'weak',
    rationale: '고객 정의가 아직 확인이 필요합니다.',
  };
}

function scoreMarketGap(
  understanding: BusinessUnderstanding,
  entities: LaunchLensDomainContext | null | undefined,
  documentText: string,
): AiPmRiskScore {
  const issueId = 'market_validation' as const;
  const marketValue = entities?.market.value ?? null;
  const marketBasis = entities?.market.basis;

  if (marketBasis === 'document' && marketValue) {
    const strong = MARKET_STRENGTH_KEYWORDS.test(marketValue);
    return {
      issueId,
      dimension: 'market',
      label: ISSUE_LABELS[issueId],
      score: strong ? 22 : 58,
      documentSignal: strong ? 'present' : 'weak',
      rationale: strong
        ? '문서에 시장 규모·근거 표현이 있습니다.'
        : '시장 언급은 있지만 규모·타이밍 근거가 약합니다.',
    };
  }

  if (/시장|market|tam|sam/i.test(documentText)) {
    return {
      issueId,
      dimension: 'market',
      label: ISSUE_LABELS[issueId],
      score: 72,
      documentSignal: 'weak',
      rationale: '시장 키워드는 있지만 검증 가능한 시장 정의가 부족합니다.',
    };
  }

  if (understanding.business.status === 'document' && understanding.customer.status === 'document') {
    return {
      issueId,
      dimension: 'market',
      label: ISSUE_LABELS[issueId],
      score: 86,
      documentSignal: 'missing',
      rationale: '고객·사업은 있지만 왜 지금 이 시장인지 근거가 없습니다.',
    };
  }

  return {
    issueId,
    dimension: 'market',
    label: ISSUE_LABELS[issueId],
    score: 90,
    documentSignal: 'missing',
    rationale: '문서에 시장 정의·검증 근거가 없습니다.',
  };
}

function scoreBmGap(
  understanding: BusinessUnderstanding,
  documentText: string,
): AiPmRiskScore {
  const issueId = 'bm_design' as const;
  const lower = documentText.toLowerCase();

  if (understanding.revenue.status === 'document') {
    return {
      issueId,
      dimension: 'bm',
      label: ISSUE_LABELS[issueId],
      score: 20,
      documentSignal: 'present',
      rationale: '문서에 수익·BM 표현이 확인됩니다.',
    };
  }

  if (REVENUE_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()))) {
    return {
      issueId,
      dimension: 'bm',
      label: ISSUE_LABELS[issueId],
      score: 68,
      documentSignal: 'weak',
      rationale: '수익 관련 언급은 있지만 구조가 명확하지 않습니다.',
    };
  }

  return {
    issueId,
    dimension: 'bm',
    label: ISSUE_LABELS[issueId],
    score: 91,
    documentSignal: 'missing',
    rationale: '문서에 수익모델·비용 지불 주체가 없습니다.',
  };
}

function scoreCompetitorGap(
  entities: LaunchLensDomainContext | null | undefined,
  documentText: string,
): AiPmRiskScore {
  const issueId = 'competitor_analysis' as const;

  if (entities?.competitor.basis === 'document' && entities.competitor.value) {
    return {
      issueId,
      dimension: 'competitor',
      label: ISSUE_LABELS[issueId],
      score: 28,
      documentSignal: 'present',
      rationale: '문서에 경쟁·대안 언급이 있습니다.',
    };
  }

  if (/경쟁|competitor|대안|대체/i.test(documentText)) {
    return {
      issueId,
      dimension: 'competitor',
      label: ISSUE_LABELS[issueId],
      score: 55,
      documentSignal: 'weak',
      rationale: '경쟁 언급은 있지만 포지션이 정리되지 않았습니다.',
    };
  }

  return {
    issueId,
    dimension: 'competitor',
    label: ISSUE_LABELS[issueId],
    score: 52,
    documentSignal: 'missing',
    rationale: '경쟁 구도는 상대적으로 덜 급합니다.',
  };
}

function scoreProblemGap(understanding: BusinessUnderstanding): AiPmRiskScore {
  const issueId = 'problem_definition' as const;

  if (understanding.problem.status === 'unknown') {
    return {
      issueId,
      dimension: 'problem',
      label: ISSUE_LABELS[issueId],
      score: 78,
      documentSignal: 'missing',
      rationale: '문서에 문제 정의가 없습니다.',
    };
  }

  if (understanding.problem.status === 'needs_confirmation') {
    return {
      issueId,
      dimension: 'problem',
      label: ISSUE_LABELS[issueId],
      score: 62,
      documentSignal: 'weak',
      rationale: '문제 언급은 있지만 한 문장으로 정리되지 않았습니다.',
    };
  }

  return {
    issueId,
    dimension: 'problem',
    label: ISSUE_LABELS[issueId],
    score: 24,
    documentSignal: 'present',
    rationale: '문서에 문제 표현이 있습니다.',
  };
}

function rankRiskScores(scores: AiPmRiskScore[]): AiPmRiskScore[] {
  return [...scores].sort((a, b) => b.score - a.score);
}

function buildConfidence(
  ranked: AiPmRiskScore[],
  primary: AiPmRiskScore | null,
): { confidencePercent: number; confidenceRationale: string } {
  const avgGap = ranked.reduce((sum, item) => sum + item.score, 0) / ranked.length;
  const confidencePercent = Math.round(Math.max(44, Math.min(76, 76 - avgGap * 0.34)));

  if (!primary) {
    return {
      confidencePercent,
      confidenceRationale: '문서 전반이 비교적 정리되어 있어 보수적으로 추정했습니다.',
    };
  }

  return {
    confidencePercent,
    confidenceRationale: `${primary.label} Gap 점수 ${primary.score} — ${primary.rationale}`,
  };
}

/** Document-based diagnosis — Risk #1 and first question derive from gap scores only. */
export function buildAiPmDynamicDiagnosis(
  understanding: BusinessUnderstanding,
  entities?: LaunchLensDomainContext | null,
  documentText?: string | null,
  resolvedIssueIds: AiPmLoopIssueId[] = [],
): AiPmDynamicDiagnosis {
  const text = documentText?.trim() ?? '';
  const resolved = new Set(resolvedIssueIds);
  const resolvedEntities = entities ?? (text ? extractDocumentEntities(text) : null);

  const riskScores = rankRiskScores([
    scoreCustomerGap(understanding, resolvedEntities, text),
    scoreMarketGap(understanding, resolvedEntities, text),
    scoreBmGap(understanding, text),
    scoreCompetitorGap(resolvedEntities, text),
    scoreProblemGap(understanding),
  ]);

  const available = riskScores.filter((item) => !resolved.has(item.issueId));
  const primary = available[0] ?? null;
  const primaryIssueId = primary?.issueId ?? null;
  const topRiskIssueIds = available.slice(0, 3).map((item) => item.issueId);

  const confidence = buildConfidence(riskScores, primary);

  return {
    riskScores,
    primaryIssueId,
    topRiskIssueIds,
    firstQuestion: primaryIssueId
      ? {
          issueId: primaryIssueId,
          questionKey: FIRST_QUESTION_KEYS[primaryIssueId],
        }
      : null,
    confidencePercent: confidence.confidencePercent,
    confidenceRationale: confidence.confidenceRationale,
  };
}

export function estimateDynamicRiskScore(
  diagnosis: AiPmDynamicDiagnosis,
  issueId: AiPmLoopIssueId,
): number {
  return diagnosis.riskScores.find((item) => item.issueId === issueId)?.score ?? 0;
}
