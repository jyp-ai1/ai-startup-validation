import type { ProjectType, ValidationScore } from '@repo/types/validation';

/** Strategic decision verdict — 3-tier model for Decision Center. */
export type DecisionVerdict = 'GO' | 'HOLD' | 'NO_GO';

export type DecisionProviderId = 'mock' | 'openai' | 'anthropic' | 'gemini' | 'ollama';

export type DecisionInput = {
  projectId: string;
  projectTitle: string;
  projectType: ProjectType;
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
};

export type DecisionScores = {
  decisionScore: number;
  confidence: number;
  investmentReadiness: number;
  executionReadiness: number;
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
  mitigationKey: string;
};

export type OpportunityItem = {
  id: string;
  category: 'MARKET' | 'GRANT' | 'GROWTH' | 'TECHNOLOGY';
  titleKey: string;
  descriptionKey: string;
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
  generatedAt: string;
  providerId: DecisionProviderId;
  projectType: ProjectType;
};

export interface DecisionProvider {
  readonly id: DecisionProviderId;
  generate(input: DecisionInput): Promise<DecisionResult>;
}
