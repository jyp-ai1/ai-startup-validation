import type { FounderAnswer, JourneyState } from './journey-types';
import { withCurrentQuestion } from './journey-engine';

export type DesignStance = 'hypothesis' | 'unknown' | 'counter' | 'experience' | 'claimed_record';

export type BusinessDraft = {
  liveModelCall: false;
  analysisKind: 'deterministic_reanalysis';
  label: '규칙 재분석 · 외부 모델 호출 아님';
  pass: number;
  businessModel: string;
  customer: string;
  problem: string;
  differentiation: string;
  price: string;
  profitability: string;
  execution: string;
  judgment: string;
  changed: string[];
  unchanged: string[];
  documentClaims: string[];
  founderStatements: string[];
  inferences: string[];
  assumptions: string[];
  externalNotes: string[];
  uncertainties: string[];
  counter: string[];
  nextStep: string;
  verifiedFact: false;
};

const LABEL = '규칙 재분석 · 외부 모델 호출 아님';

export function refinePlan(state: JourneyState): BusinessDraft | null {
  const plan = state.planCase;
  if (!plan || plan.profile === 'unrecognized') return null;
  return plan.profile === 'lmulm' ? lmulmDraft(state) : ridmDraft(state);
}

export function recordDesignAnswer(
  state: JourneyState,
  input: { text: string; stance: DesignStance; now: string },
): { applied: boolean; state: JourneyState; reason: string } {
  if (!state.planCase || state.planCase.profile === 'unrecognized') {
    return { applied: false, state, reason: '사업계획서 분석이 없으면 재분석하지 않는다.' };
  }
  const text = input.text.trim();
  if (!text) return { applied: false, state, reason: '빈 답은 재분석하지 않는다.' };
  const duplicate = state.answers.some(
    (answer) => answer.uncertaintyId === 'u-design' && answer.freeText.trim() === text,
  );
  if (duplicate) {
    return { applied: false, state, reason: '같은 구체화 답변이다. 계획을 다시 쓰지 않는다.' };
  }
  const answer: FounderAnswer = {
    id: `ans-${state.answers.length + 1}`,
    uncertaintyId: 'u-design',
    hypothesisId: 'h-business',
    questionText: '대표의 구체화 답변',
    choiceId: input.stance,
    choiceLabel: stanceLabel(input.stance),
    freeText: text,
    grade: input.stance === 'unknown' ? 'unknown' : input.stance === 'claimed_record' ? 'claimed_record' : 'founder_estimate',
    claimLabel: input.stance === 'claimed_record' ? '주장된 기록' : input.stance === 'unknown' ? '모름' : '가설',
    receivedAt: input.now,
    previousValue: state.judgmentText,
    delta: input.stance === 'counter' ? 'conflict_opened' : 'detail_added',
    material: true,
  };
  return {
    applied: true,
    state: withCurrentQuestion({ ...state, answers: [...state.answers, answer] }),
    reason: '답변을 가설 또는 주장으로 두고 사업 초안을 다시 썼다. 검증된 사실로 올리지 않았다. 외부 모델은 호출하지 않았다.',
  };
}

