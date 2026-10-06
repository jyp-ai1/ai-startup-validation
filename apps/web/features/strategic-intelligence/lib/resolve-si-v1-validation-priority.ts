/**
 * PR #97 — S.I. Validation Priority Adapter.
 * Independent path. The existing gap engine is only a fallback.
 */

import type {
  SiAiPmQuestion,
  SiStrategicJudgment,
  SiValidationAsk,
} from '@repo/types/domain/strategic-intelligence';

import { decideSiValidationAsk } from './decide-si-validation-ask';
import { presentSiAiPmQuestion } from './present-si-ai-pm-question';
import { resolveSiAiPmBindView } from './run-si-ai-pm-bind-turn';

export type SiV1ValidationPriority = {
  present: true;
  ask: SiValidationAsk;
  question: SiAiPmQuestion;
  judgment: SiStrategicJudgment;
};

export type SiV1ValidationPriorityNone = {
  present: false;
  reason: 'no-document' | 'si-error' | 'insufficient';
};

export type SiV1ValidationPriorityResult = SiV1ValidationPriority | SiV1ValidationPriorityNone;

export type JourneyQuestionChoice = {
  source: 'si-v1-priority' | 'gap-loop-fallback';
  questionText: string;
  whyNow: string;
};

export function resolveSiV1ValidationPriority(input: {
  documentText?: string | null;
  title?: string | null;
  founderAnswer?: string | null;
  judgment?: SiStrategicJudgment | null;
}): SiV1ValidationPriorityResult {
  try {
    const documentText = input.documentText?.trim() ?? '';
    if (!input.judgment && documentText.length < 8) {
      return { present: false, reason: 'no-document' };
    }
    const view = input.judgment
      ? {
          judgment: input.judgment,
          question: presentSiAiPmQuestion(decideSiValidationAsk(input.judgment)),
          update: null,
        }
      : resolveSiAiPmBindView({
          title: input.title,
          documentText,
          founderAnswer: input.founderAnswer,
        });
    if (view.judgment.verdictId === 'insufficient_basis' && view.judgment.evidenceMap.length === 0) {
      return { present: false, reason: 'insufficient' };
    }
    const ask = decideSiValidationAsk(view.judgment);
    if (!ask.validationPriority.trim() || !ask.decisionChangingEvidence.trim()) {
      return { present: false, reason: 'insufficient' };
    }
    return {
      present: true,
      ask,
      question: view.question,
      judgment: view.judgment,
    };
  } catch {
    return { present: false, reason: 'si-error' };
  }
}

export function adaptFounderJourneyQuestion(input: {
  siPriority: SiV1ValidationPriorityResult;
  gapQuestionText?: string | null;
  gapWhyNow?: string | null;
}): JourneyQuestionChoice {
  if (input.siPriority.present) {
    return {
      source: 'si-v1-priority',
      questionText: input.siPriority.question.questionText,
      whyNow: input.siPriority.question.whyAsking,
    };
  }
  return {
    source: 'gap-loop-fallback',
    questionText: input.gapQuestionText?.trim() || '아직 확인이 필요한 핵심 공백이 있습니다. 알려 주세요.',
    whyNow: input.gapWhyNow?.trim() || 'S.I. 우선순위가 없어 기존 Gap Loop를 사용합니다.',
  };
}

export function shouldPreferSiValidationOverGap(input: {
  siPriority: SiV1ValidationPriorityResult;
  gapTargetId?: string | null;
  gapQuestionText?: string | null;
}): boolean {
  if (!input.siPriority.present) return false;
  const gapQuestion = input.gapQuestionText?.trim() ?? '';
  if (/제가 이해한 사업/.test(gapQuestion) && /맞나요/.test(gapQuestion)) return false;
  if (input.gapTargetId && input.gapTargetId !== 'businessOneLiner') return false;
  return true;
}
