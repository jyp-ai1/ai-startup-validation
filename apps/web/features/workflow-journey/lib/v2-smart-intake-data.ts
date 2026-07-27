import type {
  SmartIntakeFieldId,
  SmartIntakeMissingId,
  SmartIntakePricingChoice,
  SmartIntakeStatusMessageId,
  SmartIntakeWorkingStepId,
} from './v2-smart-intake-types';

export const SMART_INTAKE_MAX_CHARS = 500;

export const SMART_INTAKE_ACCEPTED_EXTENSIONS = ['.txt', '.md', '.markdown', '.pdf', '.docx'] as const;

export const SMART_INTAKE_SUPPORTED_FORMATS = [
  'businessPlan',
  'notion',
  'confluence',
  'googleDocs',
  'chatgpt',
  'word',
] as const;

export const SMART_INTAKE_WORKING_STEPS: SmartIntakeWorkingStepId[] = [
  'problemAnalysis',
  'customerAnalysis',
  'marketResearch',
  'competitionResearch',
  'pricingAnalysis',
  'documentCompare',
  'strategySummary',
];

export const SMART_INTAKE_STATUS_MESSAGES: SmartIntakeStatusMessageId[] = [
  'googleTrends',
  'searchVolume',
  'competitorStrategy',
  'understandingDoc',
];

export const SMART_INTAKE_EXTRACTED_FIELDS: SmartIntakeFieldId[] = [
  'problem',
  'customer',
  'market',
  'bm',
  'competition',
];

export const SMART_INTAKE_MISSING_FIELDS: SmartIntakeMissingId[] = [
  'pricing',
  'customerInterview',
  'gtm',
];

export const SMART_INTAKE_PRICING_CHOICES: SmartIntakePricingChoice[] = [
  'free',
  'subscription',
  'oneTime',
  'undecided',
];

export const SMART_INTAKE_EVIDENCE_ITEMS = [
  'googleTrends',
  'productHunt',
  'yc',
] as const;

export const SMART_INTAKE_RESOURCES = [
  'businessPlanGuide',
  'marketReport',
  'governmentSupport',
  'investorDeck',
  'interviewTemplate',
] as const;

export const SMART_INTAKE_DAILY_MONITORING = [
  'competitorPricing',
  'newLaunch',
  'fundingNews',
  'searchVolume',
  'userReaction',
] as const;

export const SMART_INTAKE_WORKING_MS = 9000;
