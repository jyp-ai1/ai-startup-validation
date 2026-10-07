/**
 * PR #106 — locked failure definition.
 * Measure-only. Not imported by the analyzer. Not a persist SoT.
 *
 * DCE here is two conditions on a quantified operational problem:
 *   (1) paid conversion
 *   (2) stake before → after
 *
 * stale_cu_after_full_dce is a state-consistency defect, not a copy tweak.
 */

export type DceFill = 'dce_0_2' | 'dce_1_2' | 'dce_2_2' | 'dce_2_2_extra';

export type StaleCuSurface = {
  cu: boolean;
  dce: boolean;
  priority: boolean;
  question: boolean;
};

export type StaleCuVerdict = 'PASS' | 'FAIL' | 'HOLD' | 'N/A';

const PAYMENT_ONLY_HOLD = /지불만/;
const STAKE_STILL_OPEN = /실제로 줄었는가|지표가 그대로|전후를 한 번 잰다|전후 비교/;

export function isPromotedJudgment(input: { verdictId: string; stageId: string }): boolean {
  return (
    input.stageId === 'S3' ||
    input.stageId === 'S4' ||
    input.verdictId === 'viable' ||
    input.verdictId === 'conditionally_viable'
  );
}

/**
 * Surfaces that still speak as if the 2/2 DCE were open.
 * Call only after the founder answer completed both conditions.
 */
export function detectStaleSurfaces(input: {
  criticalUnknown: string;
  decisionChangingEvidence: string;
  validationPriority: string;
  nextQuestion: string;
}): StaleCuSurface {
  const cuText = input.criticalUnknown;
  const dceText = input.decisionChangingEvidence;
  const priorityText = input.validationPriority;
  const askText = input.nextQuestion;
  return {
    cu: PAYMENT_ONLY_HOLD.test(cuText) || /실제로 줄었는가/.test(cuText),
    dce: /지불만 있거나|지표가 줄면/.test(dceText) || STAKE_STILL_OPEN.test(dceText),
    priority: STAKE_STILL_OPEN.test(priorityText) || /전후를 한 번 잰다/.test(priorityText),
    question: /전후 수치|얼마나 줄였/.test(askText),
  };
}

/**
 * CPO classes for a completed 2/2 (or 2/2 + extra) row.
 *
 * PASS — previous CU retired; next proof is a new unknown
 * FAIL — judgment promoted and previous CU/ask remain
 * HOLD — CU leftover only; ask already moved off the fulfilled stake
 * N/A  — not a 2/2 row
 */
export function classifyStaleCuVerdict(input: {
  fill: DceFill;
  promoted: boolean;
  stale: StaleCuSurface;
}): StaleCuVerdict {
  if (input.fill !== 'dce_2_2' && input.fill !== 'dce_2_2_extra') return 'N/A';
  const leftover = input.stale.cu || input.stale.priority || input.stale.question;
  if (!leftover) return 'PASS';
  if (input.promoted && (input.stale.cu || input.stale.question)) return 'FAIL';
  if (input.stale.cu && !input.stale.question) return 'HOLD';
  return 'FAIL';
}
