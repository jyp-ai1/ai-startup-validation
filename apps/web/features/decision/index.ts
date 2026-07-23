export { generateProjectDecision } from './services/decision-service';
export type {
  DecisionResult,
  DecisionVerdict,
  DecisionScores,
  DecisionDriver,
  DecisionExplanation,
  EvidenceCoverage,
  ExplainScore,
  SupportingEvidenceRef,
  DecisionLogicStep,
  RecommendedAction,
  MissingEvidenceItem,
  RiskMatrixItem,
  OpportunityItem,
} from './services/decision-types';
export { DecisionService, decisionService } from './services/decision-engine';
export { buildDecisionExplanation } from './services/decision-explainer';
