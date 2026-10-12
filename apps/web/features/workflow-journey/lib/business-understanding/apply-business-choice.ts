/**
 * Map an MCQ selection onto the existing answer string + impact trace.
 * The conversation engine still consumes a string answer.
 */

import {
  type BusinessChoiceEvidenceClass,
  type BusinessChoiceKind,
  type BusinessChoiceOption,
} from './build-business-choice-question';
import { founderFieldLabel } from './founder-field-labels';
import type { LivingUnderstandingState } from './living-understanding-state';

export type BusinessChoiceApplied = {
  optionId: string;
  kind: BusinessChoiceKind;
  targetGap: string;
  label: string;
  evidenceClassHint: BusinessChoiceEvidenceClass;
};

export type ResolveBusinessChoiceResult = {
  answerText: string;
  needsFreeText: boolean;
  choiceApplied: BusinessChoiceApplied;
};

export type BusinessChoiceImpactTrace = {
  choiceApplied: BusinessChoiceApplied;
  understandingBefore: string;
  understandingAfter: string;
  factsChanged: boolean;
  assumptionChanged: boolean;
  nextTargetGap: string | null;
  nextTargetChanged: boolean;
  judgmentBefore: string;
  judgmentAfter: string;
  judgmentChanged: boolean;
  nextValidationAction: string | null;
  treatedAsValidated: boolean;
};

export function resolveBusinessChoiceAnswer(
  option: BusinessChoiceOption,
  freeText?: string | null,
): ResolveBusinessChoiceResult {
  const choiceApplied: BusinessChoiceApplied = {
    optionId: option.id,
    kind: option.kind,
    targetGap: option.appliesToGap,
    label: option.label,
    evidenceClassHint: option.evidenceClassHint,
  };

  if (option.kind === 'other') {
    const extra = freeText?.trim() ?? '';
    return {
      answerText: extra,
      needsFreeText: extra.length < 2,
      choiceApplied: {
        ...choiceApplied,
        evidenceClassHint: extra.length >= 2 ? 'ASSUMPTION' : 'UNKNOWN',
      },
    };
  }

  return {
    answerText: option.answerText,
    needsFreeText: false,
    choiceApplied,
  };
}

function claimValues(living: LivingUnderstandingState, gap: string): string {
  return living.claims
    .filter((claim) => claim.fieldKey === gap && claim.value?.trim())
    .map((claim) => `${claim.status}:${claim.provenance}:${claim.value!.trim()}`)
    .join('|');
}

function topGap(living: LivingUnderstandingState): string | null {
  return living.gaps[0]?.fieldKey ?? null;
}

/**
 * Trace how a choice moved understanding, unknowns, and next action.
 * Intent / unknown choices must never appear as VALIDATED performance.
 */
export function traceBusinessChoiceImpact(input: {
  option: BusinessChoiceOption;
  livingBefore: LivingUnderstandingState;
  livingAfter: LivingUnderstandingState;
  judgmentBefore?: string | null;
  judgmentAfter?: string | null;
  nextValidationAction?: string | null;
}): BusinessChoiceImpactTrace {
  const gap = input.option.appliesToGap;
  const beforeValue = claimValues(input.livingBefore, gap);
  const afterValue = claimValues(input.livingAfter, gap);
  const nextBefore = topGap(input.livingBefore);
  const nextAfter = topGap(input.livingAfter);
  const judgmentBefore = input.judgmentBefore?.trim() || input.livingBefore.judgmentSummary;
  const judgmentAfter = input.judgmentAfter?.trim() || input.livingAfter.judgmentSummary;
  const treatedAsValidated =
    input.option.kind !== 'specific' &&
    input.livingAfter.claims.some(
      (claim) =>
        claim.fieldKey === gap &&
        (claim.confidence === 'VALIDATED' || claim.provenance === 'EXTERNAL_EVIDENCE'),
    );

  return {
    choiceApplied: {
      optionId: input.option.id,
      kind: input.option.kind,
      targetGap: gap,
      label: input.option.label,
      evidenceClassHint: input.option.evidenceClassHint,
    },
    understandingBefore: input.livingBefore.spine.business,
    understandingAfter: input.livingAfter.spine.business,
    factsChanged: beforeValue !== afterValue,
    assumptionChanged: beforeValue !== afterValue || nextBefore !== nextAfter,
    nextTargetGap: nextAfter,
    nextTargetChanged: nextBefore !== nextAfter,
    judgmentBefore,
    judgmentAfter,
    judgmentChanged: judgmentBefore !== judgmentAfter,
    nextValidationAction:
      input.nextValidationAction ??
      (nextAfter ? `${founderFieldLabel(nextAfter)}을 확인한 뒤 검증 행동을 갱신합니다.` : null),
    treatedAsValidated,
  };
}
