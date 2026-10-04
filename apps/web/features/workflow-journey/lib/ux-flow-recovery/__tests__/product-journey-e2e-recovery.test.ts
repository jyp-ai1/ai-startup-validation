import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyWorkspaceSnapshotToCache,
  isUnderstandingPhaseRegression,
} from '@/features/workspace/lib/apply-workspace-snapshot';
import type { WorkspacePersistedSnapshot } from '@/lib/project/workspace-persisted-state';

import { extractCorrectedFactValue } from '../../business-understanding/ai-pm-correction-semantics';
import { buildAnswerReview } from '../../business-understanding/build-answer-review';
import { buildBusinessUnderstanding } from '../../business-understanding/build-business-understanding';
import { buildConversationMemoryFromSources } from '../../business-understanding/build-conversation-memory';
import {
  loadUnderstandingPhase,
  saveUnderstandingPhase,
} from '../../business-understanding/business-understanding-store';
import { emptyConversationMemory, upsertConfirmedFact } from '../../business-understanding/conversation-memory';
import {
  STAGE_A_REQUIRED_GAPS,
  STAGE_B_REQUIRED_GAPS,
  evaluateStageReadiness,
  isStageAReady,
  isStageBReady,
} from '../../business-understanding/evaluate-stage-readiness';
import { interpretAnswerSemantics } from '../../business-understanding/interpret-answer-semantics';
import { buildLivingUnderstandingState } from '../../business-understanding/living-understanding-state';
import {
  customerPersonaReplacesPrior,
  extractPreservedCustomerPersona,
} from '../../business-understanding/understanding-contract';
import { createInitialAiPmLoopState } from '../../business-understanding/workspace-ai-pm-loop-store';
import type { AiPmLoopTurn } from '../../business-understanding/workspace-ai-pm-loop-types';
import { createEmptyGapState } from '../../business-understanding/update-gap-state-from-review';
import { setV3ReviewPipelineForTest } from '../../business-understanding/v3-review-pipeline';
import {
  buildUxBusinessSummary,
  composeUnderstoodNarrative,
} from '../build-ux-business-summary';
import { buildUxJourneyStages } from '../build-ux-journey-stages';
import { buildUxViabilityResult } from '../build-ux-viability-result';
import { resolveBusinessSourceText, resolveProjectDisplayTitle } from '../resolve-project-display-title';

const TITLE = '양조장 체험 관광 서비스';
const LONG_SOURCE =
  '다양한 관광객이 늘며 개인별 다양한 경험을 중요하게 생각한다. 전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광을 연결하고, 양조장의 온라인 마케팅을 지원하는 사업이다.';
const SEED = `프로젝트 이름: ${TITLE}\n\n사업 설명:\n${LONG_SOURCE}`;
const PROJECT_ID = 'journey-e2e-recovery';

function stubSessionStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
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
  });
  vi.stubGlobal('window', { sessionStorage: globalThis.sessionStorage });
}

function turn(answer: string, extras: Partial<AiPmLoopTurn> = {}): AiPmLoopTurn {
  return {
    issueId: 'customer_definition',
    answer,
    appliedAt: '2026-10-04T12:00:00.000Z',
    semanticFactKey: 'customer',
    semanticFactKeys: ['customer'],
    targetGap: 'customerPersona',
    intent: 'correction',
    ...extras,
  };
}

function closeGaps(ids: readonly string[]) {
  const state = createEmptyGapState();
  for (const gapId of ids) {
    state.gaps[gapId] = {
      gapId,
      completeness: 'CLOSED',
      sourceTurnId: null,
      sourceReviewId: null,
      evidence: [],
      confidence: 'high',
      lastUpdated: '2026-10-04T12:00:00.000Z',
      rationale: 'journey-test',
    };
  }
  return state;
}

function expectBreweryMeaning(text: string) {
  expect(text).toMatch(/내국인/);
  expect(text).toMatch(/외국인/);
  expect(text).toMatch(/전통주|양조장/);
  expect(text).not.toMatch(/방한 외국인/);
}

