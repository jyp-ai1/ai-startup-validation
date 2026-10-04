/**
 * UX / Flow Recovery — real user flow gate.
 * Conditional "if visible then pass" is forbidden. Missing answer UI fails the test.
 */
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import {
  dismissCookies,
  dismissRecognition,
  submitAnswer,
} from './_helpers/v3-p0-e2e-helpers';
import { loginWithQaMagicLink, qaAuthReady } from './_helpers/qa-magic-auth';

const ARTIFACT_DIR =
  process.env.UX_FLOW_ARTIFACT_DIR ?? '/opt/cursor/artifacts/screenshots';

const BREWERY = `다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광 경험을 제공하려 한다.`;

const CLINICFLOW_ONELINER =
  '다양한 병원의 CS를 SaaS 형태로 지원하고 진료와 예약관리를 돕는 서비스입니다.';

const FIRST_ANSWER = '사용자는 관광객이고 구매자는 양조장 대표가 결제합니다.';
const EDITED_ANSWER = '사용자는 예비 관광객과 현지 여행객입니다. 구매자는 양조장 대표가 결제합니다.';
const CONFLICT_ANSWER =
  '관광객이 앱에서 일정·체험을 직접 예약·결제합니다 — 앞서 말한 양조장 대표 결제와 다릅니다';

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

async function confirmAiUnderstanding(page: Page) {
  const card = page.getByTestId('document-first-card');
  if (await card.isVisible().catch(() => false)) {
    await expect(page.getByTestId('understanding-confirm-edit')).toHaveText(/아니요\.?\s*수정할게요/);
    await expect(page.getByTestId('understanding-confirm-yes')).toBeVisible();
    await page.getByTestId('understanding-confirm-yes').click();
    await page.waitForTimeout(1_200);
    return;
  }
  const yes = page.getByRole('button', { name: /^(✓\s*)?맞습니다(?! —)/ });
  await expect(yes.first()).toBeVisible({ timeout: 20_000 });
  await yes.first().click({ force: true });
  await page.waitForTimeout(1_200);
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

async function expectWritableAnswer(page: Page) {
  await dismissRecognition(page);
  const answer = page.getByTestId('answer-input');
  await expect(answer).toBeVisible({ timeout: 30_000 });
  await expect(answer).toBeEditable();
  return answer;
}

async function submitRequiredAnswer(page: Page, text: string) {
  const answer = await expectWritableAnswer(page);
  await answer.fill(text);
  const submit = page.getByTestId('submit-answer-cta');
  await expect(submit).toBeEnabled();
  const submitted = await submitAnswer(page, text);
  expect(submitted).toBe(true);
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
  test('clinicflow title, one-liner, source, result, and PDF status', async ({ page }) => {
    test.setTimeout(240_000);
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

test.describe('E2E 2+3 — QA Auth brewery writable flow', () => {
  test('create brewery project, answer, edit, conflict, next question', async ({
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
    await clickThroughReading(page);
    await shot(page, 'ux-auth-brewery-created');

    await expect(page.getByTestId('project-display-title')).toHaveText('양조장 체험 관광 서비스');
    await expect(page.getByTestId('document-first-card')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('document-first-card')).toContainText('AI가 이해한 내용');
    await expect(page.getByTestId('current-understanding-block')).toHaveCount(0);

    const narrative = page.getByTestId('current-understanding-narrative');
    await expect(narrative).toBeVisible({ timeout: 20_000 });
    const narrativeText = (await narrative.innerText()).trim();
    expect(narrativeText).not.toBe(BREWERY);
    expect(narrativeText.slice(0, 40)).not.toBe(BREWERY.slice(0, 40));

    await openBusinessSource(page, '양조장 체험');

    await confirmAiUnderstanding(page);
    await shot(page, 'ux-auth-brewery-first-question');
    await expect(page.getByTestId('document-first-card')).toHaveCount(0);
    await expect(page.getByTestId('current-understanding-block')).toHaveCount(0);

    const answer = await expectWritableAnswer(page);
    const progress = page.getByTestId('answer-composer').getByTestId('question-progress-label');
    await expect(progress).toBeVisible();
    const questionBefore = (await progress.innerText()).trim();
    const summaryBefore = (await page.getByTestId('summary-confirmed-slots').innerText()).trim();

    await answer.fill(FIRST_ANSWER);
    await expect(page.getByTestId('submit-answer-cta')).toBeEnabled();
    await submitRequiredAnswer(page, FIRST_ANSWER);
    await shot(page, 'ux-auth-brewery-after-submit');

    await expect(page.getByTestId('my-last-answer')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('my-last-answer')).toContainText(/관광객|양조장 대표/);
    const summaryAfter = (await page.getByTestId('summary-confirmed-slots').innerText()).trim();
    expect(summaryAfter).not.toBe(summaryBefore);
    expect(summaryAfter).toMatch(/관광객|양조장 대표/);
    const questionAfter = (
      await page.getByTestId('answer-composer').getByTestId('question-progress-label').innerText()
    ).trim();
    expect(questionAfter).not.toBe(questionBefore);

    const edit = page.getByTestId('edit-prior-answer-cta');
    await expect(edit).toBeVisible();
    await expect(edit).toHaveText(/답변 수정하기/);
    await edit.click();
    await expectWritableAnswer(page);
    await page.getByTestId('answer-input').fill(EDITED_ANSWER);
    await expect(page.getByTestId('submit-answer-cta')).toBeEnabled();
    await page.getByTestId('submit-answer-cta').click();
    await page.waitForTimeout(1_200);
    await expect(page.getByTestId('my-last-answer')).toContainText(/예비 관광객|여행객|양조장 대표/);
    await shot(page, 'ux-auth-brewery-after-edit');

    await submitRequiredAnswer(page, CONFLICT_ANSWER);
    const conflict = page.getByTestId('contradiction-confirm');
    await expect(conflict).toBeVisible({ timeout: 20_000 });
    await expect(conflict).toContainText('이전 확인');
    await page.getByRole('button', { name: /새 답변이 맞아요/ }).click();
    await page.waitForTimeout(1_200);
    await shot(page, 'ux-auth-brewery-conflict');

    const summaryAfterConflict = (await page.getByTestId('summary-confirmed-slots').innerText()).trim();
    expect(summaryAfterConflict).toMatch(/직접 예약|직접 결제|관광객|양조장/);
    await expectWritableAnswer(page);
    const nextQuestion = (
      await page.getByTestId('answer-composer').getByTestId('question-progress-label').innerText()
    ).trim();
    expect(nextQuestion).not.toBe(questionAfter);
    await shot(page, 'ux-auth-brewery-next-question');
  });
});
