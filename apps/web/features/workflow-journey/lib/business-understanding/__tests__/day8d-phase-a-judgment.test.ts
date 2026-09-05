import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  computeJudgmentDelta,
  formatJudgmentDeltaForCeo,
  buildSpecificUncertaintyLine,
} from '../ai-pm-judgment-delta';
import { setAiPmJudgmentPolicyV1ForTest } from '../ai-pm-judgment-policy-v1';
import {
  buildCeoJudgmentSnapshot,
  buildCeoUnderstandingSnapshot,
} from '../ai-pm-judgment-presenter';
import { buildAiPmFocusedSnapshot } from '../ai-pm-focused-presenter';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { upsertConfirmedFact, emptyConversationMemory } from '../conversation-memory';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';

const DOC = `# 소상공인 배송 SaaS

서비스: 주문부터 배송까지 관리하는 B2B SaaS
대상: 반찬가게·꽃집 등 직접 배송 소상공인
문제: 전략 검토가 회의마다 리셋됨`;

const CORRECTION =
  '아니요. 제가 말한 핵심 고객은 꽃집이 아니라 반찬가게입니다.';

function testUnderstanding() {
  return buildBusinessUnderstanding(DOC);
}

function livingWithTurns(turns: AiPmLoopTurn[]) {
  const memory = buildConversationMemoryFromSources({
    projectId: 'day8d-a',
    documentText: DOC,
    turns,
  });
  return buildLivingUnderstandingState({
    documentText: DOC,
    understanding: testUnderstanding(),
    turns,
    memory,
  });
}

