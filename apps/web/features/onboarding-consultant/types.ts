import type { ResearchType } from '@repo/types/validation';

export const ONBOARDING_CONCERNS = [
  'MARKET',
  'REVENUE',
  'COMPETITION',
  'GOVERNMENT',
  'INVESTMENT',
  'TECHNOLOGY',
] as const;

export type OnboardingConcern = (typeof ONBOARDING_CONCERNS)[number];

export const ONBOARDING_FINAL_GOALS = [
  'FUNDRAISING',
  'NEW_BUSINESS',
  'STRATEGY',
  'AI_ADOPTION',
  'GOVERNMENT_GRANT',
] as const;

export type OnboardingFinalGoal = (typeof ONBOARDING_FINAL_GOALS)[number];

export type OnboardingAnswers = {
  validation: string;
  targetCustomer: string;
  competitors: string;
  concern: OnboardingConcern;
  finalGoal: OnboardingFinalGoal;
};

export type OnboardingContext = {
  status: 'in_progress' | 'completed';
  answers: OnboardingAnswers;
  summary: string;
  completedAt: string;
};

export type OnboardingResearchPlanItem = {
  id: string;
  titleKey: string;
  categoryKey: string;
  researchType: ResearchType;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  rank: number;
};

export type OnboardingPhase =
  | 'welcome'
  | 'interview'
  | 'summary'
  | 'research_plan'
  | 'starting';
