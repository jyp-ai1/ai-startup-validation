/**
 * S.I. V1 — Strategic Intelligence judgment (presentation + analyzer contract).
 * Not a persist SoT. Recomputed from business input.
 */

export type SiEvidenceClass =
  | 'FACT'
  | 'CLAIM'
  | 'INFERENCE'
  | 'ASSUMPTION'
  | 'VALIDATED';

export type SiAxisId =
  | 'customerProblemFit'
  | 'marketAlternatives'
  | 'businessModel'
  | 'executionAdvantage'
  | 'validationStrength';

export type SiStageId = 'S0' | 'S1' | 'S2' | 'S3' | 'S4';

export type SiVerdictId =
  | 'viable'
  | 'conditionally_viable'
  | 'judgment_deferred'
  | 'insufficient_basis';

export type SiAxisStatus = 'supported' | 'partial' | 'weak' | 'unknown';

export type SiBusinessInput = {
  title?: string | null;
  documentText: string;
};

export type SiEvidenceItem = {
  id: string;
  text: string;
  evidenceClass: SiEvidenceClass;
  axisId: SiAxisId;
};

export type SiAxisJudgment = {
  axisId: SiAxisId;
  label: string;
  status: SiAxisStatus;
  summary: string;
};

export type SiStrategicJudgment = {
  version: 1;
  verdictId: SiVerdictId;
  stageId: SiStageId;
  /** Prose first. Never a score. */
  judgment: string;
  whyPossible: string;
  whyFail: string;
  evidenceMap: SiEvidenceItem[];
  strengths: string[];
  risks: string[];
  axes: SiAxisJudgment[];
  criticalUnknown: string;
  decisionChangingEvidence: string;
  validationPriority: string;
  source: 'si-v1';
};

export type SiEvidenceStrengthDelta = 'up' | 'down' | 'unchanged';

export type SiEvidenceUpdateInput = {
  previous: SiStrategicJudgment;
  documentText: string;
  founderAnswer: string;
  title?: string | null;
};

export type SiEvidenceUpdateResult = {
  previous: SiStrategicJudgment;
  next: SiStrategicJudgment;
  addedEvidence: SiEvidenceItem[];
  evidenceStrengthDelta: SiEvidenceStrengthDelta;
  criticalUnknownChanged: boolean;
  judgmentChanged: boolean;
  validationPriorityChanged: boolean;
  source: 'si-v1-update';
};

export const SI_AXIS_LABELS: Record<SiAxisId, string> = {
  customerProblemFit: 'A. Customer / Problem Fit',
  marketAlternatives: 'B. Market / Alternatives',
  businessModel: 'C. Business Model',
  executionAdvantage: 'D. Execution Advantage',
  validationStrength: 'E. Validation Strength',
};

export const SI_VERDICT_LABELS: Record<SiVerdictId, string> = {
  viable: '사업화 가능성이 높음',
  conditionally_viable: '조건부 사업화 가능',
  judgment_deferred: '지금은 판단을 보류한다',
  insufficient_basis: '판단 근거가 부족하다',
};

export const SI_STAGE_LABELS: Record<SiStageId, string> = {
  S0: 'S0 아이디어',
  S1: 'S1 문제·고객 가설',
  S2: 'S2 해법·모델 설계',
  S3: 'S3 출시·초기 매출',
  S4: 'S4 반복 검증',
};
