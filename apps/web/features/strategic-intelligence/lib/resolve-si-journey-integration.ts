import type { SiAiPmQuestion, SiStrategicJudgment } from '@repo/types/domain/strategic-intelligence';

import type { SiAiPmBindView } from './run-si-ai-pm-bind-turn';
import { resolveSiAiPmBindView } from './run-si-ai-pm-bind-turn';

export type SiJourneyIntegrationInput = {
  businessDocument: string;
  title?: string | null;
  founderAnswer?: string | null;
  /** Gap-loop rewritten document. Must never be the S.I. source. */
  gapLoopDocument?: string | null;
};

export type SiJourneyIntegrationResult = {
  firstJudgment: SiStrategicJudgment;
  firstQuestion: SiAiPmQuestion;
  current: SiAiPmBindView;
  usedBusinessDocument: true;
  ignoredGapLoopDocument: boolean;
};

/**
 * Founder Journey integration: S.I. reads the original business input only.
 * Gap-loop document rewrites are accepted so callers can prove they are ignored.
 */
export function resolveSiJourneyIntegration(
  input: SiJourneyIntegrationInput,
): SiJourneyIntegrationResult {
  const first = resolveSiAiPmBindView({
    title: input.title,
    documentText: input.businessDocument,
  });
  const current = resolveSiAiPmBindView({
    title: input.title,
    documentText: input.businessDocument,
    founderAnswer: input.founderAnswer,
  });
  return {
    firstJudgment: first.judgment,
    firstQuestion: first.question,
    current,
    usedBusinessDocument: true,
    ignoredGapLoopDocument: Boolean(input.gapLoopDocument),
  };
}

/** P0: passing a gap-loop rewrite must not change the S.I. source document. */
export function siIgnoresGapLoopDocument(input: SiJourneyIntegrationInput): boolean {
  const isolated = resolveSiJourneyIntegration(input);
  const control = resolveSiJourneyIntegration({
    ...input,
    gapLoopDocument: null,
  });
  return (
    isolated.usedBusinessDocument &&
    isolated.firstJudgment.judgment === control.firstJudgment.judgment &&
    isolated.firstJudgment.criticalUnknown === control.firstJudgment.criticalUnknown &&
    isolated.current.judgment.judgment === control.current.judgment.judgment &&
    isolated.current.judgment.criticalUnknown === control.current.judgment.criticalUnknown
  );
}
