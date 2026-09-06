/**
 * DAY 8-G — Browser Gate (G-A ~ G-E).
 * Run via: node scripts/run-day8g-e2e.mjs
 */
import { expect, test } from '@playwright/test';

import {
  advanceToOpenAnswerSurface,
  confirmUnderstanding,
  dismissRecognition,
  readSurfaceQuestion,
  startDemoSaas,
  submitOpenAnswer,
  submitUntilJudgmentBudget,
  waitForAskSurface,
} from './_helpers/v3-p0-e2e-helpers';

test.describe('DAY 8-G — Browser Gate', () => {
  test.beforeEach(async ({ page }) => {
    await startDemoSaas(page);
    await confirmUnderstanding(page);
    await dismissRecognition(page);
    await waitForAskSurface(page);
  });

  test('G-A — simple question surface (question + guide + input, no long blocks)', async ({ page }) => {
    await expect(page.getByTestId('ai-pm-simple-question')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('simple-question-text')).toBeVisible();
    await expect(page.getByTestId('answer-guide-text')).toBeVisible();
    await expect(page.getByTestId('question-progress-label')).toContainText(/사업 이해\s*1\s*\/\s*5/);
    await expect(page.getByTestId('why-question-details')).toBeVisible();

    await advanceToOpenAnswerSurface(page);
    const hasTextarea = await page.locator('textarea').last().isVisible().catch(() => false);
    const hasConfirm = await page.getByTestId('confirm-question-actions').isVisible().catch(() => false);
    expect(hasTextarea || hasConfirm).toBe(true);
    if (hasTextarea) {
      await expect(page.getByTestId('submit-answer-cta')).toBeVisible();
    }

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/memory_document|fieldKey|targetGap|semantic repeat/i);
    expect(body).not.toMatch(/AI가 이해한 현재 사업|focused-business-understanding|focused-current-judgment/i);
    expect(body).not.toMatch(/가치 proposition|JTBD|검증 설계/i);
  });

  test('G-B — multi-fact answer updates judgment dimensions', async ({ page }) => {
    await submitOpenAnswer(
      page,
      '반찬가게와 꽃집 같은 직접 배송 소상공인이 고객이고, 주문과 배송을 따로 관리하는 것이 불편합니다.',
    );
    await page.waitForTimeout(1500);
    await submitOpenAnswer(page, '주문과 배송을 한 곳에서 연결해 관리하려고 합니다.');
    await page.waitForTimeout(1500);

    const interimCta = page.getByTestId('show-interim-judgment-cta');
    if (await interimCta.isVisible({ timeout: 8000 }).catch(() => false)) {
      await interimCta.click();
    } else {
      await submitOpenAnswer(page, '배송 누락을 줄이고 확인 부담을 줄일 수 있습니다.');
      await page.waitForTimeout(1500);
      await page.getByTestId('show-interim-judgment-cta').click({ timeout: 10_000 });
    }

    await expect(page.getByTestId('ai-pm-judgment-view')).toBeVisible({ timeout: 10_000 });

    const customer = await page.getByTestId('judgment-dim-customer').innerText();
    const problem = await page.getByTestId('judgment-dim-problem').innerText();
    expect(customer).toMatch(/🟢|🟡/);
    expect(problem).toMatch(/🟢|🟡/);
    expect(customer).not.toMatch(/아직 모름/);
    expect(problem).not.toMatch(/아직 모름/);

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/관리 시간이\s*30%|크게 감소할 것입니다/i);
  });

  test('G-C — Q3 interim judgment view with full structure', async ({ page }) => {
    const answers = [
      '직접 배송 소상공인이 고객입니다.',
      '주문과 배송을 따로 관리해야 해서 불편합니다.',
    ];

    for (const answer of answers) {
      expect(await submitOpenAnswer(page, answer)).toBe(true);
      await page.waitForTimeout(1500);
    }

    await expect(page.getByTestId('show-interim-judgment-cta')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('show-interim-judgment-cta').click();
    await page.waitForTimeout(800);

    await expect(page.getByTestId('judgment-view-title')).toContainText('현재까지의 사업 판단');
    await expect(page.getByTestId('judgment-one-liner')).toBeVisible();
    await expect(page.getByTestId('judgment-dim-customer')).toBeVisible();
    await expect(page.getByTestId('judgment-dim-problem')).toBeVisible();
    await expect(page.getByTestId('judgment-dim-solution')).toBeVisible();
    await expect(page.getByTestId('judgment-dim-customerChange')).toBeVisible();
    await expect(page.getByTestId('judgment-conclusion')).toBeVisible();
    await expect(page.getByTestId('judgment-next-check')).toBeVisible();
  });

  test('G-D — Q5 hard stop auto result view', async ({ page }) => {
    const answers = [
      '반찬가게와 꽃집 같은 직접 배송 소상공인이 고객이고, 주문과 배송을 따로 관리하는 게 불편합니다.',
      '주문과 배송을 한 곳에서 연결해 관리하려고 합니다.',
      '배송 누락을 줄이고 주문 확인 시간을 줄일 수 있습니다.',
      '엑셀과 카카오톡으로 주문을 관리하고 있습니다.',
      '직접 배송 소상공인에게 시간 절약과 실수 감소가 중요합니다.',
    ];

    await submitUntilJudgmentBudget(page, answers);

    await expect(page.getByTestId('ai-pm-judgment-view')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('judgment-view-title')).toContainText('사업 검토 결과');
    await expect(page.getByTestId('ai-pm-simple-question')).not.toBeVisible();
    await expect(page.getByTestId('submit-answer-cta')).not.toBeVisible();

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/사업 이해\s*6\s*\/\s*5/);
  });

  test('G-E — difficult answer reframes instead of repeating', async ({ page }) => {
    const before = await readSurfaceQuestion(page);
    await advanceToOpenAnswerSurface(page);
    await submitOpenAnswer(page, '무슨 말인지 잘 모르겠습니다.');
    await page.waitForTimeout(2000);
    await dismissRecognition(page);

    const after = await readSurfaceQuestion(page);
    expect(after.trim().length).toBeGreaterThan(0);
    expect(after).not.toBe(before);
  });
});
