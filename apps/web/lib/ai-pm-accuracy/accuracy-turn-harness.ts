/**
 * Turn-level V3 pipeline harness for CPO Golden Scenarios (no LLM — deterministic SoT).
 */

import type {
  ConversationFactKey,
  ExtractedFact,
} from '@repo/types/domain/answer-review';
import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

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

import type {
  AccuracyEvidencePackage,
  ScenarioEvidenceSummary,
  TurnEvidenceRecord,
} from './accuracy-evidence-types';
import type { AccuracyFailureType } from './failure-taxonomy';
import { GOLDEN_SCENARIOS, type GoldenScenario, type GoldenTurnExpect } from './golden-scenarios';

function snapshotFactsFromGapState(
  gapState: GapKnowledgeState,
): Partial<Record<ConversationFactKey, string>> {
  const out: Partial<Record<ConversationFactKey, string>> = {};
  for (const record of Object.values(gapState.gaps)) {
    for (const ev of record.evidence) {
      out[ev.factKey] = ev.value;
    }
  }
  return out;
}

function snapshotGapCompleteness(gapState: GapKnowledgeState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [gapId, record] of Object.entries(gapState.gaps)) {
    out[gapId] = record.completeness;
  }
  return out;
}

function findFact(facts: ExtractedFact[], key: ConversationFactKey): ExtractedFact | undefined {
  return facts.find((f) => f.key === key);
}

function evaluateTurnExpect(
  expect: GoldenTurnExpect,
  ctx: {
    review: ReturnType<typeof buildAnswerReview>['review'];
    semantic: ReturnType<typeof buildAnswerReview>['semantic'];
    gapState: GapKnowledgeState;
    decision: ReturnType<typeof decideNextQuestionFromReview> | null;
    priorFacts: Partial<Record<ConversationFactKey, string>>;
  },
): { pass: boolean; failureTypes: AccuracyFailureType[]; messages: string[] } {
  const failureTypes: AccuracyFailureType[] = [];
  const messages: string[] = [];

  for (const check of expect.factChecks ?? []) {
    const fact = findFact(ctx.review.extractedFacts, check.key);
    const value = fact?.value ?? '';
    if (check.valueIncludes) {
      for (const needle of check.valueIncludes) {
        if (!value.includes(needle)) {
          messages.push(`fact ${check.key}: expected to include "${needle}" in "${value}"`);
          failureTypes.push('F1_SLOT_MISCLASSIFICATION');
        }
      }
    }
    if (check.valueExcludes) {
      for (const needle of check.valueExcludes) {
        if (value.includes(needle)) {
          messages.push(`fact ${check.key}: must not include "${needle}" in "${value}"`);
          failureTypes.push('F1_SLOT_MISCLASSIFICATION');
        }
      }
    }
    if (check.evidenceClass && fact?.evidenceClass !== check.evidenceClass) {
      messages.push(
        `fact ${check.key}: expected evidenceClass ${check.evidenceClass}, got ${fact?.evidenceClass}`,
      );
      failureTypes.push('F7_EVIDENCE_INFERENCE_CONFUSION');
    }
    if (check.evidenceClassNot && fact?.evidenceClass === check.evidenceClassNot) {
      messages.push(
        `fact ${check.key}: must not be evidenceClass ${check.evidenceClassNot}`,
      );
      failureTypes.push('F7_EVIDENCE_INFERENCE_CONFUSION');
    }
  }

  if (expect.preserveFacts) {
    const current = snapshotFactsFromGapState(ctx.gapState);
    for (const [key, expectedSub] of Object.entries(expect.preserveFacts) as Array<
      [ConversationFactKey, string]
    >) {
      const val = current[key] ?? ctx.priorFacts[key] ?? '';
      if (!val.includes(expectedSub)) {
        messages.push(`preserve ${key}: expected substring "${expectedSub}" in "${val}"`);
        failureTypes.push('F2_STATE_OVERWRITE');
      }
    }
  }

  if (expect.gapCompleteness) {
    for (const [gapId, completeness] of Object.entries(expect.gapCompleteness)) {
      const actual = ctx.gapState.gaps[gapId]?.completeness;
      const effectiveActual = actual ?? (completeness === 'OPEN' ? 'OPEN' : undefined);
      if (effectiveActual !== completeness) {
        messages.push(`gap ${gapId}: expected ${completeness}, got ${actual ?? 'missing'}`);
        failureTypes.push('F3_GAP_MISCLASSIFICATION');
      }
    }
  }

  if (expect.askedGapMustNotClose) {
    const asked = ctx.review.askedGapId;
    const c = ctx.gapState.gaps[asked]?.completeness;
    if (c === 'CLOSED') {
      messages.push(`asked gap ${asked} must not CLOSE on wrong-slot answer`);
      failureTypes.push('F5_BAD_ANSWER_HANDLING');
    }
  }

  if (expect.hasContradictionOn) {
    const hit = ctx.review.contradictions.some((c) => c.factKey === expect.hasContradictionOn);
    if (!hit) {
      messages.push(`expected contradiction on ${expect.hasContradictionOn}`);
      failureTypes.push('F6_CONTRADICTION_HANDLING');
    }
  }

  if (expect.nextTargetGap && ctx.decision?.targetGapId !== expect.nextTargetGap) {
    messages.push(
      `next target gap: expected ${expect.nextTargetGap}, got ${ctx.decision?.targetGapId}`,
    );
    failureTypes.push('F8_QUESTION_PRIORITY');
  }

  if (expect.nextMustNotTargetGap && ctx.decision?.targetGapId === expect.nextMustNotTargetGap) {
    messages.push(`next question must not target closed gap ${expect.nextMustNotTargetGap}`);
    failureTypes.push('F4_REPEATED_QUESTION');
  }

  if (expect.nextAction && ctx.decision?.action !== expect.nextAction) {
    messages.push(`next action: expected ${expect.nextAction}, got ${ctx.decision?.action}`);
    failureTypes.push('F8_QUESTION_PRIORITY');
  }

  if (expect.actionRationaleIncludes) {
    const rationale = ctx.decision?.actionRationale ?? '';
    for (const needle of expect.actionRationaleIncludes) {
      if (!rationale.includes(needle)) {
        messages.push(`actionRationale must include "${needle}"`);
        failureTypes.push('F5_BAD_ANSWER_HANDLING');
      }
    }
  }

  const pass = messages.length === 0;
  return { pass, failureTypes: [...new Set(failureTypes)], messages };
}

