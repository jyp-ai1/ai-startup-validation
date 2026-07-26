import type { GeneratedTodayAction } from './founder-intelligence-engine';

type ActionTitleTranslator = (
  key: string,
  params?: Record<string, string | number>,
) => string;

type ActionTitleSource = Pick<GeneratedTodayAction, 'title' | 'titleKey' | 'titleParams'>;

const FOUNDER_PIPELINE_TEXT_MAP: Record<string, string> = {
  'Complete 3 customer interviews': '고객 인터뷰 3명 진행하기',
  'Complete customer interviews': '고객 인터뷰 3명 진행하기',
  'Complete customer interviews (Mock)': '고객 인터뷰 3명 진행하기',
  'Customer interviews (VOC 3+)': '고객 인터뷰 3명 진행하기',
  'Customer interviews': '고객 인터뷰 진행하기',
  'Customer interview': '고객 인터뷰 진행하기',
  'Price validation': '가격 검증하기',
  'Pricing validation': '가격 검증하기',
  'Pricing validation interviews': '가격 검증 인터뷰 진행하기',
  'Market research': '시장 조사하기',
  'Competitor analysis': '경쟁사 분석하기',
  'Competitor differentiation evidence': '경쟁 차별화 근거 수집하기',
  'What problem costs you the most time today?': '대표님이 가장 시간을 많이 쓰는 업무는 무엇인가요?',
  'What would you pay to solve it?': '이 문제를 해결하려면 얼마까지 지불하실 의향이 있나요?',
  'Who else on your team feels this pain?': '팀에서 같은 고민을 하는 사람이 더 있나요?',
  'What did you try before?': '그 전에 어떤 방법을 시도해 보셨나요?',
  'Would you refer a peer if this worked?': '효과가 있다면 주변에 추천하실 의향이 있나요?',
  'Are you happy with current pricing?': '현재 가격에 만족하시나요?',
  'Is trust more important than price?': '가격보다 신뢰가 더 중요한가요?',
  'Monthly vs annual preference?': '월 구독과 연 구독 중 선호는 무엇인가요?',
  'What triggers paid conversion?': '유료 전환을 결정하는 계기는 무엇인가요?',
  'Who would you refer?': '주변에 추천하실 의향이 있나요?',
  'What alternative do you use today?': '지금 사용 중인 대안은 무엇인가요?',
  'Biggest gap vs competitors?': '경쟁사 대비 가장 큰 공백은 무엇인가요?',
  'Our one differentiation point?': '우리의 핵심 차별점은 무엇인가요?',
  'Switching cost estimate?': '전환 비용은 어느 정도로 보시나요?',
  'Why stay with us in 6 months?': '6개월 뒤에도 우리를 선택하실 이유는 무엇인가요?',
  'What would you pay for our solution?': '우리 솔루션을 쓴다면 얼마를 지불할 의향이 있나요?',
  'What is the biggest pain point for your customers?': '고객이 가장 자주 불편해하는 점은 무엇인가요?',
  'What problem are you solving?': '현재 가장 해결하고 싶은 문제가 무엇인가요?',
};

const FOUNDER_PIPELINE_PATTERN_MAP: Array<{ pattern: RegExp; ko: string }> = [
  {
    pattern: /what problem costs you the most time/i,
    ko: '대표님이 가장 시간을 많이 쓰는 업무는 무엇인가요?',
  },
  {
    pattern: /what would you pay/i,
    ko: '이 문제를 해결하려면 얼마까지 지불하실 의향이 있나요?',
  },
  {
    pattern: /are you happy with current pricing/i,
    ko: '현재 가격에 만족하시나요?',
  },
  {
    pattern: /complete customer interview/i,
    ko: '고객 인터뷰 3명 진행하기',
  },
];

function normalizePipelineTitle(title: string): string {
  return normalizeFounderPipelineText(title);
}

export function normalizeFounderPipelineText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const exact = FOUNDER_PIPELINE_TEXT_MAP[trimmed];
  if (exact) return exact;

  const lower = trimmed.toLowerCase();
  for (const [en, ko] of Object.entries(FOUNDER_PIPELINE_TEXT_MAP)) {
    if (en.toLowerCase() === lower) return ko;
  }

  for (const { pattern, ko } of FOUNDER_PIPELINE_PATTERN_MAP) {
    if (pattern.test(trimmed)) return ko;
  }

  return text;
}

export function resolveFounderActionTitle(
  action: ActionTitleSource | undefined,
  td: ActionTitleTranslator,
  fallback: string,
): string {
  if (!action) return fallback;
  if (action.title) return normalizePipelineTitle(action.title);

  if (action.titleKey === 'vocInterview') {
    return td('vocInterview', action.titleParams ?? {});
  }
  if (action.titleKey === 'primaryStep') {
    return td('primaryStep', action.titleParams ?? { step: '1' });
  }
  if (action.titleKey) {
    if (action.titleKey === 'pipelineTask' && action.titleParams?.title) {
      return normalizePipelineTitle(String(action.titleParams.title));
    }
    return td(action.titleKey, action.titleParams ?? {});
  }

  return fallback;
}
