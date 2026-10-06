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

const RETURN_DOC = `D2C 의류 브랜드는 사이즈 불일치로 반품률 32%를 겪습니다.
기존 대안은 True Fit 같은 글로벌 솔루션입니다.
아직 출시되지 않았고 매출은 없습니다.`;

const CHURN_DOC = `B2B 온보딩 팀은 첫 주 이탈이 25%에 달합니다.
기존 대안은 CRM 기본 알림과 범용 온보딩툴입니다.
아직 출시되지 않았고 매출은 없습니다.`;

const PAYMENT_ONLY = pickSiIntegrationAnswer('paid_conversion', 'validated');
const FULL_NOSHOW = '결제 후보 2명이 월 구독을 결제했고 no-show가 18%에서 9%로 줄었다.';
const WORSE_NOSHOW = '유료 2곳이 해지했고 no-show가 9%에서 22%로 늘었다.';
const DENY_PAYMENT = '유료 전환은 없었고 아무도 결제하지 않았다.';
const FLIP_PAYMENT = '지난번에는 됐다고 했지만 이번에는 아니다. 실제 결제는 없다.';

function run(title: string | undefined, documentText: string, answers: string[]) {
  let document = documentText;
  let view = resolveSiJourneyIntegration({ title, businessDocument: document });
  for (const answer of answers) {
    view = resolveSiJourneyIntegration({ title, businessDocument: document, founderAnswer: answer });
    document = appendFounderEvidenceToDocument(document, answer);
  }
  return view.current.judgment;
}

