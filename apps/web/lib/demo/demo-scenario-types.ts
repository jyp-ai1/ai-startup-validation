import type { WorkspacePersistedSnapshot } from '@/lib/project/workspace-persisted-state';

export type DemoProjectSlug = 'clinicflow' | 'local-sns' | 'fitbridge';

export type DemoRuntimeKind = 'DEMO_SAMPLE' | 'DEMO_MY_BUSINESS' | 'PRODUCTION_PROJECT';

export type DemoProjectRecord = {
  id: string;
  slug: DemoProjectSlug;
  displayName: string;
  tagline: string;
  category: 'b2b_saas' | 'local_service' | 'commerce_brand';
  version: number;
  locale: 'ko';
};

export type DemoBusinessContext = {
  businessName: string;
  oneLiner: string;
  longDescription: string;
  customer: string;
  payer: string;
  problem: string;
  currentAlternatives: string;
  market: string;
  competitors: string;
  differentiation: string;
  validationPlan: string;
  coreHypothesis: string;
};

export type DemoScenarioSurface =
  | 'understanding'
  | 'question'
  | 'judgment'
  | 'final_review';

export type DemoScenarioFrame = {
  index: number;
  stepLabel: string;
  surface: DemoScenarioSurface;
  workspaceSnapshot: WorkspacePersistedSnapshot;
  presenter?: {
    understandingSummary?: string;
    questionText?: string;
    prefilledAnswerDisplay?: string;
    judgmentHeadline?: string;
    finalReviewSummary?: string;
  };
  primaryCta: 'next' | 'confirm_understanding' | 'start_preview';
};

export type DemoSeedBundle = {
  project: DemoProjectRecord;
  business: DemoBusinessContext;
  document: { format: 'markdown'; body: string };
  frames: DemoScenarioFrame[];
};
