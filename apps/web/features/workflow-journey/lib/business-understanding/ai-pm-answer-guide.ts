/**
 * DAY 8-G G-2 — Answer guide (separate from textarea placeholder).
 */

import type { CeoJudgmentDimensionId } from './ai-pm-ceo-judgment-dimensions';

export type AiPmAnswerGuide = {
  hint: string;
  examples: string[];
};

const GAP_GUIDES: Record<string, AiPmAnswerGuide> = {
  customerPersona: {
    hint: '어떤 사람·업종·상황인지 구체적으로 적어주세요.',
    examples: ['직접 배송하는 반찬가게', '꽃집 사장님', '1인 운영 소상공인'],
  },
  problemJtbd: {
    hint: '지금 겪는 불편·번거로움을 말씀해 주세요.',
    examples: ['주문과 배송을 따로 관리', '누락이 잦음', '확인에 시간이 많이 듦'],
  },
  solution: {
    hint: '무엇을 어떻게 해결하려는지 방향을 적어주세요.',
    examples: ['주문·배송을 한 곳에서 관리', '알림으로 누락 방지'],
  },
  validationTestability: {
    hint: '시간, 비용, 실수, 불편 중 무엇이 좋아지는지 생각해보세요.',
    examples: ['배송 누락 감소', '주문과 배송을 한 곳에서 관리', '관리 시간 단축'],
  },
  differentiationVsAlternatives: {
    hint: '지금 쓰는 방법과 비교해 달라지는 점을 적어주세요.',
    examples: ['엑셀·카톡 대신 한 화면', '실수 줄이기', '확인 시간 단축'],
  },
  businessOneLiner: {
    hint: '누구에게 무엇을 제공하는지 한 문장으로 적어주세요.',
    examples: ['소상공인용 주문·배송 관리', '직접 배송 가게를 위한 통합 툴'],
  },
};

const DIMENSION_GUIDES: Record<CeoJudgmentDimensionId, AiPmAnswerGuide> = {
  customer: GAP_GUIDES.customerPersona!,
  problem: GAP_GUIDES.problemJtbd!,
  solution: GAP_GUIDES.solution!,
  customerChange: GAP_GUIDES.validationTestability!,
};

const DEFAULT_GUIDE: AiPmAnswerGuide = {
  hint: '아시는 범위에서 편하게 적어주세요. 짧아도 괜찮습니다.',
  examples: [],
};

export function buildAnswerGuide(input: {
  targetGap?: string | null;
  dimensionId?: CeoJudgmentDimensionId | null;
}): AiPmAnswerGuide {
  if (input.targetGap && GAP_GUIDES[input.targetGap]) {
    return GAP_GUIDES[input.targetGap]!;
  }
  if (input.dimensionId && DIMENSION_GUIDES[input.dimensionId]) {
    return DIMENSION_GUIDES[input.dimensionId]!;
  }
  return DEFAULT_GUIDE;
}

export function formatAnswerGuideText(guide: AiPmAnswerGuide): string {
  const examples =
    guide.examples.length > 0
      ? `\n예: ${guide.examples.slice(0, 3).join(' / ')}`
      : '';
  return `💡 ${guide.hint}${examples}`;
}
