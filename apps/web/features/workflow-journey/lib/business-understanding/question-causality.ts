/**
 * ALABOM Core Final — Question causality + understanding delta + analysis gate.
 * Every ask carries why it follows from the prior understanding.
 * understandingDelta must never be empty after a mergeable answer.
 */

import type { LivingClaim, LivingUnderstandingState } from './living-understanding-state';
import { whyNowForGapField } from './living-understanding-state';
import { resolveGapQuestionBinding } from './gap-question-map';
import type { ConversationFactKey } from './conversation-memory';
import { listUnconfirmedCriticalGaps, listAnalysisBlockingGaps } from './adaptive-question-select';

/** Gaps that block Start Analysis / Validation when still open. */
export const CRITICAL_VIABILITY_GAP_KEYS = [
  'customerPersona',
  'problemJtbd',
  'payer',
  'solution',
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
  /** W3 — what was already understood before this answer */
  existing: string[];
  /** Newly understood this turn */
  newlyUnderstood: string[];
  /** Changed / superseded values */
  changed: string[];
  /** Still unknown after this turn */
  stillUnknown: string[];
  /** @deprecated alias — use newlyUnderstood */
  confirmed: string[];
  inferred: string[];
  superseded: string[];
  newlyUnknown: string[];
  /** Never empty after mergeable answer */
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

function isUserConfirmedClaim(claim: LivingClaim | undefined): boolean {
  return Boolean(
    claim &&
      claim.value?.trim() &&
      claim.status === 'confirmed' &&
      (claim.provenance === 'USER_CONFIRMED' || claim.provenance === 'USER_CORRECTED'),
  );
}

/** Count Living gaps that must be closed before Start Analysis. */
export function countCriticalViabilityGaps(living: LivingUnderstandingState): number {
  return listUnconfirmedCriticalGaps(living).length;
}

export function listCriticalViabilityGaps(living: LivingUnderstandingState): string[] {
  return listUnconfirmedCriticalGaps(living);
}

/**
 * True when Start Analysis must be forbidden.
 * Core Final — DOCUMENT / AI_INFERENCE alone do NOT close critical gaps.
 * Only USER_CONFIRMED / USER_CORRECTED close them. Open contradictions always block.
 * P0-1: Analysis Ready only — not sufficiency %.
 */
export function criticalGapsBlockAnalysis(living: LivingUnderstandingState): boolean {
  return !evaluateAnalysisReady(living).analysisReady;
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

function formatClaimLine(claim: LivingClaim, max = 48): string {
  return `${claim.fieldKey}: ${(claim.value ?? '').slice(0, max)}`;
}

/**
 * Diff Living claims before/after an answer — ALWAYS produces a non-empty summary.
 * W3: existing + newly understood + changed + still unknown.
 */
export function buildUnderstandingDelta(input: {
  before: LivingUnderstandingState;
  after: LivingUnderstandingState;
  factKeys?: ConversationFactKey[];
}): UnderstandingDelta {
  const beforeByKey = new Map(input.before.claims.map((c) => [c.fieldKey, c]));
  const existing: string[] = [];
  const newlyUnderstood: string[] = [];
  const changed: string[] = [];
  const stillUnknown: string[] = [];
  const confirmed: string[] = [];
  const inferred: string[] = [];
  const superseded: string[] = [];
  const newlyUnknown: string[] = [];

  // Existing (stable confirmed/known before this turn)
  for (const prev of input.before.claims) {
    if (
      (prev.status === 'confirmed' || prev.status === 'known') &&
      prev.value?.trim()
    ) {
      const after = beforeByKey.get(prev.fieldKey);
      const afterClaim = input.after.claims.find((c) => c.fieldKey === prev.fieldKey);
      if (afterClaim && afterClaim.value === prev.value) {
        existing.push(formatClaimLine(prev, 36));
      }
      void after;
    }
  }

  for (const after of input.after.claims) {
    const prev = beforeByKey.get(after.fieldKey);
    if (!prev) {
      if (after.value && after.status !== 'unknown') {
        newlyUnderstood.push(formatClaimLine(after));
        if (after.status === 'confirmed') confirmed.push(formatClaimLine(after));
        else inferred.push(formatClaimLine(after));
      }
      continue;
    }

    if (prev.value !== after.value && after.value) {
      if (prev.value && after.status === 'confirmed') {
        const line = `${after.fieldKey}: ${(prev.value ?? '').slice(0, 32)} → ${after.value.slice(0, 32)}`;
        changed.push(line);
        superseded.push(line);
      } else if (after.status === 'confirmed') {
        newlyUnderstood.push(formatClaimLine(after));
        confirmed.push(formatClaimLine(after));
      } else if (after.status === 'inferred' || after.status === 'known') {
        newlyUnderstood.push(formatClaimLine(after));
        inferred.push(formatClaimLine(after));
      } else {
        changed.push(formatClaimLine(after));
      }
    } else if (prev.status !== after.status) {
      if (after.status === 'confirmed' && after.value) {
        newlyUnderstood.push(formatClaimLine(after));
        confirmed.push(formatClaimLine(after));
      }
      if (after.status === 'unknown' && prev.status !== 'unknown') {
        newlyUnknown.push(after.fieldKey);
        stillUnknown.push(after.fieldKey);
      }
    }

    if (after.status === 'unknown' || !after.value?.trim()) {
      // Only list high-value unknowns
      if (
        CRITICAL_VIABILITY_GAP_KEYS.includes(
          after.fieldKey as CriticalViabilityGapKey,
        ) ||
        after.fieldKey === 'revenueModel' ||
        after.fieldKey === 'validationTestability'
      ) {
        if (!stillUnknown.includes(after.fieldKey)) {
          stillUnknown.push(after.fieldKey);
        }
      }
    }
  }

  // Unconfirmed critical gaps always appear in stillUnknown
  for (const key of listUnconfirmedCriticalGaps(input.after)) {
    if (!stillUnknown.includes(key)) stillUnknown.push(key);
  }

  if (
    newlyUnderstood.length === 0 &&
    changed.length === 0 &&
    confirmed.length === 0 &&
    inferred.length === 0 &&
    input.factKeys?.length
  ) {
    const line = `Fact 반영: ${input.factKeys.join(', ')}`;
    newlyUnderstood.push(line);
    confirmed.push(line);
  }

  const topGap = input.after.gaps[0]?.fieldKey;
  const parts = [
    existing.length ? `기존: ${existing.slice(0, 3).join(' · ')}` : null,
    newlyUnderstood.length ? `신규: ${newlyUnderstood.join(' · ')}` : null,
    changed.length ? `변경: ${changed.join(' · ')}` : null,
    stillUnknown.length ? `미확인: ${stillUnknown.slice(0, 5).join(', ')}` : null,
  ].filter(Boolean);

  let summary: string;
  if (parts.length > 0) {
    summary = `${parts.join(' · ')}${topGap ? ` · 다음 공백: ${topGap}` : ''}`;
  } else if (topGap) {
    summary = `이해 상태 재평가 완료 · 다음 공백: ${topGap}`;
  } else {
    summary = '이해 상태 재평가 완료 — 핵심 공백이 해소되었습니다.';
  }

  // Hard guarantee — never empty
  if (!summary.trim()) {
    summary = '이해 상태 갱신됨';
  }

  return {
    existing: existing.slice(0, 6),
    newlyUnderstood,
    changed,
    stillUnknown: stillUnknown.slice(0, 8),
    confirmed,
    inferred,
    superseded,
    newlyUnknown,
    summary,
  };
}

/** Format delta for turn storage / UI (never empty after a mergeable answer). */
export function formatUnderstandingDeltaSummary(delta: UnderstandingDelta): string {
  const s = delta.summary?.trim() ?? '';
  return s.length > 0 ? s : '이해 상태 갱신됨';
}

/**
 * P0-1 — Sufficiency = how concrete business understanding is (coverage / confirmed fields).
 * Does NOT equal Analysis Ready.
 */
export function explainSufficiency(living: LivingUnderstandingState): {
  percent: number;
  confirmed: string[];
  missing: string[];
  /** @deprecated use evaluateAnalysisReady().analysisReady — kept for callers */
  readyForAnalysis: boolean;
  explanation: string;
} {
  const confirmed = living.claims
    .filter((c) => isUserConfirmedClaim(c))
    .map((c) => c.fieldKey);
  const missing = listUnconfirmedCriticalGaps(living);
  const analysis = evaluateAnalysisReady(living);
  const explanation = `사업 구체화 ${living.coveragePercent}% (충분성) — 사용자 확인 ${confirmed.length}항목. Analysis Ready와는 별개입니다.${
    missing.length ? ` 미확인 핵심: ${missing.join(', ')}.` : ''
  }`;

  return {
    percent: living.coveragePercent,
    confirmed,
    missing,
    readyForAnalysis: analysis.analysisReady,
    explanation,
  };
}

/**
 * P0-1 — Analysis Ready = critical gaps/conflicts resolved enough to start viability analysis.
 * High sufficiency / enough questions ≠ Analysis Ready.
 * Critical Unknown remaining ⇒ Start Analysis DISABLED.
 */
export function evaluateAnalysisReady(living: LivingUnderstandingState): {
  analysisReady: boolean;
  sufficiencyPercent: number;
  blockedGaps: string[];
  whyNotReady: string | null;
  explanation: string;
} {
  const blockedGaps = listAnalysisBlockingGaps(living);
  const hasContradiction = living.claims.some((c) => c.status === 'contradiction');
  const analysisReady = blockedGaps.length === 0 && !hasContradiction;

  let whyNotReady: string | null = null;
  if (hasContradiction) {
    const conflict = living.claims.find((c) => c.status === 'contradiction');
    whyNotReady = `모순 미해소: 「${conflict?.fieldKey ?? '충돌'}」— Old→Superseded→New 중 어느 쪽이 맞는지 확인이 필요합니다.`;
  } else if (blockedGaps.length > 0) {
    const diffRelevanceOnly =
      blockedGaps.length === 1 && blockedGaps[0] === 'validationTestability';
    whyNotReady = diffRelevanceOnly
      ? '차별점은 확인했지만 고객에게 왜 중요한지 아직 연결되지 않았습니다. 분석하기 전에 이것 하나만 더 확인해볼게요.'
      : `Critical Unknown 남음: ${blockedGaps.join(', ')}. Start Analysis는 차단됩니다.`;
  }

  const explanation = analysisReady
    ? `Analysis Ready — 핵심 공백·모순이 사용자 확인으로 해소되었습니다. (구체화 ${living.coveragePercent}%는 참고)`
    : whyNotReady ?? 'Analysis Ready 아님';

  return {
    analysisReady,
    sufficiencyPercent: living.coveragePercent,
    blockedGaps: hasContradiction
      ? [
          ...blockedGaps,
          ...living.claims
            .filter((c) => c.status === 'contradiction')
            .map((c) => c.fieldKey),
        ]
      : blockedGaps,
    whyNotReady,
    explanation,
  };
}
