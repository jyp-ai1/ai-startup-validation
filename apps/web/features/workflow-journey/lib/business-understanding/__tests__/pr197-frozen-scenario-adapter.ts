/**
 * PR #197 verification adapter — frozen scenario 5263e83e vs engine SoT.
 *
 * Not product runtime. Does not change Stage A / FIX-10 / T7 payer-hold.
 * Maps frozen founder answers onto the gap the engine actually asked so
 * stop vs wording vs order can be measured separately.
 */

export const FROZEN_SCENARIO_SHA = '5263e83e';

export const FROZEN_DOCS = {
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

export type FrozenTurn = { expectedQuestion: string; founderAnswer: string };

/** Exact 5263e83e wording. Do not relax. */
export const FROZEN_TURNS: Record<ScenarioId, FrozenTurn[]> = {
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

export type ScenarioId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6';

export type MismatchClass =
  | 'EXACT'
  | 'FIRST_QUESTION'
  | 'ORDER'
  | 'WORDING'
  | 'STOP'
  | 'OFF_SLOT_ANSWER';

/** Frozen T1–T8 intended gap. S6 T1 has no engine gap (side-select presenter). */
export const FROZEN_INTENDED_GAP: Record<ScenarioId, string[]> = {
  S1: [
    'problemJtbd',
    'customerPersona',
    'payer',
    'revenueModel',
    'alternativesCompetitors',
    'solution',
    'validationTestability',
    'validationTestability',
  ],
  S2: [
    'problemJtbd',
    'customerPersona',
    'payer',
    'revenueModel',
    'alternativesCompetitors',
    'differentiationVsAlternatives',
    'validationTestability',
    'validationTestability',
  ],
  S3: [
    'problemJtbd',
    'customerPersona',
    'payer',
    'problemFrequencySeverity',
    'alternativesCompetitors',
    'solution',
    'validationTestability',
    'validationTestability',
  ],
  S4: [
    'problemJtbd',
    'customerPersona',
    'payer',
    'alternativesCompetitors',
    'differentiationVsAlternatives',
    'customerPersona',
    'customerPersona',
    'validationTestability',
  ],
  S5: [
    'problemJtbd',
    'customerPersona',
    'alternativesCompetitors',
    'differentiationVsAlternatives',
    'payer',
    'validationTestability',
    'validationTestability',
    'validationTestability',
  ],
  S6: [
    'marketplaceSide',
    'problemJtbd',
    'alternativesCompetitors',
    'payer',
    'differentiationVsAlternatives',
    'executionConstraints',
    'validationTestability',
    'validationTestability',
  ],
};

/** Scripted playback start. followEngine already hardcodes this — not engine SoT. */
export const FROZEN_PLAYBACK_FIRST_GAP: Record<ScenarioId, string> = {
  S1: 'problemJtbd',
  S2: 'problemJtbd',
  S3: 'problemJtbd',
  S4: 'problemJtbd',
  S5: 'problemJtbd',
  S6: 'problemJtbd',
};

export const ENGINE_SOT_FIRST_GAP = 'customerPersona';

export function normalizeQuestion(text: string): string {
  return text.trim().replace(/\s+/g, ' ').replace(/[?？]/g, '?');
}

export function classifyTurnMismatch(input: {
  turn: number;
  askedQuestion: string | null;
  expectedQuestion: string;
  askedGap: string | null;
  frozenIntendedGap: string;
  founderAnswerAppliedToAskedGap: boolean;
}): MismatchClass[] {
  const classes: MismatchClass[] = [];
  const asked = input.askedQuestion?.trim() ?? '';
  if (!asked || !input.askedGap) {
    classes.push('STOP');
    return classes;
  }
  if (normalizeQuestion(asked) === normalizeQuestion(input.expectedQuestion)) {
    classes.push('EXACT');
    return classes;
  }
  if (input.turn === 1 && input.askedGap !== input.frozenIntendedGap) {
    classes.push('FIRST_QUESTION');
  }
  if (input.askedGap !== input.frozenIntendedGap) {
    classes.push('ORDER');
  } else {
    classes.push('WORDING');
  }
  if (!input.founderAnswerAppliedToAskedGap) {
    classes.push('OFF_SLOT_ANSWER');
  }
  return classes;
}

export function pickFrozenAnswerForGap(
  frozenTurns: Array<{ expectedQuestion: string; founderAnswer: string }>,
  intendedGaps: string[],
  askedGap: string,
  usedIndexes: Set<number>,
): { answer: string; frozenTurn: number; intendedGap: string } | null {
  for (let i = 0; i < intendedGaps.length; i += 1) {
    if (usedIndexes.has(i)) continue;
    if (intendedGaps[i] === askedGap) {
      const row = frozenTurns[i];
      if (!row) continue;
      usedIndexes.add(i);
      return { answer: row.founderAnswer, frozenTurn: i + 1, intendedGap: askedGap };
    }
  }
  return null;
}

export const ONSLOT_FALLBACK: Record<string, string> = {
  customerPersona: '이 서비스를 가장 필요로 하는 사람은 문서에 적은 대상입니다',
  problemJtbd: '지금 가장 크게 해결하려는 불편은 문서에 적은 문제입니다',
  payer: '도입을 결정하는 사람은 아직 모르겠음',
  solution: '문제를 한곳에서 보이게 하는 방식입니다',
  revenueModel: '월 구독',
  alternativesCompetitors: '지금은 기존 방식으로 처리합니다',
  differentiationVsAlternatives: '한곳에서 고를 수 있는 점이 다릅니다',
  validationTestability: '아직 결제·반복 사용 증거는 없다',
  marketChannel: '아직 모르겠음',
  problemFrequencySeverity: '아직 모르겠음',
  executionConstraints: '아직 집만 있고 공급은 없습니다',
  businessOneLiner: '문서에 적은 한 줄이 맞습니다',
};

export function resolveOnSlotAnswer(
  frozenTurns: Array<{ expectedQuestion: string; founderAnswer: string }>,
  intendedGaps: string[],
  askedGap: string,
  usedIndexes: Set<number>,
): { answer: string; source: 'frozen-mapped' | 'fallback'; frozenTurn: number | null } {
  const mapped = pickFrozenAnswerForGap(frozenTurns, intendedGaps, askedGap, usedIndexes);
  if (mapped) {
    return { answer: mapped.answer, source: 'frozen-mapped', frozenTurn: mapped.frozenTurn };
  }
  return {
    answer: ONSLOT_FALLBACK[askedGap] ?? '아직 모르겠음',
    source: 'fallback',
    frozenTurn: null,
  };
}
