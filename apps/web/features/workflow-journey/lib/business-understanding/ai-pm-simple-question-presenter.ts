/**
 * DAY 8-G — Simple question presentation (G-1 + G-2 + G-3).
 */

import { buildAnswerGuide, formatAnswerGuideText } from './ai-pm-answer-guide';
import { toHumanLanguageQuestion } from './ai-pm-question-human-language';
import { sanitizeCeoWhyNow } from './ai-pm-question-presentation';
import {
  CEO_JUDGMENT_EARLY_VIEW_FROM,
  CEO_JUDGMENT_SESSION_MAX_QUESTIONS,
  judgmentViewTitle,
} from './ai-pm-question-budget';

export type AiPmSimpleQuestionSnapshot = {
  screenTitle: string;
  questionText: string;
  answerGuideText: string;
  whyQuestionSummary: string;
  progressLabel: string;
  questionIndex: number;
  maxQuestions: number;
  showInterimJudgmentCta: boolean;
};

const WHY_BY_GAP: Record<string, string> = {
  customerPersona:
    '지금까지 사업 윤곽을 파악 중입니다. 누구를 위한 사업인지 확인하려고 합니다.',
  problemJtbd:
    '지금까지 고객은 어느 정도 이해했습니다. 고객이 겪는 불편을 확인하려고 합니다.',
  solution:
    '고객과 문제는 어느 정도 파악했습니다. 무엇을 해결하려는지 확인하려고 합니다.',
  validationTestability:
    '지금까지 고객과 문제는 어느 정도 이해했습니다. 이 문제를 해결했을 때 고객에게 무엇이 좋아지는지 확인하려고 합니다.',
  differentiationVsAlternatives:
    '지금 쓰는 방법과 비교해 무엇이 달라지는지 확인하려고 합니다.',
};

function buildWhySummary(
  targetGap: string | null | undefined,
  whyNow: string | null | undefined,
): string {
  if (targetGap && WHY_BY_GAP[targetGap]) {
    return WHY_BY_GAP[targetGap]!;
  }
  const sanitized = sanitizeCeoWhyNow(whyNow);
  if (sanitized.length > 120) {
    return sanitized.slice(0, 117).trim() + '…';
  }
  return sanitized;
}

export function buildAiPmSimpleQuestionSnapshot(input: {
  displayQuestionText: string;
  targetGap?: string | null;
  whyNow?: string | null;
  questionCount: number;
}): AiPmSimpleQuestionSnapshot {
  const questionText = toHumanLanguageQuestion(
    input.displayQuestionText,
    input.targetGap,
  );
  const guide = buildAnswerGuide({ targetGap: input.targetGap });
  const index = Math.min(input.questionCount + 1, CEO_JUDGMENT_SESSION_MAX_QUESTIONS);

  return {
    screenTitle: judgmentViewTitle(input.questionCount, 'question'),
    questionText,
    answerGuideText: formatAnswerGuideText(guide),
    whyQuestionSummary: buildWhySummary(input.targetGap, input.whyNow),
    progressLabel: `확인 진행 중 · ${index}번째 질문`,
    questionIndex: index,
    maxQuestions: CEO_JUDGMENT_SESSION_MAX_QUESTIONS,
    showInterimJudgmentCta: index >= CEO_JUDGMENT_EARLY_VIEW_FROM,
  };
}
