/**
 * ALABOM Core v4 — Living Conversation Engine unit tests.
 * Hard P0: re-ask 0 · wrong-slot 0 · multi-fact · understanding update.
 */
import { describe, expect, it } from 'vitest';

import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import {
  getAnsweredTargetGaps,
  resolveMissingFieldPriorities,
  resolveNextIssueByMissingField,
} from '../resolve-missing-field-priority';
import { getFact } from '../conversation-memory';
import { createInitialAiPmLoopState } from '../workspace-ai-pm-loop-store';
import type { AiPmLoopState, AiPmLoopTurn } from '../workspace-ai-pm-loop-types';

const SEED =
  '외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다.';

function memoryFromTurns(turns: AiPmLoopTurn[]) {
  return buildConversationMemoryFromSources({
    projectId: 'v4',
    documentText: SEED,
    turns,
  });
}

describe('Core v4 multi-fact + wrong-slot', () => {
  it('extracts buyer + revenue from one utterance', () => {
    const result = interpretAnswerSemantics({
      answer: '관광객이 앱에서 직접 결제하고, 수익은 예약 수수료 12%입니다',
      askedIssueId: 'bm_design',
      askedTargetGap: 'payer',
    });
    expect(result.mergeable).toBe(true);
    const keys = result.facts.map((f) => f.key);
    expect(keys).toContain('buyer');
    expect(keys).toContain('revenue');
  });

  it('never dumps competitor answer into CUSTOMER (wrong-slot kill)', () => {
    const result = interpretAnswerSemantics({
      answer: '네이버 지도·트립어드바이저 같은 경쟁이 있고 차별은 현지 재방문 큐레이션입니다',
      askedIssueId: 'customer_definition',
      askedTargetGap: 'customerPersona',
    });
    expect(result.factKey).toBe('differentiation');
    expect(result.factKey).not.toBe('customer');
    expect(result.facts.some((f) => f.key === 'customer')).toBe(false);
    expect(result.facts.map((f) => f.key)).toContain('competitor');
    expect(result.facts.map((f) => f.key)).toContain('differentiation');
    expect(result.resolvedIssueId).toBe('competitor_analysis');
  });

  it('memory stores multi-fact keys from semanticFactKeys', () => {
    const memory = memoryFromTurns([
      {
        issueId: 'bm_design',
        answer: '관광객 결제 + 수수료 수익',
        appliedAt: '1',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer', 'revenue'],
        intent: 'business_fact',
        targetGap: 'payer',
      },
    ]);
    expect(getFact(memory, 'buyer')?.value).toMatch(/결제|수수료/);
    expect(getFact(memory, 'revenue')?.value).toMatch(/결제|수수료/);
    expect(getFact(memory, 'customer')).toBeNull();
  });
});

describe('Core v4 re-ask prevention (P0)', () => {
  it('does not re-ask revenueModel after it was answered (even if revenue fact thin)', () => {
    const understanding = buildBusinessUnderstanding(SEED);
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'problem_definition',
        answer: '정보 파편화로 맞춤 일정을 못 짠다',
        appliedAt: '1',
        semanticFactKey: 'problem',
        intent: 'business_fact',
        targetGap: 'problemJtbd',
      },
      {
        issueId: 'bm_design',
        answer: '관광객이 앱에서 직접 결제합니다',
        appliedAt: '2',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer'],
        intent: 'business_fact',
        targetGap: 'payer',
      },
      {
        issueId: 'bm_design',
        answer: '관광객이 앱에서 직접 결제합니다',
        appliedAt: '3',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer'],
        intent: 'business_fact',
        targetGap: 'revenueModel',
      },
    ];
    const memory = memoryFromTurns(turns);
    const loop: AiPmLoopState = {
      ...createInitialAiPmLoopState(),
      turns,
      currentIssueId: 'bm_design',
      phase: 'issue',
      readingCompleted: true,
      dismissedReadAck: true,
    };

    expect(getAnsweredTargetGaps(turns).has('revenueModel')).toBe(true);

    const ranked = resolveMissingFieldPriorities(understanding, loop, {
      documentText: SEED,
      memory,
      turns,
      analysisResultExists: true,
    });
    expect(ranked.every((r) => r.targetGap !== 'revenueModel')).toBe(true);
    expect(ranked.every((r) => r.targetGap !== 'payer')).toBe(true);

    // Sticky bm_design must yield after revenue gap was answered
    const next = resolveNextIssueByMissingField(understanding, loop, {
      documentText: SEED,
      memory,
      turns,
      analysisResultExists: true,
    });
    expect(next).not.toBeNull();
    // Next should not keep asking bm_design solely for revenue re-ask
    const top = ranked[0];
    expect(top?.targetGap).not.toBe('revenueModel');
  });

  it('advances past payer to a different gap after buyer confirmed', () => {
    const understanding = buildBusinessUnderstanding(SEED);
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'problem_definition',
        answer: '일정·동선 정보가 파편화되어 맞춤 경험이 어렵다',
        appliedAt: '1',
        semanticFactKey: 'problem',
        intent: 'business_fact',
        targetGap: 'problemJtbd',
      },
      {
        issueId: 'bm_design',
        answer: '관광객이 앱에서 직접 예약·결제합니다',
        appliedAt: '2',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer'],
        intent: 'business_fact',
        targetGap: 'payer',
      },
    ];
    const memory = memoryFromTurns(turns);
    const loop: AiPmLoopState = {
      ...createInitialAiPmLoopState(),
      turns,
      currentIssueId: 'bm_design',
      phase: 'issue',
      readingCompleted: true,
      dismissedReadAck: true,
    };

    const ranked = resolveMissingFieldPriorities(understanding, loop, {
      documentText: SEED,
      memory,
      turns,
      analysisResultExists: true,
    });
    expect(ranked.every((r) => r.targetGap !== 'payer')).toBe(true);
    // May ask revenue once (not yet answered) — that is OK
    const topGaps = ranked.map((r) => r.targetGap);
    expect(topGaps.includes('payer')).toBe(false);
  });
});

describe('Core v4 understanding update after answer', () => {
  it('living state coverage and claims change after buyer fact', () => {
    const understanding = buildBusinessUnderstanding(SEED);
    const before = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      turns: [],
      memory: null,
    });

    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'bm_design',
        answer: '관광객이 앱에서 직접 결제합니다',
        appliedAt: '1',
        semanticFactKey: 'buyer',
        semanticFactKeys: ['buyer'],
        intent: 'business_fact',
        targetGap: 'payer',
      },
    ];
    const memory = memoryFromTurns(turns);
    const after = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      turns,
      memory,
    });

    const payerBefore = before.claims.find((c) => c.fieldKey === 'payer');
    const payerAfter = after.claims.find((c) => c.fieldKey === 'payer');
    expect(payerBefore?.status === 'unknown' || !payerBefore?.value).toBe(true);
    expect(payerAfter?.status).toBe('confirmed');
    expect(after.judgmentSummary).toMatch(/확인|커버리지/);
  });
});
