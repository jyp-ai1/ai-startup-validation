/**
 * UX / Flow Recovery — real user flow gate.
 * Conditional "if visible then pass" is forbidden. Missing answer UI fails the test.
 */
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import { dismissCookies } from './_helpers/v3-p0-e2e-helpers';
import { loginWithQaMagicLink, qaAuthReady } from './_helpers/qa-magic-auth';

const ARTIFACT_DIR =
  process.env.UX_FLOW_ARTIFACT_DIR ?? '/opt/cursor/artifacts/screenshots';

const BREWERY = `다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광 경험을 제공하려 한다.`;

const CLINICFLOW_ONELINER =
  '다양한 병원의 CS를 SaaS 형태로 지원하고 진료와 예약관리를 돕는 서비스입니다.';

async function shot(page: Page, name: string) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, `${name}.png`), fullPage: true });
}

async function clickThroughReading(page: Page) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await dismissCookies(page);
    if (await page.getByTestId('answer-input').isVisible().catch(() => false)) return;
    if (await page.getByTestId('document-first-card').isVisible().catch(() => false)) return;
    if (await page.getByTestId('current-understanding-block').isVisible().catch(() => false)) return;
    if (await page.getByTestId('demo-project-title').first().isVisible().catch(() => false)) return;
    const cont = page.getByRole('button', {
      name: /답변으로 같이 정리하기|같이 확인|계속하기|Continue/i,
    });
    if (await cont.first().isVisible().catch(() => false)) {
      await cont.first().click({ force: true });
      await page.waitForTimeout(800);
      continue;
    }
    await page.waitForTimeout(400);
  }
  throw new Error('Reading sequence never reached AI PM understanding or answer UI');
}

async function openBusinessSource(page: Page, expected: RegExp | string) {
  const sourceToggle = page.getByTestId('source-document-text-toggle');
  if (await sourceToggle.isVisible().catch(() => false)) {
    await sourceToggle.click();
    const source = page.getByTestId('source-document-text');
    await expect(source).toContainText(expected);
    return source;
  }
  const details = page.getByTestId('demo-business-details');
  await expect(details).toBeVisible({ timeout: 10_000 });
  await details.locator('summary').click();
  await expect(details).toContainText(expected);
  return details;
}

async function createBreweryProject(page: Page) {
  await expect(page.getByTestId('my-projects-create-form')).toBeVisible({ timeout: 20_000 });
  await page.locator('#new-project-title').fill('양조장 체험 관광 서비스');
  await page.locator('input[name="reviewType"][value="startup-idea"]').check();
  await page.locator('#project-description').fill(BREWERY);
  await page.getByRole('button', { name: /사업 검토 시작|Start business review/ }).click();
  await page.waitForURL(/\/workspace\?project=/, { timeout: 60_000 });
}

test.describe('E2E 1 — Demo clinicflow fixture and result', () => {
  test('clinicflow title, one-liner, source, result, and PDF status', async ({ page, request }) => {
    test.setTimeout(240_000);
    const health = await request.get('/health');
    expect(health.ok(), `webServer not ready: health ${health.status()}`).toBe(true);
    await page.goto('/workspace?demo=guided&sample=clinicflow&fresh=1', {
      waitUntil: 'domcontentloaded',
    });
    await dismissCookies(page);
    await clickThroughReading(page);
    await shot(page, 'ux-clinicflow-workspace');

    await expect(page.getByTestId('demo-project-title').first()).toHaveText('클리닉플로우');
    await expect(page.getByTestId('demo-project-oneliner').first()).toHaveText(CLINICFLOW_ONELINER);
    await openBusinessSource(page, /클리닉|병원|no-show|예약/i);

    await expect(page.getByTestId('demo-sample-playback-bar')).toBeVisible({ timeout: 20_000 });
    for (let i = 0; i < 24; i += 1) {
      if (await page.getByTestId('viability-result-view').isVisible().catch(() => false)) break;
      const playbackBar = page.getByTestId('demo-sample-playback-bar');
      const playbackButton = playbackBar.getByRole('button');
      const playbackLabel = ((await playbackButton.innerText().catch(() => '')) || '').trim();
      if (/사업성 검토 결과 보기|분석 시작/.test(playbackLabel)) {
        await playbackButton.click({ force: true });
        await page.waitForTimeout(2_000);
        break;
      }
      expect(playbackLabel).toMatch(/다음/);
      await playbackButton.click({ force: true });
      await page.waitForTimeout(400);
    }

    await expect(page.getByTestId('viability-result-view')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('viability-verdict')).toHaveText(/HOLD|GO|조건부/);
    await shot(page, 'ux-10-11-result');
    await page.getByTestId('pdf-report-cta').click();
    await expect(page.getByTestId('pdf-report-status')).toContainText(/PDF|보고서/);
    await shot(page, 'ux-12-pdf-cta');
  });
});

test.describe('E2E 2 — QA Auth brewery single review flow', () => {
  test('logged-in brewery project shows one review flow and stores feedback', async ({
    page,
    context,
    browser,
  }) => {
    test.setTimeout(360_000);
    expect(qaAuthReady(), 'QA magic-link env must be present — do not skip').toBe(true);
    await loginWithQaMagicLink(
      page,
      context,
      process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3198',
    );
    const stateDir = path.join(process.cwd(), '.qa-auth');
    fs.mkdirSync(stateDir, { recursive: true });
    await context.storageState({ path: path.join(stateDir, 'storageState.json') });
    void browser;

    await dismissCookies(page);
    await createBreweryProject(page);
    await shot(page, 'ux-auth-brewery-created');

    const flow = page.getByTestId('ai-pm-review');
    await expect(flow).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('si-review-surface')).toHaveCount(0);
    await expect(page.getByTestId('document-first-card')).toHaveCount(0);
    await expect(page.getByTestId('project-display-title')).toHaveText('양조장 체험 관광 서비스');

    const source = await flow.getAttribute('data-result-source');
    if (source === 'model-review') {
      await page.getByTestId('ai-pm-confirm-result').click();
      await page.getByRole('checkbox', { name: '판단 근거가 불명확함' }).check();
      await page.getByTestId('ai-pm-feedback-submit').click();
      await expect(page.getByTestId('ai-pm-message')).toContainText('이 검토 버전에 저장했습니다');
      await expect(page.getByTestId('ai-pm-revised')).toContainText('가정');
      await page.getByTestId('ai-pm-next-step').click();
      await expect(page.getByTestId('ai-pm-next-question')).toHaveAttribute('data-question-source', 'model-review');
    } else {
      await expect(page.getByTestId('ai-pm-submit')).toBeVisible();
      await expect(page.getByTestId('ai-pm-source')).toContainText('모델 검토 전');
    }
    await shot(page, 'ux-auth-brewery-feedback');
  });
});
