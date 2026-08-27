import { describe, expect, it, vi, beforeEach } from 'vitest';

import { inferDomainFromPaste } from '../../workspace-ai-pm-messages';
import { createInitialAiPmLoopState } from '../workspace-ai-pm-loop-store';
import { applyWorkspaceLoopAnswer } from '../workspace-state-update';
import {
  deriveWorkspaceState,
  type WorkspaceState,
} from '../workspace-state';
import {
  presentWorkspaceHeader,
  presentWorkspaceReviewGate,
  presentWorkspaceSidebar,
} from '../workspace-state-presenters';

const DEMO_DOC = `스마트팩토리 예지보전 SaaS
창업자: 김대표
사업: 30인 이하 제조기업 대상 설비 고장 예측
문제: 예기치 않은 설비 고장으로 생산 중단
시장: 국내 3만 개 중소 제조 공장 · 예지보전 SW 침투율 8%
BM: 월 49만 원 구독 · 공장당 10대 센서 포함`;

function derive(input: Partial<Parameters<typeof deriveWorkspaceState>[0]> = {}): WorkspaceState {
  return deriveWorkspaceState({
    loop: createInitialAiPmLoopState(),
    understandingPhase: 'pending',
    reviewCount: 0,
    documentText: DEMO_DOC,
    ...input,
  });
}

describe('deriveWorkspaceState', () => {
  it('marks customer sidebar completed after loop answers customer_definition', () => {
    const state = derive({
      loop: {
        ...createInitialAiPmLoopState(),
        turns: [
          {
            issueId: 'customer_definition',
            answer: '30인 이하 제조기업. 사용자는 공장장, 구매자는 대표.',
            appliedAt: new Date().toISOString(),
          },
        ],
      },
    });

    const customer = state.sidebar.nodes.find((node) => node.id === 'customer');
    expect(customer?.lifecycle).toBe('completed');
  });

  it('exposes review.canStart when Evidence Status pack is Confirmed', () => {
    const state = derive({
      understandingPhase: 'review-ready',
      domain: {
        founder: '김대표',
        business: '스마트팩토리 예지보전 SaaS',
        customer: '30인 이하 제조기업',
        market: '국내 중소 제조 공장',
        competitor: '',
      },
      entities: {
        founder: { value: '김대표', basis: 'document' },
        business: {
          value: '스마트팩토리 예지보전 SaaS',
          basis: 'document',
          model: 'B2B',
          name: null,
        },
        customer: { value: '30인 이하 제조기업', basis: 'document' },
        product: { value: '예지보전 SaaS', basis: 'document' },
        market: { value: '국내 중소 제조 공장', basis: 'document' },
        competitor: { value: null, basis: 'unknown' },
      },
      loop: {
        ...createInitialAiPmLoopState(),
        turns: [
          {
            issueId: 'customer_definition',
            answer: '30인 이하 제조기업 공장장 · 구매는 대표',
            appliedAt: new Date().toISOString(),
          },
          {
            issueId: 'problem_definition',
            answer: '예기치 않은 설비 고장으로 생산 중단',
            appliedAt: new Date().toISOString(),
          },
        ],
      },
    });

    expect(state.review.canStart).toBe(false);
    // Core v5 — no buyer fact (and/or critical viability gaps) blocks Start Analysis
    expect(['payer_missing', 'critical_gap']).toContain(state.review.blockedReason);
  });

  it('blocks review with user-facing reason when customer is not confirmed', () => {
    const state = derive({
      understandingPhase: 'review-ready',
      domain: {
        founder: '김대표',
        business: '스마트팩토리 예지보전 SaaS',
        customer: '',
        market: '국내 중소 제조 공장',
        competitor: '',
      },
      entities: {
        founder: { value: '김대표', basis: 'document' },
        business: {
          value: '스마트팩토리 예지보전 SaaS',
          basis: 'document',
          model: 'B2B',
          name: null,
        },
        customer: { value: '중소기업', basis: 'needs_confirmation' },
        product: { value: '예지보전 SaaS', basis: 'document' },
        market: { value: '국내 중소 제조 공장', basis: 'document' },
        competitor: { value: null, basis: 'unknown' },
      },
    });

    expect(state.review.canStart).toBe(false);
    // Core Final — unconfirmed customer is a critical viability gap
    expect(state.review.blockedReason).toBe('critical_gap');
  });

  it('blocks review when understanding phase is not review-ready', () => {
    const state = derive({ understandingPhase: 'aligning' });
    expect(state.review.canStart).toBe(false);
    expect(state.review.blockedReason).toBe('critical_gap');
  });

  it('blocks review for unreadable documents', () => {
    const state = derive({
      understandingPhase: 'review-ready',
      documentText: `# plan.pdf\n\nPDF 본문은 아직 추출되지 않았습니다. Business·Customer는 직접 확인이 필요합니다.`,
    });

    expect(state.review.canStart).toBe(false);
    expect(state.review.blockedReason).toBe('document_unreadable');
  });

  it('blocks review in demo readonly with a user-facing reason (S15: no silent block)', () => {
    const state = derive({
      understandingPhase: 'review-ready',
      isDemoReadonly: true,
    });
    expect(state.review.canStart).toBe(false);
    expect(state.review.blockedReason).toBe('demo_readonly');
  });

  it('exposes shared understanding spine with business · customer · problem', () => {
    const state = derive();
    expect(state.sharedUnderstanding).not.toBeNull();
    expect(state.sharedUnderstanding?.business.length).toBeGreaterThan(2);
    expect(state.sharedUnderstanding?.customer).toBeTruthy();
    expect(state.sharedUnderstanding?.problem).toBeTruthy();
  });

  it('derives five journey stages for step-first sidebar (S16 P0-3)', () => {
    const state = derive();
    expect(state.sidebar.stepFirstProgress).toBe(true);
    expect(state.sidebar.hideProgressMetrics).toBe(true);
    expect(state.sidebar.progressPercent).toBe(0);
    expect(state.sidebar.journeySteps?.map((step) => step.id)).toEqual([
      'business',
      'customer',
      'market',
      'review',
      'analysis',
    ]);
  });

  it('keeps percent hidden after loop topics complete until analysis (no 0→60 jump)', () => {
    const state = derive({
      understandingPhase: 'review-ready',
      loop: {
        ...createInitialAiPmLoopState(),
        turns: [
          {
            issueId: 'customer_definition',
            answer: '30인 이하 제조기업. 사용자는 공장장, 구매자는 대표.',
            appliedAt: new Date().toISOString(),
          },
          {
            issueId: 'problem_definition',
            answer: '예기치 않은 설비 고장으로 생산 중단',
            appliedAt: new Date().toISOString(),
          },
          {
            issueId: 'market_validation',
            answer: '국내 중소 제조 공장 대상',
            appliedAt: new Date().toISOString(),
          },
        ],
      },
    });
    expect(state.sidebar.hideProgressMetrics).toBe(true);
    expect(state.sidebar.progressPercent).toBe(0);
    expect(state.sidebar.journeySteps?.find((s) => s.id === 'review')?.lifecycle).toBe(
      'in_progress',
    );
  });
});

