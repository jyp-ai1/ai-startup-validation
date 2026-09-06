/**
 * DAY 8-G — CEO-facing judgment dimensions (presentation SoT).
 * Not V3 gapState / factKey schema.
 */

export type CeoJudgmentDimensionId =
  | 'customer'
  | 'problem'
  | 'solution'
  | 'customerChange';

export type CeoJudgmentStatus = 'clear' | 'needs_check' | 'unknown';

export type CeoJudgmentDimension = {
  id: CeoJudgmentDimensionId;
  label: string;
  status: CeoJudgmentStatus;
  /** CEO-facing summary — never invent beyond evidence */
  summary: string;
  /** Optional one-line reason for status */
  statusReason?: string;
};

export type CeoJudgmentState = {
  dimensions: Record<CeoJudgmentDimensionId, CeoJudgmentDimension>;
  oneLiner: string;
  conclusion: string;
  nextCheck: string | null;
  /** Session question count (answered turns, excluding meta/research) */
  questionCount: number;
  updatedAt: string;
};

export const CEO_JUDGMENT_DIMENSION_LABELS: Record<CeoJudgmentDimensionId, string> = {
  customer: '고객',
  problem: '문제',
  solution: '해결 방법',
  customerChange: '고객에게 달라지는 점',
};

export const CEO_JUDGMENT_STATUS_LABEL: Record<CeoJudgmentStatus, string> = {
  clear: '명확',
  needs_check: '확인 필요',
  unknown: '아직 모름',
};

export function statusEmoji(status: CeoJudgmentStatus): string {
  switch (status) {
    case 'clear':
      return '🟢';
    case 'needs_check':
      return '🟡';
    case 'unknown':
      return '🔴';
  }
}

export function emptyCeoJudgmentState(questionCount = 0): CeoJudgmentState {
  const blank = (id: CeoJudgmentDimensionId): CeoJudgmentDimension => ({
    id,
    label: CEO_JUDGMENT_DIMENSION_LABELS[id],
    status: 'unknown',
    summary: '',
    statusReason: '아직 확인되지 않음',
  });
  return {
    dimensions: {
      customer: blank('customer'),
      problem: blank('problem'),
      solution: blank('solution'),
      customerChange: blank('customerChange'),
    },
    oneLiner: '',
    conclusion: '아직 사업에 대한 1차 판단을 내릴 정보가 부족합니다.',
    nextCheck: null,
    questionCount,
    updatedAt: new Date().toISOString(),
  };
}
