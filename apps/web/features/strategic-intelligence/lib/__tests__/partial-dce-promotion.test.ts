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

const PAYMENT_ONLY = '결제 후보 2명이 월 구독을 결제했고 유료 전환 1건이 발생했다.';

const NO_SHOW_DOC = `5~20인 병의원은 전화 예약으로 no-show가 18%에 달합니다.
기존 대안은 EMR 기본 알림과 범용 예약앱입니다.
아직 출시되지 않았고 매출은 없습니다.`;

const RETURN_DOC = `D2C 의류 브랜드는 사이즈 불일치로 반품률 32%를 겪습니다.
기존 대안은 True Fit 같은 글로벌 솔루션입니다.
아직 출시되지 않았고 매출은 없습니다.`;

describe('Partial DCE must not promote the verdict — P0', () => {
  it('does not special-case brands or rewrite the question presenter / engine import', () => {
    expect(ANALYZER_SRC).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(PRESENTER_SRC).toMatch(/QUESTION_BY_KIND/);
    expect(ANALYZER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
    expect(PRESENTER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
  });

  it('payment-only on a nameless no-show DCE stays deferred and off S3', () => {
    const t0 = analyzeStrategicIntelligence({ documentText: NO_SHOW_DOC });
    const t1 = analyzeStrategicIntelligence({
      documentText: appendFounderEvidenceToDocument(NO_SHOW_DOC, PAYMENT_ONLY),
    });
    expect(t0.verdictId).toBe('judgment_deferred');
    expect(t0.stageId).not.toBe('S3');
    expect(t1.verdictId).toBe('judgment_deferred');
    expect(t1.stageId).not.toBe('S3');
    expect(t1.judgment).not.toMatch(/사업화 가능성이 높음/);
    expect(t1.criticalUnknown).toMatch(/no-show|노쇼/);
    expect(t1.evidenceMap.some((item) => item.evidenceClass === 'VALIDATED')).toBe(true);
    expect(t1.evidenceMap.some((item) => /DCE는 부분/.test(item.text))).toBe(true);
  });

  it('payment plus stake improvement can promote a nameless no-show DCE', () => {
    const t1 = analyzeStrategicIntelligence({
      documentText: appendFounderEvidenceToDocument(
        NO_SHOW_DOC,
        '결제 후보 2명이 월 구독을 결제했고 no-show가 18%에서 9%로 줄었다.',
      ),
    });
    expect(t1.stageId).toBe('S3');
    expect(['viable', 'conditionally_viable']).toContain(t1.verdictId);
  });

  it('payment-only on a nameless return-rate DCE stays deferred and off S3', () => {
    const t1 = analyzeStrategicIntelligence({
      documentText: appendFounderEvidenceToDocument(RETURN_DOC, PAYMENT_ONLY),
    });
    expect(t1.verdictId).toBe('judgment_deferred');
    expect(t1.stageId).not.toBe('S3');
    expect(t1.criticalUnknown).toMatch(/반품/);
  });

  it('payment plus return-rate drop can promote a nameless return-rate DCE', () => {
    const t1 = analyzeStrategicIntelligence({
      documentText: appendFounderEvidenceToDocument(
        RETURN_DOC,
        '결제 후보 2명이 월 구독을 결제했고 반품률이 32%에서 20%로 줄었다.',
      ),
    });
    expect(t1.stageId).toBe('S3');
    expect(['viable', 'conditionally_viable']).toContain(t1.verdictId);
  });

  it.each(['clinicflow', 'fitbridge'] as const)(
    '%s: payment-only kind answer must not become S3/viable',
    (id) => {
      const fixture = getSiCalibrationCase(id);
      const t0 = resolveSiJourneyIntegration({
        title: fixture.title,
        businessDocument: fixture.documentText,
      });
      const answer = pickSiIntegrationAnswer(t0.firstQuestion.kind, 'validated');
      const t1 = resolveSiJourneyIntegration({
        title: fixture.title,
        businessDocument: fixture.documentText,
        founderAnswer: answer,
      });
      expect(answer).toMatch(/결제했/);
      expect(answer).not.toMatch(/no-show|노쇼|반품/);
      expect(t1.current.judgment.verdictId).toBe('judgment_deferred');
      expect(t1.current.judgment.stageId).not.toBe('S3');
      expect(t1.current.judgment.stageId).not.toBe('S4');
      expect(t1.current.update?.addedEvidence[0]?.evidenceClass).toBe('VALIDATED');
    },
  );
});
