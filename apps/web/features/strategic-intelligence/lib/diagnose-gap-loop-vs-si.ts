/**
 * PR #96 — Diagnostic only. Reads decideNextQuestionFromReview as a black box.
 * Does not rewrite the question engine, gap loop, or S.I. core.
 */

import { applyQuestionPolicy } from '@/features/workflow-journey/lib/business-understanding/ai-pm-question-policy';
import { buildAnswerReview } from '@/features/workflow-journey/lib/business-understanding/build-answer-review';
import { buildBusinessUnderstanding } from '@/features/workflow-journey/lib/business-understanding/build-business-understanding';
import { buildConversationMemoryFromSources } from '@/features/workflow-journey/lib/business-understanding/build-conversation-memory';
import { decideNextQuestionFromReview } from '@/features/workflow-journey/lib/business-understanding/decide-next-question-from-review';
import { evaluateStageReadiness } from '@/features/workflow-journey/lib/business-understanding/evaluate-stage-readiness';
import { buildLivingUnderstandingState } from '@/features/workflow-journey/lib/business-understanding/living-understanding-state';
import {
  createEmptyGapState,
  getClosedGapIds,
  updateGapStateFromReview,
} from '@/features/workflow-journey/lib/business-understanding/update-gap-state-from-review';
import { setV3ReviewPipelineForTest } from '@/features/workflow-journey/lib/business-understanding/v3-review-pipeline';
import type { AiPmLoopTurn } from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-types';
import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';
import type { SiValidationKind } from '@repo/types/domain/strategic-intelligence';

import { resolveSiJourneyIntegration } from './resolve-si-journey-integration';

export type GapVsSiClass = 'A' | 'B' | 'C' | 'D';

export type GapVsSiDimension = {
  siIntent: string;
  engineIntent: string;
  sameIntent: boolean;
  judgmentChangingEvidence: boolean;
  remainingGapOnly: boolean;
  sameSlot: boolean;
  engineAnswerEntersSiEvidence: false;
  engineAskCanMoveSiJudgment: false;
  engineOverwritesSi: false;
  enginePrioritizedOverSi: boolean;
};

export type GapVsSiRow = {
  id: string;
  si: {
    kind: SiValidationKind;
    criticalUnknown: string;
    validationPriority: string;
    decisionChangingEvidence: string;
    questionText: string;
    verdictId: string;
    stageId: string;
  };
  engineFirst: {
    targetGapId: string | null;
    questionText: string | null;
    whyNow: string | null;
    source: 'decideNextQuestionFromReview';
  };
  engineWalk: Array<{ turn: number; targetGapId: string; questionText: string }>;
  dimensions: GapVsSiDimension;
  classification: GapVsSiClass;
  classificationWhy: string;
};

const SI_FAMILY: Record<SiValidationKind, string> = {
  repeat_loop: 'repeat',
  payer_job: 'payer',
  payer_split: 'payer',
  segment_proof: 'segment',
  paid_conversion: 'payment',
  customer_problem: 'problem',
  generic: 'other',
};

const ENGINE_FAMILY: Record<string, string> = {
  businessOneLiner: 'understanding',
  customerPersona: 'segment',
  payer: 'payer',
  problemJtbd: 'problem',
  problemFrequencySeverity: 'problem',
  validationTestability: 'differentiation',
  alternativesCompetitors: 'market',
  differentiationVsAlternatives: 'differentiation',
  revenueModel: 'payment',
};

function engineFamily(gapId: string | null): string {
  if (!gapId) return 'none';
  return ENGINE_FAMILY[gapId] ?? 'checklist';
}

function classify(dim: GapVsSiDimension, siKind: SiValidationKind, engineGap: string | null): {
  classification: GapVsSiClass;
  classificationWhy: string;
} {
  if (dim.engineOverwritesSi) {
    return { classification: 'D', classificationWhy: '엔진이 S.I. 소스를 덮어 S.I. 검증을 불가능하게 한다.' };
  }
  if (dim.sameSlot && dim.sameIntent && dim.judgmentChangingEvidence) {
    return { classification: 'A', classificationWhy: '엔진이 S.I.와 같은 검증 대상을 묻는다.' };
  }
  if (dim.enginePrioritizedOverSi && !dim.sameSlot) {
    return {
      classification: 'C',
      classificationWhy: '엔진이 S.I. 검증이 아닌 gap을 우선 선택해 판단 경로와 충돌한다.',
    };
  }
  return {
    classification: 'B',
    classificationWhy: `엔진은 ${engineGap ?? 'null'}(체크리스트)을 묻고 S.I.는 ${siKind} 증거를 묻는다. 방향은 다르지만 Integration Gate상 S.I. 검증 경로는 막히지 않는다.`,
  };
}

