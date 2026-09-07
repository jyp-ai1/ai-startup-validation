import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import { setAiPmJudgmentMeaningModelV1ForTest } from '../ai-pm-judgment-meaning-model-v1';
import { setAiPmJudgmentFix5V1ForTest } from '../ai-pm-judgment-fix5-v1';
import { setAiPmAnswerSemanticSotV1ForTest } from '../ai-pm-answer-semantic-sot-v1';
import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import { clearAiPmLoopState } from '../workspace-ai-pm-loop-store';
import { clearProjectConsultingState } from '../project-consulting-store';
import {
  runDay8iConversation,
} from '../day8i-conversation-harness';
import {
  detectCrossDimensionCopy,
  evaluateFinalReviewDimensions,
  evaluateTurnExpectation,
  type TurnAcceptanceFailure,
} from '../day8i-fix3-turn-acceptance';
import { evaluateAllSemanticChains } from '../day8i-fix4-semantic-chain';
import { evaluateAllFix5Turns, FIX5_CRITICAL_TURN_EXPECTATIONS } from '../day8i-fix5-turn-acceptance';
import { extractAnswerSemanticEvidences } from '../ai-pm-answer-semantic-sot';

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

function formatFailures(failures: TurnAcceptanceFailure[]): string {
  return failures
    .map(
      (f) =>
        `Turn ${f.turnIndex} [${f.label}] ${f.field}: expected ${f.expected}, actual ${f.actual}`,
    )
    .join('\n');
}

describe('DAY 8-I P0 FIX-3 — Answer Semantic SoT', () => {
  beforeEach(() => {
    stubSessionStorage();
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
    setAiPmAnswerSemanticSotV1ForTest(true);
    setAiPmJudgmentMeaningModelV1ForTest(true);
    setAiPmJudgmentFix5V1ForTest(true);
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    setAiPmAnswerSemanticSotV1ForTest(null);
    setAiPmJudgmentMeaningModelV1ForTest(null);
    setAiPmJudgmentFix5V1ForTest(null);
    vi.unstubAllGlobals();
    clearAiPmLoopState('fix3-accept');
    clearProjectConsultingState('fix3-accept');
  });

  it('P0-2 — 8 semantic mapping cases (answer → dimension)', () => {
    const cases: Array<{
      answer: string;
      expectDims: string[];
      forbidDims: string[];
    }> = [
      {
        answer: '소규모 양조장과 반찬가게 사장님이 주 고객입니다.',
        expectDims: ['customer'],
        forbidDims: ['problem'],
      },
      {
        answer: '엑셀로 주문을 관리하다 보니 배송 누락이 많습니다.',
        expectDims: ['problem'],
        forbidDims: ['customer'],
      },
      {
        answer: '주문과 배송을 한 곳에서 관리하는 SaaS를 만들려고 합니다.',
        expectDims: ['solution'],
        forbidDims: [],
      },
      {
        answer: '배송 누락을 줄이고 주문 확인 시간을 단축할 수 있습니다.',
        expectDims: ['customerChange'],
        forbidDims: [],
      },
      {
        answer: '월 구독 3만원으로 소상공인이 직접 결제합니다.',
        expectDims: [],
        forbidDims: ['customer', 'problem', 'solution', 'customerChange'],
      },
      {
        answer: '직접 배송 소상공인 500곳을 1년 내 목표로 합니다.',
        expectDims: [],
        forbidDims: ['customer', 'problem', 'solution', 'customerChange'],
      },
      {
        answer: '정확한 시장 규모는 아직 모르겠습니다.',
        expectDims: [],
        forbidDims: ['customer', 'problem'],
      },
      {
        answer: '경쟁사가 누군지 모르겠습니다. 확인해주세요.',
        expectDims: [],
        forbidDims: ['customer', 'problem', 'solution', 'customerChange'],
      },
    ];

    for (const c of cases) {
      const { evidences, frozen, nonJudgmentSlot } = extractAnswerSemanticEvidences(c.answer);
      const dims = evidences.map((e) => e.dimension);
      for (const d of c.expectDims) {
        expect(dims, c.answer).toContain(d);
      }
      for (const d of c.forbidDims) {
        expect(dims, c.answer).not.toContain(d);
      }
      if (c.answer.includes('확인해주세요')) {
        expect(nonJudgmentSlot).toBe('researchIntent');
      }
      if (c.answer.includes('시장 규모')) {
        expect(frozen).toBe(true);
      }
    }
  });

  it('P0-5/6 — 30-turn strict dimension/evidence/state acceptance', () => {
    const result = runDay8iConversation({ projectId: 'fix3-accept' });
    expect(result.totalTurns).toBe(30);

    const failures: TurnAcceptanceFailure[] = [];

    for (const spec of FIX5_CRITICAL_TURN_EXPECTATIONS) {
      const turn = result.turns[spec.turnIndex - 1];
      if (!turn) {
        failures.push({
          turnIndex: spec.turnIndex,
          label: spec.label,
          field: 'turn',
          expected: 'turn record',
          actual: 'missing',
        });
        continue;
      }
      failures.push(...evaluateTurnExpectation(spec, turn));
    }

    failures.push(...evaluateAllSemanticChains(result.turns));
    failures.push(...evaluateAllFix5Turns(result.turns, result.finalJudgmentSnapshot));

    if (result.finalJudgmentSnapshot) {
      failures.push(...detectCrossDimensionCopy(result.finalJudgmentSnapshot));
    }
    failures.push(...evaluateFinalReviewDimensions(result.finalJudgmentSnapshot));

    expect(result.repeatedQuestions.length, 'repeated display questions').toBe(0);
    expect(result.repeatedNextQuestions.length, 'repeated next questions').toBe(0);

    if (failures.length > 0) {
      console.log(formatFailures(failures));
    }
    expect(failures, formatFailures(failures)).toHaveLength(0);
  }, 180_000);
});
