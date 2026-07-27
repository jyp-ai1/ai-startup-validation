export const JOURNEY_STEP_IDS = [
  'problem',
  'customer',
  'market',
  'business',
  'decision',
] as const;

export type JourneyStepId = (typeof JOURNEY_STEP_IDS)[number];

export type JourneyStepStatus = 'done' | 'current' | 'upcoming';

export function journeyStatusForIndex(
  stepIndex: number,
  completedQuestions: number,
  interviewComplete: boolean,
): JourneyStepStatus {
  if (interviewComplete) {
    if (stepIndex <= 1) return 'done';
    if (stepIndex === 4) return 'current';
    return 'upcoming';
  }

  if (stepIndex < completedQuestions) return 'done';
  if (stepIndex === completedQuestions) return 'current';
  return 'upcoming';
}