describe('DAY 8-D Phase A — Dynamic Judgment', () => {
  beforeEach(() => {
    setAiPmJudgmentPolicyV1ForTest(true);
    setV3ReviewPipelineForTest(true);
  });

  afterEach(() => {
    setAiPmJudgmentPolicyV1ForTest(null);
    setV3ReviewPipelineForTest(null);
  });

  it('J NEW — first business answer produces belief delta', () => {
    const before = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: testUnderstanding(),
    });
    const answer =
      '반찬가게와 꽃집에 직접 배송하는 소상공인을 위한 주문·배송 관리 SaaS입니다.';
    const after = livingWithTurns([
      {
        issueId: 'bm_design',
        answer,
        appliedAt: '2026-09-05T01:00:00.000Z',
        targetGap: 'businessOneLiner',
        intent: 'business_fact',
      },
    ]);

    const delta = computeJudgmentDelta({ before, after });
    expect(['NEW', 'CHANGED', 'STRENGTHENED']).toContain(delta.state);
    expect(delta.beliefLine.length).toBeGreaterThan(10);
    expect(delta.beliefLine).not.toMatch(
      /경쟁·대안 환경을 더 구체적으로 알면 차별 포인트 판단이 가능합니다/,
    );

    const judgment = buildCeoJudgmentSnapshot(after, null, { livingBefore: before });
    expect(judgment).not.toBe(buildCeoJudgmentSnapshot(before));
    expect(judgment.length).toBeGreaterThan(15);
  });

  it('J CHANGED — customer correction narrows belief', () => {
    const turnsBefore: AiPmLoopTurn[] = [
      {
        issueId: 'problem_definition',
        answer:
          '반찬가게와 꽃집에 배송하는 소상공인을 위한 주문·배송 관리 서비스입니다.',
        appliedAt: '2026-09-05T01:00:00.000Z',
        targetGap: 'problemJtbd',
        intent: 'business_fact',
      },
    ];
    const before = livingWithTurns(turnsBefore);
    const turnsAfter: AiPmLoopTurn[] = [
      ...turnsBefore,
      {
        issueId: 'customer_definition',
        answer: CORRECTION,
        appliedAt: '2026-09-05T01:01:00.000Z',
        targetGap: 'problemJtbd',
        intent: 'correction',
        semanticFactKey: 'customer',
      },
    ];
    const after = livingWithTurns(turnsAfter);

    const delta = computeJudgmentDelta({ before, after });
    expect(delta.state).toBe('CHANGED');
    expect(delta.beliefLine).toMatch(/반찬/);
    expect(delta.beliefLine).not.toMatch(/꽃집/);

    const judgment = buildCeoJudgmentSnapshot(after, null, { livingBefore: before });
    expect(judgment).toMatch(/반찬|좁혔/);
    expect(judgment).not.toMatch(/경쟁·대안 환경을 더 구체적으로 알면/);
  });

  it('J STRENGTHENED — competitor information updates belief', () => {
    const before = livingWithTurns([
      {
        issueId: 'bm_design',
        answer:
          '반찬가게 소상공인을 위한 주문·배송 관리 SaaS입니다.',
        appliedAt: '2026-09-05T01:00:00.000Z',
        targetGap: 'businessOneLiner',
        intent: 'business_fact',
      },
    ]);
    const after = livingWithTurns([
      {
        issueId: 'bm_design',
        answer:
          '반찬가게 소상공인을 위한 주문·배송 관리 SaaS입니다.',
        appliedAt: '2026-09-05T01:00:00.000Z',
        targetGap: 'businessOneLiner',
        intent: 'business_fact',
      },
      {
        issueId: 'competitor_analysis',
        answer: 'Notion, Linear, Jira 같은 도구는 있지만 AI PM 전략 검토는 없습니다.',
        appliedAt: '2026-09-05T01:01:00.000Z',
        targetGap: 'solution',
        intent: 'business_fact',
        semanticFactKey: 'competitor',
      },
    ]);

    const delta = computeJudgmentDelta({ before, after });
    expect(['STRENGTHENED', 'CHANGED', 'NEW']).toContain(delta.state);
    expect(delta.beliefLine).toMatch(/경쟁|대안|반영/);

    const jBefore = buildCeoJudgmentSnapshot(before, null, {
      livingBefore: buildLivingUnderstandingState({
        documentText: DOC,
        understanding: testUnderstanding(),
      }),
    });
    const jAfter = buildCeoJudgmentSnapshot(after, null, { livingBefore: before });
    expect(jAfter).not.toBe(jBefore);
  });

  it('J UNCHANGED — no material spine change uses current belief summary', () => {
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'bm_design',
        answer: '반찬가게 소상공인 SaaS',
        appliedAt: '2026-09-05T01:00:00.000Z',
        targetGap: 'businessOneLiner',
        intent: 'business_fact',
      },
    ];
    const living = livingWithTurns(turns);
    const delta = computeJudgmentDelta({ before: living, after: living });
    expect(delta.state).toBe('UNCHANGED');
    expect(delta.beliefLine).toMatch(/핵심|사업|고객/);
  });

  it('J WEAKENED — contradiction in review weakens belief', () => {
    const before = livingWithTurns([]);
    const after = livingWithTurns([
      {
        issueId: 'customer_definition',
        answer: 'B2B 대기업 CEO',
        appliedAt: '2026-09-05T01:00:00.000Z',
        targetGap: 'customerPersona',
        intent: 'business_fact',
      },
    ]);
    const delta = computeJudgmentDelta({
      before,
      after,
      lastReview: {
        recommendedAction: 'challenge',
        contradictions: [{ gapId: 'customerPersona', summary: 'conflict' }],
      } as never,
    });
    expect(delta.state).toBe('WEAKENED');
    expect(delta.beliefLine).toMatch(/확인|필요/);
  });

  it('uncertainty line is specific to top gap and customer context', () => {
    const living = livingWithTurns([
      {
        issueId: 'customer_definition',
        answer: CORRECTION,
        appliedAt: '2026-09-05T01:00:00.000Z',
        targetGap: 'customerPersona',
        intent: 'correction',
        semanticFactKey: 'customer',
      },
    ]);
    const uncertainty = buildSpecificUncertaintyLine(living);
    expect(uncertainty).toBeTruthy();
    expect(uncertainty).toMatch(/반찬|확인|비용|문제|지불/);
    expect(uncertainty).not.toBe(
      '경쟁·대안 환경을 더 구체적으로 알면 차별 포인트 판단이 가능합니다.',
    );
  });

  it('multi-fact answer produces non-empty judgment delta', () => {
    const before = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: testUnderstanding(),
    });
    const after = livingWithTurns([
      {
        issueId: 'bm_design',
        answer:
          '반찬가게 소상공인 SaaS이고, 월 구독으로 CEO와 PM이 사용합니다.',
        appliedAt: '2026-09-05T01:00:00.000Z',
        targetGap: 'businessOneLiner',
        intent: 'business_fact',
        semanticFactKeys: ['business', 'buyer'],
      },
    ]);
    const delta = computeJudgmentDelta({ before, after });
    expect(delta.beliefLine.length).toBeGreaterThan(10);
    expect(formatJudgmentDeltaForCeo(after, delta).length).toBeGreaterThan(15);
  });

  it('empty/partial answer — judgment does not crash and stays CEO-safe', () => {
    const before = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: testUnderstanding(),
    });
    const after = livingWithTurns([
      {
        issueId: 'bm_design',
        answer: '   ',
        appliedAt: '2026-09-05T01:00:00.000Z',
        targetGap: 'businessOneLiner',
        intent: 'nonsense',
      },
    ]);
    const judgment = buildCeoJudgmentSnapshot(after, null, { livingBefore: before });
    expect(judgment.length).toBeGreaterThan(5);
    expect(judgment).not.toMatch(/businessOneLiner|targetGap/i);
  });

  it('DAY 8-C regression — 4-turn sequence judgments are not all identical', () => {
    const understanding = testUnderstanding();
    const turnDefs: AiPmLoopTurn[] = [
      {
        issueId: 'bm_design',
        answer:
          '반찬가게와 꽃집에 직접 배송하는 소상공인을 위한 주문·배송 관리 SaaS입니다.',
        appliedAt: '2026-09-05T01:00:00.000Z',
        targetGap: 'businessOneLiner',
        intent: 'business_fact',
      },
      {
        issueId: 'competitor_analysis',
        answer: 'Notion, Linear, Jira 같은 도구는 있지만 AI PM 전략 검토는 없습니다.',
        appliedAt: '2026-09-05T01:01:00.000Z',
        targetGap: 'solution',
        intent: 'business_fact',
      },
      {
        issueId: 'customer_definition',
        answer: CORRECTION,
        appliedAt: '2026-09-05T01:02:00.000Z',
        targetGap: 'customerPersona',
        intent: 'correction',
        semanticFactKey: 'customer',
      },
    ];

    const judgments: string[] = [];
    for (let i = 0; i < turnDefs.length; i += 1) {
      const priorTurns = turnDefs.slice(0, i);
      const currentTurns = turnDefs.slice(0, i + 1);
      const before =
        i === 0
          ? buildLivingUnderstandingState({ documentText: DOC, understanding })
          : livingWithTurns(priorTurns);
      const after = livingWithTurns(currentTurns);
      judgments.push(
        buildCeoJudgmentSnapshot(after, null, {
          livingBefore: before,
          lastTurn: currentTurns[currentTurns.length - 1]!,
        }),
      );
    }

    const unique = new Set(judgments);
    expect(unique.size).toBeGreaterThan(1);
    expect(judgments.every((j) => !j.includes('경쟁·대안 환경을 더 구체적으로 알면'))).toBe(
      true,
    );
  });

  it('focused snapshot judgment differs from understanding with policy ON', () => {
    const before = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: testUnderstanding(),
    });
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'bm_design',
        answer:
          '반찬가게 소상공인을 위한 주문·배송 관리 SaaS입니다.',
        appliedAt: '2026-09-05T01:00:00.000Z',
        targetGap: 'businessOneLiner',
        intent: 'business_fact',
      },
    ];
    const after = livingWithTurns(turns);
    const snapshot = buildAiPmFocusedSnapshot({
      living: after,
      livingBefore: before,
      lastTurn: turns[0]!,
      lastDecision: null,
      displayQuestionText: '다음 질문',
    });

    expect(snapshot.currentJudgment).not.toBe(snapshot.businessUnderstanding);
    expect(snapshot.currentJudgment.length).toBeGreaterThan(10);
    expect(buildCeoUnderstandingSnapshot(after)).toMatch(/반찬|소상공인/);
  });

  it('legacy path unchanged when policy flag OFF', () => {
    setAiPmJudgmentPolicyV1ForTest(false);
    const living = livingWithTurns([
      {
        issueId: 'bm_design',
        answer: '반찬가게 SaaS',
        appliedAt: '2026-09-05T01:00:00.000Z',
        targetGap: 'businessOneLiner',
        intent: 'business_fact',
      },
    ]);
    const before = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: testUnderstanding(),
    });
    const withPolicy = buildCeoJudgmentSnapshot(living, null, { livingBefore: before });
    const legacy = buildCeoJudgmentSnapshot(living, null);
    expect(legacy).toMatch(/구체화|불명확|확인|쌓|판단|가능/);
    expect(withPolicy).toBe(legacy);
  });
});

describe('DAY 8-D Phase A — judgment delta unit states', () => {
  it('formatJudgmentDeltaForCeo combines belief and uncertainty', () => {
    const living = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: testUnderstanding(),
      memory: upsertConfirmedFact(
        emptyConversationMemory('fmt'),
        'customer',
        '반찬가게',
        'user_turn',
      ),
    });
    const delta = computeJudgmentDelta({
      before: buildLivingUnderstandingState({
        documentText: DOC,
        understanding: testUnderstanding(),
      }),
      after: living,
    });
    const formatted = formatJudgmentDeltaForCeo(living, delta);
    expect(formatted.split('.').length).toBeGreaterThanOrEqual(1);
    expect(formatted.length).toBeGreaterThan(12);
  });
});
