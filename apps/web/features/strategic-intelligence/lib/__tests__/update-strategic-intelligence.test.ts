import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { analyzeStrategicIntelligence } from '../analyze-strategic-intelligence';
import { classifyFounderEvidenceClass } from '../classify-founder-evidence';
import { getSiCalibrationCase } from '../si-calibration-cases';
import { updateStrategicIntelligence } from '../update-strategic-intelligence';

const UPDATE_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../update-strategic-intelligence.ts'),
  'utf8',
);
const CLASSIFY_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../classify-founder-evidence.ts'),
  'utf8',
);

const VALIDATED_ANSWER =
  '최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.';
const INTENT_ANSWER = '재판매를 생각하고 있지만 아직 아무도 등록하지 않았다.';

describe('updateStrategicIntelligence — Phase 2', () => {
  it('does not special-case calibration brand names', () => {
    expect(`${UPDATE_SRC}\n${CLASSIFY_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|클리닉플로우|핏브릿지|ClinicFlow|FitBridge/i,
    );
  });

  it('treats quantified completed resale as VALIDATED and moves the judgment', () => {
    const fixture = getSiCalibrationCase('lmulm');
    const previous = analyzeStrategicIntelligence({
      title: fixture.title,
      documentText: fixture.documentText,
    });
    expect(previous.verdictId).toBe('viable');
    expect(previous.stageId).toBe('S3');
    expect(previous.criticalUnknown).toMatch(/재판매|C2C/);

    const update = updateStrategicIntelligence({
      previous,
      title: fixture.title,
      documentText: fixture.documentText,
      founderAnswer: VALIDATED_ANSWER,
    });

    expect(classifyFounderEvidenceClass(VALIDATED_ANSWER)).toBe('VALIDATED');
    expect(update.addedEvidence[0]?.evidenceClass).toBe('VALIDATED');
    expect(update.evidenceStrengthDelta).toBe('up');
    expect(update.criticalUnknownChanged).toBe(true);
    expect(update.next.criticalUnknown).not.toMatch(/반복적으로 발생하는가/);
    expect(update.validationPriorityChanged).toBe(true);
    expect(update.judgmentChanged).toBe(true);
    expect(update.next.stageId).toBe('S4');
    expect(update.next.evidenceMap.some((item) => item.evidenceClass === 'VALIDATED')).toBe(true);
    expect(update.next.validationPriority).not.toBe(previous.validationPriority);
  });

  it('keeps intent-only resale as CLAIM, not VALIDATED', () => {
    const fixture = getSiCalibrationCase('lmulm');
    const previous = analyzeStrategicIntelligence({
      title: fixture.title,
      documentText: fixture.documentText,
    });

    const update = updateStrategicIntelligence({
      previous,
      title: fixture.title,
      documentText: fixture.documentText,
      founderAnswer: INTENT_ANSWER,
    });

    expect(classifyFounderEvidenceClass(INTENT_ANSWER)).toBe('CLAIM');
    expect(update.addedEvidence[0]?.evidenceClass).toBe('CLAIM');
    expect(update.addedEvidence[0]?.evidenceClass).not.toBe('VALIDATED');
    expect(update.next.evidenceMap.every((item) => item.evidenceClass !== 'VALIDATED')).toBe(true);
    expect(update.next.criticalUnknown).toMatch(/재판매|C2C/);
    expect(update.next.stageId).toBe('S3');
    expect(update.next.verdictId).toBe(previous.verdictId);
  });

  it('moves a generic launched marketplace the same way without brand names', () => {
    const documentText = `한정판 굿즈를 실제로 판매했고 1차 판매 매출이 있다.
초기 고객 구매가 존재한다.
자체 앱을 출시했다. 공급망이 있다.
사업 모델은 구매자가 이후 재판매하고 그 거래가 반복되는 것이다.
C2C 재판매가 반복되는지는 확인되지 않았다.`;
    const previous = analyzeStrategicIntelligence({ documentText });
    expect(previous.verdictId).toBe('viable');
    expect(previous.stageId).toBe('S3');

    const validated = updateStrategicIntelligence({
      previous,
      documentText,
      founderAnswer: '최근 구매자 80명 중 20명이 실제 재판매를 등록했고 7건이 거래됐다.',
    });
    expect(validated.addedEvidence[0]?.evidenceClass).toBe('VALIDATED');
    expect(validated.next.stageId).toBe('S4');
    expect(validated.criticalUnknownChanged).toBe(true);

    const intent = updateStrategicIntelligence({
      previous,
      documentText,
      founderAnswer: INTENT_ANSWER,
    });
    expect(intent.addedEvidence[0]?.evidenceClass).toBe('CLAIM');
    expect(intent.next.stageId).toBe('S3');
    expect(intent.next.criticalUnknown).toMatch(/재판매|C2C/);
  });
});
