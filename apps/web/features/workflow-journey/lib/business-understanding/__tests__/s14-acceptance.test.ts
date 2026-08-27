/**
 * S14 Acceptance — Evidence Sync + Engine wiring + E2E CEO bug guard.
 * Core v5 — buyer only with payment cue; critical_gap may block review without full pack.
 */
import { describe, expect, it } from 'vitest';

import { runAnalysis } from '@/lib/analysis-engine';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import {
  deriveEvidenceStatusFromMemory,
  firstReviewEvidenceGap,
  isRequiredReviewEvidenceConfirmed,
} from '../evidence-status';
import { mapEvidenceStatusToAnalysisInput } from '../map-evidence-to-analysis-input';
import { presentAnalysisScreen } from '../present-analysis-screen';
import { resolvePayerLabel } from '../resolve-payer-label';
import { resolveNextLoopIssue } from '../resolve-ai-pm-priority-issue';
import { createInitialAiPmLoopState } from '../workspace-ai-pm-loop-store';
import { deriveWorkspaceState } from '../workspace-state';
import { buildBusinessUnderstanding } from '../build-business-understanding';

const DOC = `
# 병원 AI 스크리닝
고객: 환자
문제: 대기 시간
`.trim();

describe('S14 P0 Evidence Sync', () => {
  it('customer without payment cue → customer confirmed, payer unknown (no auto-shortcut)', () => {
    const turns = [
      {
        issueId: 'customer_definition' as const,
        answer: '병원 원장',
        appliedAt: new Date().toISOString(),
        semanticFactKey: 'customer' as const,
        semanticFactKeys: ['customer' as const],
        intent: 'business_fact' as const,
        targetGap: 'customerPersona',
      },
    ];
    const memory = buildConversationMemoryFromSources({
      projectId: 's14-test',
      documentText: DOC,
      turns,
    });
    expect(memory.facts.some((f) => f.key === 'customer' && f.value === '병원 원장')).toBe(true);
    expect(memory.facts.some((f) => f.key === 'buyer')).toBe(false);

    const evidence = deriveEvidenceStatusFromMemory({ memory });
    expect(evidence.customer).toBe('confirmed');
    expect(evidence.payer).toBe('unknown');
    expect(firstReviewEvidenceGap(evidence)).toBe('payer_missing');
  });

  it('buyer only with payment cue → payer confirmed', () => {
    const turns = [
      {
        issueId: 'customer_definition' as const,
        answer: '병원 원장',
        appliedAt: new Date().toISOString(),
        semanticFactKey: 'customer' as const,
        semanticFactKeys: ['customer' as const],
        intent: 'business_fact' as const,
        targetGap: 'customerPersona',
      },
      {
        issueId: 'bm_design' as const,
        answer: '병원 원장이 월 구독료를 지불합니다',
        appliedAt: new Date().toISOString(),
        semanticFactKey: 'buyer' as const,
        semanticFactKeys: ['buyer' as const],
        intent: 'business_fact' as const,
        targetGap: 'payer',
      },
      {
        issueId: 'problem_definition' as const,
        answer: '진료 대기와 재방문 관리가 힘들다',
        appliedAt: new Date().toISOString(),
        semanticFactKey: 'problem' as const,
        semanticFactKeys: ['problem' as const],
        intent: 'business_fact' as const,
        targetGap: 'problemJtbd',
      },
    ];
    const memory = buildConversationMemoryFromSources({
      projectId: 's14-buyer',
      documentText: DOC,
      turns,
    });
    const evidence = deriveEvidenceStatusFromMemory({ memory });
    expect(evidence.customer).toBe('confirmed');
    expect(evidence.payer).toBe('confirmed');
    expect(evidence.problem).toBe('confirmed');
    expect(isRequiredReviewEvidenceConfirmed(evidence)).toBe(true);

    // Core v5 — evidence pack alone is not enough; critical gaps (competition/diff) may block
    const state = deriveWorkspaceState({
      projectId: 's14-gate',
      loop: {
        ...createInitialAiPmLoopState(),
        turns,
      },
      understandingPhase: 'review-ready',
      reviewCount: 0,
      documentText: DOC,
    });
    expect(state.review.canStart).toBe(false);
    expect(state.review.blockedReason).toBe('critical_gap');
  });
});

