/**
 * DAY 8-D Phase A — Dynamic Judgment delta (presentation/policy layer).
 * Computes belief change from before/after living state — not a new SoT.
 */

import type { AnswerReview } from '@repo/types/domain/answer-review';

import type { ParsedNotXButY } from './ai-pm-correction-semantics';
import { founderFieldLabel } from './founder-field-labels';
import { SHARED_UNDERSTANDING_PENDING } from './build-shared-understanding';
import type { ConversationFactKey } from './conversation-memory';
import type { LivingUnderstandingState } from './living-understanding-state';
import { buildUnderstandingDelta } from './question-causality';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

export type JudgmentDeltaState =
  | 'UNCHANGED'
  | 'STRENGTHENED'
  | 'WEAKENED'
  | 'CHANGED'
  | 'NEW';

export type JudgmentDelta = {
  state: JudgmentDeltaState;
  beliefLine: string;
  uncertaintyLine: string | null;
  triggerFactKeys: ConversationFactKey[];
};

function isPending(value: string | null | undefined): boolean {
  const v = value?.trim() ?? '';
  return !v || v === SHARED_UNDERSTANDING_PENDING;
}

function normalizeSpine(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function spineFieldChanged(
  before: LivingUnderstandingState,
  after: LivingUnderstandingState,
  field: 'business' | 'customer' | 'problem',
): boolean {
  const b = normalizeSpine(before.spine[field]);
  const a = normalizeSpine(after.spine[field]);
  if (isPending(a)) return false;
  if (isPending(b) && !isPending(a)) return true;
  return b !== a;
}

function shortCustomerLabel(customer: string): string {
  const trimmed = customer.trim();
  if (trimmed.length <= 28) return trimmed.replace(/입니다\.?$/, '');
  return `${trimmed.slice(0, 25)}…`;
}

function formatCustomerBelief(
  customer: string,
  state: 'NEW' | 'CHANGED',
  revision?: ParsedNotXButY | null,
): string {
  const label = shortCustomerLabel(customer);
  if (revision?.accepted) {
    return `핵심 고객을 ${revision.accepted}(으)로 좁혔습니다.`;
  }
  if (state === 'NEW') {
    return `핵심 고객은 ${label}(으)로 파악했습니다.`;
  }
  return `핵심 고객을 ${label}(으)로 좁혔습니다.`;
}

function formatBusinessBelief(business: string, state: 'NEW' | 'CHANGED'): string {
  const snippet = business.slice(0, 48).replace(/\s+/g, ' ').trim();
  if (state === 'NEW') {
    return `사업 방향을 정리했습니다: ${snippet}${business.length > 48 ? '…' : ''}.`;
  }
  return `사업 정의를 구체화했습니다: ${snippet}${business.length > 48 ? '…' : ''}.`;
}

function formatProblemBelief(problem: string, state: 'NEW' | 'CHANGED'): string {
  const snippet = problem.slice(0, 40).replace(/\s+/g, ' ').trim();
  if (state === 'NEW') {
    return `해결하려는 핵심 문제를 파악했습니다: ${snippet}${problem.length > 40 ? '…' : ''}.`;
  }
  return `핵심 문제 인식을 업데이트했습니다: ${snippet}${problem.length > 40 ? '…' : ''}.`;
}

function claimValueChanged(
  before: LivingUnderstandingState,
  after: LivingUnderstandingState,
  fieldKey: string,
): boolean {
  const b = before.claims.find((c) => c.fieldKey === fieldKey);
  const a = after.claims.find((c) => c.fieldKey === fieldKey);
  if (!a?.value?.trim()) return false;
  if (!b?.value?.trim()) return true;
  return b.value.trim() !== a.value.trim();
}

function detectCompetitorOrAlternativeChange(
  before: LivingUnderstandingState,
  after: LivingUnderstandingState,
): boolean {
  const keys = [
    'alternativesCompetitors',
    'differentiationVsAlternatives',
    'solution',
  ] as const;
  return keys.some((k) => claimValueChanged(before, after, k));
}

export function buildCurrentBeliefSummary(living: LivingUnderstandingState): string {
  const parts: string[] = [];
  const customer = living.spine.customer?.trim();
  if (!isPending(customer)) {
    parts.push(`핵심 고객은 ${shortCustomerLabel(customer!)}(으)로 보입니다`);
  }
  const business = living.spine.business?.trim();
  if (!isPending(business)) {
    parts.push('사업 방향은 정리된 상태입니다');
  }
  const problem = living.spine.problem?.trim();
  if (!isPending(problem)) {
    parts.push('해결하려는 문제 윤곽은 잡혀 있습니다');
  }
  if (parts.length === 0) {
    return '사업 이해를 쌓는 중입니다.';
  }
  return `${parts.join('. ')}.`;
}

/** CEO-facing uncertainty — specific to top gap + known spine context. */
export function buildSpecificUncertaintyLine(
  living: LivingUnderstandingState,
): string | null {
  const topGap = living.gaps[0];
  if (!topGap) return null;

  const gapKey = topGap.fieldKey;
  const customer = living.spine.customer?.trim();
  const hasCustomer = !isPending(customer);
  const hasProblem =
    !isPending(living.spine.problem) ||
    living.claims.some(
      (c) => c.fieldKey === 'problemJtbd' && c.value?.trim() && c.status !== 'unknown',
    );

  if (gapKey === 'payer' && hasCustomer) {
    return `아직 확인할 것은 ${shortCustomerLabel(customer!)} 관점에서 누가 비용을 지불하는지입니다.`;
  }
  if ((gapKey === 'problemJtbd' || gapKey === 'solution') && hasCustomer) {
    return `아직 확인할 것은 ${shortCustomerLabel(customer!)}가 실제로 겪는 주문·배송·운영 문제입니다.`;
  }
  if (gapKey === 'customerPersona' && !hasCustomer) {
    return '아직 확인할 것은 이 서비스를 가장 필요로 하는 사람입니다.';
  }
  if (
    gapKey === 'alternativesCompetitors' ||
    gapKey === 'differentiationVsAlternatives'
  ) {
    if (hasCustomer) {
      return `아직 확인할 것은 ${shortCustomerLabel(customer!)} 기준으로 경쟁·대안과의 차이입니다.`;
    }
    return '경쟁·대안 정보를 더 모으면 차별 포인트 판단을 구체화할 수 있습니다.';
  }
  if (gapKey === 'businessOneLiner') {
    return '한 줄 사업 정의가 정리되면 이후 질문 순서를 맞출 수 있습니다.';
  }

  const label = founderFieldLabel(gapKey);
  return `아직 확인할 것은 ${label}입니다.`;
}

function inferStateFromDelta(
  before: LivingUnderstandingState,
  after: LivingUnderstandingState,
  lastReview?: AnswerReview | null,
): JudgmentDeltaState {
  if (lastReview?.contradictions && lastReview.contradictions.length > 0) {
    return 'WEAKENED';
  }
  if (
    after.customerCorrectionRevision &&
    normalizeSpine(before.spine.customer) !== normalizeSpine(after.spine.customer)
  ) {
    return 'CHANGED';
  }
  if (spineFieldChanged(before, after, 'customer')) {
    return isPending(before.spine.customer) ? 'NEW' : 'CHANGED';
  }
  if (spineFieldChanged(before, after, 'business')) {
    return isPending(before.spine.business) ? 'NEW' : 'CHANGED';
  }
  if (spineFieldChanged(before, after, 'problem')) {
    return isPending(before.spine.problem) ? 'NEW' : 'CHANGED';
  }
  if (detectCompetitorOrAlternativeChange(before, after)) {
    return 'STRENGTHENED';
  }

  const delta = buildUnderstandingDelta({ before, after });
  if (delta.changed.length > 0 || delta.newlyUnderstood.length > 0) {
    return delta.changed.length > 0 ? 'CHANGED' : 'NEW';
  }
  return 'UNCHANGED';
}

function buildBeliefLineFromChange(input: {
  before: LivingUnderstandingState;
  after: LivingUnderstandingState;
  state: JudgmentDeltaState;
  lastTurn?: AiPmLoopTurn | null;
}): { beliefLine: string; triggerFactKeys: ConversationFactKey[] } {
  const { before, after, state, lastTurn } = input;
  const triggers: ConversationFactKey[] = [];

  if (state === 'WEAKENED') {
    return {
      beliefLine: '새 답변으로 기존 가정에 확인이 더 필요해졌습니다.',
      triggerFactKeys: triggers,
    };
  }

  if (
    after.customerCorrectionRevision &&
    normalizeSpine(before.spine.customer) !== normalizeSpine(after.spine.customer)
  ) {
    triggers.push('customer');
    return {
      beliefLine: formatCustomerBelief(
        after.spine.customer ?? after.customerCorrectionRevision.accepted,
        'CHANGED',
        after.customerCorrectionRevision,
      ),
      triggerFactKeys: triggers,
    };
  }

  if (spineFieldChanged(before, after, 'customer')) {
    triggers.push('customer');
    const custState = isPending(before.spine.customer) ? 'NEW' : 'CHANGED';
    return {
      beliefLine: formatCustomerBelief(after.spine.customer ?? '', custState),
      triggerFactKeys: triggers,
    };
  }

  if (spineFieldChanged(before, after, 'business')) {
    triggers.push('business');
    const bizState = isPending(before.spine.business) ? 'NEW' : 'CHANGED';
    return {
      beliefLine: formatBusinessBelief(after.spine.business ?? '', bizState),
      triggerFactKeys: triggers,
    };
  }

  if (spineFieldChanged(before, after, 'problem')) {
    triggers.push('problem');
    const probState = isPending(before.spine.problem) ? 'NEW' : 'CHANGED';
    return {
      beliefLine: formatProblemBelief(after.spine.problem ?? '', probState),
      triggerFactKeys: triggers,
    };
  }

  if (detectCompetitorOrAlternativeChange(before, after)) {
    if (claimValueChanged(before, after, 'alternativesCompetitors')) {
      triggers.push('competitor');
    }
    if (claimValueChanged(before, after, 'solution')) {
      triggers.push('business');
    }
    return {
      beliefLine: '경쟁·대안 환경에 대한 정보를 반영했습니다.',
      triggerFactKeys: triggers,
    };
  }

  const delta = buildUnderstandingDelta({ before, after });
  if (delta.changed.length > 0) {
    const line = delta.changed[0]!
      .replace(/^[^:]+:\s*/, '')
      .slice(0, 80);
    if (line.length >= 8) {
      return {
        beliefLine: `답변을 반영해 판단을 업데이트했습니다: ${line}.`,
        triggerFactKeys: triggers,
      };
    }
  }
  if (delta.newlyUnderstood.length > 0) {
    const line = delta.newlyUnderstood[0]!
      .replace(/^[^:]+:\s*/, '')
      .slice(0, 80);
    if (line.length >= 8) {
      return {
        beliefLine: `새로운 정보를 반영했습니다: ${line}.`,
        triggerFactKeys: triggers,
      };
    }
  }

  if (lastTurn?.intent === 'mid_judgment') {
    return {
      beliefLine: 'CEO 판단을 참고해 다음 확인을 준비하고 있습니다.',
      triggerFactKeys: triggers,
    };
  }

  if (state === 'UNCHANGED') {
    return {
      beliefLine: buildCurrentBeliefSummary(after),
      triggerFactKeys: triggers,
    };
  }

  return {
    beliefLine: buildCurrentBeliefSummary(after),
    triggerFactKeys: triggers,
  };
}

export function computeJudgmentDelta(input: {
  before: LivingUnderstandingState;
  after: LivingUnderstandingState;
  lastReview?: AnswerReview | null;
  lastTurn?: AiPmLoopTurn | null;
}): JudgmentDelta {
  const state = inferStateFromDelta(input.before, input.after, input.lastReview);
  const { beliefLine, triggerFactKeys } = buildBeliefLineFromChange({
    before: input.before,
    after: input.after,
    state,
    lastTurn: input.lastTurn,
  });
  const uncertaintyLine = buildSpecificUncertaintyLine(input.after);

  return {
    state,
    beliefLine,
    uncertaintyLine,
    triggerFactKeys,
  };
}

/** Format belief + uncertainty for CEO Judgment block. */
export function formatJudgmentDeltaForCeo(
  living: LivingUnderstandingState,
  delta: JudgmentDelta,
): string {
  const belief = delta.beliefLine.trim();
  const uncertainty = delta.uncertaintyLine?.trim();

  if (belief && uncertainty && !belief.includes(uncertainty.slice(0, 12))) {
    return `${belief} ${uncertainty}`;
  }
  if (belief) return belief;
  if (uncertainty) return uncertainty;
  return buildCurrentBeliefSummary(living);
}
