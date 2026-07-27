export type DemoExperienceStep =
  | 'greeting'
  | 'sampleProject'
  | 'investigating'
  | 'inbox'
  | 'opinion'
  | 'evidence'
  | 'changeDetected'
  | 'strategyImprovement'
  | 'continuousManagement'
  | 'tryMyProject'
  | 'myProjectForm'
  | 'myProjectReviewing'
  | 'myProjectResults'
  | 'savePrompt'
  | 'loginCta';

export type DemoEvidenceItemId =
  | 'googleTrends'
  | 'searchVolume'
  | 'productHunt'
  | 'ycInvestments';

export type DemoMetricId = 'marketFit' | 'differentiation' | 'aiConfidence';

export type DemoMonitoringItemId =
  | 'competitorPricing'
  | 'funding'
  | 'productHuntRank'
  | 'googleTrends'
  | 'searchVolume'
  | 'reddit'
  | 'news';

export type DemoRecommendationWhyId =
  | 'cursorFocus'
  | 'lovableFocus'
  | 'replitFocus'
  | 'gapOpportunity';
export type DemoRecommendationEvidenceId = 'searchVolume' | 'competitorDevTools' | 'strategyGap';
export type DemoEvidenceSourceId =
  | 'googleTrends'
  | 'cursor'
  | 'lovable'
  | 'productHunt'
  | 'reddit'
  | 'yc';
export type DemoDecisionChoice = 'proceed' | 'hold' | 'compare';

export type DemoMyProjectResultId =
  | 'market'
  | 'competition'
  | 'differentiation'
  | 'recommendation'
  | 'nextAction';

export const DEMO_EXPERIENCE_STEP_ORDER: DemoExperienceStep[] = [
  'greeting',
  'sampleProject',
  'investigating',
  'inbox',
  'opinion',
  'evidence',
  'changeDetected',
  'strategyImprovement',
  'continuousManagement',
  'tryMyProject',
  'myProjectForm',
  'myProjectReviewing',
  'myProjectResults',
  'savePrompt',
  'loginCta',
];

export function getNextDemoStep(step: DemoExperienceStep): DemoExperienceStep | null {
  const index = DEMO_EXPERIENCE_STEP_ORDER.indexOf(step);
  if (index < 0 || index >= DEMO_EXPERIENCE_STEP_ORDER.length - 1) return null;
  return DEMO_EXPERIENCE_STEP_ORDER[index + 1] ?? null;
}