function lmulmDraft(state: JourneyState): BusinessDraft {
  const designs = designNotes(state);
  const repurchase = latest(state, 'u-lmulm-repurchase');
  const alertFirst = designs.some((answer) => /알림|일정/.test(answer.freeText));
  const repeatUnproven =
    repurchase?.choiceId === 'unknown' ||
    designs.some((answer) => /가정|반복|재구매|모른다/.test(answer.freeText));
  const base = {
    liveModelCall: false as const,
    analysisKind: 'deterministic_reanalysis' as const,
    label: LABEL,
    verifiedFact: false as const,
    externalNotes: ['LMULM의 공개 실적을 이번 실행에서 새로 확인하지 않았다.'],
    documentClaims: [
      '2023년 8~12월 매출 2,000만 원과 전환율은 사업계획서의 주장이다.',
      '리셀 수수료 3~5%는 문서에 예정으로 적혀 있다.',
    ],
    uncertainties: ['원장 검증', '반복 구매', '주문별 공헌이익'],
    counter: ['첫 구매와 같은 플랫폼에서의 반복 재판매는 다른 행동이다.'],
  };

  if (alertFirst) {
    return {
      ...base,
      pass: 2,
      businessModel: '현재 모델은 한정판 일정 알림과 커머스 마진이다. 리셀 수수료는 반복 주문이 보이기 전까지 모델에서 빼 두었다.',
      customer: '한정판 문구 수집가. 리셀 참여자는 아직 같은 고객으로 두지 않는다.',
      problem: '수집가가 출시 일정을 놓치는 문제만 현재 문제로 둔다. 재판매 번거로움은 반복 주문이 생긴 뒤의 문제다.',
      differentiation: '일정 알림을 먼저 제공하고, 구매 이력이 쌓인 뒤에만 리셀을 연다.',
      price: '판매 마진은 문서상 30~40% 주장으로 남긴다. 리셀 수수료는 가격표에 넣지 않는다.',
      profitability: '주문별 배송·결제·반품 비용은 여전히 없다. 알림 모델의 공헌이익도 계산하지 않았다.',
      execution: '알림을 받을 수집가의 기준과 첫 판매 상품 하나를 정한다. 그 상품의 결제 원문이 생기기 전에는 매출 목표를 올리지 않는다.',
      judgment: '반복 구매 가정은 유지된다. 사업 초안은 알림·커머스 마진으로 좁혀졌다. 검증된 사실이 아니다. 사업성 판단은 유보한다.',
      changed: [
        '수익모델에서 리셀 수수료를 뺐다.',
        '현재 문제를 출시 일정 알림으로 좁혔다.',
        '다음 실행을 수집가 기준과 첫 상품 하나로 바꿨다.',
      ],
      unchanged: [
        '2023년 매출 2,000만 원은 원장으로 확인되지 않은 문서 주장이다.',
        '반복 구매는 사실이 아니다.',
        '사업성 판단은 유보다.',
      ],
      founderStatements: designs.map((answer) => `${answer.claimLabel}: ${answer.freeText}`),
      inferences: ['반복 구매가 가정이면 수수료 매출을 현재 모델에 넣지 않는 편이 일관된다.'],
      assumptions: ['수집가가 일정 알림에 반응한다는 것은 아직 가정이다.'],
      nextStep: '질문 대신 실행: 알림을 받을 수집가 기준과 첫 상품 하나를 적는다. 재구매율 질문은 반복하지 않는다.',
    };
  }

  if (repeatUnproven) {
    return {
      ...base,
      pass: 1,
      businessModel: '한정판 판매와 리셀 반복을 한 모델로 두지 않는다. 판매는 문서상 사업이고, 리셀 반복은 아직 설계되지 않은 가설이다.',
      customer: '한정판 문구 수집가. 재판매 참여자로 자동 확장하지 않는다.',
      problem: '검색이 번거롭다는 문서 주장과, 구매 후 반복 재판매한다는 가설을 분리한다.',
      differentiation: '일정·정보 제공은 문서상 제안이다. 구매 이력 리셀은 반복이 확인되기 전의 제안이다.',
      price: '마진 30~40%는 문서 주장이다. 리셀 수수료 3~5%는 가격으로 확정하지 않는다.',
      profitability: '반복 구매가 가정이므로 수수료 수익으로 공헌이익을 계산하지 않는다. 주문별 비용도 없다.',
      execution: '수집가 한 집단에서 90일 안에 같은 고객의 재주문이 있는지만 주문 원장으로 센다.',
      judgment: '반복 구매는 대표의 가설로 남는다. 첫 구매 주장을 리셀 성립의 근거로 쓰지 않는다. 검증된 사실이 아니다. 사업성 판단은 유보한다.',
      changed: [
        '사업모델을 한정판 판매와 리셀 반복으로 나눴다.',
        '리셀 수수료를 현재 가격표에서 보류했다.',
        '다음 행동을 재구매 질문에서 90일 재주문 집계로 바꿨다.',
      ],
        unchanged: [
          '2023년 매출 2,000만 원 주장은 문서 주장으로 유지된다.',
          '주문별 공헌이익은 계산되지 않았다.',
          '사업성 판단은 유보다.',
        ],
      founderStatements: statementLines(state, repurchase, designs),
      inferences: ['문구를 산 고객이 같은 플랫폼에서 다시 산다는 보장은 없다.'],
      assumptions: ['반복 구매는 가정이다. 구매 주기는 모른다.'],
      nextStep: '질문 대신 실행: 주문 원장에서 같은 고객의 90일 재주문만 센다. 재구매율을 다시 묻지 않는다.',
    };
  }

  return {
    ...base,
    pass: 0,
    businessModel: '문서는 한정판 문구 커머스와 리셀 플랫폼을 한 사업으로 적는다. 리셀 수수료는 예정이다.',
    customer: '한정판 문구를 수집하는 고객.',
    problem: '한정판 검색과 구매 후 재판매가 번거롭다는 문서 주장이다.',
    differentiation: '일정·정보와 구매 이력 기반 리셀을 함께 적는다. 경쟁 비교는 문서에 없다.',
    price: '판매 마진 30~40%. 리셀 수수료 3~5%는 예정.',
    profitability: '주문별 배송·결제·반품·운영비가 없어 공헌이익을 계산할 수 없다.',
    execution: '앱 출시와 공급 협력은 문서 문장이다. 반복 거래 운영은 없다.',
    judgment: state.judgmentText,
    changed: [],
    unchanged: ['아직 대표 답변이 없어 문서 구조를 유지한다.'],
    founderStatements: [],
    inferences: ['첫 구매와 반복 재판매를 한 근거로 읽으면 리셀 모델이 성립한 것처럼 보인다. 그렇게 읽지 않는다.'],
    assumptions: ['반복 매출은 문서의 예정 문장이지 확인된 행동이 아니다.'],
    nextStep: '질문 하나: 구매 고객이 다시 샀는지, 재구매는 가정인지. 앱 다운로드나 판매 건수로는 리셀을 판단하지 않는다.',
  };
}

