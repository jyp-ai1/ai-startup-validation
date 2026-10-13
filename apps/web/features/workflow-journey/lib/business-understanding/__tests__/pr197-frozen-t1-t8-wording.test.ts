/**
 * PR #197 remaining merge gate — frozen T1–T8 wording (5263e83e).
 * Records 1:1 question text vs scenario. Does not lower expected wording.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

import { saveWorkspaceDocumentText } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';

import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { resolveNextQuestionDecision } from '../resolve-next-question-decision';
import { applyTypedAnswerThroughLoop } from '../route-typed-answer-through-loop';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  patchAiPmLoopState,
} from '../workspace-ai-pm-loop-store';

const OUT = '/workspace/docs/evidence/ALABOM/AI-PM/PR197-CPO-FROZEN-T1-T8-DUMP.json';
const FROZEN_SHA = '5263e83e';

const DOCS = {
  S1: `서비스: 주문부터 배송까지 관리하는 B2B SaaS
대상: 반찬가게·꽃집 등 직접 배송 소상공인
문제: 주문과 배송을 따로 관리해야 함
수익: 월 구독`,
  S2: `서비스: 소규모 양조장 전통주를 브랜드로 묶어 온라인·팝업으로 판매
대상: 전통주를 선물·취미로 찾는 30–40대
문제: 양조장마다 채널이 흩어져 소비자가 좋은 술을 발견하기 어렵다
수익: 제품 판매 + 양조장 입점 수수료`,
  S3: `서비스: 중소 제조사의 견적·발주 메일을 읽어 엑셀 발주서를 자동으로 채우는 툴
대상: 직원 20–80명 제조사 영업관리자
문제: 메일·엑셀·ERP에 같은 숫자를 세 번 옮기다 오타가 난다
수익: 좌석 월 구독`,
  S4: `서비스: 아이 간식을 매주 집 앞으로 보내는 구독 박스
대상: 맞벌이 부모
문제: 장을 볼 시간이 없고 과자 고르기가 피곤하다
수익: 월 구독`,
  S5: `서비스: 단백질 쿠키를 자사몰에서 팝니다
대상: 운동하는 20–30대
문제: 시중 단백질바는 맛없거나 비싸다
수익: 제품 판매`,
  S6: `서비스: 가사 도우미와 맞벌이 집을 연결하는 중개 앱
대상: 맞벌이 가정 / 도우미
문제: 믿을 사람을 찾기 어렵고, 도우미는 일감이 불안정하다
수익: 거래 수수료`,
} as const;

type FrozenTurn = { expectedQuestion: string; founderAnswer: string };

const FROZEN: Record<keyof typeof DOCS, FrozenTurn[]> = {
  S1: [
    { expectedQuestion: '고객이 지금 가장 불편해하는 점은 무엇인가요?', founderAnswer: '주문과 배송을 따로 관리해야 함' },
    { expectedQuestion: '이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?', founderAnswer: '반찬가게' },
    {
      expectedQuestion:
        '반찬가게에서 이 문제를 해결할 때, 실제로 비용을 지불하거나 도입을 결정하는 사람은 누구인가요?',
      founderAnswer: '아직 모르겠음',
    },
    { expectedQuestion: '수익은 어떤 구조로 발생하나요?', founderAnswer: '월 구독' },
    { expectedQuestion: '지금은 이 문제를 어떻게 처리하나요?', founderAnswer: '지금은 주문과 배송을 따로 관리함' },
    { expectedQuestion: '반찬가게가 이걸 쓰면 무엇이 좋아지나요?', founderAnswer: '하루에 주문을 한 번에 보고 싶다' },
    { expectedQuestion: '그 변화를 보여 줄 결제·사용 증거가 있나요?', founderAnswer: '아직 없다' },
    { expectedQuestion: '다음에 무엇을 하면 판단이 바뀌나요?', founderAnswer: '창업자 확인' },
  ],
  S2: [
    { expectedQuestion: '지금 가장 크게 풀려는 불편은 무엇인가요?', founderAnswer: '전통주를 발견하기 어렵다' },
    { expectedQuestion: '이 브랜드를 가장 필요로 하는 사람은 누구인가요?', founderAnswer: '선물하는 30–40대' },
    { expectedQuestion: '술값을 실제로 내는 사람은 누구인가요?', founderAnswer: '선물하는 사람이 냄' },
    { expectedQuestion: '매출은 어디서 더 나오나요?', founderAnswer: '일단 병 판매가 먼저고 수수료는 나중' },
    {
      expectedQuestion: '선물하는 30–40대는 좋은 전통주를 찾기 어려울 때 지금은 어떻게 하나요?',
      founderAnswer: '지인에게 물어 추천받는다',
    },
    { expectedQuestion: '지인 추천 대비 이 브랜드만의 차이는 무엇인가요?', founderAnswer: '여러 양조장을 한곳에서 고른다' },
    { expectedQuestion: '그 이유로 이미 산 사람이 있나요?', founderAnswer: '아직 없다' },
    { expectedQuestion: '다음에 무엇을 확인하면 판단이 바뀌나요?', founderAnswer: '창업자 확인' },
  ],
  S3: [
    { expectedQuestion: '지금 가장 크게 줄이려는 실수는 무엇인가요?', founderAnswer: '메일 숫자를 엑셀에 옮기다 나는 오타' },
    { expectedQuestion: '이 툴을 매일 쓰는 사람은 누구인가요?', founderAnswer: '영업관리자' },
    { expectedQuestion: '월 구독료 결재자는 누구인가요?', founderAnswer: '대표' },
    { expectedQuestion: '한 달에 견적 메일이 얼마나 오나요?', founderAnswer: '아직 모르겠음' },
    { expectedQuestion: '지금은 이 숫자를 어떻게 옮기나요?', founderAnswer: '엑셀에 손으로' },
    { expectedQuestion: '오타가 나면 회사에 무엇이 나빠지나요?', founderAnswer: '잘못된 단가로 발주' },
    { expectedQuestion: '최근 3개월에 그런 오타 손실이 있었나요?', founderAnswer: '기억은 나지만 숫자 없음' },
    { expectedQuestion: '다음에 무슨 숫자가 있으면 GO를 논의할 수 있나요?', founderAnswer: '창업자 확인' },
  ],
  S4: [
    { expectedQuestion: '부모가 지금 가장 귀찮아하는 점은 무엇인가요?', founderAnswer: '무엇을 줄지 고르기 싫다' },
    { expectedQuestion: '박스를 가장 반기는 사람은 누구인가요?', founderAnswer: '아이' },
    { expectedQuestion: '구독료는 누가 내나요?', founderAnswer: '부모' },
    { expectedQuestion: '지금은 아이 간식을 어떻게 사나요?', founderAnswer: '쿠팡 검색' },
    { expectedQuestion: '쿠팡 대신 이 박스를 고르는 이유는 무엇인가요?', founderAnswer: '고민 없이 온다' },
    {
      expectedQuestion: '이미 구독료를 낸 부모가 있나요?',
      founderAnswer: '사실 아이가 아니라 혼자 사는 20대가 메인이에요',
    },
    { expectedQuestion: '어느 쪽이 지금 맞는 고객인가요?', founderAnswer: '지금 메인 고객은 혼자 사는 20대예요' },
    { expectedQuestion: '20대 1인 가구가 이미 결제한 적이 있나요?', founderAnswer: '없다' },
  ],
  S5: [
    { expectedQuestion: '고객이 지금 단백질 간식에서 가장 불만인 점은 무엇인가요?', founderAnswer: '맛이 없다' },
    { expectedQuestion: '그 불만을 가장 세게 느끼는 사람은 누구인가요?', founderAnswer: '헬스장 다니는 20–30대' },
    { expectedQuestion: '지금은 어떤 단백질 간식을 사나요?', founderAnswer: '시중 단백질바' },
    { expectedQuestion: '기존 바 대신 고르는 이유는 무엇인가요?', founderAnswer: '더 맛있다' },
    {
      expectedQuestion: '쿠키값은 누가 내나요?',
      founderAnswer: '헬스 트레이너가 회원에게 추천하고 회원이 결제',
    },
    { expectedQuestion: '이미 두 번 이상 산 고객이 있나요?', founderAnswer: '한 번만' },
    { expectedQuestion: '그 1회 구매를 어떻게 보나요?', founderAnswer: '내가 지인에게 판 것' },
    { expectedQuestion: '다음에 무슨 증거가 있으면 판단이 바뀌나요?', founderAnswer: '창업자 확인' },
  ],
  S6: [
    { expectedQuestion: '지금 먼저 풀 쪽은 어디인가요?', founderAnswer: '집이 믿을 사람을 못 구함' },
    { expectedQuestion: '집이 지금 가장 걱정하는 점은 무엇인가요?', founderAnswer: '사람을 못 믿음' },
    { expectedQuestion: '지금은 도우미를 어떻게 구하나요?', founderAnswer: '지인 소개' },
    { expectedQuestion: '중개 수수료는 누가 내나요?', founderAnswer: '집이 냄' },
    { expectedQuestion: '지인 소개 대신 이 앱을 쓰는 이유는 무엇인가요?', founderAnswer: '신원 확인' },
    { expectedQuestion: '지금 앱에 활동 가능한 도우미가 있나요?', founderAnswer: '아직 집만 있음' },
    { expectedQuestion: '집이 신원 확인 때문에 이미 수수료를 낸 적이 있나요?', founderAnswer: '없다' },
    { expectedQuestion: '다음에 어느 면을 먼저 실험할까요?', founderAnswer: '창업자 확인' },
  ],
};

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ').replace(/[?？]/g, '?');
}

function stubSessionStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  });
  vi.stubGlobal('window', { sessionStorage: globalThis.sessionStorage });
}

function reset(projectId: string, documentText: string) {
  clearAiPmLoopState(projectId);
  saveWorkspaceDocumentText(documentText, projectId);
  patchAiPmLoopState(
    {
      readingCompleted: true,
      dismissedReadAck: true,
      phase: 'answer',
      currentIssueId: 'problem_definition',
      ceoJudgment: emptyCeoJudgmentState(0),
    },
    projectId,
  );
}

function livingNow(projectId: string, documentText: string) {
  const loop = loadAiPmLoopState(projectId);
  const memory = buildConversationMemoryFromSources({
    projectId,
    documentText,
    turns: loop.turns,
    gapState: loop.gapState,
  });
  return {
    loop,
    memory,
    living: buildLivingUnderstandingState({
      documentText,
      understanding: buildBusinessUnderstanding(documentText),
      turns: loop.turns,
      memory,
      gapState: loop.gapState,
    }),
  };
}

function currentDecision(projectId: string, documentText: string) {
  const { loop, living, memory } = livingNow(projectId, documentText);
  return resolveNextQuestionDecision({
    living,
    turns: loop.turns,
    memory,
    gapState: loop.gapState,
    projectId,
    judgment: loop.ceoJudgment,
  });
}

function gitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'UNKNOWN';
  }
}

describe('PR #197 frozen T1–T8 wording (5263e83e)', () => {
  beforeEach(() => {
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
    stubSessionStorage();
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('records 1:1 asked vs frozen T1–T8 without lowering expected wording', () => {
    const scenarios: Record<string, unknown> = {};
    let exactMatches = 0;
    let compared = 0;

    for (const id of Object.keys(FROZEN) as Array<keyof typeof DOCS>) {
      const pid = `frozen-${id}`;
      reset(pid, DOCS[id]);
      const turns: Array<Record<string, unknown>> = [];
      let nextQ: string | null = currentDecision(pid, DOCS[id])?.questionText ?? null;
      let nextGap = currentDecision(pid, DOCS[id])?.targetGapId ?? currentDecision(pid, DOCS[id])?.targetGap ?? null;

      for (let i = 0; i < FROZEN[id].length; i += 1) {
        const frozen = FROZEN[id][i]!;
        const asked = nextQ ?? '';
        const gap = String(nextGap ?? '');
        const exact = Boolean(asked) && normalize(asked) === normalize(frozen.expectedQuestion);
        compared += 1;
        if (exact) exactMatches += 1;

        if (!asked || !gap) {
          turns.push({
            turn: i + 1,
            expectedQuestion: frozen.expectedQuestion,
            askedQuestion: asked || null,
            askedGap: gap || null,
            founderAnswer: frozen.founderAnswer,
            exactMatch: false,
            status: 'FAIL',
            reason: 'engine had no next question',
          });
          break;
        }

        const after = applyTypedAnswerThroughLoop({
          projectId: pid,
          documentText: DOCS[id],
          answer: frozen.founderAnswer,
          askedGap: gap,
          askedQuestionText: asked,
          customerCompleteness: loadAiPmLoopState(pid).gapState?.gaps.customerPersona?.completeness,
        });

        turns.push({
          turn: i + 1,
          expectedQuestion: frozen.expectedQuestion,
          askedQuestion: asked,
          askedGap: gap,
          founderAnswer: frozen.founderAnswer,
          exactMatch: exact,
          status: exact ? 'PASS' : 'FAIL',
          nextQuestion: after.nextQuestionText,
          nextTargetGap: after.nextTargetGap,
        });

        nextQ = after.nextQuestionText ?? null;
        nextGap = after.nextTargetGap ?? null;
      }

      const matchCount = turns.filter((t) => t.exactMatch === true).length;
      scenarios[id] = {
        turnCount: turns.length,
        exactMatchCount: matchCount,
        allEightExact: matchCount === 8,
        verdict: {
          status: matchCount === 8 ? 'PASS' : 'FAIL',
          reason: `${id} exact wording ${matchCount}/8 vs frozen ${FROZEN_SHA}`,
        },
        turns,
      };
    }

    const dump = {
      meta: {
        implSha: gitSha(),
        executedAt: new Date().toISOString(),
        frozenScenarioSha: FROZEN_SHA,
        path: 'engine resolveNextQuestionDecision → applyTypedAnswerThroughLoop',
        note: '1:1 wording. Expected text is 5263e83e. Failures are not relaxed.',
        production: 'NOT VERIFIED',
        googleOauth: 'NOT VERIFIED',
      },
      totals: {
        compared,
        exactMatches,
        allScenariosExact: Object.values(scenarios).every(
          (s) => (s as { allEightExact?: boolean }).allEightExact === true,
        ),
      },
      scenarios,
    };
    writeFileSync(OUT, `${JSON.stringify(dump, null, 2)}\n`);

    expect(compared).toBeGreaterThanOrEqual(8);
    expect(dump.meta.frozenScenarioSha).toBe(FROZEN_SHA);
  });
});
