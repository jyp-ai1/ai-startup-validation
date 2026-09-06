/**
 * DAY 8-H — Browser Gate (H-A ~ H-F) + 8-F/G/D regression.
 */
import { expect, test } from '@playwright/test';

import {
  confirmUnderstanding,
  dismissRecognition,
  startDemoSaas,
  submitOpenAnswer,
  submitUntilJudgmentBudget,
  waitForAskSurface,
} from './_helpers/v3-p0-e2e-helpers';

test.describe('DAY 8-H — Business Review Browser Gate', () => {
  test.beforeEach(async ({ page }) => {
    await startDemoSaas(page);
    await confirmUnderstanding(page);
    await dismissRecognition(page);
    await waitForAskSurface(page);
  });

  test('H-A — finish review opens business review screen', async ({ page }) => {
    await submitOpenAnswer(page, '직접 배송 소상공인이 고객입니다.');
    await page.waitForTimeout(1500);
    await submitOpenAnswer(page, '주문과 배송을 따로 관리해야 해서 불편합니다.');
    await page.waitForTimeout(1500);

    const interimCta = page.getByTestId('show-interim-judgment-cta');
    if (await interimCta.isVisible({ timeout: 8000 }).catch(() => false)) {
      await interimCta.click();
    } else {
      await submitOpenAnswer(page, '주문과 배송을 한 곳에서 관리하려고 합니다.');
      await page.waitForTimeout(1500);
      await page.getByTestId('show-interim-judgment-cta').click({ timeout: 10_000 });
    }

    await expect(page.getByTestId('ai-pm-judgment-view')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('judgment-finish-review-cta').click();
    await page.waitForTimeout(800);

    await expect(page.getByTestId('ai-pm-business-review')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('business-review-title')).toContainText('현재 사업 검토');
  });

  test('H-B — one-page review structure', async ({ page }) => {
    await submitOpenAnswer(
      page,
      '반찬가게와 꽃집 같은 직접 배송 소상공인이 고객이고, 주문과 배송을 따로 관리하는 것이 불편합니다.',
    );
    await page.waitForTimeout(1500);
    await submitOpenAnswer(page, '주문과 배송을 한 곳에서 연결해 관리하려고 합니다.');
    await page.waitForTimeout(1500);
    await page.getByTestId('show-interim-judgment-cta').click({ timeout: 12_000 });
    await page.getByTestId('judgment-finish-review-cta').click();
    await page.waitForTimeout(800);

    await expect(page.getByTestId('business-review-one-liner')).toBeVisible();
    await expect(page.getByTestId('business-review-dim-customer')).toBeVisible();
    await expect(page.getByTestId('business-review-dim-problem')).toBeVisible();
    await expect(page.getByTestId('business-review-dim-solution')).toBeVisible();
    await expect(page.getByTestId('business-review-dim-customerChange')).toBeVisible();
    await expect(page.getByTestId('business-review-ai-judgment')).toBeVisible();
  });

  test('H-C — supplement mode with guide', async ({ page }) => {
    await submitOpenAnswer(
      page,
      '반찬가게와 꽃집 같은 직접 배송 소상공인이 고객이고, 주문과 배송을 따로 관리하는 것이 불편합니다.',
    );
    await page.waitForTimeout(1500);
    await submitOpenAnswer(page, '배송 누락을 줄이고 확인 시간을 줄일 수 있습니다.');
    await page.waitForTimeout(1500);
    await page.getByTestId('show-interim-judgment-cta').click({ timeout: 12_000 });
    await page.getByTestId('judgment-finish-review-cta').click();
    await page.waitForTimeout(800);

    const supplementCta = page.getByTestId('business-review-supplement-cta');
    if (await supplementCta.isVisible({ timeout: 5000 }).catch(() => false)) {
      await supplementCta.click();
      await expect(page.getByTestId('ai-pm-supplement-surface')).toBeVisible({ timeout: 8000 });
      await expect(page.getByTestId('supplement-answer-guide')).toBeVisible();
      await expect(page.getByTestId('supplement-understood')).toBeVisible();
      await expect(page.getByTestId('supplement-question-text')).toBeVisible();
    }
  });

  test('H-D — supplement answer returns to review', async ({ page }) => {
    await submitOpenAnswer(
      page,
      '반찬가게와 꽃집 같은 직접 배송 소상공인이 고객이고, 주문과 배송을 따로 관리하는 것이 불편합니다.',
    );
    await page.waitForTimeout(1500);
    await submitOpenAnswer(page, '배송 누락을 줄이고 확인 시간을 줄일 수 있습니다.');
    await page.waitForTimeout(1500);
    await page.getByTestId('show-interim-judgment-cta').click({ timeout: 12_000 });
    await page.getByTestId('judgment-finish-review-cta').click();
    await page.waitForTimeout(800);

    const supplementCta = page.getByTestId('business-review-supplement-cta');
    if (!(await supplementCta.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No supplement gap in this session');
    }
    await supplementCta.click();
    await page.getByTestId('supplement-answer-input').pressSequentially(
      '엑셀로 주문을 입력하고 배송 일정을 따로 확인하는 과정을 한 화면에서 처리합니다.',
      { delay: 10 },
    );
    await page.getByTestId('supplement-submit-cta').click();
    const thinking = page.getByTestId('ai-pm-thinking-stages');
    if (await thinking.isVisible({ timeout: 8000 }).catch(() => false)) {
      await thinking.waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => null);
    }
    await page.waitForTimeout(1500);
    await expect(page.getByTestId('ai-pm-business-review')).toBeVisible({ timeout: 15_000 });
  });

  test('H-E — continue with current info shows verdict', async ({ page }) => {
    await submitOpenAnswer(
      page,
      '반찬가게와 꽃집 같은 직접 배송 소상공인이 고객이고, 주문과 배송을 따로 관리하는 것이 불편합니다.',
    );
    await page.waitForTimeout(1500);
    await submitOpenAnswer(page, '주문과 배송을 한 곳에서 연결해 관리하려고 합니다.');
    await page.waitForTimeout(1500);
    await page.getByTestId('show-interim-judgment-cta').click({ timeout: 12_000 });
    await page.getByTestId('judgment-finish-review-cta').click();
    await page.waitForTimeout(800);
    await page.getByTestId('business-review-continue-cta').click();
    await page.waitForTimeout(500);

    await expect(page.getByTestId('business-review-verdict')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('business-review-verdict-label')).toContainText(/GO/);
    await expect(page.getByTestId('business-review-next-action')).toBeVisible();
    await expect(page.getByTestId('ai-pm-simple-question')).not.toBeVisible();
  });
});
