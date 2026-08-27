/**
 * ALABOM Core v5 — Question causality + understanding delta.
 * Every ask carries why it follows from the prior understanding.
 */

import type { LivingClaim, LivingUnderstandingState } from './living-understanding-state';
import { whyNowForGapField } from './living-understanding-state';
import { resolveGapQuestionBinding } from './gap-question-map';
import type { ConversationFactKey } from './conversation-memory';

/** Gaps that block Start Analysis / Validation when still open. */
export const CRITICAL_VIABILITY_GAP_KEYS = [
  'customerPersona',
  'problemJtbd',
  'payer',
  'alternativesCompetitors',
  'differentiationVsAlternatives',
] as const;

export type CriticalViabilityGapKey = (typeof CRITICAL_VIABILITY_GAP_KEYS)[number];

export type QuestionCausality = {
  sourceEvidence: string[];
  previousUnderstanding: string;
  unresolvedGap: string;
  whyNow: string;
  expectedInformation: string;
  targetGap: string;
};

export type UnderstandingDelta = {
  confirmed: string[];
  inferred: string[];
  superseded: string[];
  newlyUnknown: string[];
  summary: string;
};

const EXPECTED_INFO: Record<string, string> = {
  customerPersona: '가장 필요로 하는 구체 고객·페르소나',
  payer: '비용을 실제로 지불하는 주체',
  problemJtbd: '해결하려는 핵심 불편·JTBD',
  alternativesCompetitors: '이미 쓰는 대안·경쟁 서비스 이름/역할',
  differentiationVsAlternatives: '경쟁 대비 우리만의 차이점',
  differentiationHypothesis: '차별 포지셔닝 가설',
  revenueModel: '수익이 발생하는 구조',
  pricingHint: '가격·요금 가설 또는 신호',
  marketChannel: '수요를 검증할 채널',
  marketSizeEvidence: '시장·수요 근거',
  businessOneLiner: '한 줄 사업 정의',
  solution: '문제 해결 방식(제공 가치)',
  validationTestability: '차별점이 고객에게 왜 중요한지(고객 관련성)',
  executionConstraints: '차별을 지키는 방어력·모방 난이도',
};

/** Count Living gaps that must be closed before Start Analysis. */
export function countCriticalViabilityGaps(living: LivingUnderstandingState): number {
  const critical = new Set<string>(CRITICAL_VIABILITY_GAP_KEYS);
  return living.gaps.filter(
    (g) => critical.has(g.fieldKey) || g.priorityScore >= 50_000,
  ).length;
}

export function listCriticalViabilityGaps(living: LivingUnderstandingState): string[] {
  const critical = new Set<string>(CRITICAL_VIABILITY_GAP_KEYS);
  return living.gaps
    .filter((g) => critical.has(g.fieldKey) || g.priorityScore >= 50_000)
    .map((g) => g.fieldKey);
}

/** True when Start Analysis must be forbidden. */
export function criticalGapsBlockAnalysis(living: LivingUnderstandingState): boolean {
  return countCriticalViabilityGaps(living) > 0;
}

function claimDigest(claims: LivingClaim[]): string {
  return claims
    .filter((c) => c.status === 'confirmed' || c.status === 'known')
    .slice(0, 5)
    .map((c) => `${c.fieldKey}=${(c.value ?? '').slice(0, 40)}`)
    .join(' · ');
}

/** Build causality for the next ask from Living State. */
export function buildQuestionCausality(input: {
  living: LivingUnderstandingState;
  targetGap: string;
  sourceEvidenceExcerpts?: string[];
}): QuestionCausality {
  const binding = resolveGapQuestionBinding(input.targetGap);
  const whyNow = whyNowForGapField(input.targetGap);
  const evidence =
    input.sourceEvidenceExcerpts && input.sourceEvidenceExcerpts.length > 0
      ? input.sourceEvidenceExcerpts
      : input.living.claims
          .filter((c) => c.status === 'confirmed' || c.status === 'known')
          .flatMap((c) => c.evidence.map((e) => e.excerpt))
          .filter(Boolean)
          .slice(0, 4);

  return {
    sourceEvidence: evidence,
    previousUnderstanding: claimDigest(input.living.claims) || input.living.judgmentSummary.slice(0, 160),
    unresolvedGap: input.targetGap,
    whyNow,
    expectedInformation: EXPECTED_INFO[input.targetGap] ?? `「${input.targetGap}」에 대한 구체 정보`,
    targetGap: binding.targetGap,
  };
}

/** Diff Living claims before/after an answer — always produces a visible summary. */
export function buildUnderstandingDelta(input: {
  before: LivingUnderstandingState;
  after: LivingUnderstandingState;
  factKeys?: ConversationFactKey[];
}): UnderstandingDelta {
  const beforeByKey = new Map(input.before.claims.map((c) => [c.fieldKey, c]));
  const confirmed: string[] = [];
  const inferred: string[] = [];
  const superseded: string[] = [];
  const newlyUnknown: string[] = [];

  for (const after of input.after.claims) {
    const prev = beforeByKey.get(after.fieldKey);
    if (!prev) continue;
    if (prev.value !== after.value && after.value) {
      if (prev.value && after.status === 'confirmed') {
        superseded.push(`${after.fieldKey}: ${(prev.value ?? '').slice(0, 32)} → ${after.value.slice(0, 32)}`);
      } else if (after.status === 'confirmed') {
        confirmed.push(`${after.fieldKey}: ${after.value.slice(0, 48)}`);
      } else if (after.status === 'inferred' || after.status === 'known') {
        inferred.push(`${after.fieldKey}: ${after.value.slice(0, 48)}`);
      }
    } else if (prev.status !== after.status) {
      if (after.status === 'confirmed' && after.value) {
        confirmed.push(`${after.fieldKey}: ${after.value.slice(0, 48)}`);
      }
      if (after.status === 'unknown' && prev.status !== 'unknown') {
        newlyUnknown.push(after.fieldKey);
      }
    }
  }

  if (confirmed.length === 0 && inferred.length === 0 && superseded.length === 0 && input.factKeys?.length) {
    confirmed.push(`Fact 반영: ${input.factKeys.join(', ')}`);
  }

  const parts = [
    confirmed.length ? `확인: ${confirmed.join(' · ')}` : null,
    superseded.length ? `정정/대체: ${superseded.join(' · ')}` : null,
    inferred.length ? `추론: ${inferred.join(' · ')}` : null,
    newlyUnknown.length ? `재개방: ${newlyUnknown.join(', ')}` : null,
  ].filter(Boolean);

  const topGap = input.after.gaps[0]?.fieldKey;
  const summary =
    parts.length > 0
      ? `${parts.join(' · ')}${topGap ? ` · 다음 공백: ${topGap}` : ''}`
      : topGap
        ? `이해 상태 재평가 완료 · 다음 공백: ${topGap}`
        : '이해 상태 재평가 완료 — 핵심 공백이 해소되었습니다.';

  return { confirmed, inferred, superseded, newlyUnknown, summary };
}

/** Format delta for turn storage / UI (never empty after a mergeable answer). */
export function formatUnderstandingDeltaSummary(delta: UnderstandingDelta): string {
  return delta.summary;
}
