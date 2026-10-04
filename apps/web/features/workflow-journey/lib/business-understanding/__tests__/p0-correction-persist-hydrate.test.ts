import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyWorkspaceSnapshotToCache,
  isUnderstandingPhaseRegression,
  shouldApplyDbSnapshot,
} from '@/features/workspace/lib/apply-workspace-snapshot';
import { bootstrapWorkspaceFromDb } from '@/features/workspace/lib/bootstrap-workspace-from-db';
import type { WorkspacePersistedSnapshot } from '@/lib/project/workspace-persisted-state';

import { extractCorrectedFactValue, parseNotXButYCorrection } from '../ai-pm-correction-semantics';
import { applyNoAskPolicy } from '../ai-pm-no-ask-policy';
import { buildAnswerReview } from '../build-answer-review';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { composeUnderstoodNarrative } from '../../ux-flow-recovery/build-ux-business-summary';
import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import {
  customerPersonaReplacesPrior,
  extractDeclaredCustomerSegment,
} from '../understanding-contract';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import {
  loadUnderstandingPhase,
  saveUnderstandingPhase,
} from '../business-understanding-store';
import { createInitialAiPmLoopState } from '../workspace-ai-pm-loop-store';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';
import { setAiPmNoAskPolicyV1ForTest } from '../ai-pm-no-ask-policy-v1';
import { createEmptyGapState } from '../update-gap-state-from-review';
import { evaluateStageReadiness } from '../evaluate-stage-readiness';
import { resolveGapQuestionBinding } from '../gap-question-map';

const BREWERY_SOURCE = `다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광 경험을 제공하려 한다.`;
const PRIOR_INFERRED = '방한 외국인';
const USER_CORRECTION = '전통주(양조장)을 좋아하는 내국인/외국인';
const CEO_TRUNCATION = '아니요. 핵심 고객은 관광객이 아니라 중소 제조 CEO입니다.';

const PROJECT_ID = 'p0-correction-prod';

function stubSessionStorage() {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  };
  vi.stubGlobal('sessionStorage', sessionStorage);
  vi.stubGlobal('window', { sessionStorage });
  return store;
}

function correctionTurn(answer: string): AiPmLoopTurn {
  return {
    issueId: 'customer_definition',
    answer,
    appliedAt: '2026-10-04T10:30:00.000Z',
    semanticFactKey: 'customer',
    semanticFactKeys: ['customer'],
    targetGap: 'customerPersona',
    intent: 'correction',
  };
}

