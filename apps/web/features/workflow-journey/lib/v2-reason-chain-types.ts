export type EvidenceTypeBadge =
  | 'data'
  | 'search'
  | 'news'
  | 'competitor'
  | 'startup'
  | 'community'
  | 'report';

export type ReasonChainStepId =
  | 'documentAnalyzed'
  | 'reviewFocus'
  | 'evidenceTrends'
  | 'thereforeMarket'
  | 'butGap'
  | 'thereforePricing'
  | 'thereforeImprovement';

export type DocumentCitation = {
  id: string;
  page: number;
  section: string;
  quote: string;
  findingKey: string;
};

export type DocumentProfile = {
  fileName: string;
  pageCount: number;
  strategyCount: number;
  bmCount: number;
  kpiCount: number;
  riskCount: number;
};

export type EvidenceMetadata = {
  id: string;
  badge: EvidenceTypeBadge;
};

export type ContextualResource = {
  id: string;
};

export type ReasonChainContext = {
  serviceName: string;
  targetUserKey: string;
  documentProfile: DocumentProfile | null;
  citations: DocumentCitation[];
  evidence: EvidenceMetadata[];
  chainSteps: ReasonChainStepId[];
  resources: ContextualResource[];
  pricingGapCitationId?: string;
};
