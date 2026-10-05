/**
 * Journey C Review surface — presentation only.
 * Reads existing living / gapState / lastDecision. Does not persist new SoT.
 */
import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import { STAGE_A_REQUIRED_GAPS } from './evaluate-stage-readiness';
import { inferTargetGapFromQuestionText } from './gap-question-map';
import type { LivingUnderstandingState } from './living-understanding-state';
import { getClosedGapIds, isGapAskable } from './update-gap-state-from-review';
import { toHumanLanguageQuestion } from './ai-pm-question-human-language';

export type ReviewThemeStatus = 'confirmed' | 'in_progress' | 'unverified';

export type ReviewCentricSlot = {
  key: 'business' | 'customer' | 'payer' | 'problem';
  label: string;
  value: string;
  status: ReviewThemeStatus;
};

export type ReviewCentricTheme = {
  id: string;
  label: string;
  status: ReviewThemeStatus;
};

export type ReviewCentricSurfaceSnapshot = {
  slots: ReviewCentricSlot[];
  judgment: string;
  uncertainty: string;
  whyThisQuestion: string;
  questionText: string;
  progressLabel: string;
  themes: ReviewCentricTheme[];
  confirmedCount: number;
  importantOpenCount: number;
  judgmentJustUpdated: boolean;
};

export const REVIEW_SLOT_PENDING = '아직 확인되지 않음';
export const REVIEW_SLOT_SEEN_UNVERIFIED = '문서에서 보이나 아직 검증되지 않음';

const UNCERTAINTY_BY_GAP: Record<string, string> = {
  businessOneLiner: '무엇을 제공하는 사업인가?',
  customerPersona: '누구의 어떤 문제를 푸는 사업인가?',
  payer: '이 고객이 실제로 돈을 지불할 이유가 있는가?',
  problemJtbd: '지금 가장 아픈 문제가 무엇인가?',
  alternativesCompetitors: '지금 쓰는 대안과 무엇이 다른가?',
  differentiationVsAlternatives: '지금 쓰는 방법보다 무엇이 다른가?',
  marketChannel: '어디서 누구에게 접근하는가?',
  solution: '그래서 무엇을 해결하려고 하는가?',
  validationTestability: '이 가설을 무엇으로 검증하는가?',
};

const WHY_BY_GAP: Record<string, string> = {
  businessOneLiner: '한 줄 정의가 바뀌면 이후 판단의 전제가 달라집니다.',
  customerPersona: '고객이 바뀌면 지금 판단의 전제가 달라집니다.',
  payer: '지불 주체가 바뀌면 사업 모델이 달라집니다.',
  problemJtbd: '문제가 바뀌면 지금 해결하려는 대상이 달라집니다.',
  alternativesCompetitors: '기존 대안이 확인되면 차별 판단이 달라집니다.',
  differentiationVsAlternatives: '차별점이 확인되면 대안 대비 판단이 달라집니다.',
  marketChannel: '접근 경로가 바뀌면 실행 판단이 달라집니다.',
  solution: '해결 방식이 바뀌면 지금 파는 것이 달라집니다.',
  validationTestability: '검증 방법이 바뀌면 다음 실행이 달라집니다.',
};

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** True when a slot value is just the founder source reprinted. */
export function isSourceReprint(value: string, documentText: string): boolean {
  const slot = normalize(value).replace(/[…]+$/g, '').trim();
  const doc = normalize(documentText);
  if (slot.length < 12 || doc.length < 12) return false;
  if (doc.includes(slot.slice(0, 36)) || slot.startsWith(doc.slice(0, 36))) return true;
  if (doc.includes(slot) && slot.length >= 40) return true;
  return false;
}

function claimValue(living: LivingUnderstandingState, fieldKey: string): string | null {
  const claim = living.claims.find((item) => item.fieldKey === fieldKey);
  const raw = claim?.value?.trim() || null;
  if (!raw || raw === '아직 확인 중') return null;
  return raw;
}

function isFounderVerified(
  living: LivingUnderstandingState,
  fieldKey: string,
  gapState?: GapKnowledgeState | null,
): boolean {
  if (gapState?.gaps[fieldKey]?.completeness === 'CLOSED') return true;
  const claim = living.claims.find((item) => item.fieldKey === fieldKey);
  return (
    claim?.status === 'confirmed' ||
    claim?.provenance === 'USER_CONFIRMED' ||
    claim?.provenance === 'USER_CORRECTED'
  );
}

