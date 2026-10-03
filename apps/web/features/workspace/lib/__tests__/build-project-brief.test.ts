import { describe, expect, it } from 'vitest';

import type { GapCompleteness } from '@repo/types/domain/answer-review';
import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import type {
  AiPmLoopState,
  AiPmLoopTurn,
} from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-types';

import { buildProjectBrief } from '../build-project-brief';
import { hasProjectBriefContent } from '../has-project-brief-content';

const STAGE_A = ['businessOneLiner', 'customerPersona', 'payer', 'problemJtbd'];
const STAGE_B = [
  'marketChannel',
  'alternativesCompetitors',
  'differentiationVsAlternatives',
  'validationTestability',
];

function gapState(entries: Record<string, { c: GapCompleteness; value?: string }>): GapKnowledgeState {
  const gaps: GapKnowledgeState['gaps'] = {};
  for (const [gapId, { c, value }] of Object.entries(entries)) {
    gaps[gapId] = {
      gapId,
      completeness: c,
      sourceTurnId: 't1',
      sourceReviewId: 'r1',
      evidence: value ? [{ factKey: 'customer', value, evidenceClass: 'FACT' }] : [],
      confidence: 'high',
      lastUpdated: '2026-09-06T10:00:00.000Z',
      rationale: 'targetGapId routing internal',
    };
  }
  return { version: 1, gaps, lastReviewByGap: {} };
}

function turn(answer: string, appliedAt: string, extra: Partial<AiPmLoopTurn> = {}): AiPmLoopTurn {
  return { issueId: 'customer_definition', answer, appliedAt, ...extra };
}

function loop(partial: Partial<AiPmLoopState>): AiPmLoopState {
  return {
    version: 1,
    phase: 'answer',
    turns: [],
    currentIssueId: 'customer_definition',
    readingCompleted: true,
    dismissedReadAck: true,
    ...partial,
  };
}

function allGaps(c: GapCompleteness): Record<string, { c: GapCompleteness; value?: string }> {
  return Object.fromEntries([...STAGE_A, ...STAGE_B].map((id) => [id, { c, value: `${id} 값` }]));
}

const INTERNAL_LEAK = /targetGap|reviewId|score|routing|recommendedAction|CONTRADICTED|PARTIAL|\bOPEN\b|CLOSED|[a-z]+[A-Z][a-zA-Z]+/;

function visibleStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(visibleStrings);
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([key]) => key !== 'kind' && key !== 'reviewStatus' && key !== 'lastAnsweredAt')
      .flatMap(([, v]) => visibleStrings(v));
  }
  return [];
}