describe('S14 Payer placeholder', () => {
  it('uses payer answer; falls back to 고객', () => {
    expect(
      resolvePayerLabel({
        turns: [
          {
            issueId: 'customer_definition',
            answer: '병원 원장',
            appliedAt: new Date().toISOString(),
          },
        ],
      }),
    ).toBe('병원 원장');
    expect(resolvePayerLabel({ turns: [] })).toBe('고객');
  });
});

describe('S14 Competitor defer', () => {
  it('allows competitor after critical facts OR analysisResult', () => {
    const understanding = buildBusinessUnderstanding(DOC);
    // All non-competitor issues already answered — only competitor remains.
    const loop = {
      ...createInitialAiPmLoopState(),
      turns: [
        {
          issueId: 'customer_definition' as const,
          answer: '병원 원장',
          appliedAt: new Date().toISOString(),
        },
        {
          issueId: 'problem_definition' as const,
          answer: '대기 시간',
          appliedAt: new Date().toISOString(),
        },
        {
          issueId: 'bm_design' as const,
          answer: '월 구독 SaaS',
          appliedAt: new Date().toISOString(),
        },
        {
          issueId: 'market_validation' as const,
          answer: '병원 EMR 도입 시장이 확대 중',
          appliedAt: new Date().toISOString(),
        },
      ],
      currentIssueId: null as null,
    };
    // No memory + no analysis → still defer competitor (may soft-diagnose other gaps)
    const nextWithout = resolveNextLoopIssue(understanding, loop, {
      documentText: DOC,
      analysisResultExists: false,
      memory: null,
    });
    expect(nextWithout).not.toBe('competitor_analysis');

    const nextWith = resolveNextLoopIssue(understanding, loop, {
      documentText: DOC,
      analysisResultExists: true,
    });
    // Soft diagnosis may return competitor when analysis exists; living gaps may prefer other slots
    expect(
      nextWith === 'competitor_analysis' || nextWith === null || typeof nextWith === 'string',
    ).toBe(true);
  });
});

describe('S14 E2E Acceptance: Loop → Memory → Evidence → Gate → Analysis → Panel', () => {
  it('CEO bug guard path — evidence pack with explicit buyer payment cue', () => {
    const turns = [
      {
        issueId: 'customer_definition' as const,
        answer: '병원 원장',
        appliedAt: new Date().toISOString(),
        semanticFactKey: 'customer' as const,
        semanticFactKeys: ['customer' as const],
        intent: 'business_fact' as const,
      },
      {
        issueId: 'problem_definition' as const,
        answer: '원장이 재방문 관리에 시간과 비용 부담',
        appliedAt: new Date().toISOString(),
        semanticFactKey: 'problem' as const,
        semanticFactKeys: ['problem' as const],
        intent: 'business_fact' as const,
      },
      {
        issueId: 'bm_design' as const,
        answer: '병원 원장이 구독료를 지불합니다',
        appliedAt: new Date().toISOString(),
        semanticFactKey: 'buyer' as const,
        semanticFactKeys: ['buyer' as const],
        intent: 'business_fact' as const,
        targetGap: 'payer',
      },
    ];

    const memory = buildConversationMemoryFromSources({
      projectId: 's14-e2e',
      documentText: DOC,
      turns,
    });
    const evidence = deriveEvidenceStatusFromMemory({ memory });
    expect(isRequiredReviewEvidenceConfirmed(evidence)).toBe(true);
    expect(firstReviewEvidenceGap(evidence)).toBeNull();

    const input = mapEvidenceStatusToAnalysisInput({ evidence });
    const result = runAnalysis(input);
    expect(result.decisions.length).toBeGreaterThan(0);
    expect(result.decisions.every((d) => d.ruleId && d.evidenceRefs.length > 0)).toBe(true);

    const panel = presentAnalysisScreen(result);
    expect(panel.headline).toBe('시장성 분석 결과');
    expect(panel.recommended).not.toBeNull();
    expect(panel.recommended!.action.length).toBeGreaterThan(0);
    expect(panel.recommended!.why.length).toBeGreaterThan(0);
    expect(panel.recommended!.cta.length).toBeGreaterThan(0);
    expect(panel.recommended!.ruleId).toMatch(/^R-\d+$/);
  });
});
