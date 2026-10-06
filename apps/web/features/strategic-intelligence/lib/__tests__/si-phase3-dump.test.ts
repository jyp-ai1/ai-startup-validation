import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { analyzeStrategicIntelligence } from '../analyze-strategic-intelligence';
import { decideSiValidationAsk } from '../decide-si-validation-ask';
import { presentSiAiPmQuestion } from '../present-si-ai-pm-question';
import { runSiAiPmBindTurn } from '../run-si-ai-pm-bind-turn';
import { getSiCalibrationCase } from '../si-calibration-cases';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-phase3-ai-pm-bind.json',
);

const VALIDATED_ANSWER =
  '최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.';
const INTENT_ANSWER = '재판매를 생각하고 있지만 아직 아무도 등록하지 않았다.';

function snapshotJudgment(judgment: ReturnType<typeof analyzeStrategicIntelligence>) {
  return {
    verdictId: judgment.verdictId,
    stageId: judgment.stageId,
    judgment: judgment.judgment,
    criticalUnknown: judgment.criticalUnknown,
    decisionChangingEvidence: judgment.decisionChangingEvidence,
    validationPriority: judgment.validationPriority,
  };
}

describe('S.I. Phase 3 AI PM bind dump', () => {
  it('writes the closed-loop proof', () => {
    const lmulm = getSiCalibrationCase('lmulm');
    const first = analyzeStrategicIntelligence({
      title: lmulm.title,
      documentText: lmulm.documentText,
    });
    const asked = presentSiAiPmQuestion(decideSiValidationAsk(first));
    const validated = runSiAiPmBindTurn({
      title: lmulm.title,
      documentText: lmulm.documentText,
      founderAnswer: VALIDATED_ANSWER,
    });
    const intent = runSiAiPmBindTurn({
      title: lmulm.title,
      documentText: lmulm.documentText,
      founderAnswer: INTENT_ANSWER,
    });

    const payload = {
      asked: {
        kind: asked.kind,
        questionText: asked.questionText,
        whyAsking: asked.whyAsking,
        evidenceSought: asked.evidenceSought,
        copiedCriticalUnknown: asked.questionText === first.criticalUnknown,
      },
      validated: {
        founderAnswer: VALIDATED_ANSWER,
        addedEvidenceClass: validated.update.addedEvidence[0]?.evidenceClass,
        previous: snapshotJudgment(validated.previous),
        next: snapshotJudgment(validated.update.next),
        deltas: {
          evidenceStrengthDelta: validated.update.evidenceStrengthDelta,
          criticalUnknownChanged: validated.update.criticalUnknownChanged,
          judgmentChanged: validated.update.judgmentChanged,
          validationPriorityChanged: validated.update.validationPriorityChanged,
        },
        nextQuestionText: validated.nextAsk.questionText,
      },
      intent: {
        founderAnswer: INTENT_ANSWER,
        addedEvidenceClass: intent.update.addedEvidence[0]?.evidenceClass,
        previous: snapshotJudgment(intent.previous),
        next: snapshotJudgment(intent.update.next),
        deltas: {
          evidenceStrengthDelta: intent.update.evidenceStrengthDelta,
          criticalUnknownChanged: intent.update.criticalUnknownChanged,
          judgmentChanged: intent.update.judgmentChanged,
          validationPriorityChanged: intent.update.validationPriorityChanged,
        },
      },
    };

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    expect(payload.asked.copiedCriticalUnknown).toBe(false);
    expect(payload.validated.next.stageId).toBe('S4');
    expect(payload.intent.next.stageId).toBe('S3');
  });
});
