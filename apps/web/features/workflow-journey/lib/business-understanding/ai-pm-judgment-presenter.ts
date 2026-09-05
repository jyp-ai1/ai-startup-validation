/**
 * DAY 8-B — CEO Judgment presenter (distinct from Understanding delta).
 * Understanding = what AI knows. Judgment = what AI believes + what's still uncertain.
 */

import { SHARED_UNDERSTANDING_PENDING } from './build-shared-understanding';
import { founderFieldLabel } from './founder-field-labels';
import type { LivingClaim, LivingUnderstandingState } from './living-understanding-state';
import type { UnderstandingGateResult } from './ai-pm-understanding-gate';

const INTERNAL_KEY_RE =
  /\b(businessOneLiner|customerPersona|problemJtbd|marketChannel|targetGap|gapState|validationTestability|alternativesCompetitors|differentiationVsAlternatives)\b/i;

function isPending(value: string | null | undefined): boolean {
  const v = value?.trim() ?? '';
  return !v || v === SHARED_UNDERSTANDING_PENDING;
}

function isUserConfirmed(claim: LivingClaim | undefined): boolean {
  return Boolean(
    claim?.value?.trim() &&
      claim.status === 'confirmed' &&
      (claim.provenance === 'USER_CONFIRMED' || claim.provenance === 'USER_CORRECTED'),
  );
}

/** CEO-facing understanding — what AI currently knows about the business. */
export function buildCeoUnderstandingSnapshot(
  living: LivingUnderstandingState,
): string {
  const lines: string[] = [];

  const business = living.spine.business?.trim();
  if (!isPending(business)) {
    lines.push(business!);
  }

  const customer = living.spine.customer?.trim();
  if (!isPending(customer)) {
    lines.push(`주요 고객은 ${customer.endsWith('입니다') || customer.endsWith('이다') ? customer : `${customer}입니다`}.`);
  }

  const problem = living.spine.problem?.trim();
  if (!isPending(problem)) {
    lines.push(`핵심 문제는 ${problem.endsWith('입니다') || problem.endsWith('이다') ? problem : `${problem}입니다`}.`);
  }

  const solution = living.claims.find(
    (c) => c.fieldKey === 'solution' && c.value?.trim() && c.status !== 'unknown',
  );
  if (solution?.value?.trim() && !lines.some((l) => l.includes(solution.value!.slice(0, 12)))) {
    lines.push(`제공 가치는 ${solution.value.trim()}입니다.`);
  }

  if (lines.length === 0) {
    return '아직 사업 설명을 확인 중입니다. 아래 질문에 답해 주시면 이해를 쌓겠습니다.';
  }

  return lines.join(' ');
}

function interpretTurnChange(gate: UnderstandingGateResult | null): string | null {
  if (!gate?.whatChanged) return null;

  const raw = gate.whatChanged;
  if (INTERNAL_KEY_RE.test(raw)) return null;

  if (/고객|페르소나|대상/.test(raw) && /신규|변경/.test(raw)) {
    return '고객 범위가 구체화됐습니다.';
  }
  if (/문제|불편|JTBD/i.test(raw)) {
    return '해결하려는 문제가 더 선명해졌습니다.';
  }
  if (/사업|한 줄|제공/.test(raw)) {
    return '사업 정의가 더 명확해졌습니다.';
  }
  if (/경쟁|대안/.test(raw)) {
    return '경쟁·대안 환경이 파악됐습니다.';
  }
  if (/차별/.test(raw)) {
    return '차별 포인트가 구체화됐습니다.';
  }

  const cleaned = raw
    .replace(/^신규:\s*/i, '')
    .replace(/^변경:\s*/i, '')
    .replace(/ · .*/g, '')
    .trim();
  if (cleaned.length >= 8 && !INTERNAL_KEY_RE.test(cleaned)) {
    return `${cleaned} — 이해에 반영했습니다.`;
  }
  return null;
}

function buildUncertaintyClause(living: LivingUnderstandingState): string | null {
  const topGap = living.gaps[0];
  if (!topGap) return null;

  const gapKey = topGap.fieldKey;
  const hasCustomer =
    !isPending(living.spine.customer) || isUserConfirmed(living.claims.find((c) => c.fieldKey === 'customerPersona'));
  const hasProblem =
    !isPending(living.spine.problem) || isUserConfirmed(living.claims.find((c) => c.fieldKey === 'problemJtbd'));
  const hasBusiness =
    !isPending(living.spine.business) || isUserConfirmed(living.claims.find((c) => c.fieldKey === 'businessOneLiner'));

  if (hasCustomer && !hasProblem && (gapKey === 'problemJtbd' || gapKey === 'solution')) {
    return '고객 범위는 어느 정도 구체화됐지만, 핵심 문제·현재 운영 방식은 아직 불명확합니다.';
  }
  if (hasBusiness && hasCustomer && !hasProblem) {
    return '사업과 고객은 파악됐지만, 가장 큰 불편·해결 방식은 아직 확인이 필요합니다.';
  }
  if (gapKey === 'alternativesCompetitors' || gapKey === 'differentiationVsAlternatives') {
    return '경쟁·대안 환경을 더 구체적으로 알면 차별 포인트 판단이 가능합니다.';
  }
  if (gapKey === 'payer' || gapKey === 'revenueModel') {
    return '가치 제안은 어느 정도 보이지만, 누가 비용을 내는지는 아직 불명확합니다.';
  }

  const label = founderFieldLabel(gapKey);
  return `${label}에 대한 확인이 아직 필요합니다.`;
}

/**
 * CEO-facing judgment — belief state + remaining uncertainty (NOT raw delta).
 */
export function buildCeoJudgmentSnapshot(
  living: LivingUnderstandingState,
  gate?: UnderstandingGateResult | null,
): string {
  const turnInsight = interpretTurnChange(gate ?? null);
  const uncertainty = buildUncertaintyClause(living);

  if (turnInsight && uncertainty) {
    return `${turnInsight} ${uncertainty}`;
  }
  if (turnInsight) {
    return turnInsight;
  }
  if (uncertainty) {
    return uncertainty;
  }

  const confirmed = living.claims.filter((c) => isUserConfirmed(c));
  if (confirmed.length >= 3) {
    return '핵심 사업 맥락이 쌓이고 있습니다. 남은 불확실성을 좁혀 가겠습니다.';
  }
  if (confirmed.length >= 1) {
    return '일부 핵심 정보가 확인됐습니다. 다음 확인으로 판단을 구체화하겠습니다.';
  }

  const fallback = living.judgmentSummary
    .replace(/\s*이해 상태 커버리지\s*\d+%[^.]*\./g, '')
    .replace(/남은 핵심 공백은[^.]*\./g, '')
    .replace(/지금까지 확인:/g, '확인된 내용:')
    .trim();

  if (fallback.length >= 12 && !INTERNAL_KEY_RE.test(fallback)) {
    return fallback.slice(0, 220);
  }

  return '사업 이해를 쌓는 중입니다. 답변을 주시면 판단을 업데이트하겠습니다.';
}

/** Strip internal keys from any CEO-facing copy. */
export function sanitizeCeoFacingCopy(text: string): string {
  if (INTERNAL_KEY_RE.test(text)) {
    return text.replace(INTERNAL_KEY_RE, '').replace(/\s{2,}/g, ' ').trim();
  }
  return text;
}
