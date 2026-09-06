/**
 * DAY 8-F — Browser: question causality + answer binding.
 */
import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import {
  confirmUnderstanding,
  dismissRecognition,
  readSurfaceQuestion,
  startDemoSaas,
  submitAnswer,
  submitResearchDelegation,
  advanceToOpenAnswerSurface,
  waitForAskSurface,
} from './_helpers/v3-p0-e2e-helpers';

const ARTIFACT_DIR =
  process.env.DAY8F_ARTIFACT_DIR ?? '/opt/cursor/artifacts/screenshots/day8f-question-causality';

async function readFocusedQuestion(page: import('@playwright/test').Page) {
  const focused = page.getByTestId('ai-pm-focused-surface');
  if (await focused.isVisible({ timeout: 5000 }).catch(() => false)) {
    return (await page.getByTestId('focused-confirm-prompt').innerText()).trim();
  }
  return readSurfaceQuestion(page);
}

async function saveScreenshot(page: import('@playwright/test').Page, name: string) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, `${name}.png`), fullPage: true });
}

test.describe('DAY 8-F — Question Causality Browser', () => {
  test.beforeEach(async ({ page }) => {
    await startDemoSaas(page);
    await confirmUnderstanding(page);
    await dismissRecognition(page);
    await waitForAskSurface(page);
  });

  test('F-B1 — value prop answer must not confirm company name', async ({ page }) => {
    await advanceToOpenAnswerSurface(page);
    await submitAnswer(page, '영세한 양조장은 온라인 마케팅을 못합니다.');
    await page.waitForTimeout(1000);
    await advanceToOpenAnswerSurface(page);
    await submitAnswer(
      page,
      '양조장을 온라인 시장으로 홍보하고 지역경제 활성화를 돕습니다.',
    );
    await page.waitForTimeout(1200);

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/취향저격|회사명.*맞나요/i);
    expect(body).not.toMatch(/semantic repeat|memory_document/i);

    const confirmActions = page.getByTestId('confirm-question-actions');
    if (await confirmActions.isVisible({ timeout: 3000 }).catch(() => false)) {
      expect(await page.getByTestId('confirm-yes-cta').isVisible()).toBe(true);
      expect(await page.getByTestId('submit-answer-cta').isVisible().catch(() => false)).toBe(false);
    }

    await saveScreenshot(page, 'f_b1_no_company_confirm');
  });

  test('F-B2 — research delegation stops gap re-ask', async ({ page }) => {
    await submitResearchDelegation(page, '경쟁사를 모르겠습니다. 알아보고 안내해주세요.');
    await page.waitForTimeout(1200);

    const ack = page.getByTestId('research-ack-panel');
    await expect(ack).toBeVisible({ timeout: 10000 });

    const ackText = await ack.innerText();
    expect(ackText).toMatch(/경쟁|대안|확인/);
    expect(ackText).not.toMatch(/누구인가요|경쟁사는 누구/i);

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/\bRESEARCH\b|memory_document|semantic repeat/i);
    expect(body).not.toMatch(/비슷한 역할을 이미 하고 있는 서비스가 있나요/);

    await saveScreenshot(page, 'f_b2_research_delegation');
  });

  test('F-B2b — explicit research cue still works', async ({ page }) => {
    await submitResearchDelegation(page, '경쟁사 찾아줘');
    await page.waitForTimeout(1000);
    await expect(page.getByTestId('research-ack-panel')).toBeVisible({ timeout: 8000 });
  });

  test('F-B3 — confirm question shows Yes/No not textarea-only', async ({ page }) => {
    await advanceToOpenAnswerSurface(page);
    await submitAnswer(
      page,
      '반찬가게와 꽃집 소상공인에게 직접 배송하는 B2B 서비스입니다.',
    );
    await page.waitForTimeout(800);
    await submitAnswer(
      page,
      '소상공인이 주문·배송을 한 번에 관리할 수 있게 돕습니다.',
    );
    await page.waitForTimeout(1200);

    const confirmBlock = page.getByTestId('confirm-question-actions');
    const confirmVisible = await confirmBlock.isVisible({ timeout: 5000 }).catch(() => false);
    const question = await readFocusedQuestion(page);

    if (confirmVisible || /맞나요/.test(question)) {
      await expect(page.getByTestId('confirm-yes-cta')).toBeVisible();
      await expect(page.getByTestId('confirm-no-cta')).toBeVisible();
      const submitVisible = await page
        .getByTestId('submit-answer-cta')
        .isVisible()
        .catch(() => false);
      expect(submitVisible).toBe(false);
    }

    await saveScreenshot(page, 'f_b3_confirm_actions');
  });
});