describe('workspace-state presenters', () => {
  it('format header and sidebar from the same aggregate', () => {
    const state = derive({
      loop: {
        ...createInitialAiPmLoopState(),
        turns: [
          {
            issueId: 'customer_definition',
            answer: '30인 이하 제조기업',
            appliedAt: new Date().toISOString(),
          },
        ],
      },
    });

    const sidebar = presentWorkspaceSidebar(state);
    const header = presentWorkspaceHeader(state);
    const review = presentWorkspaceReviewGate(state);

    expect(sidebar.nodes.find((node) => node.id === 'customer')?.lifecycle).toBe('completed');
    expect(header?.snapshot.fields.some((field) => field.label === '고객')).toBe(true);
    expect(review.count).toBe(0);
  });
});

describe('applyWorkspaceLoopAnswer', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
    const session = {
      getItem(key: string) {
        return store[key] ?? null;
      },
      setItem(key: string, value: string) {
        store[key] = value;
      },
      removeItem(key: string) {
        delete store[key];
      },
    };
    vi.stubGlobal('sessionStorage', session);
    vi.stubGlobal('window', { sessionStorage: session });
  });

  it('persists domain entities through the single loop write path', () => {
    inferDomainFromPaste(DEMO_DOC, 'test');

    // Pure customer answer (no payment cue) — Core v5 routes payer only with payment language
    const result = applyWorkspaceLoopAnswer(
      'customer_definition',
      '30인 이하 제조기업 공장장이 주요 사용자입니다.',
      'test',
    );

    expect(result.applied).toBe(true);
    expect(result.semantic.factKey).toBe('customer');
    expect(result.documentText).toMatch(/\[AI PM 확인 · (고객 정의|페르소나 확인)\]/);
    expect(result.documentText).toContain('공장장');
  });
});
