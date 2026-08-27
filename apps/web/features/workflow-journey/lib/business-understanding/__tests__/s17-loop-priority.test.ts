import { describe, expect, it } from 'vitest';

import { buildBusinessUnderstanding } from '../build-business-understanding';
import { resolveMissingFieldPriorities } from '../resolve-missing-field-priority';
import { resolveNextLoopIssue } from '../resolve-ai-pm-priority-issue';
import { resolveThinkingStage, THINKING_STAGES, THINKING_TOTAL_MS } from '../thinking-stages';
import type { AiPmLoopState } from '../workspace-ai-pm-loop-types';

const DOC_MISSING_CUSTOMER = `# 헬스케어 SaaS

창업자: 이대표
사업: 병원 운영 자동화 B2B SaaS
문제: 병원 행정 업무가 수작업으로 느리다
`;

function emptyLoop(overrides: Partial<AiPmLoopState> = {}): AiPmLoopState {
  return {
    version: 1,
    phase: 'issue',
    currentIssueId: null,
    turns: [],
    readingCompleted: true,
    dismissedReadAck: true,
    ...overrides,
  };
}

describe('S17-3 missing-field priority', () => {
  it('boosts customer when Shared Understanding customer is pending', () => {
    const understanding = buildBusinessUnderstanding(DOC_MISSING_CUSTOMER);
    const ranked = resolveMissingFieldPriorities(understanding, emptyLoop(), {
      documentText: DOC_MISSING_CUSTOMER,
    });

    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0]!.issueId).toBe('customer_definition');
    expect(ranked[0]!.missingField).toBe('customer');
  });

  it('resolveNextLoopIssue uses missing-field path', () => {
    const understanding = buildBusinessUnderstanding(DOC_MISSING_CUSTOMER);
    const next = resolveNextLoopIssue(understanding, emptyLoop(), {
      documentText: DOC_MISSING_CUSTOMER,
    });
    expect(next).toBe('customer_definition');
  });
});

describe('S17-2 thinking stages', () => {
  it('stages confirm → update → judgment → next gap within ~1–2s', () => {
    expect(THINKING_STAGES.map((s) => s.id)).toEqual([
      'confirmAnswer',
      'updateUnderstanding',
      'reviewJudgment',
      'selectNextGap',
    ]);
    expect(THINKING_TOTAL_MS).toBeGreaterThanOrEqual(1500);
    expect(THINKING_TOTAL_MS).toBeLessThanOrEqual(2500);
    expect(resolveThinkingStage(0).id).toBe('confirmAnswer');
    expect(resolveThinkingStage(500).id).toBe('updateUnderstanding');
    expect(resolveThinkingStage(1000).id).toBe('reviewJudgment');
    expect(resolveThinkingStage(1500).id).toBe('selectNextGap');
  });
});