function firstEngineAsk(documentText: string) {
  setV3ReviewPipelineForTest(true);
  const understanding = buildBusinessUnderstanding(documentText);
  if (!understanding) {
    return { targetGapId: null, questionText: null, whyNow: null, living: null, gapState: createEmptyGapState() };
  }
  const memory = buildConversationMemoryFromSources({
    projectId: 'si-gap-diagnostic',
    documentText,
    turns: [],
    entities: null,
    previous: null,
  });
  const living = buildLivingUnderstandingState({
    documentText,
    understanding,
    turns: [],
    memory,
  });
  const gapState = createEmptyGapState();
  const stageReadiness = evaluateStageReadiness({ gapState, turns: [], living });
  const raw = decideNextQuestionFromReview({
    living,
    turns: [],
    memory,
    lastReview: null,
    gapState,
    stageReadiness,
  });
  const presented = raw
    ? applyQuestionPolicy({
        decision: raw,
        gapState,
        living,
        turns: [],
        stageReadiness,
        isBootstrap: true,
      })
    : null;
  return {
    targetGapId: presented?.targetGapId ?? raw?.targetGapId ?? null,
    questionText: presented?.questionText ?? raw?.questionText ?? null,
    whyNow: presented?.whyNow ?? raw?.whyNow ?? null,
    living,
    gapState,
    memory,
  };
}

function walkEngineAsks(documentText: string, steps = 4): Array<{
  turn: number;
  targetGapId: string;
  questionText: string;
}> {
  setV3ReviewPipelineForTest(true);
  const first = firstEngineAsk(documentText);
  if (!first.living || !first.targetGapId || !first.questionText) return [];

  let gapState: GapKnowledgeState = first.gapState;
  const turns: AiPmLoopTurn[] = [];
  const walk: Array<{ turn: number; targetGapId: string; questionText: string }> = [
    { turn: 1, targetGapId: first.targetGapId, questionText: first.questionText },
  ];
  let pendingGap = first.targetGapId;
  let pendingQuestion = first.questionText;

  for (let i = 2; i <= steps; i += 1) {
    const answer = documentText.replace(/\s+/g, ' ').trim().slice(0, 120);
    const { review, semantic } = buildAnswerReview({
      turnId: `diag-${i - 1}`,
      askedGapId: pendingGap,
      askedQuestionText: pendingQuestion,
      askedIssueId: 'bm_design',
      userAnswer: answer,
      displayedQuestionText: pendingQuestion,
      existingFactsByKey: {},
      priorClosedGaps: getClosedGapIds(gapState),
    });
    gapState = updateGapStateFromReview(review, gapState);
    turns.push({
      issueId: 'bm_design',
      answer,
      appliedAt: `diag-${i - 1}`,
      targetGap: pendingGap,
      semanticFactKey: semantic.factKey,
    });
    const stageReadiness = evaluateStageReadiness({ gapState, turns, living: first.living });
    const raw = decideNextQuestionFromReview({
      living: first.living,
      turns,
      memory: first.memory ?? null,
      lastReview: review,
      gapState,
      stageReadiness,
    });
    if (!raw?.targetGapId || !raw.questionText) break;
    walk.push({ turn: i, targetGapId: raw.targetGapId, questionText: raw.questionText });
    pendingGap = raw.targetGapId;
    pendingQuestion = raw.questionText;
  }

  return walk;
}

export function diagnoseGapLoopVsSi(input: {
  id: string;
  title?: string;
  documentText: string;
}): GapVsSiRow {
  const si = resolveSiJourneyIntegration({
    title: input.title,
    businessDocument: input.documentText,
  });
  const engine = firstEngineAsk(input.documentText);
  const engineWalk = walkEngineAsks(input.documentText);
  const siFamily = SI_FAMILY[si.firstQuestion.kind];
  const engFamily = engineFamily(engine.targetGapId);
  const sameSlot = siFamily === engFamily;
  const sameIntent = sameSlot;

  const dimensions: GapVsSiDimension = {
    siIntent: si.firstJudgment.validationPriority,
    engineIntent: engine.questionText ?? '(no ask)',
    sameIntent,
    judgmentChangingEvidence: false,
    remainingGapOnly: engine.targetGapId === 'businessOneLiner' || engFamily === 'understanding',
    sameSlot,
    engineAnswerEntersSiEvidence: false,
    engineAskCanMoveSiJudgment: false,
    engineOverwritesSi: false,
    enginePrioritizedOverSi: false,
  };
  const { classification, classificationWhy } = classify(
    dimensions,
    si.firstQuestion.kind,
    engine.targetGapId,
  );

  return {
    id: input.id,
    si: {
      kind: si.firstQuestion.kind,
      criticalUnknown: si.firstJudgment.criticalUnknown,
      validationPriority: si.firstJudgment.validationPriority,
      decisionChangingEvidence: si.firstJudgment.decisionChangingEvidence,
      questionText: si.firstQuestion.questionText,
      verdictId: si.firstJudgment.verdictId,
      stageId: si.firstJudgment.stageId,
    },
    engineFirst: {
      targetGapId: engine.targetGapId,
      questionText: engine.questionText,
      whyNow: engine.whyNow,
      source: 'decideNextQuestionFromReview',
    },
    engineWalk,
    dimensions,
    classification,
    classificationWhy,
  };
}
