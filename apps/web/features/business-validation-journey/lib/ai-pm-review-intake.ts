function normalizeReviewText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
}

export const REVIEW_PURPOSES = [
  'market',
  'revenue',
  'customer',
  'execution',
  'funding',
  'overall',
] as const;

export type ReviewPurpose = (typeof REVIEW_PURPOSES)[number];

export const REVIEW_PURPOSE_LABEL: Record<ReviewPurpose, string> = {
  market: '시장성 확인',
  revenue: '수익모델 검증',
  customer: '고객 정의',
  execution: '실행계획 수립',
  funding: '투자·지원사업 준비',
  overall: '종합 검토',
};

export const REVIEW_STAGES = ['idea', 'customer_research', 'partners', 'pilot', 'revenue'] as const;

export type ReviewStage = (typeof REVIEW_STAGES)[number];

export const REVIEW_STAGE_LABEL: Record<ReviewStage, string> = {
  idea: '아이디어',
  customer_research: '고객 조사',
  partners: '제휴처 확보',
  pilot: '시범 운영',
  revenue: '매출 발생',
};

export const REVIEW_FOCUS_PRESETS = [
  '고객이 누구인지',
  '어떤 문제를 푸는지',
  '제공 가치가 무엇인지',
  '누가 비용을 부담하는지',
  '어떻게 운영을 시작하는지',
] as const;

export function isReviewPurpose(value: string): value is ReviewPurpose {
  return (REVIEW_PURPOSES as readonly string[]).includes(value);
}

export function isReviewStage(value: string): value is ReviewStage {
  return (REVIEW_STAGES as readonly string[]).includes(value);
}

/** Body plus optional purpose lines. The purpose lines change the stored hash. */
export function composeReviewInput(input: {
  text: string;
  purpose?: ReviewPurpose | null;
  stage?: ReviewStage | null;
  focus?: string | null;
}): string {
  const body = normalizeReviewText(input.text);
  if (!input.purpose) return body;
  const purpose = REVIEW_PURPOSE_LABEL[input.purpose];
  const stage = input.stage ? REVIEW_STAGE_LABEL[input.stage] : '없음';
  const focus = normalizeReviewText(input.focus ?? '') || '없음';
  return `${body}\n\n검토 목적: ${purpose}\n현재 단계: ${stage}\n가장 알고 싶은 것: ${focus}`;
}

/** Local guidance after a saved choice. This does not ask a model for the next review. */
export function nextDirectionAfterChoice(input: { label: string; otherText: string; reason: string }): string {
  const stated = /기타/.test(input.label) && input.otherText.trim() ? input.otherText.trim() : input.label;
  const reason = input.reason.trim() || '이 선택에서 아직 확인되지 않은 사실을 다음 검토의 출발점으로 둡니다.';
  return `확인된 내용: ${stated}. 다음 검토는 이 선택을 전제로 합니다. ${reason} 후속 모델 검토는 실행하지 않습니다.`;
}
