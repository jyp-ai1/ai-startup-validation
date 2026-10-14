/**
 * Workspace apply path for an MCQ choice.
 * Specific answers reuse the existing V3 write path.
 * Unknown answers persist without merging a fake fact and stay on the open slot.
 */

import { saveWorkspaceDocumentText } from '../workspace-ai-pm-messages';

import { buildCeoJudgmentState } from './ai-pm-judgment-aggregation';
import { syncJudgmentAfterAnswer } from './ai-pm-judgment-loop-sync';
import {
  resolveBusinessChoiceAnswer,
  type ResolveBusinessChoiceResult,
} from './apply-business-choice';
import { buildBusinessUnderstanding } from './build-business-understanding';
import {
  buildBusinessChoiceQuestion,
  type BusinessChoiceOption,
} from './build-business-choice-question';
import { buildConversationMemoryFromSources } from './build-conversation-memory';
import { resolveGapQuestionBinding } from './gap-question-map';
import { interpretAnswerSemantics } from './interpret-answer-semantics';
import {
  buildLivingUnderstandingState,
  whyNowForGapField,
  type LivingUnderstandingState,
} from './living-understanding-state';
import { appendLoopTurnWithReview, runLoopAnswerProcessing } from './process-loop-answer';
import { resolveNextQuestionDecision } from './resolve-next-question-decision';
import { applyAnswerSensitiveWhyNow } from './decide-next-question-from-review';
import { reframeQuestion } from './reframe-question';
import {
  answerRevisesQuotedHypothesis,
  questionBoundToRevisedCustomer,
  validationActionForAnswer,
} from './validation-action-for-answer';
import { isV3ReviewPipelineActive } from './v3-review-pipeline';
import {
  appendAiPmLoopTurn,
  loadAiPmLoopState,
  patchAiPmLoopState,
} from './workspace-ai-pm-loop-store';
import { applyWorkspaceLoopAnswer } from './workspace-state-update';
import type { CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';

export type ApplyBusinessChoiceThroughLoopInput = {
  projectId?: string;
  documentText: string;
  option: BusinessChoiceOption;
  freeText?: string | null;
  askedQuestionText?: string | null;
};

export type ApplyBusinessChoiceThroughLoopResult = {
  waitingForFreeText: boolean;
  persisted: boolean;
  applied: boolean;
  resolved: ResolveBusinessChoiceResult;
  livingBefore: LivingUnderstandingState;
  livingAfter: LivingUnderstandingState;
  judgmentBefore: CeoJudgmentState | null;
  judgmentAfter: CeoJudgmentState;
  nextTargetGap: string | null;
  nextQuestionText: string | null;
  nextWhyNow: string | null;
  nextIssueId: AiPmLoopIssueId | null;
  nextValidationAction: string | null;
  conversationContinues: boolean;
};

function livingFromDocument(
  documentText: string,
  projectId: string | undefined,
  turns: ReturnType<typeof loadAiPmLoopState>['turns'],
  gapState?: ReturnType<typeof loadAiPmLoopState>['gapState'],
) {
  const understanding = buildBusinessUnderstanding(documentText);
  const memory = buildConversationMemoryFromSources({
    projectId: projectId ?? 'default',
    documentText,
    turns,
    gapState,
  });
  return buildLivingUnderstandingState({
    documentText,
    understanding,
    turns,
    memory,
    gapState,
  });
}

/**
 * Apply one founder MCQ choice through the workspace loop.
 * Does not rewrite question selection or judgment engines.
 */
export function applyBusinessChoiceThroughLoop(
  input: ApplyBusinessChoiceThroughLoopInput,
): ApplyBusinessChoiceThroughLoopResult {
  const resolved = resolveBusinessChoiceAnswer(input.option, input.freeText);
  const answeredKind =
    input.option.kind !== 'unknown' &&
    input.option.kind !== 'reject' &&
    answerRevisesQuotedHypothesis(input.askedQuestionText ?? '', resolved.answerText)
      ? 'revise'
      : input.option.kind;
  const skipFactMerge =
    input.option.kind === 'unknown' || input.option.kind === 'reject';
  const prior = loadAiPmLoopState(input.projectId);
  const livingBefore = livingFromDocument(
    input.documentText,
    input.projectId,
    prior.turns,
    prior.gapState,
  );
  const judgmentBefore = prior.ceoJudgment ?? null;
  const emptyResult = {
    waitingForFreeText: true,
    persisted: false,
    applied: false,
    resolved,
    livingBefore,
    livingAfter: livingBefore,
    judgmentBefore,
    judgmentAfter: judgmentBefore ?? buildCeoJudgmentState({ living: livingBefore, turns: prior.turns }),
    nextTargetGap: input.option.appliesToGap,
    nextQuestionText: input.askedQuestionText ?? null,
    nextWhyNow: whyNowForGapField(input.option.appliesToGap),
    nextIssueId: prior.currentIssueId,
    nextValidationAction: validationActionForAnswer({
      answer: resolved.answerText,
      kind: answeredKind,
    }),
    conversationContinues: true,
  };

  if (resolved.needsFreeText) {
    return emptyResult;
  }

  if (input.documentText.trim()) {
    saveWorkspaceDocumentText(input.documentText, input.projectId);
  }

  const binding = resolveGapQuestionBinding(input.option.appliesToGap);
  const semantic = interpretAnswerSemantics({
    answer: resolved.answerText,
    askedIssueId: binding.issueId,
    askedTargetGap: input.option.appliesToGap,
  });
  const askedQuestionText =
    input.askedQuestionText?.trim() || binding.questionText;
  const appliedAt = `choice-${prior.turns.length + 1}`;
  const turn = {
    issueId: binding.issueId,
    answer: resolved.answerText,
    appliedAt,
    semanticFactKey: semantic.factKey,
    semanticFactKeys: semantic.facts.map((fact) => fact.key),
    intent: semantic.intent,
    targetGap: input.option.appliesToGap,
    askedQuestionText,
  };

  if (isV3ReviewPipelineActive()) {
    appendLoopTurnWithReview(
      turn,
      {
        askedGapId: input.option.appliesToGap,
        askedQuestionText,
        askedIssueId: binding.issueId,
        userAnswer: resolved.answerText,
        displayedQuestionText: askedQuestionText,
      },
      input.projectId,
    );
  } else {
    appendAiPmLoopTurn(turn, input.projectId);
  }

  const applied =
    !skipFactMerge && semantic.mergeable
      ? applyWorkspaceLoopAnswer(
          binding.issueId,
          resolved.answerText,
          input.projectId,
          {
            semantic,
            askedTargetGap: input.option.appliesToGap,
          },
        ).applied
      : false;

  const understanding = buildBusinessUnderstanding(input.documentText);
  const processed = runLoopAnswerProcessing({
    projectId: input.projectId,
    documentText: input.documentText,
    understanding,
  });

  const judgmentSync = syncJudgmentAfterAnswer({
    projectId: input.projectId,
    living: processed.living,
    loop: processed.loop,
    lastQuestionText: askedQuestionText,
    answer: resolved.answerText,
    beforeState: judgmentBefore,
  });

  const judgmentAfter = judgmentSync.judgment;

  const loopAfter = loadAiPmLoopState(input.projectId);
  let next = resolveNextQuestionDecision({
    living: processed.living,
    turns: loopAfter.turns,
    memory: processed.memory,
    gapState: loopAfter.gapState,
    projectId: input.projectId,
    judgment: judgmentAfter,
    persistLastDecision: true,
  });

  if (
    next &&
    (input.option.kind === 'unknown' || input.option.kind === 'reject') &&
    next.targetGap === input.option.appliesToGap &&
    next.questionText.trim() === askedQuestionText.trim()
  ) {
    const reframed = reframeQuestion({
      targetGap: next.targetGap,
      living: processed.living,
      reason: 'unknown_signal',
      previousQuestionText: askedQuestionText,
    });
    next = {
      ...next,
      questionText: reframed.questionText,
      whyNow: reframed.whyNow || next.whyNow,
      reframed: true,
    };
  }
  if (next?.targetGap === 'businessOneLiner') {
    const verification = buildBusinessChoiceQuestion({
      living: processed.living,
      documentText: input.documentText,
      targetGap: 'businessOneLiner',
    });
    next = { ...next, questionText: verification.questionText };
  }
  if (next && answeredKind === 'revise' && next.targetGap === 'problemJtbd') {
    next = {
      ...next,
      questionText: questionBoundToRevisedCustomer(next.questionText, resolved.answerText),
    };
  }
  if (next) {
    patchAiPmLoopState(
      {
        phase: 'answer',
        currentIssueId: next.issueId,
      },
      input.projectId,
    );
  }

  const nextTargetGap = next?.targetGap ?? null;
  const lastReview = [...loopAfter.turns].reverse().find((t) => t.review)?.review ?? null;
  const nextWhyNow = applyAnswerSensitiveWhyNow(
    lastReview,
    next?.whyNow ?? (nextTargetGap ? whyNowForGapField(nextTargetGap) : ''),
  ) || null;

  return {
    waitingForFreeText: false,
    persisted: true,
    applied,
    resolved,
    livingBefore,
    livingAfter: processed.living,
    judgmentBefore,
    judgmentAfter,
    nextTargetGap,
    nextQuestionText: next?.questionText ?? null,
    nextWhyNow,
    nextIssueId: next?.issueId ?? null,
    nextValidationAction: validationActionForAnswer({
      answer: resolved.answerText,
      kind: answeredKind,
    }),
    conversationContinues: Boolean(nextTargetGap) || Boolean(nextWhyNow),
  };
}