describe('P0 Product Journey E2E Recovery — J1~J6 engine', () => {
  beforeEach(() => {
    setV3ReviewPipelineForTest(true);
    stubSessionStorage();
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    vi.unstubAllGlobals();
  });

  it('J1 keeps Title ≠ Source ≠ AI interpretation', () => {
    expect(resolveProjectDisplayTitle({ projectTitle: TITLE, seedDocument: SEED })).toBe(TITLE);
    expect(resolveProjectDisplayTitle({ projectTitle: TITLE, seedDocument: SEED })).not.toContain(
      '다양한 관광객이 늘며',
    );
    const source = resolveBusinessSourceText({ seedDocument: SEED });
    expect(source).toContain('온라인 마케팅');
    expect(source).not.toBe(TITLE);

    const living = buildLivingUnderstandingState({
      documentText: LONG_SOURCE,
      understanding: buildBusinessUnderstanding(LONG_SOURCE),
    });
    const view = buildUxBusinessSummary({
      projectTitle: TITLE,
      documentText: LONG_SOURCE,
      living,
    });
    expect(view.projectTitle).toBe(TITLE);
    expect(view.fullDescription).toBe(LONG_SOURCE);
    expect(view.understoodNarrative).not.toBe(LONG_SOURCE);
    expect(view.understoodNarrative).toMatch(/이해했습니다/);
    expectBreweryMeaning(`${view.understoodNarrative}\n${view.slots.find((s) => s.id === 'user')?.value ?? ''}`);
  });

  it('J2 long-form correction is reinterpreted and stored in full', () => {
    const correction = '아니요. 핵심 고객은 관광객이 아니라 중소 제조 CEO입니다.';
    expect(extractCorrectedFactValue('customer', correction)).toBe('중소 제조 CEO');

    const { review } = buildAnswerReview({
      turnId: 'j2',
      userAnswer: correction,
      askedGapId: 'customerPersona',
      askedIssueId: 'customer_definition',
      existingFactsByKey: { customer: '관광객' },
    });
    expect(review.extractedFacts.find((f) => f.key === 'customer')?.value).toBe('중소 제조 CEO');

    const living = buildLivingUnderstandingState({
      documentText: LONG_SOURCE,
      understanding: buildBusinessUnderstanding(LONG_SOURCE),
      turns: [turn(correction)],
      memory: buildConversationMemoryFromSources({
        projectId: PROJECT_ID,
        documentText: LONG_SOURCE,
        turns: [turn(correction)],
      }),
    });
    expect(living.claims.find((c) => c.fieldKey === 'customerPersona')?.value).toBe('중소 제조 CEO');
    expect(composeUnderstoodNarrative(living, LONG_SOURCE)).toContain('중소 제조 CEO');
  });

  it('J3 repeated correction keeps C as the final value', () => {
    const sequence = ['A 관광객', 'B 내국인 애호가', 'C 전통주 양조장 체험객'];
    let memory = emptyConversationMemory(PROJECT_ID);
    for (const value of sequence) {
      memory = upsertConfirmedFact(memory, 'customer', value, 'user_turn');
    }
    const current = memory.facts.find((f) => f.key === 'customer' && (f.lifecycle ?? 'current') === 'current');
    expect(current?.value).toBe('C 전통주 양조장 체험객');
    expect(memory.facts.filter((f) => f.key === 'customer' && f.lifecycle === 'current')).toHaveLength(1);
  });

  it('J4 conflict keeps the confirmed replacement and does not revive A', () => {
    const prior = '방한 외국인';
    const next = '전통주(양조장)을 좋아하는 내국인/외국인';
    expect(customerPersonaReplacesPrior(prior, next)).toBe(true);

    const semantic = interpretAnswerSemantics({
      answer: next,
      askedIssueId: 'customer_definition',
      askedTargetGap: 'customerPersona',
      existingFactsByKey: { customer: prior },
    });
    expect(semantic.intent).toBe('correction');
    expect(semantic.value).toBe(next);
    expect(semantic.value).not.toMatch(/방한/);

    const living = buildLivingUnderstandingState({
      documentText: LONG_SOURCE,
      understanding: buildBusinessUnderstanding(LONG_SOURCE),
      turns: [turn(next)],
      memory: buildConversationMemoryFromSources({
        projectId: PROJECT_ID,
        documentText: LONG_SOURCE,
        turns: [turn(next)],
      }),
    });
    expect(living.spine.customer).toBe(next);
    expect(living.spine.customer).not.toMatch(/방한 외국인/);
  });

  it('J5 refresh/re-entry cannot regress accepted → pending', () => {
    saveUnderstandingPhase('accepted', PROJECT_ID);
    expect(isUnderstandingPhaseRegression('accepted', 'pending')).toBe(true);
    const stale: WorkspacePersistedSnapshot = {
      updatedAt: '2026-10-04T11:00:00.000Z',
      understandingPhase: 'pending',
      reviewCount: 0,
      documentText: LONG_SOURCE,
      aiPmLoop: createInitialAiPmLoopState(),
    };
    applyWorkspaceSnapshotToCache(PROJECT_ID, stale);
    expect(loadUnderstandingPhase(PROJECT_ID)).toBe('accepted');
  });

  it('J6 Stage ①→②→③→④ uses existing V3 gaps and synthesis, not new questions', () => {
    const empty = createEmptyGapState();
    expect(isStageAReady(empty)).toBe(false);
    expect(evaluateStageReadiness({ gapState: empty }).currentStageFocus).toBe('A_understanding');

    const stageA = closeGaps(STAGE_A_REQUIRED_GAPS);
    expect(isStageAReady(stageA)).toBe(true);
    expect(isStageBReady(stageA)).toBe(false);
    expect(buildUxJourneyStages({ gapState: stageA }).map((s) => `${s.id}:${s.lifecycle}`)).toEqual([
      'understand:completed',
      'market:in_progress',
      'viability:waiting',
      'result:waiting',
    ]);

    const stageB = closeGaps([...STAGE_A_REQUIRED_GAPS, ...STAGE_B_REQUIRED_GAPS]);
    expect(isStageBReady(stageB)).toBe(true);
    const stages = buildUxJourneyStages({ gapState: stageB });
    expect(stages.find((s) => s.id === 'viability')?.lifecycle).toBe('in_progress');
    expect(JSON.stringify(stages)).not.toMatch(/stageCReady/);

    const resultOpen = buildUxJourneyStages({ gapState: stageB, resultOpen: true });
    expect(resultOpen.find((s) => s.id === 'result')?.lifecycle).toBe('in_progress');

    const result = buildUxViabilityResult({
      reviewType: 'startup-idea',
      presenter: {
        judgment: '지금은 HOLD — 검증 근거가 부족합니다.',
        evidence: ['지불 의향 근거가 없습니다.'],
        reasons: ['핵심 문제는 확인됐지만 지불 근거가 없습니다.'],
        criticalGap: '양조장 온라인 마케팅의 전환을 검증해야 합니다.',
        hero: null,
        secondary: [],
        supportingScoreHint: null,
        headline: '사업성 검토 결과',
        decisions: [],
        insights: [],
        recommended: null,
      },
    });
    expect(result.judgment).toMatch(/HOLD|판단/);
    expect(result.why.length).toBeGreaterThan(4);
    expect(result.risks.length).toBeGreaterThan(0);
    expect(result.nextValidation.length).toBeGreaterThan(0);
    expect(result.nextActions.length).toBeGreaterThan(0);
    expect(JSON.stringify(result)).not.toMatch(/targetGap|coveragePercent|evaluator/);
  });

  it('long-form brewery meaning is preserved without 방한 외국인', () => {
    const preserved = extractPreservedCustomerPersona(LONG_SOURCE);
    expect(preserved).toMatch(/내국인/);
    expect(preserved).toMatch(/외국인/);
    expect(preserved).toMatch(/전통주|양조장/);

    const understanding = buildBusinessUnderstanding(LONG_SOURCE);
    expect(understanding.customerMentions.map((m) => m.label).join(' ')).not.toMatch(/방한 외국인/);

    const living = buildLivingUnderstandingState({
      documentText: LONG_SOURCE,
      understanding,
    });
    const narrative = composeUnderstoodNarrative(living, LONG_SOURCE);
    expectBreweryMeaning(`${narrative}\n${living.spine.customer}\n${preserved ?? ''}`);
    expect(LONG_SOURCE).toMatch(/체험/);
    expect(LONG_SOURCE).toMatch(/주변 관광/);
    expect(LONG_SOURCE).toMatch(/온라인 마케팅/);
    expect(narrative).not.toBe(LONG_SOURCE);
  });
});
