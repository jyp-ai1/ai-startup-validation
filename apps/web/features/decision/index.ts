export { generateProjectDecision } from './services/decision-service';
export type {
  DecisionResult,
  DecisionVerdict,
  DecisionScores,
  RecommendedAction,
  MissingEvidenceItem,
  RiskMatrixItem,
  OpportunityItem,
} from './services/decision-types';
export { DecisionService, decisionService } from './services/decision-engine';
