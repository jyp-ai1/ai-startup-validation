import { describe, expect, it } from 'vitest';

import { emptyConversationMemory, upsertConfirmedFact } from '../conversation-memory';
import { createInitialAiPmLoopState } from '../workspace-ai-pm-loop-store';
import { evaluateStageTransition } from '../stage-transition';
import {
  applyUserCorrection,
  buildWhyFollowUp,
  resolveContradictionChoice,
} from '../correction-and-why';
import { assertSingleHeroCta, presentAnalysisScreen } from '../present-analysis-screen';
import { runAnalysis } from '@/lib/analysis-engine';
import { mapEvidenceStatusToAnalysisInput } from '../map-evidence-to-analysis-input';
import { deriveEvidenceStatusFromMemory } from '../evidence-status';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';

describe('stage-transition (W9)', () => {
  it('does not open Validation on turn count alone', () => {
    const loop = {
      ...createInitialAiPmLoopState(),
      turns: [
        { issueId: 'customer_definition' as const, answer: 'a', appliedAt: 't' },
        { issueId: 'problem_definition' as const, answer: 'b', appliedAt: 't' },
        { issueId: 'bm_design' as const, answer: 'c', appliedAt: 't' },
      ],
    };
    const memory = emptyConversationMemory('st');
    const result = evaluateStageTransition({ loop, memory });
    expect(result.canTransitionToValidation).toBe(false);
    expect(result.blocker).toBe('critical_unknown');
    expect(result.turnCount).toBe(3);
  });

  it('opens Validation when required facts are confirmed', () => {
    let memory = emptyConversationMemory('st2');
    memory = upsertConfirmedFact(memory, 'customer', '병원 원장', 'user_turn');
    memory = upsertConfirmedFact(memory, 'buyer', '병원 원장', 'user_turn');
    memory = upsertConfirmedFact(memory, 'problem', '재방문 관리 부담', 'user_turn');
    memory = upsertConfirmedFact(memory, 'business', '병원 AI', 'document');
    const loop = createInitialAiPmLoopState();
    const result = evaluateStageTransition({ loop, memory });
    expect(result.canTransitionToValidation).toBe(true);
    expect(result.validationHandoff.length).toBeGreaterThan(10);
  });

  it('blocks on pending contradiction', () => {
    let memory = emptyConversationMemory('st3');
    memory = upsertConfirmedFact(memory, 'customer', '병원 원장', 'user_turn');
    memory = upsertConfirmedFact(memory, 'buyer', '병원 원장', 'user_turn');
    memory = upsertConfirmedFact(memory, 'problem', '재방문 관리 부담', 'user_turn');
    memory = upsertConfirmedFact(memory, 'business', '병원 AI', 'document');
    const result = evaluateStageTransition({
      loop: createInitialAiPmLoopState(),
      memory,
      pendingContradiction: true,
    });
    expect(result.canTransitionToValidation).toBe(false);
    expect(result.blocker).toBe('pending_contradiction');
  });
});

describe('correction-and-why (W7–W8)', () => {
  it('applies USER_CORRECTED overwrite', () => {
    let memory = emptyConversationMemory('c1');
    memory = upsertConfirmedFact(memory, 'customer', '학생', 'user_turn');
    const applied = applyUserCorrection({
      projectId: 'c1',
      fieldKey: 'customer',
      nextValue: '병원 원장',
      previous: memory,
    });
    expect(applied.provenance).toBe('USER_CORRECTED');
    expect(applied.memory.facts.find((f) => f.key === 'customer')?.value).toBe('병원 원장');
  });

  it('resolves contradiction keep vs accept', () => {
    const memory = emptyConversationMemory('c2');
    const keep = resolveContradictionChoice({
      projectId: 'c2',
      fieldKey: 'customer',
      choice: 'keep_prior',
      priorValue: '병원 원장',
      newValue: '대학생',
      previous: memory,
    });
    expect(keep.provenance).toBe('USER_CONFIRMED');
    expect(keep.nextValue).toBe('병원 원장');

    const accept = resolveContradictionChoice({
      projectId: 'c2',
      fieldKey: 'customer',
      choice: 'accept_new',
      priorValue: '병원 원장',
      newValue: '대학생',
      previous: memory,
    });
    expect(accept.provenance).toBe('USER_CORRECTED');
    expect(accept.nextValue).toBe('대학생');
  });

  it('builds Why follow-up that returns to loop', () => {
    const why = buildWhyFollowUp({
      judgment: '지금은 HOLD',
      reasons: ['고객 미확인', '문제 모호'],
      criticalGap: '고객 정의',
    });
    expect(why.evidence).toHaveLength(2);
    expect(why.returnToLoopCta).toMatch(/루프/);
  });
});

describe('evidence-first review presenter (W10)', () => {
  it('exposes judgment, ≤3 reasons, single hero, supporting score', () => {
    const turns = [
      {
        issueId: 'customer_definition' as const,
        answer: '병원 원장',
        appliedAt: new Date().toISOString(),
      },
      {
        issueId: 'problem_definition' as const,
        answer: '원장이 재방문 관리에 시간과 비용 부담',
        appliedAt: new Date().toISOString(),
      },
    ];
    const memory = buildConversationMemoryFromSources({
      projectId: 'w10',
      documentText: '병원 AI\n고객: 환자\n문제: 대기',
      turns,
    });
    const evidence = deriveEvidenceStatusFromMemory({ memory });
    const input = mapEvidenceStatusToAnalysisInput({ evidence });
    const result = runAnalysis(input);
    const panel = presentAnalysisScreen(result);
    expect(panel.judgment.length).toBeGreaterThan(0);
    expect(panel.reasons.length).toBeLessThanOrEqual(3);
    expect(panel.evidence).toEqual(panel.reasons);
    expect(assertSingleHeroCta(panel)).toBe(true);
    expect(panel.hero === null || panel.recommended === panel.hero).toBe(true);
  });
});
