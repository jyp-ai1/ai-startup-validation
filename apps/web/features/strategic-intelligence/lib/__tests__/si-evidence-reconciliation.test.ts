import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { analyzeStrategicIntelligence } from '../analyze-strategic-intelligence';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import { getSiCalibrationCase } from '../si-calibration-cases';
import { pickSiIntegrationAnswer } from '../si-integration-answers';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';

const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);

const NO_SHOW_DOC = `5~20인 병의원은 전화 예약으로 no-show가 18%에 달합니다.
기존 대안은 EMR 기본 알림과 범용 예약앱입니다.
아직 출시되지 않았고 매출은 없습니다.`;

const FULL_NOSHOW = '결제 후보 2명이 월 구독을 결제했고 no-show가 18%에서 9%로 줄었다.';
const PAYMENT_ONLY = pickSiIntegrationAnswer('paid_conversion', 'validated');
const REPEAT_VALIDATED = pickSiIntegrationAnswer('repeat_loop', 'validated');
const PAYER_SPLIT = pickSiIntegrationAnswer('payer_split', 'validated');
const PAYER_JOB = pickSiIntegrationAnswer('payer_job', 'validated');

function run(title: string | undefined, documentText: string, answers: string[]) {
  let document = documentText;
  let view = resolveSiJourneyIntegration({ title, businessDocument: document });
  for (const answer of answers) {
    view = resolveSiJourneyIntegration({ title, businessDocument: document, founderAnswer: answer });
    document = appendFounderEvidenceToDocument(document, answer);
  }
  return view;
}

describe('Evidence reconciliation Fix — conflict / repeat-zero / CU', () => {
  it('does not brand-branch or rewrite the presenter / question engine', () => {
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function applySignalRetractions/);
    expect(ANALYZER_SRC).toMatch(/function isRepeatDirectDenial/);
    expect(ANALYZER_SRC).toMatch(/function hasLiveValidated/);
    expect(PRESENTER_SRC).toMatch(/QUESTION_BY_KIND/);
    expect(PRESENTER_SRC).not.toMatch(/applySignalRetractions/);
    expect(ANALYZER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
  });

  it('keeps payment-only off S3 (#104) and 2/2 next-unknown CU (#107)', () => {
    const paidOnly = analyzeStrategicIntelligence({
      documentText: appendFounderEvidenceToDocument(NO_SHOW_DOC, PAYMENT_ONLY),
    });
    expect(paidOnly.verdictId).toBe('judgment_deferred');
    expect(paidOnly.stageId).not.toBe('S3');

    const full = analyzeStrategicIntelligence({
      documentText: appendFounderEvidenceToDocument(NO_SHOW_DOC, FULL_NOSHOW),
    });
    expect(full.stageId).toBe('S3');
    expect(full.criticalUnknown).toMatch(/다음 고객|다음 기간/);
  });

  it('treats same-axis payment denial as CONFLICT and rejudges', () => {
    const view = run(undefined, NO_SHOW_DOC, [FULL_NOSHOW, '실제로 결제한 고객은 없었다.']);
    expect(view.current.update?.addedEvidence[0]?.evidenceClass).toBe('CONFLICT');
    expect(
      view.current.judgment.stageId === 'S3' && view.current.judgment.verdictId === 'viable',
    ).toBe(false);
  });

  it('treats same-axis resale denial as CONFLICT and leaves S4', () => {
    const fixture = getSiCalibrationCase('lmulm');
    const view = run(fixture.title, fixture.documentText, [
      REPEAT_VALIDATED,
      '실제 재판매는 발생하지 않았다.',
    ]);
    expect(view.current.update?.addedEvidence[0]?.evidenceClass).toBe('CONFLICT');
    expect(view.current.judgment.stageId).not.toBe('S4');
  });

  it('does not call repurchase-zero a CONFLICT and does not promote it to S4', () => {
    const afterPayment = analyzeStrategicIntelligence({
      documentText: appendFounderEvidenceToDocument(NO_SHOW_DOC, FULL_NOSHOW),
    });
    expect(afterPayment.stageId).toBe('S3');
    const zero = analyzeStrategicIntelligence({
      documentText: appendFounderEvidenceToDocument(
        appendFounderEvidenceToDocument(NO_SHOW_DOC, FULL_NOSHOW),
        '재구매는 0건이다.',
      ),
    });
    expect(zero.evidenceMap.some((item) => item.evidenceClass === 'CONFLICT')).toBe(false);
    expect(zero.stageId).not.toBe('S4');
    expect(zero.stageId === 'S3' || zero.stageId === afterPayment.stageId).toBe(true);

    const fixture = getSiCalibrationCase('lmulm');
    const afterRepeat = run(fixture.title, fixture.documentText, [REPEAT_VALIDATED, '재구매는 0건이다.']);
    expect(afterRepeat.current.update?.addedEvidence[0]?.evidenceClass).not.toBe('CONFLICT');
    expect(afterRepeat.current.judgment.stageId).not.toBe('S4');
  });

  it('moves CU and priority after payer VALIDATED on split and job paths', () => {
    const juinjip = getSiCalibrationCase('juinjip');
    const ridm = getSiCalibrationCase('ridm');
    const t0J = resolveSiJourneyIntegration({
      title: juinjip.title,
      businessDocument: juinjip.documentText,
    }).current.judgment;
    const t1J = run(juinjip.title, juinjip.documentText, [PAYER_SPLIT]).current.judgment;
    expect(t1J.stageId === 'S3' || t1J.verdictId === 'viable' || t1J.verdictId === 'conditionally_viable').toBe(
      true,
    );
    expect(t1J.criticalUnknown).not.toBe(t0J.criticalUnknown);
    expect(t1J.validationPriority).not.toBe(t0J.validationPriority);

    const t0R = resolveSiJourneyIntegration({
      title: ridm.title,
      businessDocument: ridm.documentText,
    }).current.judgment;
    const t1R = run(ridm.title, ridm.documentText, [PAYER_JOB]).current.judgment;
    expect(t1R.stageId === 'S3' || t1R.verdictId === 'conditionally_viable' || t1R.verdictId === 'viable').toBe(
      true,
    );
    expect(t1R.criticalUnknown).not.toBe(t0R.criticalUnknown);
    expect(t1R.validationPriority).not.toBe(t0R.validationPriority);
  });

  it('keeps negative hops after VALIDATED then churn', () => {
    const juinjip = getSiCalibrationCase('juinjip');
    const after = run(juinjip.title, juinjip.documentText, [
      PAYER_SPLIT,
      '결제자 3명이 모두 거절했고 아무도 마케팅비를 내지 않았다.',
    ]).current.judgment;
    expect(after.stageId === 'S4').toBe(false);
    expect(after.verdictId === 'viable' && (after.stageId === 'S3' || after.stageId === 'S4')).toBe(false);
  });
});