describe('P0 Production — customer correction persist/hydrate', () => {
  beforeEach(() => {
    setV3ReviewPipelineForTest(true);
    setAiPmNoAskPolicyV1ForTest(true);
    stubSessionStorage();
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmNoAskPolicyV1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('does not infer 방한 외국인 from 내국인+외국인 brewery source', () => {
    const understanding = buildBusinessUnderstanding(BREWERY_SOURCE);
    expect(understanding.customerMentions.map((m) => m.label).join(' ')).not.toMatch(/방한 외국인/);
  });

  it('keeps the full CEO correction — 중소 제조 CEO is not truncated to 중소', () => {
    expect(parseNotXButYCorrection(CEO_TRUNCATION)).toEqual({
      rejected: '관광객',
      accepted: '중소 제조 CEO',
    });
    expect(extractCorrectedFactValue('customer', CEO_TRUNCATION)).toBe('중소 제조 CEO');
    expect(extractDeclaredCustomerSegment('고객은 중소 제조 CEO입니다.')).toBe('중소 제조 CEO');
  });

  it('traces input → interpret → review → memory → living → narrative → hydrate', () => {
    const evidence: Record<string, string | boolean> = {
      userInput: USER_CORRECTION,
      priorInferred: PRIOR_INFERRED,
    };

    expect(customerPersonaReplacesPrior(PRIOR_INFERRED, USER_CORRECTION)).toBe(true);

    const semantic = interpretAnswerSemantics({
      answer: USER_CORRECTION,
      askedIssueId: 'customer_definition',
      askedTargetGap: 'customerPersona',
      existingFactsByKey: { customer: PRIOR_INFERRED },
    });
    evidence.interpretValue = semantic.value;
    evidence.interpretIntent = semantic.intent;
    expect(semantic.intent).toBe('correction');
    expect(semantic.factKey).toBe('customer');
    expect(semantic.mergeable).toBe(true);
    expect(semantic.value).toBe(USER_CORRECTION);
    expect(semantic.value).not.toMatch(/방한/);

    const { review } = buildAnswerReview({
      turnId: 't-corr',
      userAnswer: USER_CORRECTION,
      askedGapId: 'customerPersona',
      askedIssueId: 'customer_definition',
      existingFactsByKey: { customer: PRIOR_INFERRED },
    });
    const extracted = review.extractedFacts.find((f) => f.key === 'customer');
    evidence.reviewValue = extracted?.value ?? '';
    expect(extracted?.value).toBe(USER_CORRECTION);
    expect(extracted?.value).not.toBe(PRIOR_INFERRED);

    const turns = [correctionTurn(USER_CORRECTION)];
    const memory = buildConversationMemoryFromSources({
      projectId: PROJECT_ID,
      documentText: BREWERY_SOURCE,
      turns,
    });
    const customerFact = memory.facts.find(
      (f) => f.key === 'customer' && (f.lifecycle ?? 'current') === 'current',
    );
    evidence.memoryValue = customerFact?.value ?? '';
    expect(customerFact?.value).toBe(USER_CORRECTION);
    expect(customerFact?.value).not.toMatch(/방한/);

    const living = buildLivingUnderstandingState({
      documentText: BREWERY_SOURCE,
      understanding: buildBusinessUnderstanding(BREWERY_SOURCE),
      turns,
      memory,
    });
    const persona = living.claims.find((c) => c.fieldKey === 'customerPersona');
    evidence.livingValue = persona?.value ?? '';
    evidence.spineValue = living.spine.customer;
    expect(persona?.value).toBe(USER_CORRECTION);
    expect(living.spine.customer).toBe(USER_CORRECTION);

    const narrative = composeUnderstoodNarrative(living, BREWERY_SOURCE);
    evidence.narrative = narrative;
    expect(narrative).toContain(USER_CORRECTION);
    expect(narrative).not.toMatch(/방한 외국인/);

    saveUnderstandingPhase('accepted', PROJECT_ID);
    const staleDb: WorkspacePersistedSnapshot = {
      updatedAt: '2026-10-04T10:00:00.000Z',
      understandingPhase: 'pending',
      reviewCount: 0,
      documentText: BREWERY_SOURCE,
      aiPmLoop: createInitialAiPmLoopState(),
    };
    expect(isUnderstandingPhaseRegression('accepted', 'pending')).toBe(true);
    expect(shouldApplyDbSnapshot(PROJECT_ID, staleDb)).toBe(false);
    applyWorkspaceSnapshotToCache(PROJECT_ID, staleDb);
    expect(loadUnderstandingPhase(PROJECT_ID)).toBe('accepted');
    const boot = bootstrapWorkspaceFromDb(PROJECT_ID, staleDb);
    expect(boot.understandingPhase).toBe('accepted');
    evidence.hydratePhase = boot.understandingPhase;
    evidence.survived = String(!String(evidence.livingValue).includes('방한'));

    expect(evidence.userInput).toBe(evidence.livingValue);
    expect(evidence.memoryValue).toBe(evidence.userInput);
    expect(evidence.narrative).toContain(evidence.userInput);
  });

  it('does not remount CONFIRM after 맞습니다 persisted the same known value', () => {
    const turns = [
      {
        issueId: 'customer_definition' as const,
        answer: USER_CORRECTION,
        appliedAt: '2026-10-04T10:31:00.000Z',
        semanticFactKey: 'customer' as const,
        targetGap: 'customerPersona',
        intent: 'correction' as const,
      },
      {
        issueId: 'customer_definition' as const,
        answer: USER_CORRECTION,
        appliedAt: '2026-10-04T10:31:30.000Z',
        semanticFactKey: 'customer' as const,
        targetGap: 'customerPersona',
        intent: 'business_fact' as const,
      },
    ];
    const memory = buildConversationMemoryFromSources({
      projectId: PROJECT_ID,
      documentText: BREWERY_SOURCE,
      turns,
    });
    const living = buildLivingUnderstandingState({
      documentText: BREWERY_SOURCE,
      understanding: buildBusinessUnderstanding(BREWERY_SOURCE),
      turns,
      memory,
    });
    const applied = applyNoAskPolicy({
      decision: {
        targetGap: 'customerPersona',
        targetGapId: 'customerPersona',
        issueId: 'customer_definition',
        questionText: resolveGapQuestionBinding('customerPersona').questionText,
        whyNow: 'test',
        rationale: 'test',
        score: 1000,
        reframed: false,
        excludedGaps: [],
        drivenByReview: true,
        sourceAnswerId: 't1',
        sourceReviewId: 'r1',
        reviewAction: 'advance',
        action: 'advance',
        actionRationale: 'test',
        reason: 'test',
      },
      living,
      gapState: createEmptyGapState(),
      turns,
      memory,
      stageReadiness: evaluateStageReadiness({ gapState: createEmptyGapState(), turns }),
    });
    expect(applied.questionType === 'confirm').toBe(false);
    expect(applied.questionText ?? '').not.toMatch(/방한 외국인/);
  });
});
