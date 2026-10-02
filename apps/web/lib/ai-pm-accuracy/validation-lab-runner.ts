/**
 * Sprint 2A Phase 1 — run V3 pipeline with **AI-selected** next questions (no fixed Q order).
 */

import { buildAnswerReview } from '@/features/workflow-journey/lib/business-understanding/build-answer-review';
import { buildBusinessUnderstanding } from '@/features/workflow-journey/lib/business-understanding/build-business-understanding';
import { buildConversationMemoryFromSources } from '@/features/workflow-journey/lib/business-understanding/build-conversation-memory';
import { decideNextQuestionFromReview } from '@/features/workflow-journey/lib/business-understanding/decide-next-question-from-review';
import { evaluateStageReadiness } from '@/features/workflow-journey/lib/business-understanding/evaluate-stage-readiness';
import { buildLivingUnderstandingState } from '@/features/workflow-journey/lib/business-understanding/living-understanding-state';
import { resolveGapQuestionBinding } from '@/features/workflow-journey/lib/business-understanding/gap-question-map';
import {
  createEmptyGapState,
  getClosedGapIds,
  updateGapStateFromReview,
} from '@/features/workflow-journey/lib/business-understanding/update-gap-state-from-review';
import { setV3ReviewPipelineForTest } from '@/features/workflow-journey/lib/business-understanding/v3-review-pipeline';
import type { AiPmLoopTurn } from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-types';

import {
  snapshotFactsFromGapState,
  snapshotGapCompleteness,
} from './accuracy-turn-harness';
import { getBusinessScenario, type BusinessScenarioMatrixRow } from './business-scenario-matrix';
import type { InputPerturbationType } from './input-perturbation-types';
import { VALIDATION_LAB_PERTURBATIONS } from './input-perturbation-types';
import type { ValidationLabPack, ValidationLabRow } from './validation-lab-types';
import { userAnswerForPerturbation } from './validation-lab-answers';

function livingFor(biz: BusinessScenarioMatrixRow) {
  const understanding = buildBusinessUnderstanding(biz.documentText)!;
  const memory = buildConversationMemoryFromSources({
    projectId: biz.id,
    documentText: biz.documentText,
    turns: [],
    entities: null,
    previous: null,
  });
  return buildLivingUnderstandingState({
    documentText: biz.documentText,
    understanding,
    turns: [],
    memory,
  });
}

function formatAiVisible(review: ReturnType<typeof buildAnswerReview>['review']): string {
  const facts = review.extractedFacts
    .map((f) => `${f.key}=${f.evidenceClass}: ${f.value.slice(0, 80)}`)
    .join('; ');
  return facts || review.rationale || '(no extract)';
}

export function runValidationLabSession(input: {
  businessId: string;
  perturbation: InputPerturbationType;
  maxTurns?: number;
  gitSha?: string | null;
}): ValidationLabRow[] {
  setV3ReviewPipelineForTest(true);
  const biz = getBusinessScenario(input.businessId);
  if (!biz) throw new Error(`Unknown business ${input.businessId}`);

  const maxTurns = input.maxTurns ?? (input.perturbation === 'mixed' ? 4 : 3);
  let gapState = createEmptyGapState();
  let existingFactsByKey: Partial<Record<string, string | null>> = {};
  const loopTurns: AiPmLoopTurn[] = [];
  const living = livingFor(biz);
  const rows: ValidationLabRow[] = [];

  let pendingDecision = decideNextQuestionFromReview({
    living,
    turns: loopTurns,
    memory: null,
    lastReview: null,
    gapState,
    stageReadiness: evaluateStageReadiness({ gapState, turns: loopTurns }),
  });

  for (let t = 1; t <= maxTurns; t += 1) {
    const stateBefore = snapshotFactsFromGapState(gapState);
    const gapBefore = snapshotGapCompleteness(gapState);

    const askedGapId = pendingDecision?.targetGapId ?? 'customerPersona';
    const binding = resolveGapQuestionBinding(askedGapId);
    const askedQuestionText = pendingDecision?.questionText ?? binding.questionText;
    const userInput = userAnswerForPerturbation(input.perturbation, t, biz.exampleLabel);

    const turnId = `${biz.id}-${input.perturbation}-t${t}`;
    const { review, semantic } = buildAnswerReview({
      turnId,
      askedGapId,
      askedQuestionText,
      askedIssueId: binding.issueId,
      userAnswer: userInput,
      displayedQuestionText: askedQuestionText,
      existingFactsByKey,
      priorClosedGaps: getClosedGapIds(gapState),
    });

    gapState = updateGapStateFromReview(review, gapState);
    existingFactsByKey = snapshotFactsFromGapState(gapState);

    loopTurns.push({
      issueId: binding.issueId,
      answer: userInput,
      appliedAt: turnId,
      targetGap: askedGapId,
      semanticFactKey: semantic.factKey,
    });

    const stageReadiness = evaluateStageReadiness({ gapState, turns: loopTurns });
    const nextDecision = decideNextQuestionFromReview({
      living,
      turns: loopTurns,
      memory: null,
      lastReview: review,
      gapState,
      stageReadiness,
    });

    rows.push({
      businessId: biz.id,
      businessSet: biz.set,
      scenario: `${biz.id}:${input.perturbation}`,
      perturbation: input.perturbation,
      turn: t,
      userInput,
      aiVisibleResponse: formatAiVisible(review),
      answerUnderstanding: {
        extractedFacts: review.extractedFacts,
        intent: semantic.intent ?? null,
        quality: review.semanticInterpretationRef?.quality ?? null,
        contradictions: review.contradictions,
      },
      stateBefore,
      stateAfter: snapshotFactsFromGapState(gapState),
      gapBefore,
      gapAfter: snapshotGapCompleteness(gapState),
      askedGapId,
      askedQuestionText,
      actualNextQuestion: nextDecision?.questionText ?? null,
      actualNextQuestionTargetGap: nextDecision?.targetGapId ?? null,
      nextQuestionReason: nextDecision?.actionRationale ?? nextDecision?.rationale ?? null,
      expectedInterpretation: null,
      expectedState: null,
      expectedGap: null,
      expectedQuestionFamily: null,
      ctoStructuralPass: null,
      cpoVerdict: 'PENDING_CPO_2PASS',
      failureType: [],
      gitSha: input.gitSha ?? null,
    });

    pendingDecision = nextDecision;
  }

  return rows;
}

export function runFullValidationLab(options?: { gitSha?: string | null }): ValidationLabPack {
  const rows: ValidationLabRow[] = [];
  const businesses = [
    ...Array.from({ length: 17 }, (_, i) => `biz-${String(i + 1).padStart(2, '0')}`),
  ];

  for (const businessId of businesses) {
    if (!getBusinessScenario(businessId)) continue;
    for (const perturbation of VALIDATION_LAB_PERTURBATIONS) {
      rows.push(
        ...runValidationLabSession({
          businessId,
          perturbation,
          gitSha: options?.gitSha ?? null,
        }),
      );
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    sprint: 'SPRINT_2A_VALIDATION_LAB',
    phase: 'PHASE_1_ACTUAL_EVIDENCE',
    dynamicQuestionOrder: true,
    matrix: {
      businesses: businesses.filter((id) => getBusinessScenario(id)).length,
      perturbations: VALIDATION_LAB_PERTURBATIONS.length,
      rows: rows.length,
    },
    holdoutPolicy:
      'biz-16-17 holdout; biz-14-15 regression (prior Layer A probe — not used for fix tuning)',
    rows,
  };
}
