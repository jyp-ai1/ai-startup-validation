/** S17-2 / Core v5 — staged Thinking mirroring judgment loop. */
export type ThinkingStageId =
  | 'confirmAnswer'
  | 'updateUnderstanding'
  | 'reviewJudgment'
  | 'selectNextGap';

export type ThinkingStage = {
  id: ThinkingStageId;
  /** i18n key under aiPmLoop.thinkingStages.* */
  labelKey: string;
  /** Cumulative end time in ms from thinking start. */
  endsAtMs: number;
};

export const THINKING_STAGES: ThinkingStage[] = [
  { id: 'confirmAnswer', labelKey: 'thinkingStages.confirmAnswer', endsAtMs: 450 },
  { id: 'updateUnderstanding', labelKey: 'thinkingStages.updateUnderstanding', endsAtMs: 900 },
  { id: 'reviewJudgment', labelKey: 'thinkingStages.reviewJudgment', endsAtMs: 1350 },
  { id: 'selectNextGap', labelKey: 'thinkingStages.selectNextGap', endsAtMs: 1800 },
];

export const THINKING_TOTAL_MS = THINKING_STAGES[THINKING_STAGES.length - 1]!.endsAtMs;

/** v2 — minimum display when all stages completed by real pipeline. */
export const THINKING_STATE_DRIVEN_MIN_MS = 400;

/** Elapsed ms until UI may complete when stages are pre-done by real writes. */
export function stateDrivenThinkingCompleteMs(completedStageIds: ThinkingStageId[]): number {
  const allDone = THINKING_STAGES.every((s) => completedStageIds.includes(s.id));
  return allDone ? THINKING_STATE_DRIVEN_MIN_MS : THINKING_TOTAL_MS;
}

export function resolveThinkingStage(elapsedMs: number): ThinkingStage {
  for (const stage of THINKING_STAGES) {
    if (elapsedMs < stage.endsAtMs) return stage;
  }
  return THINKING_STAGES[THINKING_STAGES.length - 1]!;
}
