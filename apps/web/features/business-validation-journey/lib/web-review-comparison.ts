import type { ExternalNote, JourneyState } from './journey-types';

export const WEB_REVIEW_PROMPT = [
  '아래 입력만 사용하라. 입력에 없는 수치, 상품, 시장 점유율, 고객 수를 만들지 마라.',
  '예상과 계획은 받은 매출이 아니다. 창업자 답은 원장으로 입증된 사실이 아니다.',
  'S1: PMF 결과 (2023년 8월 ~ 2023년 12월) - 매출: 2000만원',
  'S2: 구매전환율: 3.8~5.7%',
  'S3: 모회사와 상품 공급 계약 체결 (예상 연매출 10억)',
  'S4: 모회사 오프라인 매장 PB 상품 납품 (예상 연매출 1억)',
  'S5: 그룹사 VIP 선물 대량 납품 계약 체결 (예상 매출 4억)',
  'S6: 사내벤처 모기업 온라인 쇼핑몰(회원수 2,000만 명)을 활용하여 보장된 시장을 대상으로 초기 고객을 확보할 계획임',
  'A1: 문서의 매출 2,000만 원에서 가장 큰 비중은 모회사·계열사 판매다.',
  'A2: 모회사·계열사 지원이 없어도 현재 매출 구조를 유지할 수 없다. 사실상 모회사 지원이 필수다.',
].join('\n');

const SLOTS = {
  gpt: { executionId: 'web-review-gpt', providerLabel: 'gpt_web', title: 'GPT 웹' },
  gemini: { executionId: 'web-review-gemini', providerLabel: 'gemini_web', title: 'Gemini 웹' },
} as const;

type SlotId = keyof typeof SLOTS;
type Stance = 'missing' | 'affirm' | 'deny' | 'actual' | 'mixed';

type Criterion = {
  id: string;
  label: string;
  needles: string[];
  deny: string[];
  actual: string[];
};

const CRITERIA: Criterion[] = [
  {
    id: 's1',
    label: 'S1 매출 2,000만 원',
    needles: ['2,000만 원', '2000만 원', '2,000만원', '2000만원', '매출: 2000만원'],
    deny: ['2,000만 원이 아니', '2000만원이 아니', '매출이 없'],
    actual: ['2,000만 원이 입금', '2000만원이 입금'],
  },
  {
    id: 's2',
    label: 'S2 구매전환율 3.8~5.7%',
    needles: ['3.8', '5.7', '전환율'],
    deny: ['전환율이 아니', '전환율은 없'],
    actual: ['전환율을 원장'],
  },
  {
    id: 's3',
    label: 'S3 예상 연매출 10억',
    needles: ['10억', '십억'],
    deny: ['10억이 아니', '10억은 아니', '십억이 아니'],
    actual: ['확정 매출 10억', '실제 연매출 10억', '10억이 입금', '10억을 원장', '십억이 입금'],
  },
  {
    id: 's4',
    label: 'S4 예상 연매출 1억',
    needles: ['1억'],
    deny: ['1억이 아니', '1억은 아니'],
    actual: ['확정 매출 1억', '1억이 입금'],
  },
  {
    id: 's5',
    label: 'S5 예상 매출 4억',
    needles: ['4억'],
    deny: ['4억이 아니', '4억은 아니'],
    actual: ['확정 매출 4억', '4억이 입금'],
  },
  {
    id: 's6',
    label: 'S6 회원 2,000만 명 계획',
    needles: ['2,000만 명', '2000만 명', '2,000만명', '회원수'],
    deny: ['회원수가 아니', '계획이 아니'],
    actual: ['회원이 입금', '회원수를 매출로 확정'],
  },
  {
    id: 'a1',
    label: 'A1 모회사·계열사 판매 비중',
    needles: ['계열사', '가장 큰 비중'],
    deny: ['비중이 아니', '계열사 판매가 아니'],
    actual: ['비중을 원장'],
  },
  {
    id: 'a2',
    label: 'A2 모회사 지원 없이 매출 유지 불가',
    needles: ['지원이 필수', '유지할 수 없', '모회사 지원'],
    deny: ['없이도 유지', '없어도 유지', '필수는 아니', '지원 없이 가능', '유지할 수 있다'],
    actual: [],
  },
];

export type WebReviewComparison = {
  verifiedFact: false;
  liveModelCall: false;
  agreement: string[];
  conflict: string[];
  insufficient: string[];
  nextAction: string;
};

function hasNeedle(text: string, needle: string): boolean {
  if (needle === '1억') return /(?<![0-9])1억/.test(text);
  return text.includes(needle);
}

function classify(text: string, item: Criterion): Stance {
  const parts = text.split(/\n+/);
  const hits = parts.filter((part) => item.needles.some((needle) => hasNeedle(part, needle)));
  if (hits.length === 0) return 'missing';
  const flags = new Set<'affirm' | 'deny' | 'actual'>();
  for (const hit of hits) {
    if (item.deny.some((cue) => hit.includes(cue))) flags.add('deny');
    else if (item.actual.some((cue) => hit.includes(cue))) flags.add('actual');
    else flags.add('affirm');
  }
  if (flags.size > 1) return 'mixed';
  return [...flags][0] ?? 'missing';
}

