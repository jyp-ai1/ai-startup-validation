import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  CLINICFLOW_DOCUMENT,
  FITBRIDGE_DOCUMENT,
  LOCAL_SNS_DOCUMENT,
} from '@/lib/demo/demo-seed-documents';
import { classifyFounderEvidenceClass } from '../classify-founder-evidence';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';

const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const CLASSIFY_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../classify-founder-evidence.ts'),
  'utf8',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);
const QUANTITY_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../quantity-unit.ts'),
  'utf8',
);

const CLINIC_SEMANTIC =
  '결제 후보 2곳이 월 구독을 결제했고 no-show가 22%에서 12%로 줄었다.';
const CLINIC_TOKEN =
  '결제 후보 2곳이 월 구독을 결제했고 유료 전환 2건이 발생했으며 no-show가 22%에서 12%로 줄었다.';
const CLINIC_PARTIAL_ORG = '결제 후보 2곳이 월 구독을 결제했다.';
const CLINIC_PARTIAL_TX = '결제 후보 2곳이 월 구독을 결제했고 유료 전환 2건이 발생했다.';
const CLINIC_STAKE = 'no-show가 22%에서 12%로 줄었지만 아직 한 건도 결제되지 않았다.';
const FIT_SEMANTIC = '결제 후보 2곳이 위젯을 결제했고 반품률이 38%에서 29%로 줄었다.';
const FIT_TOKEN =
  '결제 후보 2곳이 위젯을 결제했고 유료 전환 2건이 발생했으며 반품률이 38%에서 29%로 줄었다.';
const FIT_PARTIAL = '결제 후보 2곳이 위젯을 결제했고 유료 전환 2건이 발생했다.';
const ASSUMPTION_PLAN = '유료 제안을 생각하고 있지만 아직 아무도 결제하지 않았다.';
const ASSUMPTION_OFFER = '브랜드 3곳에 제안했지만 아직 한 건도 결제되지 않았다.';
const NEGATIVE_ZERO_ORG = '유료 전환은 0곳이고 아직 아무도 결제하지 않았다.';
const LOCAL_PAY = '파일럿 사장 1명이 월 구독을 결제했고 유료 전환 1건이 발생했다.';

function play(title: string, document: string, answer?: string) {
  const t0 = resolveSiJourneyIntegration({ title, businessDocument: document });
  const view = resolveSiJourneyIntegration({
    title,
    businessDocument: document,
    founderAnswer: answer,
  });
  return {
    t0,
    after: view.current,
    update: view.current.update,
  };
}

