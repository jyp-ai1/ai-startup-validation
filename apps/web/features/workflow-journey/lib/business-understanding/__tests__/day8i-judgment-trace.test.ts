import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import {
  applyAnswerToJudgment,
  buildCeoJudgmentStateWithTrace,
} from '../ai-pm-judgment-aggregation';
import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { buildBusinessReviewResult } from '../ai-pm-business-review';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import { extractDimensionSummaries } from '../ai-pm-dimension-extract';
import {
  detectDimensionSeparationIssues,
  classifyJudgmentChangeType,
  buildJudgmentTraceEntries,
} from '../ai-pm-judgment-trace';
import {
  runDay8iConversation,
  formatDay8iCtoReport,
  DAY8I_30_TURN_SCENARIO,
} from '../day8i-conversation-harness';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import { clearAiPmLoopState } from '../workspace-ai-pm-loop-store';

function stubSessionStorage() {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  };
  vi.stubGlobal('sessionStorage', sessionStorage);
  vi.stubGlobal('window', { sessionStorage });
}

describe('DAY 8-I — Judgment Trace & Dimension Separation', () => {
  beforeEach(() => {
    stubSessionStorage();
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('CPO-R1 — customer answer reflects in customer dimension only', () => {
    const state = applyAnswerToJudgment({
      prior: emptyCeoJudgmentState(0),
      answer: '소규모 양조장과 반찬가게 사장님이 주 고객입니다.',
      issueId: 'customer_definition',
      targetGap: 'customerPersona',
    });
    expect(state.dimensions.customer.status).not.toBe('unknown');
    expect(state.dimensions.customer.summary).toMatch(/양조|반찬|사장/);
    expect(state.dimensions.solution.status).toBe('unknown');
  });

  it('CPO-R2 — problem answer reflects in problem dimension', () => {
    const state = applyAnswerToJudgment({
      prior: emptyCeoJudgmentState(1),
      answer: '주문과 배송을 따로 관리해서 배송 누락이 자주 생깁니다.',
      issueId: 'problem_definition',
      targetGap: 'problemJtbd',
    });
    expect(state.dimensions.problem.status).not.toBe('unknown');
    expect(state.dimensions.problem.summary).toMatch(/누락|따로|관리/);
  });

  it('CPO-R3 — solution answer reflects in solution dimension', () => {
    const state = applyAnswerToJudgment({
      prior: emptyCeoJudgmentState(2),
      answer: '주문과 배송을 한 곳에서 관리하는 SaaS를 만들려고 합니다.',
      issueId: 'bm_design',
      targetGap: 'solution',
    });
    expect(state.dimensions.solution.status).not.toBe('unknown');
    expect(state.dimensions.solution.summary).toMatch(/한\s*곳|SaaS|관리/);
    expect(state.dimensions.problem.status).toBe('unknown');
  });

  it('CPO-R4 — customer change answer reflects in customerChange', () => {
    const state = applyAnswerToJudgment({
      prior: emptyCeoJudgmentState(3),
      answer: '배송 누락을 줄이고 주문 확인 시간을 단축할 수 있습니다.',
      issueId: 'competitor_analysis',
      targetGap: 'validationTestability',
    });
    expect(state.dimensions.customerChange.status).not.toBe('unknown');
    expect(state.dimensions.customerChange.summary).toMatch(/누락|확인|단축|줄이/);
    expect(state.dimensions.problem.summary).not.toBe(state.dimensions.customerChange.summary);
  });

  it('CPO-R5 — off-slot answer meaning prioritized over question slot', () => {
    const state = applyAnswerToJudgment({
      prior: emptyCeoJudgmentState(1),
      answer: '엑셀로 주문을 관리하다 보니 배송 누락이 많습니다.',
      issueId: 'competitor_analysis',
      targetGap: 'validationTestability',
    });
    expect(state.dimensions.problem.status).not.toBe('unknown');
    expect(state.dimensions.problem.summary).toMatch(/엑셀|누락/);
  });

  it('CPO-R6 — multi-fact answer splits across dimensions', () => {
    const extracted = extractDimensionSummaries(
      '소규모 양조장이 엑셀로 주문을 관리하고 배송 누락이 생겨서 주문과 배송을 한 곳에서 관리하려고 합니다.',
      { allowMultiFact: true },
    );
    expect(extracted.customer?.summary).toMatch(/양조/);
    expect(extracted.problem?.summary).toMatch(/누락|엑셀/);
    expect(extracted.solution?.summary).toMatch(/한\s*곳|관리/);

    const state = applyAnswerToJudgment({
      prior: emptyCeoJudgmentState(0),
      answer:
        '소규모 양조장이 엑셀로 주문을 관리하고 배송 누락이 생겨서 주문과 배송을 한 곳에서 관리하려고 합니다.',
      allowMultiFact: true,
    });
    const issues = detectDimensionSeparationIssues(state);
    expect(issues.filter((i) => i.sharedSummary.length > 20)).toHaveLength(0);
  });

  it('CPO-R7 — repeated info does not duplicate as new dimension content', () => {
    let state = applyAnswerToJudgment({
      prior: emptyCeoJudgmentState(0),
      answer: '소규모 양조장과 반찬가게 사장님이 주 고객입니다.',
      targetGap: 'customerPersona',
      issueId: 'customer_definition',
    });
    const before = state.dimensions.customer.summary;
    state = applyAnswerToJudgment({
      prior: state,
      answer: '소규모 양조장과 반찬가게 사장님이 주 고객입니다.',
      targetGap: 'customerPersona',
      issueId: 'customer_definition',
    });
    expect(state.dimensions.customer.summary).toBe(before);
    expect(state.dimensions.problem.status).toBe('unknown');
  });

  it('CPO-R8 — correction updates existing judgment', () => {
    let state = applyAnswerToJudgment({
      prior: emptyCeoJudgmentState(0),
      answer: '소규모 양조장이 주 고객입니다.',
      targetGap: 'customerPersona',
    });
    state = applyAnswerToJudgment({
      prior: state,
      answer: '고객은 양조장만이 아니라 반찬가게와 꽃집도 포함합니다.',
      targetGap: 'customerPersona',
      issueId: 'customer_definition',
    });
    expect(state.dimensions.customer.summary).toMatch(/반찬|꽃집|포함/);
    expect(state.dimensions.customerChange.status).toBe('unknown');
    const change = classifyJudgmentChangeType({
      before: { status: 'needs_check', summary: '소규모 양조장이 주 고객입니다.' },
      after: { status: state.dimensions.customer.status, summary: state.dimensions.customer.summary },
    });
    expect(['CHANGED', 'STRENGTHENED', 'CONFIRMED', 'NEW', 'CONFLICTED']).toContain(change);
  });

  it('CPO-R9 — unknown answer does not invent facts', () => {
    const prior = applyAnswerToJudgment({
      prior: emptyCeoJudgmentState(0),
      answer: '배송 누락이 주문 건수의 10% 정도로 매우 심각합니다.',
      targetGap: 'problemJtbd',
    });
    const state = applyAnswerToJudgment({
      prior,
      answer: '정확한 시장 규모는 아직 모르겠습니다.',
      issueId: 'market_validation',
      targetGap: 'marketSizeEvidence',
    });
    expect(state.dimensions.problem.summary).toBe(prior.dimensions.problem.summary);
    expect(state.dimensions.customerChange.summary).toBe(prior.dimensions.customerChange.summary);
  });

  it('CPO-R10 — 20+ turn conversation maintains early→late connection', () => {
    const result = runDay8iConversation({
      projectId: 'cpo-r10',
      steps: DAY8I_30_TURN_SCENARIO.slice(0, 22),
    });
    expect(result.totalTurns).toBeGreaterThanOrEqual(20);
    const last = result.turns[result.turns.length - 1]!;
    expect(last.dimensions.customer).toMatch(/양조|반찬|소상공인|🟢|🟡/);
    expect(last.dimensions.problem).toMatch(/누락|관리|🟢|🟡/);
    clearAiPmLoopState('cpo-r10');
  });

  it('CPO-R11 — business review is judgment not input echo', () => {
    const result = runDay8iConversation({
      projectId: 'cpo-r11',
      steps: DAY8I_30_TURN_SCENARIO.slice(0, 8),
    });
    expect(result.finalReview).toBeTruthy();
    const review = result.finalReview!;
    expect(review.oneLiner.length).toBeGreaterThan(10);
    expect(review.aiJudgmentBody).not.toBe(result.businessDoc);
    expect(review.verdict).toBeTruthy();
    clearAiPmLoopState('cpo-r11');
  });

  it('CPO-R12 — trace captures answer→dimension causality', () => {
    const change = classifyJudgmentChangeType({
      before: { status: 'unknown', summary: '' },
      after: { status: 'clear', summary: '소규모 양조장 사장님' },
    });
    expect(change).toBe('NEW');

    const prior = emptyCeoJudgmentState(0);
    const after = applyAnswerToJudgment({
      prior,
      answer: '소규모 양조장 사장님이 고객입니다.',
    });
    const traceEntries = buildJudgmentTraceEntries({
      sourceTurnId: 't1',
      question: '누구를 위한 서비스인가요?',
      answer: '소규모 양조장 사장님이 고객입니다.',
      prior,
      next: after,
      dimensionMeta: {},
    });
    expect(after.dimensions.customer.summary.length).toBeGreaterThan(0);
    expect(
      traceEntries.length > 0 ||
        after.dimensions.customer.status !== prior.dimensions.customer.status,
    ).toBe(true);
  });
});

describe('DAY 8-I — 30 Turn CTO Conversation Test', () => {
  beforeEach(() => {
    stubSessionStorage();
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    vi.unstubAllGlobals();
    clearAiPmLoopState('day8i-30');
  });

  it('runs 30-turn full pipeline and produces CPO-reviewable report', () => {
    const result = runDay8iConversation({ projectId: 'day8i-30' });
    expect(result.totalTurns).toBe(30);

    const report = formatDay8iCtoReport(result);
    expect(report).toContain('# ALABOM — DAY 8-I CTO 20~30 Turn Test Report');
    expect(report).toContain('Turn 01');
    expect(report).toContain('Turn 30');
    expect(report).toContain('## 10. CTO 판정');

    const tracedTurns = result.turns.filter((t) => t.trace?.dimensionEntries.length);
    expect(tracedTurns.length).toBeGreaterThan(5);

    const review = buildBusinessReviewResult(
      applyAnswerToJudgment({
        prior: emptyCeoJudgmentState(5),
        answer: '배송 누락 감소와 확인 시간 단축이 고객에게 가장 큰 변화입니다.',
      }),
    );
    expect(review.nextAction.length).toBeGreaterThan(5);

    if (process.env.DAY8I_WRITE_REPORT === 'true') {
      const fs = require('node:fs');
      const path = require('node:path');
      const out = path.join(
        process.cwd(),
        '../../docs/evidence/ALABOM/DAY_8I_CTO_30_TURN_REPORT.md',
      );
      fs.writeFileSync(out, report, 'utf8');
    }
  }, 120_000);
});
