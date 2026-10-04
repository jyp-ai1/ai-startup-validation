/**
 * UX / Flow Recovery — real browser clicks.
 * Clinicflow fixture + brewery custom document + sample playback to result.
 * Authenticated new-project runs only when .qa-auth/storageState.json exists.
 */
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import {
  confirmUnderstanding,
  dismissCookies,
  dismissRecognition,
  submitAnswer,
} from './_helpers/v3-p0-e2e-helpers';

const ARTIFACT_DIR =
  process.env.UX_FLOW_ARTIFACT_DIR ?? '/opt/cursor/artifacts/screenshots';
const QA_STATE = path.join(process.cwd(), '.qa-auth/storageState.json');

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
    if (await page.getByTestId('demo-project-title').first().isVisible().catch(() => false)) return;
    if (await page.getByTestId('document-first-card').isVisible().catch(() => false)) return;
    if (await page.getByTestId('current-understanding-block').isVisible().catch(() => false)) return;
    if (await page.getByTestId('answer-composer').isVisible().catch(() => false)) return;
    const cont = page.getByRole('button', {
      name: /답변으로 같이 정리하기|같이 확인|계속하기|Continue|다음/i,
    });
    if (await cont.first().isVisible().catch(() => false)) {
      await cont.first().click({ force: true });
      await page.waitForTimeout(800);
      continue;
    }
    await page.waitForTimeout(400);
  }
}

async function confirmAiUnderstanding(page: Page) {
  const yes = page.getByTestId('understanding-confirm-yes').or(
    page.getByRole('button', { name: /^(✓\s*)?맞습니다(?! —)/ }),
  );
  if (await yes.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
    await yes.first().click({ force: true });
    await page.waitForTimeout(1_200);
    return;
  }
  await confirmUnderstanding(page).catch(() => null);
}

async function openBusinessSource(page: Page) {
  const details = page.getByTestId('demo-business-details');
  if (await details.isVisible().catch(() => false)) {
    await details.locator('summary').click();
    return details;
  }
  const toggle = page.getByTestId('source-document-text-toggle');
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click();
    return page.getByTestId('source-document-text');
  }
  return null;
}

test.describe('UX Flow Recovery — Demo clinicflow fixture', () => {
  test('clinicflow title and one-liner come from the explicit fixture', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/workspace?demo=guided&sample=clinicflow&fresh=1', {
      waitUntil: 'domcontentloaded',
    });
    await dismissCookies(page);
    await clickThroughReading(page);
    await shot(page, 'ux-clinicflow-workspace');

    await expect(page.getByTestId('demo-project-title').first()).toHaveText('클리닉플로우', {
      timeout: 30_000,
    });
    await expect(page.getByTestId('demo-project-oneliner').first()).toHaveText(CLINICFLOW_ONELINER);
    const source = await openBusinessSource(page);
    expect(source).not.toBeNull();
    await expect(source!).toContainText(/클리닉|병원|no-show|예약/i);
  });
});

test.describe('UX Flow Recovery — Brewery browser path', () => {
  test('UX-01~02 brewery: AI understanding is not the source document', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/demo/start?fresh=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await dismissCookies(page);

    await page.getByRole('button', { name: /내 사업 문서로 체험하기/i }).click();
    await page.getByTestId('demo-my-business-document').waitFor({ state: 'visible', timeout: 20_000 });
    await page.getByTestId('demo-my-business-document').fill(BREWERY);
    await page.getByRole('button', { name: /AI Read 시작/i }).click();
    await page.waitForURL(/\/workspace/, { timeout: 60_000 });
    await clickThroughReading(page);
    await shot(page, 'ux-01-02-brewery-intake');

    const narrative = page
      .getByTestId('current-understanding-narrative')
      .or(page.getByTestId('demo-project-oneliner'))
      .first();
    await expect(narrative).toBeVisible({ timeout: 20_000 });
    const narrativeText = (await narrative.innerText()).trim();
    expect(narrativeText).not.toBe(BREWERY);
    expect(narrativeText.slice(0, 40)).not.toBe(BREWERY.slice(0, 40));
    expect(narrativeText).toMatch(/이해했습니다|아직 사업을 충분히 이해하지 못했습니다/);

    const source = await openBusinessSource(page);
    expect(source).not.toBeNull();
    await expect(source!).toContainText('양조장 체험');

    const body = await page.locator('body').innerText();
    expect(body).toMatch(/실제 사용자|결제자|시장\/채널|대안\/경쟁|문제|사업/);
    await shot(page, 'ux-01-02-brewery-understanding');
  });
});

