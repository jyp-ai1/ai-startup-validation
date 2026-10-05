/**
 * Sprint 1 — Review Surface Prototype smoke.
 * Does not reopen P0-1/P0-2 or CEO test.
 */
import { expect, test } from '@playwright/test';

import {
  confirmUnderstanding,
  dismissRecognition,
  startDemoSaas,
  waitForAskSurface,
} from './_helpers/v3-p0-e2e-helpers';

test.describe('Review-centric surface prototype', () => {
  test('Founder sees structure, judgment, and uncertainty before the question', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await startDemoSaas(page);
    const reviewAlreadyOpen = await page
      .getByTestId('review-centric-surface')
      .isVisible()
      .catch(() => false);
    if (!reviewAlreadyOpen) {
      await confirmUnderstanding(page);
      await dismissRecognition(page);
      await waitForAskSurface(page);
    }

    const review = page.getByTestId('review-centric-surface');
    await expect(review).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('review-structured-slots')).toBeVisible();
    await expect(page.getByTestId('review-slot-business')).toBeVisible();
    await expect(page.getByTestId('review-slot-customer')).toBeVisible();
    await expect(page.getByTestId('review-slot-payer')).toBeVisible();
    await expect(page.getByTestId('review-slot-problem')).toBeVisible();
    await expect(page.getByTestId('review-current-judgment')).toBeVisible();
    await expect(page.getByTestId('review-key-uncertainty')).toBeVisible();
    await expect(page.getByTestId('review-why-this-question')).toBeVisible();
    await expect(page.getByTestId('review-progress-label')).toContainText(
      /지금까지 확인한 것 \d+개/,
    );
    const ask = page
      .getByTestId('ai-pm-simple-question')
      .or(page.getByTestId('simple-question-text'))
      .or(page.getByTestId('s11-surface'))
      .or(page.locator('textarea'));
    await expect(ask.first()).toBeVisible();
  });
});
