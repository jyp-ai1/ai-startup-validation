/**
 * DAY 8-H — Supplement mode presentation (dimension-targeted, not gap loop).
 */

import { buildAnswerGuide, formatAnswerGuideText } from './ai-pm-answer-guide';
import {
  CEO_JUDGMENT_DIMENSION_LABELS,
  type CeoJudgmentDimensionId,
  type CeoJudgmentState,
} from './ai-pm-ceo-judgment-dimensions';

export type AiPmSupplementSnapshot = {
  dimensionId: CeoJudgmentDimensionId;
  dimensionLabel: string;
  understoodSummary: string;
  missingSummary: string;
  whyNeeded: string;
  questionText: string;
  answerGuideText: string;
};

const SUPPLEMENT_QUESTIONS: Record<CeoJudgmentDimensionId, string> = {
  customer:
    '이 서비스를 가장 필요로 하는 사람은 누구인가요? 업종이나 상황을 구체적으로 알려주세요.',
  problem:
    '고객이 지금 가장 불편해하는 점은 무엇인가요? 실제로 겪는 번거로움을 알려주세요.',
  solution:
    '지금 엑셀이나 기존 방식으로 하던 주문·배송 관리 중, 이 서비스가 대신 해주는 일은 무엇인가요?',
  customerChange:
    '이 서비스를 쓰면 고객에게 가장 좋아지는 점은 무엇인가요? 시간, 실수, 불편 중 무엇이 달라지나요?',
};

const SUPPLEMENT_MISSING: Record<CeoJudgmentDimensionId, string> = {
  customer: '누구를 위한 사업인지',
  problem: '고객이 겪는 문제',
  solution: '실제로 어떤 과정을 바꾸는지',
  customerChange: '고객에게 달라지는 점',
};

const SUPPLEMENT_WHY: Record<CeoJudgmentDimensionId, string> = {
  customer: '누구를 위한 사업인지 알아야 문제와 해결 방법을 연결할 수 있습니다.',
  problem: '문제가 명확해야 해결 방법이 의미 있는지 판단할 수 있습니다.',
  solution: '실제로 어떤 방식으로 문제를 해결하는지 알아야 사업 검토를 확정할 수 있습니다.',
  customerChange: '고객에게 실제로 무엇이 달라지는지 알아야 가치를 판단할 수 있습니다.',
};

function understoodForDimension(
  state: CeoJudgmentState,
  id: CeoJudgmentDimensionId,
): string {
  const related: CeoJudgmentDimensionId[] =
    id === 'solution' ? ['customer', 'problem', 'solution'] : [id];
  const parts = related
    .map((dimId) => state.dimensions[dimId].summary.trim())
    .filter((s) => s.length >= 4);
  if (parts.length === 0) {
    return '아직 이 부분에 대한 구체적인 정보가 부족합니다.';
  }
  if (id === 'solution' && parts.length >= 2) {
    const solution = state.dimensions.solution.summary.trim();
    if (solution) {
      return `현재 제가 이해한 해결 방법은 "${solution}"입니다.`;
    }
    return `고객과 문제는 "${parts.slice(0, 2).join(' / ')}" 정도로 이해했습니다.`;
  }
  return state.dimensions[id].summary.trim();
}

export function pickSupplementDimension(state: CeoJudgmentState): CeoJudgmentDimensionId {
  const order: CeoJudgmentDimensionId[] = [
    'customer',
    'problem',
    'solution',
    'customerChange',
  ];
  for (const id of order) {
    if (state.dimensions[id].status === 'unknown') return id;
  }
  for (const id of order) {
    if (state.dimensions[id].status === 'needs_check') return id;
  }
  return 'solution';
}

export function buildAiPmSupplementSnapshot(
  state: CeoJudgmentState,
  dimensionId?: CeoJudgmentDimensionId | null,
): AiPmSupplementSnapshot {
  const id = dimensionId ?? pickSupplementDimension(state);
  const guide = buildAnswerGuide({ dimensionId: id });

  return {
    dimensionId: id,
    dimensionLabel: CEO_JUDGMENT_DIMENSION_LABELS[id],
    understoodSummary: understoodForDimension(state, id),
    missingSummary: SUPPLEMENT_MISSING[id],
    whyNeeded: SUPPLEMENT_WHY[id],
    questionText: SUPPLEMENT_QUESTIONS[id],
    answerGuideText: formatAnswerGuideText(guide),
  };
}

/** Map supplement dimension to V3 gap / issue for answer pipeline. */
export function supplementDimensionToGap(id: CeoJudgmentDimensionId): {
  targetGap: string;
  issueId: 'customer_definition' | 'problem_definition' | 'market_validation';
} {
  switch (id) {
    case 'customer':
      return { targetGap: 'customerPersona', issueId: 'customer_definition' };
    case 'problem':
      return { targetGap: 'problemJtbd', issueId: 'problem_definition' };
    case 'solution':
      return { targetGap: 'solution', issueId: 'problem_definition' };
    case 'customerChange':
      return { targetGap: 'validationTestability', issueId: 'market_validation' };
  }
}
