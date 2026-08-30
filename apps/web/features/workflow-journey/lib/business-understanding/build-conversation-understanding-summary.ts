/**
 * CPO UX — structured understanding summary for collapsed conversation panel.
 * Uses Living Understanding spine + claims — not transcript accumulation.
 */
import { SHARED_UNDERSTANDING_PENDING } from './build-shared-understanding';
import type { LivingUnderstandingState } from './living-understanding-state';

export type ConversationUnderstandingRow = {
  label: string;
  value: string;
};

const FIELD_LABEL: Record<string, string> = {
  businessOneLiner: '사업',
  customerPersona: '고객',
  problemJtbd: '문제',
  solution: '해결 방법',
  revenueModel: '수익',
  pricingHint: '가격',
  differentiationVsAlternatives: '차별점',
  marketSizeEvidence: '수요',
};

const SPINE_LABEL: Record<'business' | 'customer' | 'problem', string> = {
  business: '사업',
  customer: '고객',
  problem: '문제',
};

function claimValue(
  living: LivingUnderstandingState,
  fieldKey: string,
): string | null {
  const claim = living.claims.find((c) => c.fieldKey === fieldKey);
  if (!claim?.value?.trim()) return null;
  return claim.value.trim();
}

function spineOrClaim(
  living: LivingUnderstandingState,
  spineKey: 'business' | 'customer' | 'problem',
  claimKey: string,
): string | null {
  const spineVal = living.spine[spineKey]?.trim();
  if (spineVal && spineVal !== SHARED_UNDERSTANDING_PENDING) {
    return spineVal;
  }
  return claimValue(living, claimKey);
}

/** Founder-facing labeled rows — 고객 / 문제 / 해결 / 수익 / 차별 / 수요. */
export function buildConversationUnderstandingRows(
  living: LivingUnderstandingState,
): ConversationUnderstandingRow[] {
  const rows: Array<ConversationUnderstandingRow | null> = [
    {
      label: SPINE_LABEL.customer,
      value:
        spineOrClaim(living, 'customer', 'customerPersona') ??
        SHARED_UNDERSTANDING_PENDING,
    },
    {
      label: SPINE_LABEL.problem,
      value:
        spineOrClaim(living, 'problem', 'problemJtbd') ??
        SHARED_UNDERSTANDING_PENDING,
    },
    {
      label: FIELD_LABEL.solution,
      value: claimValue(living, 'solution') ?? SHARED_UNDERSTANDING_PENDING,
    },
    {
      label: FIELD_LABEL.revenueModel,
      value:
        claimValue(living, 'revenueModel') ??
        claimValue(living, 'pricingHint') ??
        SHARED_UNDERSTANDING_PENDING,
    },
    {
      label: FIELD_LABEL.differentiationVsAlternatives,
      value:
        claimValue(living, 'differentiationVsAlternatives') ??
        claimValue(living, 'differentiationHypothesis') ??
        SHARED_UNDERSTANDING_PENDING,
    },
    {
      label: FIELD_LABEL.marketSizeEvidence,
      value:
        claimValue(living, 'marketSizeEvidence') ??
        claimValue(living, 'marketChannel') ??
        SHARED_UNDERSTANDING_PENDING,
    },
  ];

  return rows.filter((row): row is ConversationUnderstandingRow => row != null);
}

/** Korean labels for detail view — replaces internal fieldKey tokens. */
export function formatFounderJudgmentSummary(living: LivingUnderstandingState): string {
  const confirmed = living.claims
    .filter((c) => c.status === 'confirmed' && c.value?.trim())
    .slice(0, 4)
    .map((c) => `${FIELD_LABEL[c.fieldKey] ?? c.fieldKey}: ${c.value!.trim()}`);

  const spineLine = [
    living.spine.business !== SHARED_UNDERSTANDING_PENDING
      ? `사업: ${living.spine.business}`
      : null,
    living.spine.customer !== SHARED_UNDERSTANDING_PENDING
      ? `고객: ${living.spine.customer}`
      : null,
    living.spine.problem !== SHARED_UNDERSTANDING_PENDING
      ? `문제: ${living.spine.problem}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const confirmedLine =
    confirmed.length > 0
      ? `지금까지 확인: ${confirmed.join(' · ')}.`
      : spineLine
        ? `현재 이해 — ${spineLine}.`
        : '아직 핵심 사업 이해가 비어 있습니다.';

  const uncertain = living.claims
    .filter((c) => c.status === 'inferred' || c.status === 'contradiction')
    .slice(0, 2)
    .map((c) => FIELD_LABEL[c.fieldKey] ?? c.fieldKey);

  const uncertainLine =
    uncertain.length > 0 ? ` 불확실: ${uncertain.join(', ')}.` : '';

  const topGap = living.gaps[0];
  const gapLine = topGap
    ? ` 남은 핵심 공백은 「${FIELD_LABEL[topGap.fieldKey] ?? topGap.fieldKey}」입니다.`
    : '';

  return `${confirmedLine}${uncertainLine} 이해 상태 커버리지 ${living.coveragePercent}% (필드 채움률이 아님).${gapLine}`;
}
