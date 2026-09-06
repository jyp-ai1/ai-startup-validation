/**
 * DAY 8-G — Browser: judgment conversation + simple question UX.
 */
import { expect, test } from '@playwright/test';

import {
  advanceToOpenAnswerSurface,
  confirmUnderstanding,
  dismissRecognition,
  startDemoSaas,
  submitAnswer,
  waitForAskSurface,
} from './_helpers/v3-p0-e2e-helpers';

test.describe('DAY 8-G — Judgment Conversation Browser', () => {
  test.beforeEach(async ({ page }) => {
    await startDemoSaas(page);
    await confirmUnderstanding(page);
    await dismissRecognition(page);
    await waitForAskSurface(page);
  });

  test('G-B1 — simple question surface with guide and progress', async ({ page }) => {
    const simple = page.getByTestId('ai-pm-simple-question');
    await expect(simple).toBeVisible({ timeout: 15_000 });

    await expect(page.getByTestId('simple-question-text')).toBeVisible();
    await expect(page.getByTestId('answer-guide-text')).toBeVisible();
    await expect(page.getByTestId('question-progress-label')).toContainText(/사업 이해\s*1\s*\/\s*5/);
    await expect(page.getByTestId('why-question-details')).toBeVisible();

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/memory_document|fieldKey|targetGap|semantic repeat/i);
    expect(body).not.toMatch(/AI가 이해한 현재 사업|focused-business-understanding/i);
  });

  test('G-B2 — multi-dimension answer updates judgment view', async ({ page }) => {
    await advanceToOpenAnswerSurface(page);
    await submitAnswer(
      page,
      '직접 배송하는 반찬가게와 꽃집 사장님이 고객이고, 주문과 배송을 따로 관리하는 게 불편합니다.',
    );
    await page.waitForTimeout(1500);
    await advanceToOpenAnswerSurface(page);
    await submitAnswer(page, '주문과 배송을 한 곳에서 연결해 관리하려고 합니다.');
    await page.waitForTimeout(1500);
    await advanceToOpenAnswerSurface(page);
    await submitAnswer(page, '배송 누락과 확인 시간을 줄일 수 있습니다.');
    await page.waitForTimeout(1500);

    const interimCta = page.getByTestId('show-interim-judgment-cta');
    if (await interimCta.isVisible({ timeout: 5000 }).catch(() => false)) {
      await interimCta.click();
    }

    const judgment = page.getByTestId('ai-pm-judgment-view');
    await expect(judgment).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('judgment-one-liner')).toBeVisible();
    await expect(page.getByTestId('judgment-dim-customer')).toBeVisible();
    await expect(page.getByTestId('judgment-dim-problem')).toBeVisible();
    await expect(page.getByTestId('judgment-conclusion')).toBeVisible();
  });

  test('G-B3 — five questions hard stop', async ({ page }) => {
    const answers = [
      '직접 배송 소상공인이 고객입니다.',
      '주문과 배송 분리 관리가 불편합니다.',
      '한 곳에서 연결해 관리하려 합니다.',
      '배송 누락을 줄이고 싶습니다.',
      '엑셀과 카톡으로 관리 중입니다.',
    ];

    for (const answer of answers) {
      await advanceToOpenAnswerSurface(page);
      await submitAnswer(page, answer);
      await page.waitForTimeout(1200);
    }

    await expect(page.getByTestId('ai-pm-judgment-view')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('judgment-view-title')).toContainText('사업 검토 결과');

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/사업 이해\s*6\s*\/\s*5/);
  });
});