describe('Negative judgment Fix — retract / CONFLICT / downgrade', () => {
  it('does not brand-branch or rewrite the presenter / question engine', () => {
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function applySignalRetractions/);
    expect(ANALYZER_SRC).toMatch(/CONFLICT/);
    expect(PRESENTER_SRC).toMatch(/QUESTION_BY_KIND/);
    expect(ANALYZER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
    expect(PRESENTER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
  });

  it('keeps payment-only off S3 (#104)', () => {
    const t1 = analyzeStrategicIntelligence({
      documentText: appendFounderEvidenceToDocument(NO_SHOW_DOC, PAYMENT_ONLY),
    });
    expect(t1.verdictId).toBe('judgment_deferred');
    expect(t1.stageId).not.toBe('S3');
  });

  it('keeps 2/2 promotion and next-unknown CU (#107)', () => {
    const t1 = analyzeStrategicIntelligence({
      documentText: appendFounderEvidenceToDocument(NO_SHOW_DOC, FULL_NOSHOW),
    });
    expect(t1.stageId).toBe('S3');
    expect(['viable', 'conditionally_viable']).toContain(t1.verdictId);
    expect(t1.criticalUnknown).toMatch(/다음 고객|다음 기간/);
    expect(t1.criticalUnknown).not.toMatch(/지불만/);
  });

  it('does not treat a worsening percent pair as stake_improved', () => {
    const improved = analyzeStrategicIntelligence({
      documentText: appendFounderEvidenceToDocument(NO_SHOW_DOC, FULL_NOSHOW),
    });
    const worsened = analyzeStrategicIntelligence({
      documentText: appendFounderEvidenceToDocument(
        appendFounderEvidenceToDocument(NO_SHOW_DOC, FULL_NOSHOW),
        'no-show가 9%에서 22%로 늘었다.',
      ),
    });
    expect(improved.stageId).toBe('S3');
    expect(worsened.stageId === 'S3' && worsened.verdictId === 'viable').toBe(false);
    expect(worsened.evidenceMap.some((item) => item.evidenceClass === 'CONFLICT')).toBe(true);
  });

  it('downgrades nameless no-show after churn + worse metric', () => {
    const after = run(undefined, NO_SHOW_DOC, [FULL_NOSHOW, WORSE_NOSHOW]);
    expect(after.stageId === 'S3' && after.verdictId === 'viable').toBe(false);
  });

  it('marks direct payment denial as CONFLICT and drops S3', () => {
    const view = resolveSiJourneyIntegration({
      businessDocument: appendFounderEvidenceToDocument(NO_SHOW_DOC, FULL_NOSHOW),
      founderAnswer: DENY_PAYMENT,
    });
    expect(view.current.update?.addedEvidence[0]?.evidenceClass).toBe('CONFLICT');
    expect(view.current.judgment.stageId === 'S3' && view.current.judgment.verdictId === 'viable').toBe(
      false,
    );
  });

  it('does not call repurchase-zero a CONFLICT while still leaving S4', () => {
    const fixture = getSiCalibrationCase('lmulm');
    const upgraded = appendFounderEvidenceToDocument(
      fixture.documentText,
      pickSiIntegrationAnswer('repeat_loop', 'validated'),
    );
    const t1 = analyzeStrategicIntelligence({ title: fixture.title, documentText: upgraded });
    expect(t1.stageId).toBe('S4');
    const t2 = analyzeStrategicIntelligence({
      title: fixture.title,
      documentText: appendFounderEvidenceToDocument(
        upgraded,
        '재판매는 멈췄고 재구매는 0건이다. 최근 구매자 중 아무도 등록하지 않았다.',
      ),
    });
    expect(t2.stageId).not.toBe('S4');
    expect(t2.evidenceMap.some((item) => item.evidenceClass === 'CONFLICT')).toBe(false);
  });

  it('treats a founder flip that denies payment as CONFLICT', () => {
    const clinic = getSiCalibrationCase('clinicflow');
    const view = resolveSiJourneyIntegration({
      title: clinic.title,
      businessDocument: appendFounderEvidenceToDocument(clinic.documentText, FULL_NOSHOW),
      founderAnswer: FLIP_PAYMENT,
    });
    expect(view.current.update?.addedEvidence[0]?.evidenceClass).toBe('CONFLICT');
    expect(
      view.current.judgment.stageId === 'S3' && view.current.judgment.verdictId === 'viable',
    ).toBe(false);
  });

  it('downgrades juinjip / ridm / fitbridge / unnamed returns and churn on negative evidence', () => {
    const juinjip = getSiCalibrationCase('juinjip');
    const ridm = getSiCalibrationCase('ridm');
    const fit = getSiCalibrationCase('fitbridge');
    const j = run(juinjip.title, juinjip.documentText, [
      pickSiIntegrationAnswer('payer_split', 'validated'),
      '결제자 3명이 모두 거절했고 아무도 마케팅비를 내지 않았다.',
    ]);
    const r = run(ridm.title, ridm.documentText, [
      pickSiIntegrationAnswer('payer_job', 'validated'),
      '결제 1건은 취소됐고 직무 대체는 확인되지 않았다.',
    ]);
    const f = run(fit.title, fit.documentText, [
      '결제 후보 2명이 월 구독을 결제했고 반품률가 32%에서 20%로 줄었다.',
      '유료 2곳이 해지했고 반품률가 20%에서 35%로 늘었다.',
    ]);
    const unnamedReturn = run(undefined, RETURN_DOC, [
      '결제 후보 2명이 월 구독을 결제했고 반품률가 32%에서 20%로 줄었다.',
      '유료 2곳이 해지했고 반품률가 20%에서 35%로 늘었다.',
    ]);
    const unnamedChurn = run(undefined, CHURN_DOC, [
      '결제 후보 2명이 월 구독을 결제했고 이탈가 25%에서 12%로 줄었다.',
      '유료 2곳이 해지했고 이탈가 12%에서 30%로 늘었다.',
    ]);
    for (const row of [j, r, f, unnamedReturn, unnamedChurn]) {
      expect(row.stageId === 'S4').toBe(false);
      expect(row.verdictId === 'viable' && (row.stageId === 'S3' || row.stageId === 'S4')).toBe(false);
    }
  });
});
