import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { analyzeStrategicIntelligence } from '../analyze-strategic-intelligence';
import { getSiCalibrationCase } from '../si-calibration-cases';
import { FIRST_PASS_REFEREE } from './si-first-pass-referee';
import { scoreSiFirstPass } from './score-si-first-pass';

const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);

const LOCKED = {
  juinjip: {
    verdictId: 'judgment_deferred',
    stageId: 'S1',
    criticalUnknown:
      '실제 돈을 내는 사람이 누구이며, 그 사람이 이 문제를 비용으로 해결할 이유가 있는가. 결제자가 확인되지 않으면 사용자 수요만으로 사업화 판단을 확정할 수 없다.',
    validationPriority: '사용자와 결제자를 분리해, 결제자 한 명의 지불 이유를 확인한다.',
  },
  lmulm: {
    verdictId: 'viable',
    stageId: 'S3',
    criticalUnknown:
      'C2C 재판매가 한 번의 이벤트가 아니라 반복적으로 발생하는가. 이 루프가 없으면 1차 판매만 있는 브랜드이지 플랫폼 사업이 아니다.',
    validationPriority: '최근 구매 코호트의 재판매 등록·체결·재구매 여부 한 가지를 확인한다.',
  },
  ridm: {
    verdictId: 'judgment_deferred',
    stageId: 'S1',
    criticalUnknown:
      '누가 어떤 직무를 이 제품으로 대체하며, 왜 돈을 내는가. 직무와 결제자가 없으면 콘셉트만으로 사업화 판단을 내릴 수 없다.',
    validationPriority: '결제자와 Job-to-be-done을 한 쌍으로 확인한다.',
  },
} as const;

describe('CU Calibration — quantified problem stake', () => {
  it('does not special-case calibration brand names', () => {
    expect(ANALYZER_SRC).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|교보|오로라|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
  });

  it.each(Object.keys(LOCKED) as Array<keyof typeof LOCKED>)(
    '%s first-pass CU stays locked',
    (id) => {
      const fixture = getSiCalibrationCase(id);
      const judgment = analyzeStrategicIntelligence({
        title: fixture.title,
        documentText: fixture.documentText,
      });
      expect(judgment.verdictId).toBe(LOCKED[id].verdictId);
      expect(judgment.stageId).toBe(LOCKED[id].stageId);
      expect(judgment.criticalUnknown).toBe(LOCKED[id].criticalUnknown);
      expect(judgment.validationPriority).toBe(LOCKED[id].validationPriority);
    },
  );

  it('binds paid-conversion CU to a nameless no-show metric and a named system', () => {
    const judgment = analyzeStrategicIntelligence({
      documentText: `5~20인 병의원은 전화 예약으로 no-show가 18%에 달합니다.
기존 대안은 EMR 기본 알림과 범용 예약앱입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    });
    expect(judgment.verdictId).toBe('judgment_deferred');
    expect(judgment.criticalUnknown).toMatch(/no-show|노쇼/);
    expect(judgment.criticalUnknown).toMatch(/유료|지불/);
    expect(judgment.decisionChangingEvidence).toMatch(/no-show|노쇼/);
    expect(judgment.decisionChangingEvidence).toMatch(/EMR/);
    expect(judgment.validationPriority).toMatch(/no-show|노쇼/);
    expect(judgment.criticalUnknown).not.toBe(
      '이 사업이 주장하는 가치가 실제 지불로 이어지는가. 문제와 대안이 있어도 유료 전환이 없으면 사업화 판단을 확정할 수 없다.',
    );
  });

  it('binds paid-conversion CU to a nameless return-rate metric and Latin alternative', () => {
    const judgment = analyzeStrategicIntelligence({
      documentText: `D2C 의류 브랜드는 사이즈 불일치로 반품률 32%를 겪습니다.
기존 대안은 True Fit 같은 글로벌 솔루션입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    });
    expect(judgment.verdictId).toBe('judgment_deferred');
    expect(judgment.criticalUnknown).toMatch(/반품/);
    expect(judgment.decisionChangingEvidence).toMatch(/반품/);
    expect(judgment.decisionChangingEvidence).toMatch(/True Fit/);
    expect(judgment.validationPriority).toMatch(/반품/);
  });

  it('clinicflow CU names no-show/EMR without becoming generic paid conversion', () => {
    const fixture = getSiCalibrationCase('clinicflow');
    const judgment = analyzeStrategicIntelligence({
      title: fixture.title,
      documentText: fixture.documentText,
    });
    expect(judgment.criticalUnknown).toMatch(/no-show|노쇼/);
    expect(judgment.decisionChangingEvidence).toMatch(/no-show|노쇼|EMR/);
    expect(judgment.whyFail).toMatch(/no-show|노쇼/);
    expect(scoreSiFirstPass(judgment, FIRST_PASS_REFEREE.clinicflow).overall).not.toBe('FAIL');
  });

  it('keeps generic paid-conversion CU when the problem is not quantified', () => {
    const judgment = analyzeStrategicIntelligence({
      documentText: `병의원은 예약 관리가 어렵습니다.
기존 대안은 전화와 수기 장부입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    });
    expect(judgment.criticalUnknown).toBe(
      '이 사업이 주장하는 가치가 실제 지불로 이어지는가. 문제와 대안이 있어도 유료 전환이 없으면 사업화 판단을 확정할 수 없다.',
    );
  });

  it('fitbridge CU names return-rate/True Fit without becoming generic paid conversion', () => {
    const fixture = getSiCalibrationCase('fitbridge');
    const judgment = analyzeStrategicIntelligence({
      title: fixture.title,
      documentText: fixture.documentText,
    });
    expect(judgment.criticalUnknown).toMatch(/반품/);
    expect(`${judgment.decisionChangingEvidence} ${judgment.whyFail}`).toMatch(/반품|True Fit/);
    expect(scoreSiFirstPass(judgment, FIRST_PASS_REFEREE.fitbridge).overall).not.toBe('FAIL');
  });
});
