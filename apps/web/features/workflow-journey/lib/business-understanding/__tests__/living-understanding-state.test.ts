import { describe, expect, it } from 'vitest';

import { buildBusinessUnderstanding } from '../build-business-understanding';
import {
  buildLivingUnderstandingState,
  computeUnderstandingCoverage,
  invalidateDownstreamTurns,
  whyNowForGapField,
} from '../living-understanding-state';
import { upsertConfirmedFact, emptyConversationMemory } from '../conversation-memory';
import { AI_PM_LOOP_ISSUE_ORDER } from '../workspace-ai-pm-loop-types';

const RICH_DOC = `# 양조장 체험 SaaS

서비스: 전통주 양조장과 MZ·FIT 관광객을 연결하는 B2B 예약 플랫폼
대상: MZ 관광객, FIT 개별 여행객
문제: 양조장 예약·동선이 파편화되어 체험 전환이 낮다
수익: 예약 수수료 + 제휴 리포트
시장: 방한 외국인 · 국내 전통주 체험`;

describe('living-understanding-state (v2 SoT)', () => {
  it('builds 20 domain claims from document', () => {
    const understanding = buildBusinessUnderstanding(RICH_DOC);
    const living = buildLivingUnderstandingState({
      documentText: RICH_DOC,
      understanding,
      entities: null,
      turns: [],
      memory: null,
    });

    expect(living.claims).toHaveLength(20);
    expect(living.coveragePercent).toBeGreaterThan(0);
    expect(living.judgmentSummary).toContain('커버리지');
  });

  it('coverage increases when memory facts are confirmed', () => {
    const understanding = buildBusinessUnderstanding(RICH_DOC);
    const base = buildLivingUnderstandingState({
      documentText: RICH_DOC,
      understanding,
      memory: null,
    });

    let memory = emptyConversationMemory('test');
    memory = upsertConfirmedFact(memory, 'customer', 'MZ 관광객', 'user_turn');
    memory = upsertConfirmedFact(memory, 'problem', '예약 파편화', 'user_turn');

    const withFacts = buildLivingUnderstandingState({
      documentText: RICH_DOC,
      understanding,
      memory,
      turns: [
        {
          issueId: 'customer_definition',
          answer: 'MZ 관광객',
          appliedAt: new Date().toISOString(),
        },
        {
          issueId: 'problem_definition',
          answer: '예약 파편화',
          appliedAt: new Date().toISOString(),
        },
      ],
    });

    expect(withFacts.coveragePercent).toBeGreaterThanOrEqual(base.coveragePercent);
    expect(withFacts.claims.find((c) => c.fieldKey === 'customerPersona')?.status).toBe(
      'confirmed',
    );
  });

  it('computeUnderstandingCoverage is deterministic', () => {
    const claims = [
      { fieldKey: 'a', value: 'valid value', status: 'known' as const, provenance: 'DOCUMENT' as const, confidence: 'PROPOSED' as const, evidence: [] },
      { fieldKey: 'b', value: null, status: 'unknown' as const, provenance: 'UNKNOWN' as const, confidence: 'UNKNOWN' as const, evidence: [] },
    ];
    expect(computeUnderstandingCoverage(claims)).toBe(50);
  });

  it('invalidateDownstreamTurns trims later issues after edit', () => {
    const turns = [
      { issueId: 'customer_definition' as const, answer: 'A', appliedAt: '1' },
      { issueId: 'problem_definition' as const, answer: 'B', appliedAt: '2' },
      { issueId: 'bm_design' as const, answer: 'C', appliedAt: '3' },
    ];
    const trimmed = invalidateDownstreamTurns(turns, 'customer_definition', AI_PM_LOOP_ISSUE_ORDER);
    expect(trimmed).toHaveLength(1);
    expect(trimmed[0]?.issueId).toBe('customer_definition');
  });

  it('whyNowForGapField is judgment-first (not generic next-question copy)', () => {
    expect(whyNowForGapField('payer')).toMatch(/지불|GO\/HOLD/);
    expect(whyNowForGapField('payer')).not.toMatch(/다음 질문입니다/);
    expect(whyNowForGapField('problemJtbd')).not.toMatch(/문서·이전 답변으로 「/);
    expect(whyNowForGapField('alternativesCompetitors')).toMatch(/대안|경쟁/);
  });
});
