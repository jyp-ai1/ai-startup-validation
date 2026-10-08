import type {
  SiAiPmBindTurnInput,
  SiAiPmBindTurnResult,
  SiAiPmQuestion,
  SiEvidenceUpdateResult,
  SiStrategicJudgment,
} from '@repo/types/domain/strategic-intelligence';

import { analyzeStrategicIntelligence } from './analyze-strategic-intelligence';
import { decideSiValidationAsk } from './decide-si-validation-ask';
import { presentSiAiPmQuestion } from './present-si-ai-pm-question';
import { updateStrategicIntelligence } from './update-strategic-intelligence';

export type SiAiPmBindView = {
  judgment: SiStrategicJudgment;
  question: SiAiPmQuestion;
  update: SiEvidenceUpdateResult | null;
};

export function resolveSiAiPmBindView(input: {
  documentText: string;
  title?: string | null;
  founderAnswer?: string | null;
}): SiAiPmBindView {
  const previous = analyzeStrategicIntelligence({
    title: input.title,
    documentText: input.documentText,
  });
  const binding = { documentText: input.documentText };
  const asked = presentSiAiPmQuestion(decideSiValidationAsk(previous), binding);
  const answer = input.founderAnswer?.trim() ?? '';
  if (!answer) {
    return { judgment: previous, question: asked, update: null };
  }

  const update = updateStrategicIntelligence({
    previous,
    title: input.title,
    documentText: input.documentText,
    founderAnswer: answer,
  });
  return {
    judgment: update.next,
    question: presentSiAiPmQuestion(decideSiValidationAsk(update.next), binding),
    update,
  };
}

/**
 * One closed loop: S.I. ask → AI PM question → founder answer → Phase 2 re-judgment.
 */
export function runSiAiPmBindTurn(input: SiAiPmBindTurnInput): SiAiPmBindTurnResult {
  const view = resolveSiAiPmBindView(input);
  if (!view.update) {
    throw new Error('si-ai-pm-bind requires a founder answer');
  }
  return {
    previous: view.update.previous,
    asked: presentSiAiPmQuestion(decideSiValidationAsk(view.update.previous), {
      documentText: input.documentText,
    }),
    update: view.update,
    nextAsk: view.question,
    source: 'si-v1-ai-pm-bind',
  };
}
