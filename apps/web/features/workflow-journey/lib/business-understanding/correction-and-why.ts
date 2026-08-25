/**
 * Long Sprint W7–W8 — correction + Why follow-up helpers.
 * Correction → USER_CORRECTED provenance; Why explains evidence then returns to loop.
 */

import type { UnderstandingProvenance } from './understanding-contract';
import type { ConversationFactKey } from './conversation-memory';
import {
  emptyConversationMemory,
  upsertConfirmedFact,
  type ConversationMemory,
} from './conversation-memory';

export type CorrectionApplyResult = {
  memory: ConversationMemory;
  provenance: UnderstandingProvenance;
  fieldKey: ConversationFactKey;
  previousValue: string | null;
  nextValue: string;
};

/** Apply founder correction — overwrites prior fact as USER_CORRECTED (via user_turn source). */
export function applyUserCorrection(input: {
  projectId: string;
  fieldKey: ConversationFactKey;
  nextValue: string;
  previous?: ConversationMemory | null;
}): CorrectionApplyResult {
  const previousValue =
    input.previous?.facts.find((f) => f.key === input.fieldKey)?.value ?? null;
  const base = input.previous ?? emptyConversationMemory(input.projectId);
  const memory = upsertConfirmedFact(
    base,
    input.fieldKey,
    input.nextValue,
    'user_turn',
  );
  return {
    memory,
    provenance: 'USER_CORRECTED',
    fieldKey: input.fieldKey,
    previousValue,
    nextValue: input.nextValue.trim(),
  };
}

/** Resolve contradiction by choosing prior or next as current truth. */
export function resolveContradictionChoice(input: {
  projectId: string;
  fieldKey: ConversationFactKey;
  choice: 'keep_prior' | 'accept_new';
  priorValue: string;
  newValue: string;
  previous?: ConversationMemory | null;
}): CorrectionApplyResult {
  const nextValue = input.choice === 'keep_prior' ? input.priorValue : input.newValue;
  const result = applyUserCorrection({
    projectId: input.projectId,
    fieldKey: input.fieldKey,
    nextValue,
    previous: input.previous,
  });
  return {
    ...result,
    provenance: input.choice === 'accept_new' ? 'USER_CORRECTED' : 'USER_CONFIRMED',
  };
}

export type WhyFollowUp = {
  /** Short answer to 「왜?」 */
  explanation: string;
  /** Evidence lines (≤3) */
  evidence: string[];
  /** Always return founder to the validation / question loop */
  returnToLoopCta: string;
};

export function buildWhyFollowUp(input: {
  judgment: string;
  reasons: string[];
  criticalGap?: string | null;
}): WhyFollowUp {
  const evidence = input.reasons.slice(0, 3);
  const explanation = input.criticalGap
    ? `${input.judgment} 핵심 공백은 「${input.criticalGap}」입니다.`
    : `${input.judgment} 아래 근거를 기준으로 판단했습니다.`;
  return {
    explanation,
    evidence,
    returnToLoopCta: '이해 루프로 돌아가기',
  };
}
