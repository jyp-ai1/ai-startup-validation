/**
 * SI-matching founder answers stay on the loop store.
 * The same sentence is not also appended to the SI document.
 * Reuses the existing loop write. Does not call analyzeStrategicIntelligence.
 */

import type { SiAiPmQuestion } from '@repo/types/domain/strategic-intelligence';

import { applyBusinessChoiceThroughLoop } from './apply-business-choice-through-loop';
import { siTurnInsightFromQuestion } from './si-turn-insight';
import { loadWorkspaceDocumentText } from '../workspace-ai-pm-messages';
import { loadAiPmLoopState } from './workspace-ai-pm-loop-store';

export function resolveSiMatchedAnswerStorage(_input: {
  siAskText?: string | null;
  liveAskText?: string | null;
}): { updateLoop: boolean; appendDocument: boolean } {
  return { updateLoop: true, appendDocument: false };
}

export function recordSiMatchedAnswerOnLoop(input: {
  projectId?: string;
  documentText: string;
  answer: string;
  question: SiAiPmQuestion;
}): {
  storedCopies: number;
  documentContainsAnswerMark: boolean;
  reviewPresent: boolean;
  judgmentPresent: boolean;
  targetGap: string;
} {
  const answer = input.answer.trim();
  const preferred =
    siTurnInsightFromQuestion(input.question)?.preferredGapIds[0] ?? 'customerPersona';
  applyBusinessChoiceThroughLoop({
    projectId: input.projectId,
    documentText: input.documentText,
    askedQuestionText: input.question.questionText,
    option: {
      id: 'si-matched-answer',
      label: 'SI 답변',
      answerText: answer,
      kind: 'specific',
      appliesToGap: preferred,
      evidenceClassHint: 'ASSUMPTION',
    },
  });
  const loop = loadAiPmLoopState(input.projectId);
  const copies = loop.turns.filter((turn) => turn.answer?.trim() === answer && !turn.superseded).length;
  const storedDoc = loadWorkspaceDocumentText(input.projectId) ?? input.documentText;
  const last = [...loop.turns].reverse().find((turn) => turn.answer?.trim() === answer);
  return {
    storedCopies: copies,
    documentContainsAnswerMark: storedDoc.includes('[Founder evidence]'),
    reviewPresent: Boolean(last?.review),
    judgmentPresent: Boolean(loop.ceoJudgment),
    targetGap: preferred,
  };
}
