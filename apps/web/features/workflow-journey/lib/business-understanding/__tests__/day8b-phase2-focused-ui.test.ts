import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import {
  classifyAiPmCeoIntent,
  researchIntentStubMessage,
} from '../ai-pm-intent-policy';
import { buildAiPmFocusedSnapshot } from '../ai-pm-focused-presenter';
import {
  applyQuestionPolicy,
  BOOTSTRAP_GAP_PRIORITY,
  pickBootstrapGapWithPolicy,
  VALIDATION_TESTABILITY_BEHAVIORAL_QUESTION,
} from '../ai-pm-question-policy';
import { gapSemanticCluster } from '../ai-pm-semantic-clusters';
import { runUnderstandingGate } from '../ai-pm-understanding-gate';
import {
  buildCeoJudgmentSnapshot,
  buildCeoUnderstandingSnapshot,
} from '../ai-pm-judgment-presenter';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { upsertConfirmedFact, emptyConversationMemory } from '../conversation-memory';
import { resolveNextQuestionDecision } from '../resolve-next-question-decision';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import { setAiPmFocusedUiForTest } from '../ai-pm-focused-ui';
import { formatQuestionTrace } from '../ai-pm-question-trace';
import type { NextQuestionDecision } from '../decide-next-question-from-review';
import { evaluateStageReadiness, isStageBGap } from '../evaluate-stage-readiness';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { createEmptyGapState } from '../update-gap-state-from-review';

const DOC = `# 소상공인 배송 SaaS

서비스: 주문부터 배송까지 관리하는 B2B SaaS
대상: 반찬가게·꽃집 등 직접 배송 소상공인
문제: 주문·배송 관리가 분절되어 번거롭다`;

function testUnderstanding() {
  return buildBusinessUnderstanding(DOC);
}

function gapStateWithClosedStageA(): GapKnowledgeState {
  const state = createEmptyGapState();
  for (const gapId of ['businessOneLiner', 'customerPersona', 'problemJtbd', 'payer']) {
    state.gaps[gapId] = {
      gapId,
      completeness: 'CLOSED',
      sourceTurnId: 't1',
      sourceReviewId: 'r1',
      evidence: [],
      confidence: 'high',
      lastUpdated: '2026-09-05T00:00:00.000Z',
      rationale: 'test',
    };
  }
  state.gaps.marketChannel = {
    gapId: 'marketChannel',
    completeness: 'OPEN',
    sourceTurnId: null,
    sourceReviewId: null,
    evidence: [],
    confidence: 'low',
    lastUpdated: '2026-09-05T00:00:00.000Z',
    rationale: '',
  };
  return state;
}

function bootstrapDecision(targetGapId: string): NextQuestionDecision {
  return {
    targetGap: targetGapId,
    targetGapId,
    issueId: 'bm_design',
    questionText: 'stock question',
    whyNow: 'why',
    rationale: 'why',
    score: 50_000,
    reframed: false,
    excludedGaps: [],
    drivenByReview: true,
    sourceAnswerId: 'bootstrap',
    sourceReviewId: 'bootstrap',
    reviewAction: 'advance',
    action: 'advance',
    actionRationale: 'bootstrap',
    reason: 'bootstrap',
  };
}

describe('DAY 8-B Phase 2 — intent router', () => {
  it('routes RESEARCH intent to ai_action', () => {
    const result = classifyAiPmCeoIntent('경쟁사 찾아줘');
    expect(result.intent).toBe('RESEARCH');
    expect(result.route).toBe('ai_action');
  });

  it('treats embedded factual answer as ANSWER not RESEARCH', () => {
    const result = classifyAiPmCeoIntent('배민이요 경쟁사 찾아줘');
    expect(result.intent).toBe('ANSWER');
    expect(result.route).toBe('continue_loop');
  });

  it('provides research stub message', () => {
    expect(researchIntentStubMessage()).toMatch(/조사 요청/);
  });
});

