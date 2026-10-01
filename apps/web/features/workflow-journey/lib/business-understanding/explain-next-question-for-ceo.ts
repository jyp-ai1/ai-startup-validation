import type { NextQuestionDecision } from './decide-next-question-from-review';
import { resolveGapQuestionBinding } from './gap-question-map';
import { gapCeoSurfaceLabel, gapCeoSurfaceKind } from './gap-ceo-surface-label';

/** Track C — CEO-facing explanation (no internal scores). */
export type CeoQuestionExplanation = {
  targetGapLabel: string;
  whyImportant: string;
  gapStatusLabel: string;
  decisionImpactHint: string;
};

export function explainNextQuestionForCeo(decision: NextQuestionDecision): CeoQuestionExplanation {
  const gapId = decision.targetGapId ?? decision.targetGap;
  const binding = resolveGapQuestionBinding(gapId);
  const whyImportant = decision.whyNow?.trim() || binding.whyNow;
  const statusKind = gapCeoSurfaceKind('OPEN');

  let decisionImpactHint = '이 답변으로 사업 이해와 다음 판단이 달라질 수 있습니다.';
  if (decision.reviewAction === 'clarify' || decision.clarifyTarget) {
    decisionImpactHint = '충돌하거나 불명확한 설명을 바로잡으면 잘못된 판단을 줄일 수 있습니다.';
  } else if (decision.reviewAction === 'probe') {
    decisionImpactHint = '같은 주제를 조금 더 구체화하면 GO/HOLD 판단 근거가 강해집니다.';
  }

  return {
    targetGapLabel: gapId,
    whyImportant,
    gapStatusLabel: gapCeoSurfaceLabel(statusKind),
    decisionImpactHint,
  };
}