function minimalLiving(projectId: string) {
  const doc = 'B2B SaaS for founders validating ideas.';
  const understanding = buildBusinessUnderstanding(doc)!;
  const memory = buildConversationMemoryFromSources({
    projectId,
    documentText: doc,
    turns: [],
    entities: null,
    previous: null,
  });
  return buildLivingUnderstandingState({
    documentText: doc,
    understanding,
    turns: [],
    memory,
  });
}

export function runGoldenScenario(scenario: GoldenScenario): ScenarioEvidenceSummary {
  setV3ReviewPipelineForTest(true);

  let gapState = createEmptyGapState();
  let existingFactsByKey: Partial<Record<ConversationFactKey, string | null>> = {};
  const loopTurns: AiPmLoopTurn[] = [];
  const turnRecords: TurnEvidenceRecord[] = [];
  const living = minimalLiving(scenario.id);

  scenario.turns.forEach((turn, index) => {
    const turnId = `${scenario.id}-t${index + 1}`;
    const { review, semantic } = buildAnswerReview({
      turnId,
      askedGapId: turn.askedGapId,
      askedQuestionText: turn.askedQuestionText,
      askedIssueId: turn.askedIssueId,
      userAnswer: turn.userAnswer,
      displayedQuestionText: turn.askedQuestionText,
      existingFactsByKey,
      priorClosedGaps: getClosedGapIds(gapState),
    });

    const priorFacts = { ...existingFactsByKey } as Partial<Record<ConversationFactKey, string>>;
    gapState = updateGapStateFromReview(review, gapState);
    existingFactsByKey = snapshotFactsFromGapState(gapState);

    loopTurns.push({
      issueId: turn.askedIssueId,
      answer: turn.userAnswer,
      appliedAt: turnId,
      targetGap: turn.askedGapId,
      semanticFactKey: semantic.factKey,
    });

    const stageReadiness = evaluateStageReadiness({ gapState, turns: loopTurns });
    const decision = decideNextQuestionFromReview({
      living,
      turns: loopTurns,
      memory: null,
      lastReview: review,
      gapState,
      stageReadiness,
    });

    const evalResult = evaluateTurnExpect(turn.expect, {
      review,
      semantic,
      gapState,
      decision,
      priorFacts,
    });

    turnRecords.push({
      scenario: scenario.id,
      turn: index + 1,
      userInput: turn.userAnswer,
      expectedInterpretation: { factChecks: turn.expect.factChecks ?? [] },
      actualInterpretation: {
        extractedFacts: review.extractedFacts.map((f) => ({
          key: f.key,
          value: f.value,
          evidenceClass: f.evidenceClass,
          targetGap: f.targetGap,
        })),
        intent: semantic.intent,
        quality: review.semanticInterpretationRef?.quality,
      },
      expectedState: { preserveFacts: turn.expect.preserveFacts ?? {} },
      actualState: snapshotFactsFromGapState(gapState),
      expectedGap: turn.expect.gapCompleteness ?? {},
      actualGap: snapshotGapCompleteness(gapState),
      expectedNextQuestion: turn.expect.nextTargetGap
        ? { targetGapId: turn.expect.nextTargetGap, action: turn.expect.nextAction }
        : turn.expect.nextMustNotTargetGap
          ? { mustNotTargetGap: turn.expect.nextMustNotTargetGap }
          : null,
      actualNextQuestion: decision
        ? {
            targetGapId: decision.targetGapId,
            action: decision.action,
            questionText: decision.questionText,
          }
        : null,
      expectedReason: turn.expect.actionRationaleIncludes?.join('|') ?? null,
      actualReason: decision?.actionRationale ?? null,
      pass: evalResult.pass,
      failureTypes: evalResult.failureTypes,
      gates: scenario.gates,
    });
  });

  return {
    scenarioId: scenario.id,
    label: scenario.label,
    gates: scenario.gates,
    pass: turnRecords.every((t) => t.pass),
    turns: turnRecords,
  };
}

export function runAllGoldenScenarios(): AccuracyEvidencePackage {
  const scenarios = GOLDEN_SCENARIOS.map(runGoldenScenario);
  const passCount = scenarios.filter((s) => s.pass).length;
  return {
    generatedAt: new Date().toISOString(),
    pipeline: 'v3-review',
    scenarioCount: scenarios.length,
    passCount,
    failCount: scenarios.length - passCount,
    scenarios,
  };
}