describe('DAY 8-B Phase 2 — bootstrap policy', () => {
  it('prefers businessOneLiner over marketChannel when Stage A pre-closed', () => {
    const gapState = gapStateWithClosedStageA();
    const readiness = evaluateStageReadiness({ gapState });
    const gap = pickBootstrapGapWithPolicy(gapState, readiness);
    expect(gap).toBe('businessOneLiner');
    expect(gap).not.toBe('marketChannel');
  });

  it('blocks Stage B bootstrap before stageBAllowed', () => {
    const gapState = createEmptyGapState();
    gapState.gaps.marketChannel = {
      gapId: 'marketChannel',
      completeness: 'OPEN',
      sourceTurnId: null,
      sourceReviewId: null,
      evidence: [],
      confidence: 'low',
      lastUpdated: '2026-09-05T00:00:00.000Z',
      rationale: '',
    };
    for (const gapId of BOOTSTRAP_GAP_PRIORITY) {
      gapState.gaps[gapId] = {
        gapId,
        completeness: 'OPEN',
        sourceTurnId: null,
        sourceReviewId: null,
        evidence: [],
        confidence: 'low',
        lastUpdated: '2026-09-05T00:00:00.000Z',
        rationale: '',
      };
    }
    const readiness = evaluateStageReadiness({ gapState });
    const gap = pickBootstrapGapWithPolicy(gapState, readiness);
    expect(gap).toBe('businessOneLiner');
    expect(isStageBGap(gap)).toBe(false);
  });
});

describe('DAY 8-B Phase 2 — validationTestability suppression', () => {
  it('replaces stock abstract question with behavioral probe', () => {
    const gapState = gapStateWithClosedStageA();
    const living = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: testUnderstanding(),
    });
    const readiness = evaluateStageReadiness({ gapState });
    expect(readiness.stageBAllowed).toBe(true);
    const engineDecision: NextQuestionDecision = {
      ...bootstrapDecision('validationTestability'),
      sourceAnswerId: 'turn-1',
      sourceReviewId: 'review-1',
    };
    const decision = applyQuestionPolicy({
      decision: engineDecision,
      gapState,
      living,
      turns: [],
      stageReadiness: readiness,
      isBootstrap: false,
    });
    expect(decision.questionText).toBe(VALIDATION_TESTABILITY_BEHAVIORAL_QUESTION);
    expect(decision.questionText).not.toMatch(/왜 중요한가요/);
  });
});

describe('DAY 8-B Phase 2 — semantic clusters', () => {
  it('maps gaps to clusters', () => {
    expect(gapSemanticCluster('customerPersona')).toBe('C1');
    expect(gapSemanticCluster('alternativesCompetitors')).toBe('C2');
    expect(gapSemanticCluster('differentiationVsAlternatives')).toBe('C3');
  });
});

describe('DAY 8-B Phase 2 — understanding gate', () => {
  it('produces non-empty judgment update after merge', () => {
    const before = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: testUnderstanding(),
    });
    const after = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: testUnderstanding(),
      turns: [
        {
          issueId: 'customer_definition',
          answer: '반찬가게·꽃집 등 직접 배송 소상공인',
          appliedAt: '1',
        },
      ],
    });
    const gate = runUnderstandingGate({ before, after });
    expect(gate.judgmentUpdate.trim().length).toBeGreaterThan(0);
    expect(gate.delta.summary.trim().length).toBeGreaterThan(0);
  });
});

describe('DAY 8-B Phase 2 — judgment vs understanding separation', () => {
  it('judgment is distinct from understanding and uses CEO language', () => {
    const living = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: testUnderstanding(),
      memory: upsertConfirmedFact(
        emptyConversationMemory('test'),
        'customer',
        '반찬가게·꽃집 등 직접 배송 소상공인',
        'user_turn',
      ),
    });
    const understanding = buildCeoUnderstandingSnapshot(living);
    const judgment = buildCeoJudgmentSnapshot(living);

    expect(understanding).toMatch(/소상공인|반찬|꽃|고객/);
    expect(judgment).not.toBe(understanding);
    expect(judgment).not.toMatch(/customerPersona|businessOneLiner|targetGap/i);
    expect(judgment).toMatch(/구체화|불명확|확인|쌓|판단|가능/);
  });
});

