/**
 * ALABOM Core v3 — Living Conversation Engine unit tests.
 * Covers KI-CQ-1 kills: wrong-slot, why-not-fact, nonsense, conflict, supersede, mid-judgment.
 */
import { describe, expect, it } from 'vitest';

import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import {
  buildConversationMemoryFromSources,
} from '../build-conversation-memory';
import {
  emptyConversationMemory,
  getConflictFact,
  getFact,
  parkConflictFact,
  upsertConfirmedFact,
  clearFactsByKeys,
} from '../conversation-memory';
import { evaluateAnswerQuality } from '../understanding-contract';
import { invalidateDownstreamTurns } from '../living-understanding-state';
import { AI_PM_LOOP_ISSUE_ORDER } from '../workspace-ai-pm-loop-types';
import { evaluateStageTransition } from '../stage-transition';
import { createInitialAiPmLoopState } from '../workspace-ai-pm-loop-store';

describe('Core v3 semantic interpretation', () => {
  it('routes differentiation away from CUSTOMER (wrong-slot kill)', () => {
    const result = interpretAnswerSemantics({
      answer: '차별점은 인플루언서 핫플이 아니라 현지인이 다시 찾는 맛집 큐레이션입니다',
      askedIssueId: 'customer_definition',
    });
    expect(result.mergeable).toBe(true);
    expect(result.factKey).toBe('competitor');
    expect(result.resolvedIssueId).toBe('competitor_analysis');
    expect(result.factKey).not.toBe('customer');
  });

  it('routes payer answer to buyer, not PROBLEM', () => {
    const result = interpretAnswerSemantics({
      answer: '관광객이 앱에서 직접 예약·결제합니다',
      askedIssueId: 'problem_definition',
    });
    expect(result.factKey).toBe('buyer');
    expect(result.factKey).not.toBe('problem');
  });

  it('why/meta never mergeable as business Fact', () => {
    const result = interpretAnswerSemantics({
      answer: '왜 그게 중요하죠?',
      askedIssueId: 'customer_definition',
    });
    expect(result.intent).toBe('why_meta');
    expect(result.mergeable).toBe(false);
    expect(result.displayOnly).toBe(true);
    expect(result.factKey).toBeNull();
  });

  it('mid-judgment never auto-saved as Confirmed Fact', () => {
    const result = interpretAnswerSemantics({
      answer: '지금까지 이해한 사업 정리해줘',
      askedIssueId: 'market_validation',
    });
    expect(result.intent).toBe('mid_judgment');
    expect(result.mergeable).toBe(false);
    expect(result.displayOnly).toBe(true);
  });

  it('nonsense hangul jamo mash is IRRELEVANT', () => {
    const result = interpretAnswerSemantics({
      answer: 'ㅁㄴㅇㄻㄴㅇㄻㅇ',
      askedIssueId: 'customer_definition',
    });
    expect(result.intent).toBe('nonsense');
    expect(result.mergeable).toBe(false);
    expect(evaluateAnswerQuality('ㅁㄴㅇㄻㄴㅇㄻㅇ').mergeable).toBe(false);
  });

  it('flags CONTRADICTORY against existing fact for same semantic key', () => {
    const result = interpretAnswerSemantics({
      answer: '대학생 개인 여행자가 지불합니다',
      askedIssueId: 'customer_definition',
      existingFactsByKey: { buyer: '병원 원장이 결제합니다' },
    });
    expect(result.quality).toBe('CONTRADICTORY');
    expect(result.mergeable).toBe(false);
  });
});

