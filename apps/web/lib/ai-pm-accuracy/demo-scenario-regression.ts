/**
 * Demo flow regression — Expected vs Actual table for CPO (fixed demo seed).
 */

import { demoSeedQaSteps } from '@/lib/demo/demo-seed-qa';

export type DemoRegressionRow = {
  step: string;
  expectedState: string;
  expectedQuestion: string;
  expectedJudgment: string;
  actualState: string;
  actualQuestion: string;
  actualJudgment: string;
  pass: 'PENDING_CPO' | 'PASS' | 'FAIL';
};

/** Demo local-sns seed — CTO submits; CPO validates against live demo. */
export function buildDemoLocalSnsRegressionOutline(): DemoRegressionRow[] {
  const steps = demoSeedQaSteps('local-sns');
  if (!steps.length) {
    return [];
  }
  return steps.map((turn, i) => ({
    step: `demo-local-sns-${i + 1}`,
    expectedState: turn.prefilledAnswerDisplay ?? turn.answer.slice(0, 40),
    expectedQuestion: turn.targetGap,
    expectedJudgment: 'Scenario-fixed — no live judgment in seed',
    actualState: 'RUN_DEMO_E2E_OR_CPO_BROWSER',
    actualQuestion: 'RUN_DEMO_E2E_OR_CPO_BROWSER',
    actualJudgment: 'RUN_DEMO_E2E_OR_CPO_BROWSER',
    pass: 'PENDING_CPO',
  }));
}
