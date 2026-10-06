import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import { CLINICFLOW_DOCUMENT, FITBRIDGE_DOCUMENT } from '../lib/demo/demo-seed-documents';
import { SI_INTEGRATION_ANSWERS } from '../features/strategic-intelligence/lib/si-integration-answers';
import { dismissCookies } from './_helpers/v3-p0-e2e-helpers';

const ARTIFACT_DIR = '/opt/cursor/artifacts/screenshots';

const CASES = [
  {
    id: 'lmulm',
    title: 'LMULM',
    documentText: `LMULM은 교보문고 사내벤처에서 출발한 한정판 문구 브랜드이자 C2C 재판매 플랫폼이다.

교보에서 분사하여 독립 법인으로 운영 중이며, 자체 앱을 출시했다.
오로라 한정판 문구를 실제로 판매했고, 공급망과 초기 고객 구매가 존재한다.
1차 한정판 판매 매출이 있다.

사업 모델은 한정판을 산 구매자가 이후 C2C로 재판매하고, 그 거래가 반복되는 것이다.
현재까지 1차 판매는 있으나, C2C 재판매가 반복적으로 발생하는지는 확인되지 않았다.
재구매·재판매 등록·2차 거래 데이터는 아직 없다.

기존 대안은 중고나라·번개장터 같은 범용 중고 거래와 브랜드 공식 재입고다.`,
  },
  { id: 'clinicflow', title: '클리닉플로우', documentText: CLINICFLOW_DOCUMENT },
  { id: 'fitbridge', title: '핏브릿지', documentText: FITBRIDGE_DOCUMENT },
] as const;

function firstAnswer(questionText: string): string {
  if (/재판매|재구매|두 번째/.test(questionText)) return SI_INTEGRATION_ANSWERS.repeat_loop.validated;
  if (/유료로 제안/.test(questionText)) return SI_INTEGRATION_ANSWERS.paid_conversion.validated;
  if (/직무|돈을 내는 사람은 누구/.test(questionText)) {
    return SI_INTEGRATION_ANSWERS.payer_job.validated;
  }
  return SI_INTEGRATION_ANSWERS.generic.validated;
}

function secondAnswer(questionText: string): string {
  if (/재판매|재구매|두 번째/.test(questionText)) {
    return '같은 구매 코호트에서 18명이 실제 재판매를 등록했고 9건이 거래됐다.';
  }
  if (/유료로 제안/.test(questionText)) {
    return '결제 후보 3명이 월 구독을 결제했고 유료 전환 2건이 발생했다.';
  }
  return '최근 고객 4명이 실제로 결제했고 유료 전환 2건이 발생했다.';
}

for (const fixture of CASES) {
  test(`S.I. Founder Journey E2E — ${fixture.id} two evidence turns`, async ({ page }) => {
    test.setTimeout(120_000);
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const sessionId = `sie2e${fixture.id}`.slice(0, 16);
    const projectId = `demo-my-${sessionId}`;

    await page.addInitScript(
      ({ sessionId: sid, projectId: pid, text }) => {
        sessionStorage.setItem('launchlens.demo.mybusiness.sessionId', sid);
        sessionStorage.setItem(`launchlens.demo.customDocument.${pid}`, text);
        sessionStorage.setItem(`launchlens.document.${pid}.raw`, text);
      },
      { sessionId, projectId, text: fixture.documentText },
    );

    await page.goto('/workspace?demo=guided&sample=custom&fresh=1', {
      waitUntil: 'domcontentloaded',
    });
    await dismissCookies(page);

    const surface = page.getByTestId('si-review-surface');
    const bind = page.getByTestId('si-ai-pm-bind-surface');
    const unknown = page.getByTestId('si-critical-unknown');
    const priority = page.getByTestId('si-validation-priority');
    const question = page.getByTestId('si-ai-pm-question');
    await expect(surface).toBeVisible({ timeout: 60_000 });
    await expect(bind).toBeVisible();

    const t0 = {
      stage: await surface.getAttribute('data-si-stage'),
      unknown: (await unknown.innerText()).trim(),
      priority: (await priority.innerText()).trim(),
      question: (await question.innerText()).trim(),
    };

    await page.getByTestId('si-ai-pm-answer').fill(firstAnswer(t0.question));
    await page.getByTestId('si-ai-pm-submit').click();

    await expect
      .poll(async () => {
        const stage = await surface.getAttribute('data-si-stage');
        const nextUnknown = (await unknown.innerText()).trim();
        const nextPriority = (await priority.innerText()).trim();
        return stage !== t0.stage || nextUnknown !== t0.unknown || nextPriority !== t0.priority;
      })
      .toBe(true);

    const t1 = {
      stage: await surface.getAttribute('data-si-stage'),
      unknown: (await unknown.innerText()).trim(),
      priority: (await priority.innerText()).trim(),
      question: (await question.innerText()).trim(),
    };
    expect(t1.unknown !== t0.unknown || t1.priority !== t0.priority).toBeTruthy();

    await expect(page.getByTestId('si-ai-pm-answer')).toHaveValue('');
    await page.getByTestId('si-ai-pm-answer').fill(secondAnswer(t1.question));
    await page.getByTestId('si-ai-pm-submit').click();

    await expect(surface).toBeVisible();
    await expect(bind).toBeVisible();
    const t2Unknown = (await unknown.innerText()).trim();
    const t2Priority = (await priority.innerText()).trim();
    const t2Judgment = (await page.getByTestId('si-judgment-prose').innerText()).trim();
    expect(t2Unknown.length > 8 && t2Priority.length > 8 && t2Judgment.length > 8).toBeTruthy();

    if (fixture.id === 'lmulm') {
      expect(t0.stage).toBe('S3');
      expect(t1.stage).toBe('S4');
      expect(t0.unknown).toMatch(/C2C|재판매/);
      expect(t1.unknown).toMatch(/반복/);
      expect(t1.priority).toMatch(/두 번째 행동/);
    }

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, `si-founder-journey-e2e-${fixture.id}.png`),
      fullPage: true,
    });
  });
}