function ridmDraft(state: JourneyState): BusinessDraft {
  const designs = designNotes(state);
  const payers = latest(state, 'u-ridm-payers');
  const urlExperiment = designs.some((answer) => /URL|창작자|지불 의향/.test(answer.freeText));
  const noPayer =
    payers?.choiceId === 'none' ||
    payers?.choiceId === 'unknown' ||
    designs.some((answer) => /없다|모름|가설/.test(answer.freeText));
  const base = {
    liveModelCall: false as const,
    analysisKind: 'deterministic_reanalysis' as const,
    label: LABEL,
    verifiedFact: false as const,
    externalNotes: [
      '이전에 제출된 공개 출처 메모만 남긴다. 이번 실행에서 웹을 다시 열지 않았고 모델을 호출하지 않았다.',
      'FLOAT 공개 설명은 제품 소개다. 유료 고객 수나 매출이 아니다.',
      'Character.AI 비용 보도는 시장 사례다. RIDM의 결제 사실이 아니다.',
    ],
    documentClaims: [
      '구독 월 9,900원과 MAU·전환율·ARR 산식은 문서의 미래 가정이다.',
      '문서는 현재 Pre-revenue라고 적는다.',
    ],
    uncertainties: ['최초 결제', '유지율', '무엇에 돈을 내는지', '호출 1회 비용'],
    counter: ['사용량이 늘어도 추론 비용이 구독·광고 수익을 넘으면 수익이 성립하지 않을 수 있다.'],
  };

  if (urlExperiment) {
    return {
      ...base,
      pass: 2,
      businessModel: '현재 실험 모델은 창작자가 캐릭터 URL 하나를 여는 지불 의향이다. 구독·후원·광고·B2B·마켓은 나중 수익원으로 내려 두었다.',
      customer: '개인 창작자. 캐릭터 운영자, 전문가, 기업은 이번 실험의 고객이 아니다.',
      problem: '창작자가 자기 캐릭터의 주소를 유료로 열 이유가 있는지가 현재 문제다.',
      differentiation: '감정·기억 엔진은 문서와 공개 소개의 제품 설명이다. 이번 실험의 판매 항목은 URL 개방 하나다.',
      price: '실험 가격은 정하지 않는다. 월 9,900원은 문서 가정으로 남기고 실험 가격으로 쓰지 않는다.',
      profitability: '가격을 정하기 전에 호출 1회 비용이 필요하다. 그 숫자는 없다.',
      execution: '창작자 5명에게 URL 개방에 낼 금액을 묻는다. 그 답은 매출이 아니다. 실제 결제 원문이 생기면 그때 유지와 비용을 본다.',
      judgment: '유료 수요는 여전히 없다. 사업 초안은 창작자 URL 실험으로 좁혀졌다. 검증된 사실이 아니다. 사업성 판단은 유보한다.',
      changed: [
        '고객을 창작자로 좁혔다.',
        '판매 항목을 캐릭터 URL 하나로 좁혔다.',
        '월 9,900원을 실험 가격에서 뺐다.',
      ],
      unchanged: [
        '실제 결제 고객은 없다.',
        '문서의 구독 산술은 미래 가정으로 남아 있다.',
        '사업성 판단은 유보다.',
      ],
      founderStatements: designs.map((answer) => `${answer.claimLabel}: ${answer.freeText}`),
      inferences: ['가격을 문서 가정으로 고정하면 지불 의향과 문서 가격을 구분할 수 없다.'],
      assumptions: ['창작자가 URL에 돈을 낼 수 있다는 것은 실험 가설이다.'],
      nextStep: '질문 대신 실행: 창작자 5명의 지불 의향 금액을 적는다. 유료 고객이 있냐고 다시 묻지 않는다.',
    };
  }

  if (noPayer) {
    return {
      ...base,
      pass: 1,
      businessModel: '운영 모델은 Pre-revenue다. 문서의 7개 수익원과 ARR은 운영 매출로 넣지 않는다.',
      customer: '개인 창작자, 캐릭터 운영자, 전문가, 기업은 문서의 대상이다. 돈을 낸 고객은 없다.',
      problem: '자신의 AI를 사업화하기 어렵다는 문서 주장은 유지한다. 그 문제에 돈을 낸 기록은 없다.',
      differentiation: '생성, 독립 URL, API, 구독·후원·광고·B2B는 문서상 범위다. 유료로 선택된 기능은 없다.',
      price: '월 9,900원은 문서 가정이다. 현재 받는 가격이 아니다.',
      profitability: '유료 고객이 없으므로 유지율과 고객당 비용을 실적으로 계산하지 않는다.',
      execution: '첫 결제가 일어나는 고객 하나와 그 고객이 내는 기능 하나를 정하는 실험을 설계한다. 전환율 목표를 다시 설명하지 않는다.',
      judgment: '유료 고객이 없다는 답으로 전환율과 ARR은 실적이 되지 않는다. 검증된 사실이 아니다. 사업성 판단은 유보한다.',
      changed: [
        'ARR과 전환율을 운영 매출에서 뺐다.',
        '월 9,900원을 현재 가격이 아닌 문서 가정으로 내렸다.',
        '다음 행동을 첫 결제 실험 설계로 바꿨다.',
      ],
      unchanged: [
        '문서의 구독 산술 자체는 지우지 않는다. 미래 가정으로 남긴다.',
        'Pre-revenue 문장은 유지된다.',
        '추론 비용 숫자는 여전히 없다.',
      ],
      founderStatements: statementLines(state, payers, designs),
      inferences: ['산식이 문서와 맞아도 유료 전환과 유지는 따라오지 않는다.'],
      assumptions: ['7개 수익원은 동시에 성립한다는 보장이 없다.'],
      nextStep: '질문 대신 실행: 첫 결제의 고객과 기능 하나를 정한다. 전환율 가정을 다시 설명하지 않는다.',
    };
  }

  return {
    ...base,
    pass: 0,
    businessModel: '문서는 AI 에이전트 생성·배포와 구독·후원·광고·B2B 등 여러 수익원을 한 플랫폼으로 적는다.',
    customer: '개인 창작자, AI 캐릭터 운영자, 전문가, 기업.',
    problem: '자신의 AI를 만들어 사업화하기 어렵다는 문서 주장이다.',
    differentiation: '감정·기억, 독립 URL, API는 문서와 공개 소개의 제품 범위다. 경쟁 대비 유료 차별은 확인되지 않았다.',
    price: '구독 월 9,900원. MAU·전환율·ARR은 미래 산식이다.',
    profitability: '유료 고객, 유지율, 호출 비용이 없어 수익성을 계산할 수 없다.',
    execution: '내부 베타와 기능 개발 완료는 문서 문장이다. 결제 실험은 없다.',
    judgment: state.judgmentText,
    changed: [],
    unchanged: ['아직 대표 답변이 없어 Pre-revenue와 미래 가정을 분리한 채로 둔다.'],
    founderStatements: [],
    inferences: ['구독 인원 × 9,900원 × 12의 산술이 맞아도 그 인원이 생긴 것은 아니다.'],
    assumptions: ['전환율과 유지는 문서의 가정이다.'],
    nextStep: '질문 하나: 결제가 완료된 유료 고객이 있는가. 있다면 결제 원문, 없다면 첫 결제 실험, 모르면 결제 자료를 확인한다.',
  };
}

function designNotes(state: JourneyState): FounderAnswer[] {
  return state.answers.filter((answer) => answer.uncertaintyId === 'u-design' && answer.material);
}

function latest(state: JourneyState, uncertaintyId: string): FounderAnswer | undefined {
  return [...state.answers].reverse().find((answer) => answer.uncertaintyId === uncertaintyId);
}

function statementLines(state: JourneyState, answer: FounderAnswer | undefined, designs: FounderAnswer[]): string[] {
  const lines = designs.map((item) => `${item.claimLabel}: ${item.freeText}`);
  if (answer) lines.unshift(`${answer.claimLabel}: ${answer.choiceLabel}${answer.freeText ? ` / ${answer.freeText}` : ''}`);
  return lines;
}

function stanceLabel(stance: DesignStance): string {
  switch (stance) {
    case 'hypothesis':
      return '예상·가설';
    case 'unknown':
      return '아직 모름';
    case 'counter':
      return '반대 의견';
    case 'experience':
      return '경험';
    case 'claimed_record':
      return '확인했다고 보는 기록';
  }
}
