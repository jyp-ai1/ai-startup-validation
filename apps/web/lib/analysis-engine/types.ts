/**
 * S13 Deterministic Analysis Engine v1 — types only.
 * Engine Purity: no JSX, i18n, or Presenter.
 */

export type EvidenceStatus = 'confirmed' | 'assumed' | 'unknown';

export type EvidenceId =
  | 'customer'
  | 'problem'
  | 'revenue'
  | 'payer'
  | 'market'
  | 'competition'
  | 'price'
  | 'cac'
  | 'ltv';

export type StageId = 'idea' | 'mvp' | 'early_revenue' | 'growth' | 'scale';

export type BusinessTypeId =
  | 'saas'
  | 'marketplace'
  | 'travel'
  | 'commerce'
  | 'generic';

export type EvidenceMap = Partial<Record<EvidenceId, EvidenceStatus>>;

export type AnalysisInput = {
  stage: StageId;
  businessType: BusinessTypeId;
  evidence: EvidenceMap;
};

/** Machine decision — Rule output (S12 §2 families only; no ProblemFit) */
export type DecisionCode =
  | 'RevenueValidation'
  | 'MarketJudgment'
  | 'AnalysisGate';

export type DecisionValue =
  | 'Ready'
  | 'Insufficient'
  | 'Blocked'
  | 'Fragile';

export type Decision = {
  code: DecisionCode;
  value: DecisionValue;
  ruleId: string;
  evidenceRefs: EvidenceId[];
};

export type Insight = {
  decisionCode: DecisionCode;
  decisionValue: DecisionValue;
  claim: string;
  basisEvidenceIds: EvidenceId[];
  confidence: 'supported' | 'fragile' | 'insufficient';
  ruleId: string;
};

export type RecommendedAction = {
  decisionCode: DecisionCode;
  decisionValue: DecisionValue;
  action: string;
  ruleId: string;
};

export type AnalysisResult = {
  input: AnalysisInput;
  decisions: Decision[];
  insights: Insight[];
  actions: RecommendedAction[];
};

export type RuleContext = {
  input: AnalysisInput;
  status: (id: EvidenceId) => EvidenceStatus;
};