describe('DAY 8-B Phase 2 — A-U-J-Q Continuity (acceptance)', () => {
  beforeEach(() => {
    setV3ReviewPipelineForTest(true);
    setAiPmFocusedUiForTest(true);
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmFocusedUiForTest(null);
  });

  it('Answer A → Understanding → Judgment → Question B continuity', () => {
    const understandingDoc = testUnderstanding();
    const answerA =
      '반찬가게나 꽃집처럼 직접 배송하는 소상공인이 주문부터 배송까지 한 번에 관리할 수 있게 하는 서비스입니다.';

    const livingBefore = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: understandingDoc,
    });

    const turns = [
      {
        issueId: 'customer_definition' as const,
        answer: answerA,
        appliedAt: '2026-09-05T01:00:00.000Z',
        targetGap: 'customerPersona',
      },
    ];
    const memory = buildConversationMemoryFromSources({
      projectId: 'aujq-test',
      documentText: DOC,
      turns,
      entities: null,
      previous: emptyConversationMemory('aujq-test'),
    });

    const livingAfter = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: understandingDoc,
      turns,
      memory,
    });

    const decision = resolveNextQuestionDecision({
      living: livingAfter,
      turns,
      memory,
      gapState: createEmptyGapState(),
    });

    const snapshot = buildAiPmFocusedSnapshot({
      living: livingAfter,
      livingBefore,
      lastTurn: turns[0]!,
      lastDecision: decision && 'drivenByReview' in decision ? decision : null,
      displayQuestionText: decision?.questionText ?? '',
      whyNow: decision?.whyNow,
    });

    expect(snapshot.businessUnderstanding).toMatch(/소상공인|반찬|꽃|고객|배송/);
    expect(snapshot.currentJudgment).not.toMatch(/customerPersona|businessOneLiner/i);
    expect(snapshot.currentJudgment.length).toBeGreaterThan(8);
    expect(snapshot.currentJudgment).not.toBe(snapshot.businessUnderstanding);
    expect(snapshot.questionText.trim().length).toBeGreaterThan(10);

    const trace = formatQuestionTrace({
      ceoInput: answerA,
      intent: 'ANSWER',
      understanding: snapshot.businessUnderstanding,
      judgment: snapshot.currentJudgment,
      policy: 'bootstrap+continuity',
      decision: decision && 'drivenByReview' in decision ? decision : null,
      question: snapshot.questionText,
    });
    expect(trace).toMatch(/CEO:/);
    expect(trace).toMatch(/Q=/);
  });
});

describe('DAY 8-B Phase 2 — CEO-facing leak scan (programmatic)', () => {
  const LEAK_PATTERNS = [
    'businessOneLiner',
    'customerPersona',
    'problemJtbd',
    'marketChannel',
    'targetGap',
    'gapState',
    'Prior turn',
  ];

  it('focused snapshot contains zero internal keys', () => {
    const living = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: testUnderstanding(),
      memory: upsertConfirmedFact(
        emptyConversationMemory('leak-test'),
        'customer',
        '반찬가게·꽃집 등 직접 배송 소상공인',
        'user_turn',
      ),
    });
    const snapshot = buildAiPmFocusedSnapshot({
      living,
      lastTurn: null,
      lastDecision: null,
      displayQuestionText: '지금은 주문을 어디에서 받고 있나요?',
      whyNow: '주문·배송 관리 방식 확인이 필요합니다.',
    });
    const joined = Object.values(snapshot).join('\n');
    for (const leak of LEAK_PATTERNS) {
      expect(joined).not.toContain(leak);
    }
  });
});

describe('DAY 8-B Phase 2 — focused presenter', () => {
  it('builds latest snapshot without accumulation', () => {
    const living = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: testUnderstanding(),
    });
    const snapshot = buildAiPmFocusedSnapshot({
      living,
      lastTurn: null,
      lastDecision: null,
      displayQuestionText: '지금은 주문을 어디에서 받고 있나요?',
      whyNow: '주문·배송 관리 방식 확인이 필요합니다.',
    });
    expect(snapshot.businessUnderstanding).toMatch(/주문|배송|사업/);
    expect(snapshot.currentJudgment.length).toBeGreaterThan(0);
    expect(snapshot.confirmPrompt).toMatch(/주문|확인/);
    expect(snapshot.questionText).toMatch(/주문/);
  });
});
