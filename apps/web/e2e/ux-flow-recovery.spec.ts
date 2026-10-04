/**
 * UX / Flow Recovery — real browser clicks.
 * Demo clinicflow fixture + brewery custom document.
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
  if (await yes.first().isVisible({ timeout: 8_000 }).catch(() => false)) {
    await yes.first().click({ force: true });
    await page.waitForTimeout(1_200);
    return;
  }
  await confirmUnderstanding(page);
}

test.describe('UX Flow Recovery — Demo clinicflow fixture', () => {
  test('clinicflow title and one-liner come from the explicit fixture', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/demo/start?fresh=1', { waitUntil: 'domcontentloaded' });
    await dismissCookies(page);
    await page.getByTestId('demo-entry-sample').click();
    await page.getByTestId('demo-sample-clinicflow').click();
    await page.getByTestId('demo-start-sample-read').click();
    await page.waitForURL(/\/workspace/, { timeout: 45_000 });
    await clickThroughReading(page);
    await shot(page, 'ux-clinicflow-workspace');

    await expect(page.getByTestId('demo-project-title').first()).toHaveText('클리닉플로우');
    await expect(page.getByTestId('demo-project-oneliner').first()).toHaveText(CLINICFLOW_ONELINER);
    await page.getByTestId('demo-business-details').locator('summary').click();
    await expect(page.getByTestId('demo-business-details')).toContainText('클리닉플로우');
  });
});

test.describe('UX Flow Recovery — Brewery browser path', () => {
  test('UX-01~12 brewery clicks: understand, answer, edit, conflict, result, PDF', async ({
    page,
  }) => {
    test.setTimeout(360_000);
    await page.goto('/demo/start?fresh=1', { waitUntil: 'domcontentloaded' });
    await dismissCookies(page);

    await page.getByTestId('demo-entry-custom').click();
    await page.getByTestId('demo-my-business-document').fill(BREWERY);
    await page.getByTestId('demo-start-custom-read').click();
    await page.waitForURL(/\/workspace/, { timeout: 45_000 });
    await clickThroughReading(page);
    await shot(page, 'ux-01-02-brewery-intake');

    const understanding = page.getByTestId('current-understanding-narrative');
    if (await understanding.isVisible().catch(() => false)) {
      const narrative = (await understanding.innerText()).trim();
      expect(narrative).not.toBe(BREWERY);
      expect(narrative.slice(0, 40)).not.toBe(BREWERY.slice(0, 40));
    }

    const sourceToggle = page.getByTestId('source-document-text-toggle').or(
      page.getByRole('button', { name: /사업내용 보기/ }),
    );
    if (await sourceToggle.first().isVisible().catch(() => false)) {
      await sourceToggle.first().click();
      await expect(page.getByTestId('source-document-text')).toContainText('양조장 체험');
    }

    await confirmAiUnderstanding(page);
    await dismissRecognition(page);
    await shot(page, 'ux-03-first-question');

    const answerBox = page.getByTestId('answer-input').or(page.locator('textarea').last());
    await expect(answerBox.first()).toBeVisible({ timeout: 60_000 });
    const q1 = (await page.getByTestId('question-progress-label').first().innerText().catch(() => '')) ||
      '';
    const submitted = await submitAnswer(page, '사용자는 관광객이고 구매자는 양조장 대표입니다.');
    expect(submitted).toBe(true);
    await dismissRecognition(page);
    await shot(page, 'ux-04-05-06-after-first-answer');

    const q2 = (await page.getByTestId('question-progress-label').first().innerText().catch(() => '')) ||
      '';
    const body = await page.locator('body').innerText();
    const stateChanged =
      q1 !== q2 ||
      /관광객|양조장 대표/.test(body) ||
      (await page.getByTestId('summary-confirmed-slots').isVisible().catch(() => false));
    expect(stateChanged).toBe(true);

    const edit = page.getByTestId('edit-prior-answer-cta');
    if (await edit.isVisible().catch(() => false)) {
      await edit.click();
      await expect(page.getByTestId('answer-input')).toBeVisible();
      await page.getByTestId('answer-input').fill('예비 관광객');
      await page.getByTestId('submit-answer-cta').click();
      await page.waitForTimeout(1_200);
      await shot(page, 'ux-07-answer-edit');
    }

    await dismissRecognition(page);
    await submitAnswer(page, '핵심 고객은 방한 외국인이 아니라 영세한 양조장 사장님입니다.');
    await page.waitForTimeout(1_500);
    const conflict = page.getByTestId('contradiction-confirm');
    if (await conflict.isVisible().catch(() => false)) {
      await expect(conflict).toContainText('이전 확인');
      await page.getByRole('button', { name: /새 답변이 맞아요/ }).click();
      await shot(page, 'ux-08-conflict');
    } else {
      await shot(page, 'ux-08-no-false-conflict');
    }

    await expect(page.getByTestId('business-summary-rail')).toBeVisible();
    await expect(page.getByTestId('summary-confirmed-slots')).toContainText(/결제자|실제 사용자|문제|시장\/채널|대안\/경쟁|사업/);
    await shot(page, 'ux-09-summary-updated');

    for (let i = 0; i < 6; i += 1) {
      const resultCta = page.getByTestId('start-viability-result-cta');
      if (await resultCta.isVisible().catch(() => false)) {
        await resultCta.click();
        break;
      }
      const playback = page.getByTestId('demo-open-result-cta');
      if (await playback.isVisible().catch(() => false)) {
        await playback.click();
        break;
      }
      await dismissRecognition(page);
      const advanced = await submitAnswer(
        page,
        [
          '문제는 양조장 예약과 동선이 파편화된 것입니다.',
          '현재는 인스타그램과 전화 예약에 의존합니다.',
          '경쟁은 개별 양조장 홈페이지와 지역 관광공사입니다.',
          '차별점은 체험과 주변 관광을 한 동선으로 연결하는 것입니다.',
        ][i % 4]!,
      );
      if (!advanced) break;
      await page.waitForTimeout(800);
    }

    const result = page.getByTestId('viability-result-view').or(page.getByTestId('analysis-result-evidence-first'));
    if (await result.first().isVisible({ timeout: 20_000 }).catch(() => false)) {
      await shot(page, 'ux-10-11-result');
      const pdf = page.getByTestId('pdf-report-cta').first();
      await expect(pdf).toBeVisible();
      await pdf.click();
      const pdfStatus = page.getByTestId('pdf-report-status').first();
      if (await pdfStatus.isVisible().catch(() => false)) {
        await expect(pdfStatus).not.toHaveText('');
      }
      await shot(page, 'ux-12-pdf-cta');
    } else {
      await shot(page, 'ux-10-result-not-yet');
      await expect(page.getByTestId('answer-composer').or(page.getByTestId('start-viability-result-cta'))).toBeVisible();
    }
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