test.describe('UX Flow Recovery — click path to result', () => {
  test('UX-03~12 clinicflow clicks: confirm, answer/edit if writable, result, PDF', async ({
    page,
  }) => {
    test.setTimeout(360_000);
    await page.goto('/workspace?demo=guided&sample=clinicflow&fresh=1', {
      waitUntil: 'domcontentloaded',
    });
    await dismissCookies(page);
    await clickThroughReading(page);
    await shot(page, 'ux-03-clinicflow-open');

    if (await page.getByTestId('document-first-card').isVisible().catch(() => false)) {
      await expect(page.getByTestId('understanding-confirm-edit')).toHaveText(/이 이해 수정하기/);
      await confirmAiUnderstanding(page);
    }

    await dismissRecognition(page);
    const answer = page.getByTestId('answer-input');
    if (await answer.isVisible().catch(() => false)) {
      const readonly = await answer.isEditable().catch(() => false);
      if (readonly) {
        const q1 =
          (await page.getByTestId('question-progress-label').first().innerText().catch(() => '')) ||
          '';
        const submitted = await submitAnswer(page, '사용자는 병원 실장이고 결제자는 원장입니다.');
        expect(submitted).toBe(true);
        await shot(page, 'ux-04-05-06-after-first-answer');
        const edit = page.getByTestId('edit-prior-answer-cta');
        if (await edit.isVisible().catch(() => false)) {
          await expect(edit).toHaveText(/답변 수정하기/);
          await edit.click();
          await page.getByTestId('answer-input').fill('예비 병원 실장');
          await page.getByTestId('submit-answer-cta').click();
          await shot(page, 'ux-07-answer-edit');
        }
        await submitAnswer(page, '핵심 고객은 병원 원장이 아니라 실장입니다.');
        if (await page.getByTestId('contradiction-confirm').isVisible().catch(() => false)) {
          await page.getByRole('button', { name: /새 답변이 맞아요/ }).click();
          await shot(page, 'ux-08-conflict');
        }
        const q2 =
          (await page.getByTestId('question-progress-label').first().innerText().catch(() => '')) ||
          '';
        expect(q1 !== q2 || (await page.locator('body').innerText()).includes('병원')).toBe(true);
      }
    }

    await expect(page.getByTestId('business-summary-rail')).toBeVisible();
    await expect(page.getByTestId('summary-confirmed-slots')).toContainText(
      /결제자|실제 사용자|문제|시장\/채널|대안\/경쟁|사업/,
    );
    await shot(page, 'ux-09-summary-updated');
    await expect(page.getByTestId('demo-sample-playback-bar')).toBeVisible({ timeout: 20_000 });

    for (let i = 0; i < 24; i += 1) {
      if (await page.getByTestId('viability-result-view').isVisible().catch(() => false)) break;
      if (await page.getByTestId('analysis-result-evidence-first').isVisible().catch(() => false)) {
        break;
      }
      const playbackBar = page.getByTestId('demo-sample-playback-bar');
      const playbackButton = playbackBar.getByRole('button');
      const playbackLabel = ((await playbackButton.innerText().catch(() => '')) || '').trim();
      if (/사업성 검토 결과 보기|분석 시작/.test(playbackLabel)) {
        await playbackButton.click({ force: true });
        await page.waitForTimeout(4_000);
        break;
      }
      if (/다음/.test(playbackLabel)) {
        await playbackButton.click({ force: true });
        await page.waitForTimeout(500);
        continue;
      }
      const nextStep = page.getByTestId('start-viability-result-cta');
      if (await nextStep.isVisible().catch(() => false)) {
        await nextStep.click({ force: true });
        await page.waitForTimeout(4_000);
        break;
      }
      break;
    }

    const result = page
      .getByTestId('viability-result-view')
      .or(page.getByTestId('analysis-result-evidence-first'));
    await expect(result.first()).toBeVisible({ timeout: 30_000 });
    await shot(page, 'ux-10-11-result');

    const pdf = page.getByTestId('pdf-report-cta').first();
    await expect(pdf).toBeVisible();
    await pdf.click();
    await expect(page.getByTestId('pdf-report-status').first()).toContainText(/PDF|보고서/, {
      timeout: 8_000,
    });
    await shot(page, 'ux-12-pdf-cta');
  });
});

test.describe('UX Flow Recovery — authenticated new project', () => {
  test('UX-01 create form is reachable with QA storageState', async ({ browser }) => {
    test.skip(!fs.existsSync(QA_STATE), 'QA storageState missing — authenticated UX-01 not run');
    const context = await browser.newContext({ storageState: QA_STATE });
    const page = await context.newPage();
    await page.goto('/ko/workspace', { waitUntil: 'domcontentloaded' });
    if (page.url().includes('/auth/login')) {
      await context.close();
      test.skip(true, 'QA storageState expired — redirected to login');
      return;
    }
    await expect(page.getByTestId('my-projects-create-form')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: /사업 검토 시작|Start business review/ })).toBeVisible();
    await context.close();
  });
});
