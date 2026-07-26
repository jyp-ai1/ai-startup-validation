import type { GeneratedTodayAction } from './founder-intelligence-engine';

type ActionTitleTranslator = (
  key: string,
  params?: Record<string, string | number>,
) => string;

type ActionTitleSource = Pick<GeneratedTodayAction, 'title' | 'titleKey' | 'titleParams'>;

const FOUNDER_PIPELINE_TITLE_MAP: Record<string, string> = {
  'Complete 3 customer interviews': '고객 인터뷰 3명 진행하기',
  'Customer interviews': '고객 인터뷰 진행하기',
  'Customer interview': '고객 인터뷰 진행하기',
  'Price validation': '가격 검증하기',
  'Pricing validation': '가격 검증하기',
  'Market research': '시장 조사하기',
  'Competitor analysis': '경쟁사 분석하기',
};

function normalizePipelineTitle(title: string): string {
  return FOUNDER_PIPELINE_TITLE_MAP[title] ?? title;
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