function stanceLabel(stance: Stance): string {
  if (stance === 'affirm') return '입력의 주장으로 적음';
  if (stance === 'deny') return '그 주장을 부정';
  if (stance === 'actual') return '받은 매출처럼 적음';
  if (stance === 'mixed') return '한 원문 안에서 상반';
  return '없음';
}

export function compareWebReviews(gptText: string | null, geminiText: string | null): WebReviewComparison {
  const gpt = gptText?.trim() || null;
  const gemini = geminiText?.trim() || null;
  if (!gpt || !gemini) {
    const missing = [gpt ? null : 'GPT 웹 원문', gemini ? null : 'Gemini 웹 원문'].filter(Boolean);
    return {
      verifiedFact: false,
      liveModelCall: false,
      agreement: [],
      conflict: [],
      insufficient: [`${missing.join(', ')}이 없다. 빈칸을 추정으로 채우지 않는다.`],
      nextAction: gpt
        ? '보관한 GPT 원문과 같은 사업 입력을 Gemini 웹에 넣고, 반론 원문을 바꾸지 않고 Gemini 칸에 붙여 넣는다.'
        : 'GPT 웹에 위 사업 입력을 넣고, 받은 원문을 바꾸지 않고 GPT 칸에 붙여 넣는다.',
    };
  }

  const agreement: string[] = [];
  const conflict: string[] = [];
  const insufficient: string[] = [
    '두 원문은 모델 주장이다. 원장·결제·입금·세금계산서가 없어도 문장 속 숫자만으로 사실로 올리지 않는다.',
  ];

  for (const item of CRITERIA) {
    const left = classify(gpt, item);
    const right = classify(gemini, item);
    if (left === 'missing' || right === 'missing' || left === 'mixed' || right === 'mixed') {
      insufficient.push(
        `${item.label}: GPT ${stanceLabel(left)}, Gemini ${stanceLabel(right)}. 빠진 쪽을 모델이 말한 것으로 보충하지 않는다.`,
      );
      continue;
    }
    if (left === right) {
      agreement.push(`${item.label}: 둘 다 ${stanceLabel(left)}. 같은 문장도 검증된 사실이 아니다.`);
      continue;
    }
    conflict.push(`${item.label}: GPT ${stanceLabel(left)}, Gemini ${stanceLabel(right)}. 어느 쪽도 사실로 고르지 않는다.`);
  }

  const nextAction = conflict.length
    ? '상충 항목을 모델 문장으로 고르지 않는다. 다음 검증: 주문 원장에서 모회사·계열사 매출과 그 밖 매출을 나눈다. 예상 연매출은 받은 돈으로 세지 않는다.'
    : '합의한 문장도 원장이 없으면 사실이 아니다. 다음 검증: 주문 원장에서 모회사·계열사 매출과 그 밖 매출을 나눈다. 예상 연매출은 받은 돈으로 세지 않는다.';

  return {
    verifiedFact: false,
    liveModelCall: false,
    agreement,
    conflict,
    insufficient,
    nextAction,
  };
}

export function readWebReview(state: JourneyState): {
  gpt: ExternalNote | null;
  gemini: ExternalNote | null;
  comparison: WebReviewComparison;
} {
  const notes = state.externalNotes ?? [];
  const gpt = notes.find((note) => note.executionId === SLOTS.gpt.executionId) ?? null;
  const gemini = notes.find((note) => note.executionId === SLOTS.gemini.executionId) ?? null;
  return {
    gpt,
    gemini,
    comparison: compareWebReviews(gpt?.text ?? null, gemini?.text ?? null),
  };
}

export function storeWebReview(
  state: JourneyState,
  input: { slot: SlotId; text: string; now: string; provenance?: 'user_declared' | 'test_fixture' },
): { state: JourneyState; accepted: boolean; reason: string } {
  const text = input.text.trim();
  const slot = SLOTS[input.slot];
  if (!text) {
    return { state, accepted: false, reason: `${slot.title} 원문이 비어 있다. 이전 보관과 판단을 유지한다.` };
  }
  const provenance = input.provenance ?? 'user_declared';
  const note: ExternalNote = {
    executionId: slot.executionId,
    origin: 'user_paste',
    liveModelCall: false,
    providerLabel: slot.providerLabel,
    provenance,
    evidenceKind: 'model_claim',
    sourceLabel: slot.title,
    text,
    citedExcerpt: null,
    verifiedFact: false,
    realAnalysisSuccess: false,
    systemVerified: false,
    userDeclaredReal: provenance === 'user_declared',
    claimStatus: 'unassessed',
    judgmentChanged: false,
    receivedAt: input.now,
    questionId: state.nextQuestion?.uncertaintyId ?? null,
    hypothesisIds: [],
    status: 'reference',
  };
  const notes = (state.externalNotes ?? []).filter((item) => item.executionId !== slot.executionId);
  return {
    state: {
      ...state,
      judgmentText: state.judgmentText,
      judgmentStatus: 'judgment_deferred',
      externalNotes: [...notes, note],
    },
    accepted: true,
    reason: `${slot.title} 원문을 보관했다. 모델 호출은 없다. 검증된 사실이 아니다.`,
  };
}
