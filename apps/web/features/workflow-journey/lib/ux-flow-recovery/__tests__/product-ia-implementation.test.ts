import { describe, expect, it } from 'vitest';

import type { GapCompleteness } from '@repo/types/domain/answer-review';
import type { GapKnowledgeRecord, GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import { buildBusinessUnderstanding } from '../../business-understanding/build-business-understanding';
import { emptyConversationMemory, upsertConfirmedFact } from '../../business-understanding/conversation-memory';
import { STAGE_A_REQUIRED_GAPS, STAGE_B_REQUIRED_GAPS } from '../../business-understanding/evaluate-stage-readiness';
import { buildLivingUnderstandingState } from '../../business-understanding/living-understanding-state';
import { buildUxBusinessSummary, uxSlotSymbol } from '../build-ux-business-summary';
import { buildUxJourneyStages, emptyGapKnowledgeState } from '../build-ux-journey-stages';
import { buildUxViabilityResult } from '../build-ux-viability-result';
import {
  founderContextLabel,
  resolveFounderContext,
  resultSectionOrder,
} from '../founder-context-lens';
import {
  resolveBusinessSourceText,
  resolveProjectDisplayTitle,
  UNTITLED_PROJECT_PLACEHOLDER,
} from '../resolve-project-display-title';

const BREWERY = `다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광 경험을 제공하려 한다.`;
const TITLE = '양조장 체험 관광 서비스';
const SEED = `프로젝트 이름: ${TITLE}\n\n사업 설명:\n${BREWERY}`;

function record(gapId: string, completeness: GapCompleteness): GapKnowledgeRecord {
  return {
    gapId,
    completeness,
    sourceTurnId: null,
    sourceReviewId: null,
    evidence: [],
    confidence: 'high',
    lastUpdated: '2026-01-01T00:00:00.000Z',
    rationale: 'test',
  };
}

function gaps(entries: Record<string, GapCompleteness>): GapKnowledgeState {
  return {
    version: 1,
    gaps: Object.fromEntries(
      Object.entries(entries).map(([gapId, completeness]) => [gapId, record(gapId, completeness)]),
    ),
    lastReviewByGap: {},
  };
}

function closeAll(ids: readonly string[]): Record<string, GapCompleteness> {
  return Object.fromEntries(ids.map((id) => [id, 'CLOSED']));
}

describe('P0-1 / P0-2 Title ≠ Source', () => {
  it('keeps the user title and never promotes the source first sentence', () => {
    expect(resolveProjectDisplayTitle({ projectTitle: TITLE, seedDocument: SEED })).toBe(TITLE);
    expect(resolveProjectDisplayTitle({ projectTitle: '  ', seedDocument: SEED })).toBe(TITLE);
    expect(resolveProjectDisplayTitle({})).toBe(UNTITLED_PROJECT_PLACEHOLDER);
    expect(resolveBusinessSourceText({ seedDocument: SEED })).toContain('전통주와 양조장 체험');
    expect(resolveBusinessSourceText({ seedDocument: SEED })).not.toBe(TITLE);
  });
});

describe('P0-7 Summary updates from gapState', () => {
  it('moves 결제자 from ○ to ✓ with the answered value', () => {
    const understanding = buildBusinessUnderstanding(BREWERY);
    let memory = emptyConversationMemory('ia');
    memory = upsertConfirmedFact(memory, 'buyer', '양조장 대표', 'user_turn');
    const living = buildLivingUnderstandingState({
      documentText: BREWERY,
      understanding,
      memory,
    });

    const before = buildUxBusinessSummary({
      projectTitle: TITLE,
      documentText: BREWERY,
      living,
      gapState: emptyGapKnowledgeState(),
    });
    expect(before.slots.find((slot) => slot.id === 'payer')?.mark).toBe('partial');
    expect(uxSlotSymbol(before.slots.find((slot) => slot.id === 'payer')!.mark)).toBe('△');

    const after = buildUxBusinessSummary({
      projectTitle: TITLE,
      documentText: BREWERY,
      living,
      gapState: gaps({ payer: 'CLOSED' }),
    });
    const payer = after.slots.find((slot) => slot.id === 'payer');
    expect(payer?.mark).toBe('closed');
    expect(payer?.confirmed).toBe(true);
    expect(payer?.value).toContain('양조장 대표');
    expect(uxSlotSymbol(payer!.mark)).toBe('✓');
  });
});

describe('P0-8 Stage readiness is Canonical, not document intake', () => {
  it('keeps ① in progress after source exists with all gaps OPEN', () => {
    const stages = buildUxJourneyStages({ gapState: emptyGapKnowledgeState() });
    expect(stages.map((stage) => `${stage.id}:${stage.lifecycle}`)).toEqual([
      'understand:in_progress',
      'market:waiting',
      'viability:waiting',
      'result:waiting',
    ]);
  });

  it('completes ① only after Stage A Canonical 4 are CLOSED', () => {
    const stages = buildUxJourneyStages({
      gapState: gaps(closeAll(STAGE_A_REQUIRED_GAPS)),
    });
    expect(stages.find((stage) => stage.id === 'understand')?.lifecycle).toBe('completed');
    expect(stages.find((stage) => stage.id === 'market')?.lifecycle).toBe('in_progress');
    expect(stages.find((stage) => stage.id === 'viability')?.lifecycle).toBe('waiting');
  });
});

describe('P0-9 Stage ③ is synthesis, not a new C-stage', () => {
  it('opens ③ after A+B without creating a stageCReady flag', () => {
    const stages = buildUxJourneyStages({
      gapState: gaps({
        ...closeAll(STAGE_A_REQUIRED_GAPS),
        ...closeAll(STAGE_B_REQUIRED_GAPS),
      }),
    });
    expect(stages.find((stage) => stage.id === 'viability')?.lifecycle).toBe('in_progress');
    expect(stages.find((stage) => stage.id === 'result')?.lifecycle).toBe('waiting');
    expect(JSON.stringify(stages)).not.toMatch(/stageCReady/);
  });
});

describe('P0-10 Result + Founder Context lens', () => {
  it('reads existing reviewType and only reorders sections', () => {
    expect(resolveFounderContext('investment-prep')).toBe('investment-prep');
    expect(resolveFounderContext('not-a-type')).toBe('startup-idea');
    expect(founderContextLabel('startup-idea')).toContain('예비창업자');
    expect(resultSectionOrder('investment-prep')[0]).toBe('risks');
    expect(resultSectionOrder('existing-strategy')[0]).toBe('facts');

    const result = buildUxViabilityResult({
      reviewType: 'investment-prep',
      presenter: {
        judgment: '지금은 HOLD — 검증 근거가 부족합니다.',
        evidence: ['지불 의향 근거가 없습니다.'],
        reasons: ['지불 의향 근거가 없습니다.'],
        criticalGap: '고객이 실제로 겪는 핵심 문제',
        hero: null,
        secondary: [],
        supportingScoreHint: null,
        headline: '사업성 검토 결과',
        decisions: [],
        insights: [],
        recommended: null,
      },
    });
    expect(result.title).toBe('현재 사업성 판단');
    expect(result.sectionOrder[0]).toBe('risks');
    expect(result.confirmedFacts).toEqual(
      buildUxViabilityResult({
        reviewType: 'startup-idea',
        presenter: {
          judgment: '지금은 HOLD — 검증 근거가 부족합니다.',
          evidence: ['지불 의향 근거가 없습니다.'],
          reasons: ['지불 의향 근거가 없습니다.'],
          criticalGap: '고객이 실제로 겪는 핵심 문제',
          hero: null,
          secondary: [],
          supportingScoreHint: null,
          headline: '사업성 검토 결과',
          decisions: [],
          insights: [],
          recommended: null,
        },
      }).confirmedFacts,
    );
  });
});