describe('P1-C DCE fulfillment / quantity normalization', () => {
  it('does not rewrite analyzer architecture, presenter, or brand-branch', () => {
    expect(`${ANALYZER_SRC}\n${CLASSIFY_SRC}\n${QUANTITY_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
    expect(ANALYZER_SRC).toMatch(/function dceStakeOpen/);
    expect(ANALYZER_SRC).toMatch(/function pickCriticalUnknown/);
    expect(ANALYZER_SRC).toMatch(/from ['"]\.\/quantity-unit['"]/);
    expect(ANALYZER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
    expect(PRESENTER_SRC).toMatch(/QUESTION_BY_KIND/);
    expect(QUANTITY_SRC).not.toMatch(/replace\([^)]*곳[^)]*건/);
  });

  it('ClinicFlow semantic full promotes; token full still promotes; partial stays S1', () => {
    const semantic = play('클리닉플로우', CLINICFLOW_DOCUMENT, CLINIC_SEMANTIC);
    expect(classifyFounderEvidenceClass(CLINIC_SEMANTIC)).toBe('VALIDATED');
    expect(semantic.update?.addedEvidence[0]?.evidenceClass).toBe('VALIDATED');
    expect(semantic.after.judgment.verdictId).not.toBe('judgment_deferred');
    expect(semantic.after.judgment.stageId).not.toBe('S1');
    expect(['S3', 'S2']).toContain(semantic.after.judgment.stageId);
    expect(['viable', 'conditionally_viable']).toContain(semantic.after.judgment.verdictId);
    expect(semantic.after.question.questionText).not.toBe(semantic.t0.current.question.questionText);
    expect(semantic.after.question.questionText).not.toMatch(/재판매/);

    const token = play('클리닉플로우', CLINICFLOW_DOCUMENT, CLINIC_TOKEN);
    expect(classifyFounderEvidenceClass(CLINIC_TOKEN)).toBe('VALIDATED');
    expect(token.after.judgment.stageId).toBe('S3');
    expect(token.after.judgment.verdictId).toBe('viable');

    const partialOrg = play('클리닉플로우', CLINICFLOW_DOCUMENT, CLINIC_PARTIAL_ORG);
    expect(classifyFounderEvidenceClass(CLINIC_PARTIAL_ORG)).toBe('VALIDATED');
    expect(partialOrg.after.judgment.verdictId).toBe('judgment_deferred');
    expect(partialOrg.after.judgment.stageId).toBe('S1');
    expect(partialOrg.after.judgment.stageId).not.toBe('S4');
    expect(partialOrg.after.judgment.criticalUnknown).toMatch(/no-show|노쇼/);

    const partialTx = play('클리닉플로우', CLINICFLOW_DOCUMENT, CLINIC_PARTIAL_TX);
    expect(partialTx.after.judgment.verdictId).toBe('judgment_deferred');
    expect(partialTx.after.judgment.stageId).toBe('S1');

    const stake = play('클리닉플로우', CLINICFLOW_DOCUMENT, CLINIC_STAKE);
    expect(classifyFounderEvidenceClass(CLINIC_STAKE)).not.toBe('VALIDATED');
    expect(stake.after.judgment.verdictId).toBe('judgment_deferred');
    expect(stake.after.judgment.stageId).toBe('S1');
  });

  it('FitBridge semantic full promotes; token and partial keep the same boundary', () => {
    const semantic = play('핏브릿지', FITBRIDGE_DOCUMENT, FIT_SEMANTIC);
    expect(classifyFounderEvidenceClass(FIT_SEMANTIC)).toBe('VALIDATED');
    expect(semantic.after.judgment.verdictId).not.toBe('judgment_deferred');
    expect(semantic.after.judgment.stageId).not.toBe('S1');
    expect(['viable', 'conditionally_viable']).toContain(semantic.after.judgment.verdictId);
    expect(semantic.after.question.questionText).not.toMatch(/재판매/);

    const token = play('핏브릿지', FITBRIDGE_DOCUMENT, FIT_TOKEN);
    expect(token.after.judgment.stageId).toBe('S3');
    expect(token.after.judgment.verdictId).toBe('viable');

    const partial = play('핏브릿지', FITBRIDGE_DOCUMENT, FIT_PARTIAL);
    expect(partial.after.judgment.verdictId).toBe('judgment_deferred');
    expect(partial.after.judgment.stageId).toBe('S1');
    expect(partial.after.judgment.criticalUnknown).toMatch(/반품/);
  });

  it('ASSUMPTION / INTENT and zero counts do not become VALIDATED or viable', () => {
    for (const answer of [ASSUMPTION_PLAN, ASSUMPTION_OFFER, '결제할 예정이다.', '검토 중이다.']) {
      expect(classifyFounderEvidenceClass(answer)).not.toBe('VALIDATED');
    }

    const clinicPlan = play('클리닉플로우', CLINICFLOW_DOCUMENT, ASSUMPTION_PLAN);
    expect(clinicPlan.after.judgment.verdictId).toBe('judgment_deferred');
    expect(clinicPlan.after.judgment.stageId).toBe('S1');
    expect(clinicPlan.update?.addedEvidence[0]?.evidenceClass).not.toBe('VALIDATED');

    const fitOffer = play('핏브릿지', FITBRIDGE_DOCUMENT, ASSUMPTION_OFFER);
    expect(fitOffer.after.judgment.verdictId).toBe('judgment_deferred');
    expect(fitOffer.after.judgment.verdictId).not.toBe('viable');
    expect(fitOffer.update?.addedEvidence[0]?.evidenceClass).not.toBe('VALIDATED');

    const zero = play('클리닉플로우', CLINICFLOW_DOCUMENT, NEGATIVE_ZERO_ORG);
    expect(classifyFounderEvidenceClass(NEGATIVE_ZERO_ORG)).not.toBe('VALIDATED');
    expect(zero.after.judgment.verdictId).not.toBe('viable');
    expect(zero.after.judgment.stageId).not.toBe('S4');
  });

  it('동네장터 1건 payment still fulfills its DCE and stays off 재판매', () => {
    const local = play('동네장터알림', LOCAL_SNS_DOCUMENT, LOCAL_PAY);
    expect(classifyFounderEvidenceClass(LOCAL_PAY)).toBe('VALIDATED');
    expect(local.after.judgment.verdictId).toBe('viable');
    expect(local.after.judgment.stageId).toBe('S3');
    expect(local.after.question.questionText).toMatch(/구독|다시 결제/);
    expect(local.after.question.questionText).not.toMatch(/재판매/);
  });
});