/** Verbatim source token — not a review. 「관광객」 in the document is not a verified customer. */
export function isShortDocumentToken(value: string, documentText: string): boolean {
  const slot = normalize(value);
  const doc = normalize(documentText);
  if (slot.length < 2 || doc.length < 2) return false;
  if (!doc.includes(slot)) return false;
  return slot.length < 18;
}

function slotValue(
  raw: string | null,
  documentText: string,
  fallback: string | null,
  founderVerified: boolean,
): string {
  const pick = raw && raw !== '아직 확인 중' ? raw : fallback && fallback !== '아직 확인 중' ? fallback : null;
  if (!pick) return REVIEW_SLOT_PENDING;
  if (isSourceReprint(pick, documentText)) return REVIEW_SLOT_SEEN_UNVERIFIED;
  if (!founderVerified && isShortDocumentToken(pick, documentText)) {
    return REVIEW_SLOT_SEEN_UNVERIFIED;
  }
  return pick;
}

function themeStatus(gapId: string, gapState: GapKnowledgeState | null | undefined): ReviewThemeStatus {
  const completeness = gapState?.gaps[gapId]?.completeness;
  if (completeness === 'CLOSED') return 'confirmed';
  if (completeness === 'PARTIAL' || completeness === 'CONTRADICTED') return 'in_progress';
  return 'unverified';
}

function isFilled(value: string): boolean {
  return value !== REVIEW_SLOT_PENDING;
}

function buildJudgment(input: {
  closed: string[];
  customerShown: boolean;
  payerShown: boolean;
  businessShown: boolean;
  lastAnsweredGap?: string | null;
  lastAnswerText?: string | null;
}): string {
  const closed = new Set(input.closed);
  if (closed.has('customerPersona') && !closed.has('payer')) {
    return '고객 문제는 비교적 보이지만, 실제 지불 주체와 기존 대안에 대한 근거가 부족합니다.';
  }
  if (closed.has('businessOneLiner') && !closed.has('customerPersona')) {
    return '사업 윤곽은 있으나, 누구의 어떤 문제를 푸는지가 아직 확인되지 않았습니다.';
  }
  if (closed.has('problemJtbd') && !closed.has('payer')) {
    return '문제 후보는 있으나, 그 문제를 누가 돈 내고 푸는지가 미검증입니다.';
  }
  if (closed.has('alternativesCompetitors') && !closed.has('customerPersona')) {
    return '대안 스케치는 있으나, 누구의 문제를 푸는 사업인지는 아직 검증되지 않았습니다.';
  }
  if (closed.has('alternativesCompetitors') && !closed.has('payer')) {
    return '기존 쓰는 방법은 보이나, 그 대비 지불 이유는 아직 검증되지 않았습니다.';
  }
  if (input.lastAnsweredGap === 'alternativesCompetitors' && !closed.has('customerPersona')) {
    return '방금 현재 쓰는 방법을 들었지만, 고객과 지불 구조는 아직 검증되지 않았습니다.';
  }
  if (input.lastAnsweredGap && !closed.has(input.lastAnsweredGap) && !closed.has('businessOneLiner')) {
    return '방금 답이 들어왔지만, 그 내용이 판단을 바꿀 만큼 검증되지는 않았습니다.';
  }
  if (input.lastAnswerText?.trim() && !closed.has('businessOneLiner') && !closed.has('customerPersona')) {
    return '방금 답이 들어왔지만, 그 내용이 판단을 바꿀 만큼 검증되지는 않았습니다.';
  }
  if (!closed.has('businessOneLiner')) {
    if (input.customerShown && input.payerShown) {
      return '문서에서 고객과 구매자 스케치는 보이지만, 그 구조가 아직 검증되지 않았습니다.';
    }
    if (input.customerShown && !input.payerShown) {
      return '문서에서 고객 스케치는 보이지만, 그 고객이 검증되지 않았고 누가 돈을 내는지도 갈라지지 않았습니다.';
    }
    if (input.businessShown) {
      return '사업 윤곽은 문서에서 보이지만, 한 줄 정의와 지불 구조가 아직 검증되지 않았습니다.';
    }
    return '문서를 읽었지만, 한 줄 정의와 지불 구조가 아직 검증되지 않았습니다.';
  }
  return '확인된 것은 있으나, 판단을 바꿀 핵심 근거가 아직 부족합니다.';
}

