import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { analyzeStrategicIntelligence } from '../analyze-strategic-intelligence';
import { classifyFounderEvidenceClass } from '../classify-founder-evidence';
import { isCompletedLaunchText, isPlannedLaunchText } from '../launch-status';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';

const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const LAUNCH_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../launch-status.ts'),
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

const PLANNED_BREWERY = `영세 양조장의 온라인 마케팅을 연결한다.
타깃은 관광객과 FIT다.
MVP 런칭 예정이다.
아직 매출은 없다.`;

const LAUNCHED_BREWERY = `영세 양조장의 온라인 마케팅을 연결한다.
타깃은 관광객과 FIT다.
앱을 실제 출시했고 현재 사용자가 있다.`;

const PLANNED_B2B = `병의원 예약 누락이 문제다.
기존 대안은 EMR이다.
고객사에 제안 예정이다.`;

const LIVE_B2B = `병의원 예약 누락이 문제다.
기존 대안은 EMR이다.
고객사에서 실제 사용 중이다.`;

const PREP_SAAS = `감정 기록 AI 컴패니언이다.
수익 모델은 월 구독이다.
서비스 출시 준비 중이다.`;

const PAID_SAAS = `감정 기록 AI 컴패니언이다.
수익 모델은 월 구독이다.
유료 고객이 실제 사용 중이다.`;

function leak(text: string): boolean {
  return /targetGap|gapId|gapTarget|internalId|\bscore\b/i.test(text);
}

function viewOf(document: string, answer?: string) {
  return resolveSiJourneyIntegration({
    title: 'launch-status',
    businessDocument: document,
    founderAnswer: answer,
  });
}

describe('P1-B launch status interpretation', () => {
  it('does not brand-branch, rewrite judgment architecture, or leak Gap Loop IDs', () => {
    expect(`${ANALYZER_SRC}\n${LAUNCH_SRC}\n${CLASSIFY_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
    expect(ANALYZER_SRC).toMatch(/function dceStakeOpen/);
    expect(ANALYZER_SRC).toMatch(/function pickCriticalUnknown/);
    expect(ANALYZER_SRC).toMatch(/from ['"]\.\/launch-status['"]/);
    expect(ANALYZER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
    expect(PRESENTER_SRC).toMatch(/QUESTION_BY_KIND/);
    expect(LAUNCH_SRC).not.toMatch(/replace\([^)]*예정[^)]*출시/);
  });

  it('keeps planned vs completed launch as distinct meanings', () => {
    expect(isPlannedLaunchText('MVP 런칭 예정이다.')).toBe(true);
    expect(isPlannedLaunchText('출시 계획이다.')).toBe(true);
    expect(isPlannedLaunchText('개발 예정이다.')).toBe(true);
    expect(isPlannedLaunchText('서비스 출시 준비 중이다.')).toBe(true);
    expect(isPlannedLaunchText('고객사에 제안 예정이다.')).toBe(true);
    expect(isCompletedLaunchText('앱을 실제 출시했고 현재 사용자가 있다.')).toBe(true);
    expect(isCompletedLaunchText('고객사에서 실제 사용 중이다.')).toBe(true);
    expect(isCompletedLaunchText('유료 고객이 실제 사용 중이다.')).toBe(true);
    expect(isPlannedLaunchText('앱을 실제 출시했고 현재 사용자가 있다.')).toBe(false);
    expect(classifyFounderEvidenceClass('MVP 런칭 예정이다.')).toBe('CLAIM');
    expect(classifyFounderEvidenceClass('고객사에 제안 예정이다.')).toBe('CLAIM');
    expect(classifyFounderEvidenceClass('앱을 실제 출시했고 현재 사용자가 있다.')).not.toBe(
      'VALIDATED',
    );
    expect(classifyFounderEvidenceClass('앱을 실제 출시했고 현재 사용자가 있다.')).toBe('FACT');
  });

  it('does not treat planned launch as already shipped', () => {
    const planned = [
      ['brewery-plan', PLANNED_BREWERY],
      ['b2b-offer', PLANNED_B2B],
      ['saas-prep', PREP_SAAS],
    ] as const;

    for (const [id, document] of planned) {
      const view = viewOf(document);
      const j = view.current.judgment;
      const q = view.current.question;
      expect(j.strengths.join(' '), id).not.toMatch(/이미 출시되어 있다/);
      expect(j.evidenceMap.some((item) => item.evidenceClass === 'VALIDATED'), id).toBe(false);
      expect(j.stageId, id).not.toBe('S4');
      expect(j.verdictId, id).not.toBe('viable');
      expect(leak(`${j.judgment}\n${j.criticalUnknown}\n${j.validationPriority}\n${q.questionText}\n${q.whyAsking}`), id).toBe(
        false,
      );
    }

    const brewery = analyzeStrategicIntelligence({ documentText: PLANNED_BREWERY });
    expect(brewery.strengths.join(' ')).not.toMatch(/이미 출시되어 있다/);
    expect(brewery.criticalUnknown.length).toBeGreaterThan(8);
    expect(brewery.validationPriority.length).toBeGreaterThan(8);
  });

  it('treats completed launch / live use as launch FACT', () => {
    const launched = analyzeStrategicIntelligence({ documentText: LAUNCHED_BREWERY });
    expect(launched.strengths.join(' ')).toMatch(/이미 출시되어 있다/);
    expect(launched.evidenceMap.some((item) => /출시했|사용/.test(item.text) && item.evidenceClass === 'FACT')).toBe(
      true,
    );

    const liveB2b = analyzeStrategicIntelligence({ documentText: LIVE_B2B });
    expect(liveB2b.strengths.join(' ')).toMatch(/이미 출시되어 있다/);

    const paidSaas = analyzeStrategicIntelligence({ documentText: PAID_SAAS });
    expect(paidSaas.strengths.join(' ')).toMatch(/이미 출시되어 있다/);
    expect(classifyFounderEvidenceClass('유료 고객이 실제 사용 중이다.')).not.toBe('VALIDATED');
  });

  it('founder answers: plan stays CLAIM; completed launch is FACT not VALIDATED', () => {
    const plan = viewOf(PLANNED_B2B, '고객사에 제안 예정이다.');
    expect(plan.current.update?.addedEvidence[0]?.evidenceClass).toBe('CLAIM');
    expect(plan.current.update?.addedEvidence[0]?.evidenceClass).not.toBe('VALIDATED');
    expect(plan.current.judgment.verdictId).not.toBe('viable');

    const live = viewOf(PLANNED_B2B, '앱을 실제 출시했고 현재 사용자가 있다.');
    expect(live.current.update?.addedEvidence[0]?.evidenceClass).toBe('FACT');
    expect(live.current.update?.addedEvidence[0]?.evidenceClass).not.toBe('VALIDATED');
    expect(live.current.judgment.strengths.join(' ')).toMatch(/이미 출시되어 있다/);
  });
});
