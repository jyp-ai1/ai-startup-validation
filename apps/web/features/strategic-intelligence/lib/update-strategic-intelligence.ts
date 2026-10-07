import type {
  SiEvidenceUpdateInput,
  SiEvidenceUpdateResult,
  SiStrategicJudgment,
} from '@repo/types/domain/strategic-intelligence';

import { analyzeStrategicIntelligence, isRepeatZeroLine } from './analyze-strategic-intelligence';
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

const VERDICT_RANK = {
  insufficient_basis: 0,
  judgment_deferred: 1,
  conditionally_viable: 2,
  viable: 3,
} as const;

function reconcileEvidenceStrengthDelta(args: {
  previous: SiStrategicJudgment;
  next: SiStrategicJudgment;
  prevRank: number;
  nextRank: number;
  founderAnswer: string;
}): SiEvidenceUpdateResult['evidenceStrengthDelta'] {
  const computed = args.nextRank > args.prevRank ? 'up' : args.nextRank < args.prevRank ? 'down' : 'unchanged';
  const verdictDelta = VERDICT_RANK[args.next.verdictId] - VERDICT_RANK[args.previous.verdictId];
  if (verdictDelta < 0) return 'down';
  if (isRepeatZeroLine(args.founderAnswer) && computed === 'up') return 'unchanged';
  return computed;
}

export function updateStrategicIntelligence(input: SiEvidenceUpdateInput): SiEvidenceUpdateResult {
  const previous = input.previous;
  const addedEvidence = [classifyFounderEvidence(input.founderAnswer)];
  const next = analyzeStrategicIntelligence({
    title: input.title,
    documentText: appendFounderEvidenceToDocument(input.documentText, input.founderAnswer),
  });
  const conflict = next.evidenceMap.find((item) => item.evidenceClass === 'CONFLICT');
  if (conflict && addedEvidence[0]) {
    addedEvidence[0] = { ...addedEvidence[0], evidenceClass: 'CONFLICT' };
  }

  const prevRank = evidenceStrengthRank(previous);
  const nextRank = evidenceStrengthRank(next);
  const evidenceStrengthDelta = reconcileEvidenceStrengthDelta({
    previous,
    next,
    prevRank,
    nextRank,
    founderAnswer: input.founderAnswer,
  });

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
