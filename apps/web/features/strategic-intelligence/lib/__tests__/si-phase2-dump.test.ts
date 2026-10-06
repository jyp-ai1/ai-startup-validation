import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { analyzeStrategicIntelligence } from '../analyze-strategic-intelligence';
import { classifyFounderEvidenceClass } from '../classify-founder-evidence';
import { getSiCalibrationCase } from '../si-calibration-cases';
import { updateStrategicIntelligence } from '../update-strategic-intelligence';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-phase2-evidence-update.json',
);

const VALIDATED_ANSWER =
  '최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.';
const INTENT_ANSWER = '재판매를 생각하고 있지만 아직 아무도 등록하지 않았다.';

const GENERIC_MARKETPLACE = `한정판 굿즈를 실제로 판매했고 1차 판매 매출이 있다.
초기 고객 구매가 존재한다.
자체 앱을 출시했다. 공급망이 있다.
사업 모델은 구매자가 이후 재판매하고 그 거래가 반복되는 것이다.
C2C 재판매가 반복되는지는 확인되지 않았다.`;

function snapshotJudgment(judgment: ReturnType<typeof analyzeStrategicIntelligence>) {
  return {
    verdictId: judgment.verdictId,
    stageId: judgment.stageId,
    judgment: judgment.judgment,
    criticalUnknown: judgment.criticalUnknown,
    decisionChangingEvidence: judgment.decisionChangingEvidence,
    validationPriority: judgment.validationPriority,
    evidenceClasses: judgment.evidenceMap.map((item) => item.evidenceClass),
  };
}

function runCase(input: {
  id: string;
  title?: string;
  documentText: string;
  founderAnswer: string;
}) {
  const previous = analyzeStrategicIntelligence({
    title: input.title,
    documentText: input.documentText,
  });
  const update = updateStrategicIntelligence({
    previous,
    title: input.title,
    documentText: input.documentText,
    founderAnswer: input.founderAnswer,
  });
  return {
    id: input.id,
    founderAnswer: input.founderAnswer,
    addedEvidenceClass: classifyFounderEvidenceClass(input.founderAnswer),
    previous: snapshotJudgment(previous),
    next: snapshotJudgment(update.next),
    deltas: {
      evidenceStrengthDelta: update.evidenceStrengthDelta,
      criticalUnknownChanged: update.criticalUnknownChanged,
      judgmentChanged: update.judgmentChanged,
      validationPriorityChanged: update.validationPriorityChanged,
    },
  };
}

describe('S.I. Phase 2 evidence-update dump', () => {
  it('writes before/after judgments for VALIDATED vs INTENT answers', () => {
    const lmulm = getSiCalibrationCase('lmulm');
    const rows = [
      runCase({
        id: 'lmulm-validated',
        title: lmulm.title,
        documentText: lmulm.documentText,
        founderAnswer: VALIDATED_ANSWER,
      }),
      runCase({
        id: 'lmulm-intent',
        title: lmulm.title,
        documentText: lmulm.documentText,
        founderAnswer: INTENT_ANSWER,
      }),
      runCase({
        id: 'generic-marketplace-validated',
        documentText: GENERIC_MARKETPLACE,
        founderAnswer: '최근 구매자 80명 중 20명이 실제 재판매를 등록했고 7건이 거래됐다.',
      }),
      runCase({
        id: 'generic-marketplace-intent',
        documentText: GENERIC_MARKETPLACE,
        founderAnswer: INTENT_ANSWER,
      }),
    ];

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');

    expect(rows).toHaveLength(4);
    expect(rows[0]?.addedEvidenceClass).toBe('VALIDATED');
    expect(rows[0]?.next.stageId).toBe('S4');
    expect(rows[1]?.addedEvidenceClass).toBe('CLAIM');
    expect(rows[1]?.next.stageId).toBe('S3');
  });
});
