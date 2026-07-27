export const REVIEW_TYPES = [
  'startup-idea',
  'new-business',
  'existing-strategy',
  'investment-prep',
] as const;

export type ReviewType = (typeof REVIEW_TYPES)[number];

export const INTERVIEW_QUESTION_IDS = ['q1-problem', 'q2-customer'] as const;

export type InterviewQuestionId = (typeof INTERVIEW_QUESTION_IDS)[number];

export type InterviewContextSnapshot = {
  problem?: string;
  customer?: string;
  value?: string;
  hypothesis?: string;
};

export type Sprint12InterviewState = {
  reviewType: ReviewType;
  description?: string;
  interviewStarted: boolean;
  interviewComplete: boolean;
  currentQuestionIndex: number;
  answers: Partial<Record<InterviewQuestionId, string>>;
  context: InterviewContextSnapshot;
};

export type ProjectInterviewBundle = {
  sprint12?: Sprint12InterviewState;
};

export function parseInterviewBundle(
  onboardingContext: Record<string, unknown> | null | undefined,
): ProjectInterviewBundle {
  if (!onboardingContext || typeof onboardingContext !== 'object') {
    return {};
  }
  const sprint12 = onboardingContext.sprint12;
  if (!sprint12 || typeof sprint12 !== 'object') {
    return {};
  }
  return { sprint12: sprint12 as Sprint12InterviewState };
}

export function isReviewType(value: string): value is ReviewType {
  return (REVIEW_TYPES as readonly string[]).includes(value);
}

export function buildInitialInterviewState(
  reviewType: ReviewType,
  description?: string,
): Sprint12InterviewState {
  return {
    reviewType,
    description: description?.trim() || undefined,
    interviewStarted: false,
    interviewComplete: false,
    currentQuestionIndex: 0,
    answers: {},
    context: {},
  };
}
