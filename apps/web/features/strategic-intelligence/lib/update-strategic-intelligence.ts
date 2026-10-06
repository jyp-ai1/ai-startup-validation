import type {
  SiEvidenceUpdateInput,
  SiEvidenceUpdateResult,
  SiStrategicJudgment,
} from '@repo/types/domain/strategic-intelligence';

import { analyzeStrategicIntelligence } from './analyze-strategic-intelligence';
import { classifyFounderEvidence } from './classify-founder-evidence';

const FOUNDER_EVIDENCE_MARK = '[Founder evidence]';

export function appendFounderEvidenceToDocument(documentText: string, founderAnswer: string): string {
  const answer = founderAnswer.trim();
  if (!answer) return documentText.trim();
  return `${documentText.trim()}\n\n${FOUNDER_EVIDENCE_MARK}\n${answer}`;
}

function evidenceStrengthRank(judgment: SiStrategicJudgment): number {
  const validated = judgment.evidenceMap.filter((item) => item.evidenceClass === 'VALIDATED').length;
  const facts = judgment.evidenceMap.filter((item) => item.evidenceClass === 'FACT').length;
  const stageRank = { S0: 0, S1: 1, S2: 2, S3: 3, S4: 4 }[judgment.stageId];
  return stageRank * 10 + validated * 3 + facts;
}

export function updateStrategicIntelligence(input: SiEvidenceUpdateInput): SiEvidenceUpdateResult {
  const previous = input.previous;
  const addedEvidence = [classifyFounderEvidence(input.founderAnswer)];
  const next = analyzeStrategicIntelligence({
    title: input.title,
    documentText: appendFounderEvidenceToDocument(input.documentText, input.founderAnswer),
  });

  const prevRank = evidenceStrengthRank(previous);
  const nextRank = evidenceStrengthRank(next);
  const evidenceStrengthDelta =
    nextRank > prevRank ? 'up' : nextRank < prevRank ? 'down' : 'unchanged';

  return {
    previous,
    next,
    addedEvidence,
    evidenceStrengthDelta,
    criticalUnknownChanged: previous.criticalUnknown !== next.criticalUnknown,
    judgmentChanged:
      previous.verdictId !== next.verdictId ||
      previous.stageId !== next.stageId ||
      previous.judgment !== next.judgment,
    validationPriorityChanged: previous.validationPriority !== next.validationPriority,
    source: 'si-v1-update',
  };
}