describe('buildProjectBrief', () => {
  it('Case E — no stored loop yields empty state', () => {
    expect(buildProjectBrief(null)).toEqual({ kind: 'empty' });
    expect(buildProjectBrief(loop({}))).toEqual({ kind: 'empty' });
  });

  it('answers without gapState are reported as unstructured, never filled with samples', () => {
    const brief = buildProjectBrief(
      loop({ turns: [turn('a', '2026-08-30T01:00:00.000Z'), turn('b', '2026-08-31T01:00:00.000Z')] }),
    );
    expect(brief).toEqual({
      kind: 'unstructured',
      answeredCount: 2,
      lastAnsweredAt: '2026-08-31T01:00:00.000Z',
    });
  });

  it('Case A/B — partial progress splits confirmed vs unconfirmed and names the Stage A blocker', () => {
    const brief = buildProjectBrief(
      loop({
        turns: [turn('병원 원장님', '2026-09-07T01:00:00.000Z')],
        gapState: gapState({
          businessOneLiner: { c: 'CLOSED', value: '병원 예약 자동화' },
          customerPersona: { c: 'CLOSED', value: '개인 병원 원장' },
          payer: { c: 'OPEN' },
          problemJtbd: { c: 'PARTIAL', value: '노쇼' },
        }),
      }),
    );
    expect(brief.kind).toBe('brief');
    if (brief.kind !== 'brief') return;
    expect(brief.reviewStatus).toBe('understanding');
    expect(brief.confirmed.map((i) => i.label)).toEqual(['사업 한 줄', '고객 페르소나']);
    expect(brief.confirmed[1]?.value).toBe('개인 병원 원장');
    expect(brief.unconfirmed.map((i) => i.label)).toEqual([
      '구매자',
      '핵심 문제',
      '시장',
      '대안/경쟁',
      '차별점',
      '검증 가능성',
    ]);
    expect(brief.unconfirmed[0]).toEqual({ label: '구매자', statusLabel: '아직 확인되지 않음', value: null });
    expect(brief.unconfirmed[1]).toEqual({
      label: '핵심 문제',
      statusLabel: '가설은 있으나 검증 필요',
      value: null,
    });
    expect(brief.blockerLabel).toBe('구매자');
    expect(brief.conflicts).toEqual([]);
  });

  it('Case C — contradicted gaps surface as conflicts and block readiness', () => {
    const brief = buildProjectBrief(
      loop({
        turns: [turn('x', '2026-10-02T01:00:00.000Z')],
        gapState: gapState({ ...allGaps('CLOSED'), customerPersona: { c: 'CONTRADICTED', value: 'A, B' } }),
      }),
    );
    expect(brief.kind).toBe('brief');
    if (brief.kind !== 'brief') return;
    expect(brief.conflicts).toEqual([
      { label: '고객 페르소나', statusLabel: '서로 다른 설명이 충돌함', value: 'A, B' },
    ]);
    expect(brief.reviewStatus).toBe('understanding');
    expect(brief.blockerLabel).toBe('고객 페르소나');
  });

  it('Stage A done, Stage B open → validation with Stage B blocker', () => {
    const entries = allGaps('CLOSED');
    entries.alternativesCompetitors = { c: 'OPEN' };
    const brief = buildProjectBrief(
      loop({ turns: [turn('x', '2026-09-01T00:00:00.000Z')], gapState: gapState(entries) }),
    );
    if (brief.kind !== 'brief') throw new Error('expected brief');
    expect(brief.reviewStatus).toBe('validation');
    expect(brief.blockerLabel).toBe('대안/경쟁');
  });

  it('Case D — all required gaps CLOSED is READY with no blocker', () => {
    const turns = Array.from({ length: 37 }, (_, i) =>
      turn(`a${i}`, `2026-09-0${(i % 6) + 1}T00:00:00.000Z`),
    );
    const brief = buildProjectBrief(loop({ turns, gapState: gapState(allGaps('CLOSED')) }));
    if (brief.kind !== 'brief') throw new Error('expected brief');
    expect(brief.reviewStatus).toBe('ready');
    expect(brief.blockerLabel).toBeNull();
    expect(brief.confirmed).toHaveLength(8);
    expect(brief.unconfirmed).toHaveLength(0);
    expect(brief.answeredCount).toBe(37);
    expect(brief.lastAnsweredAt).toBe('2026-09-06T00:00:00.000Z');
  });

  it('superseded turns are not counted', () => {
    const brief = buildProjectBrief(
      loop({
        turns: [turn('old', '2026-09-01T00:00:00.000Z', { superseded: true }), turn('new', '2026-09-02T00:00:00.000Z')],
        gapState: gapState({ businessOneLiner: { c: 'CLOSED' } }),
      }),
    );
    if (brief.kind !== 'brief') throw new Error('expected brief');
    expect(brief.answeredCount).toBe(1);
  });

  it('shows the stored next question and drops engine-meta copy', () => {
    const brief = buildProjectBrief(
      loop({
        turns: [turn('x', '2026-09-07T00:00:00.000Z')],
        gapState: gapState({ businessOneLiner: { c: 'CLOSED' }, payer: { c: 'OPEN' } }),
        lastDecision: {
          targetGap: 'payer',
          targetGapId: 'payer',
          issueId: 'bm_design',
          questionText: '실제로 돈을 내는 사람은 누구인가요?',
          whyNow: '구매자가 정해져야 가격을 판단할 수 있습니다.',
          rationale: 'score 0.9 routing',
          score: 0.9,
          reframed: false,
          excludedGaps: [],
          drivenByReview: true,
          sourceAnswerId: 'a1',
          sourceReviewId: 'r1',
          reviewAction: 'probe',
          action: 'probe',
          actionRationale: 'targetGapId=payer recommendedAction=probe',
          reason: 'x',
        },
      }),
    );
    if (brief.kind !== 'brief') throw new Error('expected brief');
    expect(brief.nextQuestion).toBe('실제로 돈을 내는 사람은 누구인가요?');
    expect(brief.nextQuestionReason).toBe('구매자가 정해져야 가격을 판단할 수 있습니다.');
  });

  it('skips verdict vocabulary in the reason and uses only extracted facts as recent understanding', () => {
    const brief = buildProjectBrief(
      loop({
        turns: [
          turn('양조장 사장님', '2026-09-07T00:00:00.000Z', {
            review: {
              extractedFacts: [{ value: '양조장 사장님' }, { value: '양조장 사장님' }],
              known: ['customerPersona'],
            } as unknown as AiPmLoopTurn['review'],
          }),
        ],
        gapState: gapState({ businessOneLiner: { c: 'CLOSED' }, payer: { c: 'OPEN' } }),
        lockedAskSurface: {
          questionText: '서비스 비용은 누가 지불하나요?',
          whyNow: '누가 비용을 지불하는지 모르면 GO/HOLD를 결정할 수 없습니다.',
          rationale: '가격을 판단하려면 구매자를 알아야 합니다.',
          targetGap: 'payer',
        } as unknown as AiPmLoopState['lockedAskSurface'],
      }),
    );
    if (brief.kind !== 'brief') throw new Error('expected brief');
    expect(brief.nextQuestion).toBe('서비스 비용은 누가 지불하나요?');
    expect(brief.nextQuestionReason).toBe('가격을 판단하려면 구매자를 알아야 합니다.');
    expect(brief.recentUnderstanding).toBe('양조장 사장님');
  });

  it('label-only reviews do not produce a recent understanding line', () => {
    const brief = buildProjectBrief(
      loop({
        turns: [
          turn('x', '2026-09-07T00:00:00.000Z', {
            review: { extractedFacts: [], known: ['marketChannel', 'problemJtbd'] } as unknown as AiPmLoopTurn['review'],
          }),
        ],
        gapState: gapState({ businessOneLiner: { c: 'CLOSED' } }),
      }),
    );
    if (brief.kind !== 'brief') throw new Error('expected brief');
    expect(brief.recentUnderstanding).toBeNull();
  });

  it('completed loop has no next question', () => {
    const brief = buildProjectBrief(
      loop({
        phase: 'complete',
        turns: [turn('x', '2026-09-07T00:00:00.000Z')],
        gapState: gapState(allGaps('CLOSED')),
      }),
    );
    if (brief.kind !== 'brief') throw new Error('expected brief');
    expect(brief.nextQuestion).toBeNull();
  });

  it('never exposes internal ids, statuses or engine metadata', () => {
    const entries = allGaps('PARTIAL');
    entries.customerPersona = { c: 'CONTRADICTED', value: 'targetGapId=customerPersona' };
    entries.payer = { c: 'CLOSED', value: 'score 0.8' };
    const brief = buildProjectBrief(
      loop({ turns: [turn('x', '2026-09-07T00:00:00.000Z')], gapState: gapState(entries) }),
    );
    const strings = visibleStrings(brief);
    expect(strings.length).toBeGreaterThan(0);
    for (const text of strings) {
      expect(text).not.toMatch(INTERNAL_LEAK);
    }
  });

  it('does not mutate the stored loop', () => {
    const stored = loop({
      turns: [turn('x', '2026-09-07T00:00:00.000Z')],
      gapState: gapState(allGaps('CLOSED')),
    });
    const before = JSON.stringify(stored);
    buildProjectBrief(stored);
    expect(JSON.stringify(stored)).toBe(before);
  });
});

describe('hasProjectBriefContent', () => {
  it('requires at least one non-superseded stored answer', () => {
    expect(hasProjectBriefContent(null)).toBe(false);
    expect(hasProjectBriefContent({ v2Workspace: {} })).toBe(false);
    expect(hasProjectBriefContent({ v2Workspace: { aiPmLoop: { turns: [] } } })).toBe(false);
    expect(
      hasProjectBriefContent({ v2Workspace: { aiPmLoop: { turns: [{ superseded: true }] } } }),
    ).toBe(false);
    expect(hasProjectBriefContent({ v2Workspace: { aiPmLoop: { turns: [{ answer: 'a' }] } } })).toBe(
      true,
    );
  });
});
