import type { AppLocale } from '@repo/i18n/config';
import type { ProjectType, ValidationScore } from '@repo/types/validation';

/** Strategic decision verdict — 3-tier model for Decision Center. */
export type DecisionVerdict = 'GO' | 'HOLD' | 'NO_GO';

export type DecisionProviderId = 'mock' | 'openai' | 'anthropic' | 'gemini' | 'ollama';

export type SupportingEvidenceType =
  | 'EVIDENCE'
  | 'VOC'
  | 'RESEARCH'
  | 'COMPETITOR'
  | 'GRANT'
  | 'VALIDATION';

export type SupportingItemRef = {
  id: string;
  title: string;
};

export type DecisionInput = {
  projectId: string;
  projectTitle: string;
  projectType: ProjectType;
  locale: AppLocale;
  research: {
    total: number;
    completed: number;
    progressPercent: number;
  };
  evidence: {
    total: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
  voc: {
    total: number;
  };
  competitors: {
    total: number;
  };
  grants: {
    total: number;
    avgFitScore: number | null;
  };
  validationScore: ValidationScore | null;
  supportingItems?: {
    evidence: SupportingItemRef[];
    voc: SupportingItemRef[];
    research: SupportingItemRef[];
    competitors: SupportingItemRef[];
    grants: SupportingItemRef[];
  };
};

export type DecisionScores = {
  decisionScore: number;
  confidence: number;
  investmentReadiness: number;
  executionReadiness: number;
};

export type ScoreBreakdown = {
  researchScore: number;
  evidenceScore: number;
  vocScore: number;
  competitorScore: number;
  grantScore: number;
  validationBoost: number;
};

export type DecisionDriver = {
  id: string;
  labelKey: string;
  impact: number;
  direction: 'positive' | 'negative';
};

export type ExplainScoreComponent = {
  id: string;
  labelKey: string;
  value: number;
};

export type ExplainScore = {
  labelKey: string;
  total: number;
  components: ExplainScoreComponent[];
};

export type EvidenceCoverageDimension = {
  id: string;
  labelKey: string;
  current: number;
  required: number;
  percent: number;
  completed: boolean;
  href: string;
};

export type EvidenceCoverage = {
  overallPercent: number;
  dimensions: EvidenceCoverageDimension[];
};

export type SupportingEvidenceRef = {
  id: string;
  type: SupportingEvidenceType;
  title: string;
  href: string;
  metaKey?: string;
  metaParams?: Record<string, string | number>;
};

export type DecisionLogicStep = {
  id: string;
  labelKey: string;
  detailKey: string;
  params?: Record<string, string | number>;
};

export type DecisionReason = {
  id: string;
  textKey: string;
  params?: Record<string, string | number>;
};

export type MissingEvidenceItem = {
  id: string;
  labelKey: string;
  completed: boolean;
  href: string;
};

export type RecommendedAction = {
  id: string;
  priority: 1 | 2 | 3;
  labelKey: string;
  descriptionKey: string;
  scoreImpact: number;
  estimatedDays: number;
  effectKey: string;
  href: string;
};

export type RiskMatrixItem = {
  id: string;
  riskKey: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  probability: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  mitigationKey: string;
};

export type OpportunityItem = {
  id: string;
  category: 'MARKET' | 'GRANT' | 'GROWTH' | 'TECHNOLOGY' | 'AI';
  titleKey: string;
  descriptionKey: string;
};

export type DecisionExplanation = {
  drivers: DecisionDriver[];
  explainScore: ExplainScore;
  evidenceCoverage: EvidenceCoverage;
  supportingEvidence: SupportingEvidenceRef[];
  decisionLogic: DecisionLogicStep[];
  confidenceFactors: {
    evidenceVolume: number;
    evidenceQuality: number;
    recency: number;
    sourceTrust: number;
  };
};

export type DecisionResult = {
  verdict: DecisionVerdict;
  scores: DecisionScores;
  executiveSummaryKeys: string[];
  executiveSummaryParams?: Record<string, string | number>[];
  reasons: DecisionReason[];
  missingEvidence: MissingEvidenceItem[];
  recommendedActions: RecommendedAction[];
  risks: RiskMatrixItem[];
  opportunities: OpportunityItem[];
  explanation: DecisionExplanation;
  generatedAt: string;
  providerId: DecisionProviderId;
  projectType: ProjectType;
  locale: AppLocale;
};

export interface DecisionProvider {
  readonly id: DecisionProviderId;
  generate(input: DecisionInput): Promise<DecisionResult>;
}
