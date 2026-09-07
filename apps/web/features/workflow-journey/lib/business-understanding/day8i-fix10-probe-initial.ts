/**
 * Probe first AI question / spine before any CEO answer (Scenario A/B).
 */

import { buildBusinessUnderstanding } from './build-business-understanding';
import { buildLivingUnderstandingState } from './living-understanding-state';
import { buildConversationMemoryFromSources } from './build-conversation-memory';
import { resolveNextQuestionDecision } from './resolve-next-question-decision';
import { isNextQuestionDecision } from './decide-next-question-from-review';
import { evaluateStageReadiness } from './evaluate-stage-readiness';
import { createEmptyGapState } from './update-gap-state-from-review';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  saveAiPmLoopState,
} from './workspace-ai-pm-loop-store';
import { parseIntakeSeedDocument } from '@/lib/project/parse-intake-seed';
import { buildAnswerGuide } from './ai-pm-answer-guide';
import { toHumanLanguageQuestion } from './ai-pm-question-human-language';

export type Fix10InitialProbe = {
  parsedIntake: ReturnType<typeof parseIntakeSeedDocument>;
  spineBusiness: string;
  firstQuestion: string | null;
  firstQuestionType: 'confirm' | 'open' | 'none';
  firstTargetGap: string | null;
  answerGuideHint: string | null;
  answerGuideExamples: string[];
};

export function probeFix10InitialState(input: {
  projectId: string;
  documentText: string;
}): Fix10InitialProbe {
  const { projectId, documentText } = input;

  clearAiPmLoopState(projectId);
  saveAiPmLoopState(
    {
      version: 1,
      phase: 'answer',
      turns: [],
      currentIssueId: 'customer_definition',
      readingCompleted: true,
      dismissedReadAck: true,
      judgmentTraces: [],
    },
    projectId,
  );

  const understanding = buildBusinessUnderstanding(documentText)!;
  const loop = loadAiPmLoopState(projectId);
  const memory = buildConversationMemoryFromSources({
    projectId,
    documentText,
    turns: loop.turns,
  });
  const living = buildLivingUnderstandingState({
    documentText,
    understanding,
    turns: loop.turns,
    memory,
  });
  const gapState = loop.gapState ?? createEmptyGapState();
  const stageReadiness = evaluateStageReadiness({
    gapState,
    living,
    turns: loop.turns,
  });

  const raw = resolveNextQuestionDecision({
    living,
    turns: loop.turns,
    memory,
    gapState,
    projectId,
  });

  const decision = raw && isNextQuestionDecision(raw) ? raw : raw;

  const targetGap =
    decision && isNextQuestionDecision(decision) ? decision.targetGapId : null;
  const questionText =
    decision && isNextQuestionDecision(decision)
      ? toHumanLanguageQuestion(decision.questionText, decision.targetGapId)
      : null;

  const guide = buildAnswerGuide({ targetGap });
  const parsedIntake = parseIntakeSeedDocument(documentText);

  let firstQuestionType: Fix10InitialProbe['firstQuestionType'] = 'none';
  if (questionText) {
    firstQuestionType =
      decision && isNextQuestionDecision(decision) && decision.questionType === 'confirm'
        ? 'confirm'
        : 'open';
  }

  return {
    parsedIntake,
    spineBusiness: living.spine.business ?? '',
    firstQuestion: questionText,
    firstQuestionType,
    firstTargetGap: targetGap,
    answerGuideHint: guide.hint,
    answerGuideExamples: guide.examples,
  };
}