export function buildReviewCentricSurface(input: {
  living: LivingUnderstandingState;
  gapState?: GapKnowledgeState | null;
  documentText: string;
  displayQuestionText: string;
  targetGap?: string | null;
  lastAnsweredGap?: string | null;
  lastAnswerText?: string | null;
}): ReviewCentricSurfaceSnapshot {
  const closed = input.gapState ? getClosedGapIds(input.gapState) : [];
  const business = slotValue(
    claimValue(input.living, 'businessOneLiner') ?? input.living.spine.business,
    input.documentText,
    null,
    isFounderVerified(input.living, 'businessOneLiner', input.gapState),
  );
  const customer = slotValue(
    claimValue(input.living, 'customerPersona') ?? input.living.spine.customer,
    input.documentText,
    null,
    isFounderVerified(input.living, 'customerPersona', input.gapState),
  );
  const payer = slotValue(
    claimValue(input.living, 'payer'),
    input.documentText,
    null,
    isFounderVerified(input.living, 'payer', input.gapState),
  );
  const problem = slotValue(
    claimValue(input.living, 'problemJtbd') ?? input.living.spine.problem,
    input.documentText,
    null,
    isFounderVerified(input.living, 'problemJtbd', input.gapState),
  );

  const slots: ReviewCentricSlot[] = [
    {
      key: 'business',
      label: '사업',
      value: business,
      status: themeStatus('businessOneLiner', input.gapState),
    },
    {
      key: 'customer',
      label: '고객',
      value: customer,
      status: themeStatus('customerPersona', input.gapState),
    },
    {
      key: 'payer',
      label: '구매자',
      value: payer,
      status: themeStatus('payer', input.gapState),
    },
    {
      key: 'problem',
      label: '문제',
      value: problem,
      status: themeStatus('problemJtbd', input.gapState),
    },
  ];

  const target =
    input.targetGap ??
    inferTargetGapFromQuestionText(input.displayQuestionText) ??
    STAGE_A_REQUIRED_GAPS.find((gap) => input.gapState && isGapAskable(gap, input.gapState)) ??
    'businessOneLiner';

  const themes: ReviewCentricTheme[] = [
    { id: 'business', label: '사업 이해', status: themeStatus('businessOneLiner', input.gapState) },
    { id: 'customer', label: '고객', status: themeStatus('customerPersona', input.gapState) },
    { id: 'payer', label: '지불 의사', status: themeStatus('payer', input.gapState) },
    { id: 'problem', label: '고객 문제', status: themeStatus('problemJtbd', input.gapState) },
    {
      id: 'market',
      label: '시장/대안',
      status:
        themeStatus('alternativesCompetitors', input.gapState) === 'unverified' &&
        input.lastAnsweredGap === 'alternativesCompetitors'
          ? 'in_progress'
          : themeStatus('alternativesCompetitors', input.gapState),
    },
    {
      id: 'viability',
      label: '사업성 판단',
      status: closed.length > 0 ? 'in_progress' : 'unverified',
    },
  ];

  const confirmedCount = themes.filter((theme) => theme.status === 'confirmed').length;
  const importantOpenCount = themes.filter((theme) => theme.status !== 'confirmed').length;

  return {
    slots,
    judgment: buildJudgment({
      closed,
      customerShown: isFilled(customer),
      payerShown: isFilled(payer),
      businessShown: isFilled(business),
      lastAnsweredGap: input.lastAnsweredGap,
      lastAnswerText: input.lastAnswerText,
    }),
    uncertainty: UNCERTAINTY_BY_GAP[target] ?? '지금 판단을 바꿀 빈칸이 무엇인가?',
    whyThisQuestion: WHY_BY_GAP[target] ?? '이 답이 바뀌면 현재 판단이 달라집니다.',
    questionText: toHumanLanguageQuestion(input.displayQuestionText, target),
    progressLabel: `지금까지 확인한 것 ${confirmedCount}개 · 아직 중요한 것 ${importantOpenCount}개`,
    themes,
    confirmedCount,
    importantOpenCount,
    judgmentJustUpdated: Boolean(input.lastAnswerText?.trim()),
  };
}
