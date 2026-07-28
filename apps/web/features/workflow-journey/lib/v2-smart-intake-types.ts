export type SmartIntakeImportSource = 'paste' | 'txt' | 'md' | 'pdf' | 'docx';

export type SmartIntakeFieldId = 'problem' | 'customer' | 'market' | 'bm' | 'competition';

export type SmartIntakeMissingId = 'pricing' | 'customerInterview' | 'gtm';

export type SmartIntakePricingChoice =
  | 'free'
  | 'subscription'
  | 'oneTime'
  | 'usageBased'
  | 'enterprise'
  | 'undecided';

export type SmartIntakePriceLevelChoice = '29' | '49' | '99' | 'custom';

export type SmartIntakeAnalysis = {
  serviceName: string;
  tagline: string;
  problem: string;
  customer: string;
  market: string;
  bm: string;
  competition: string;
  extracted: Record<SmartIntakeFieldId, boolean>;
  missing: SmartIntakeMissingId[];
  completenessScore: number;
  completenessStars: number;
};

export type SmartIntakeWorkingStepId =
  | 'problemAnalysis'
  | 'customerAnalysis'
  | 'marketResearch'
  | 'competitionResearch'
  | 'pricingAnalysis'
  | 'documentCompare'
  | 'strategySummary';

export type SmartIntakeStatusMessageId =
  | 'googleTrends'
  | 'searchVolume'
  | 'competitorStrategy'
  | 'understandingDoc';
