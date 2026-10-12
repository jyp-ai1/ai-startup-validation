/**
 * One apply path: MCQ choice → living understanding → judgment → next question.
 * Reuses existing builders. Does not replace the conversation engine.
 */

import {
  applyAnswerToJudgment,
  buildCeoJudgmentState,
} from './ai-pm-judgment-aggregation';
import { emptyCeoJudgmentState, type CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import {
  resolveBusinessChoiceAnswer,
  traceBusinessChoiceImpact,
  type BusinessChoiceImpactTrace,
  type ResolveBusinessChoiceResult,
} from './apply-business-choice';
import { buildBusinessUnderstanding } from './build-business-understanding';
import {
  type BusinessChoiceOption,
  type BusinessChoiceQuestion,
  buildBusinessChoiceQuestion,
} from './build-business-choice-question';
import { buildConversationMemoryFromSources } from './build-conversation-memory';
import { resolveGapQuestionBinding } from './gap-question-map';
import { interpretAnswerSemantics } from './interpret-answer-semantics';
import {
  buildLivingUnderstandingState,
  whyNowForGapField,
  type LivingUnderstandingState,
} from './living-understanding-state';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

export type ApplyBusinessChoiceTurnInput = {
  documentText: string;
  turns?: AiPmLoopTurn[];
  option: BusinessChoiceOption;
  freeText?: string | null;
  priorJudgment?: CeoJudgmentState | null;
};

export type ApplyBusinessChoiceTurnResult = {
  resolved: ResolveBusinessChoiceResult;
  livingBefore: LivingUnderstandingState;
  livingAfter: LivingUnderstandingState;
  judgmentBefore: CeoJudgmentState;
  judgmentAfter: CeoJudgmentState;
  nextQuestion: BusinessChoiceQuestion;
  impact: BusinessChoiceImpactTrace;
  nextValidationAction: string;
};

function livingFrom(documentText: string, turns: AiPmLoopTurn[]) {
  const understanding = buildBusinessUnderstanding(documentText);
  const memory = buildConversationMemoryFromSources({
    projectId: 'mcq-choice-turn',
    documentText,
    turns,
  });
  return buildLivingUnderstandingState({
    documentText,
    understanding,
    turns,
    memory,
  });
}

/**
 * Apply one founder choice and recompute understanding, judgment, and the next ask.
 */
export function applyBusinessChoiceTurn(
  input: ApplyBusinessChoiceTurnInput,
): ApplyBusinessChoiceTurnResult {
  const priorTurns = input.turns ?? [];
  const livingBefore = livingFrom(input.documentText, priorTurns);
  const judgmentBefore =
    input.priorJudgment ??
    (priorTurns.length > 0
      ? buildCeoJudgmentState({ living: livingBefore, turns: priorTurns })
      : emptyCeoJudgmentState(0));

  const resolved = resolveBusinessChoiceAnswer(input.option, input.freeText);
  const binding = resolveGapQuestionBinding(input.option.appliesToGap);
  const semantic = interpretAnswerSemantics({
    answer: resolved.answerText,
    askedIssueId: binding.issueId,
    askedTargetGap: input.option.appliesToGap,
  });

  const nextTurns: AiPmLoopTurn[] = resolved.needsFreeText
    ? priorTurns
    : [
        ...priorTurns,
        {
          issueId: binding.issueId,
          targetGap: input.option.appliesToGap,
          answer: resolved.answerText,
          appliedAt: `choice-${priorTurns.length + 1}`,
          intent: semantic.intent,
          askedQuestionText: binding.questionText,
          semanticFactKey: semantic.factKey,
        },
      ];

  const livingAfter = livingFrom(input.documentText, nextTurns);
  const judgmentAfter = resolved.needsFreeText
    ? judgmentBefore
    : applyAnswerToJudgment({
        prior: judgmentBefore,
        answer: resolved.answerText,
        issueId: binding.issueId,
        targetGap: input.option.appliesToGap,
      });

  const nextQuestion = buildBusinessChoiceQuestion({
    living: livingAfter,
    documentText: input.documentText,
    targetGap: livingAfter.gaps[0]?.fieldKey,
  });
  const nextValidationAction = whyNowForGapField(nextQuestion.targetGap);
  const impact = traceBusinessChoiceImpact({
    option: input.option,
    livingBefore,
    livingAfter,
    judgmentBefore: judgmentBefore.conclusion,
    judgmentAfter: judgmentAfter.conclusion,
    nextValidationAction,
  });

  return {
    resolved,
    livingBefore,
    livingAfter,
    judgmentBefore,
    judgmentAfter,
    nextQuestion,
    impact,
    nextValidationAction,
  };
}
