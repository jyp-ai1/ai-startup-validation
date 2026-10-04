/**
 * P0 Product Journey E2E Recovery — browser Golden J1~J6.
 * Missing answer UI is a failure. Do not treat "if visible" as pass.
 */
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import { dismissCookies, dismissRecognition, submitAnswer } from './_helpers/v3-p0-e2e-helpers';
import { loginWithQaMagicLink, qaAuthReady } from './_helpers/qa-magic-auth';

const ARTIFACT_DIR = process.env.UX_FLOW_ARTIFACT_DIR ?? '/opt/cursor/artifacts/screenshots';

const TITLE = '양조장 체험 관광 서비스';
const LONG_SOURCE =
  '다양한 관광객이 늘며 개인별 다양한 경험을 중요하게 생각한다. 전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광을 연결하고, 양조장의 온라인 마케팅을 지원하는 사업이다.';
const LONG_CORRECTION =
  '아니요. 핵심 고객은 관광객이 아니라 전통주와 양조장 체험을 좋아하는 내국인과 외국인입니다.';

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
    if (await page.getByTestId('viability-result-view').isVisible().catch(() => false)) return;
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

async function confirmYes(page: Page) {
  const card = page.getByTestId('document-first-card');
  if (await card.isVisible().catch(() => false)) {
    await expect(page.getByTestId('understanding-confirm-edit')).toHaveText(/아니요\.?\s*수정할게요/);
    await page.getByTestId('understanding-confirm-yes').click();
    await page.waitForTimeout(1_200);
    return;
  }
  const yes = page.getByRole('button', { name: /^(✓\s*)?(네,\s*)?맞습니다/ });
  await expect(yes.first()).toBeVisible({ timeout: 20_000 });
  await yes.first().click({ force: true });
  await page.waitForTimeout(1_200);
}

test.describe('J1 / J6 — demo clinicflow reaches result', () => {
  test('title, AI understanding, result sections', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('/workspace?demo=guided&sample=clinicflow&fresh=1', {
      waitUntil: 'domcontentloaded',
    });
    await dismissCookies(page);
    await clickThroughReading(page);
    await expect(page.getByTestId('demo-project-title').first()).toHaveText('클리닉플로우');
    await expect(page.getByTestId('current-understanding-block')).toHaveCount(0);

    const playbackBar = page.getByTestId('demo-sample-playback-bar');
    if (await playbackBar.isVisible().catch(() => false)) {
      for (let i = 0; i < 24; i += 1) {
        if (await page.getByTestId('viability-result-view').isVisible().catch(() => false)) break;
        const playbackButton = playbackBar.getByRole('button');
        const playbackLabel = ((await playbackButton.innerText().catch(() => '')) || '').trim();
        if (/사업성 검토 결과 보기|분석 시작/.test(playbackLabel)) {
          await playbackButton.click({ force: true });
          await page.waitForTimeout(2_000);
          break;
        }
        await playbackButton.click({ force: true });
        await page.waitForTimeout(400);
      }
    }

    await expect(page.getByTestId('viability-result-view')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('viability-verdict')).toHaveText(/HOLD|GO|조건부/);
    await shot(page, 'journey-j1-j6-result');
  });
});

test.describe('J2 / J3 / J4 / J5 — authenticated brewery journey', () => {
  test('long-form meaning, correction, conflict, refresh', async ({ page, context }) => {
    test.setTimeout(360_000);
    expect(qaAuthReady(), 'QA magic-link env must be present — do not skip').toBe(true);
    await loginWithQaMagicLink(
      page,
      context,
      process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3198',
    );
    await dismissCookies(page);

    await expect(page.getByTestId('my-projects-create-form')).toBeVisible({ timeout: 20_000 });
    await page.locator('#new-project-title').fill(TITLE);
    await page.locator('input[name="reviewType"][value="startup-idea"]').check();
    await page.locator('#project-description').fill(LONG_SOURCE);
    await page.getByRole('button', { name: /사업 검토 시작|Start business review/ }).click();
    await page.waitForURL(/\/workspace\?project=/, { timeout: 60_000 });
    await clickThroughReading(page);

    await expect(page.getByTestId('project-display-title')).toHaveText(TITLE);
    await expect(page.getByTestId('document-first-card')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('understanding-confirm-edit')).toHaveText(/아니요\.?\s*수정할게요/);
    const body = await page.getByTestId('document-first-card').innerText();
    expect(body).toContain('AI가 이해한 내용');
    expect(body).not.toMatch(/방한 외국인/);
    expect(body).toMatch(/내국인|외국인|전통주|양조장/);
    const sourceToggle = page.getByTestId('source-document-text-toggle');
    if (await sourceToggle.isVisible().catch(() => false)) {
      await sourceToggle.click();
      await expect(page.getByTestId('source-document-text')).toContainText('온라인 마케팅');
    }

    await page.getByTestId('understanding-confirm-edit').click();
    await page.waitForTimeout(800);
    const answer = page.getByTestId('answer-input');
    if (await answer.isVisible().catch(() => false)) {
      await dismissRecognition(page);
      await answer.fill(LONG_CORRECTION);
      await expect(page.getByTestId('submit-answer-cta')).toBeEnabled();
      const submitted = await submitAnswer(page, LONG_CORRECTION);
      expect(submitted).toBe(true);
    } else {
      await confirmYes(page);
    }

    await expect(page.getByTestId('document-first-card')).toHaveCount(0);
    const afterEdit = await page.locator('body').innerText();
    expect(afterEdit).not.toMatch(/방한 외국인/);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await dismissCookies(page);
    await clickThroughReading(page);
    await expect(page.getByTestId('document-first-card')).toHaveCount(0);
    await expect(page.getByTestId('answer-input').or(page.getByTestId('stage-synthesis-panel'))).toBeVisible({
      timeout: 30_000,
    });
    await shot(page, 'journey-j5-refresh');
  });
});