describe('Core v3 memory build — semantic not slot dump', () => {
  it('does not store why/mid/nonsense turns as Facts', () => {
    const memory = buildConversationMemoryFromSources({
      projectId: 'v3',
      documentText: '# 관광 맛집\n고객 미정',
      turns: [
        {
          issueId: 'customer_definition',
          answer: '왜 그게 중요하죠?',
          appliedAt: '1',
          intent: 'why_meta',
        },
        {
          issueId: 'customer_definition',
          answer: '지금까지 이해한 사업 정리해줘',
          appliedAt: '2',
          intent: 'mid_judgment',
        },
        {
          issueId: 'customer_definition',
          answer: 'ㅁㄴㅇㄻㄴㅇㄻㅇ',
          appliedAt: '3',
          intent: 'nonsense',
        },
        {
          issueId: 'customer_definition',
          answer: '방한 외국인 관광객',
          appliedAt: '4',
          semanticFactKey: 'customer',
          intent: 'business_fact',
        },
      ],
    });
    expect(getFact(memory, 'customer')?.value).toContain('외국인');
    expect(memory.facts.filter((f) => (f.lifecycle ?? 'current') === 'current')).toHaveLength(1);
  });

  it('stores differentiation under competitor even if asked as customer', () => {
    const memory = buildConversationMemoryFromSources({
      projectId: 'v3',
      documentText: '# 관광 맛집',
      turns: [
        {
          issueId: 'customer_definition',
          answer: '차별점은 인플루언서 핫플이 아니라 현지 재방문 큐레이션',
          appliedAt: '1',
          // simulate legacy turn without semanticFactKey — rebuild interprets
        },
      ],
    });
    expect(getFact(memory, 'customer')).toBeNull();
    expect(getFact(memory, 'competitor')?.value).toMatch(/차별|큐레이션/);
  });
});

describe('Core v3 conflict + supersede', () => {
  it('parks conflict without dual silent current pick', () => {
    let memory = emptyConversationMemory('v3');
    memory = upsertConfirmedFact(memory, 'buyer', '관광객 직접 결제', 'user_turn');
    memory = parkConflictFact(memory, 'buyer', '관광객 직접 결제', '사장님이 대납');
    expect(getFact(memory, 'buyer')?.value).toContain('관광객');
    expect(getConflictFact(memory, 'buyer')?.value).toContain('대납');
  });

  it('supersede clears current and keeps audit trail', () => {
    let memory = emptyConversationMemory('v3');
    memory = upsertConfirmedFact(memory, 'customer', 'A고객', 'user_turn');
    memory = upsertConfirmedFact(memory, 'customer', 'B고객', 'user_turn');
    expect(getFact(memory, 'customer')?.value).toBe('B고객');
    expect(memory.facts.filter((f) => f.key === 'customer' && f.lifecycle === 'superseded')).toHaveLength(
      1,
    );
    memory = clearFactsByKeys(memory, ['customer']);
    expect(getFact(memory, 'customer')).toBeNull();
  });

  it('invalidateDownstreamTurns supports edit-prior recompute', () => {
    const turns = [
      { issueId: 'customer_definition' as const, answer: 'C', appliedAt: '1' },
      { issueId: 'problem_definition' as const, answer: 'P', appliedAt: '2' },
      { issueId: 'market_validation' as const, answer: 'M', appliedAt: '3' },
    ];
    const trimmed = invalidateDownstreamTurns(turns, 'customer_definition', AI_PM_LOOP_ISSUE_ORDER);
    expect(trimmed.map((t) => t.issueId)).toEqual(['customer_definition']);
  });
});

describe('Core v3 sufficiency gate', () => {
  it('blocks GO when critical spine gaps remain (not score alone)', () => {
    const loop = createInitialAiPmLoopState();
    loop.turns = [
      {
        issueId: 'customer_definition',
        answer: '관광객',
        appliedAt: '1',
        semanticFactKey: 'customer',
        intent: 'business_fact',
      },
    ];
    let memory = emptyConversationMemory('v3');
    memory = upsertConfirmedFact(memory, 'customer', '관광객', 'user_turn');
    // missing problem + payer
    const evalResult = evaluateStageTransition({
      loop,
      memory,
      criticalGapCount: 2,
      understandingCoveragePercent: 80,
    });
    expect(evalResult.canTransitionToValidation).toBe(false);
    expect(evalResult.blocker).toBe('critical_unknown');
  });
});
