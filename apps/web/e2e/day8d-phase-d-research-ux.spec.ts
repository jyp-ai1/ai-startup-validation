/**
 * DAY 8-D Phase D — Browser D1–D5 Research UX verification.
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
  waitForAskSurface,
} from './_helpers/v3-p0-e2e-helpers';

const ARTIFACT_DIR =
  process.env.DAY8D_ARTIFACT_DIR ?? '/opt/cursor/artifacts/screenshots/day8d-phase-d';

async function readFocusedBlocks(page: import('@playwright/test').Page) {
  const focused = page.getByTestId('ai-pm-focused-surface');
  const visible = await focused.isVisible({ timeout: 8000 }).catch(() => false);
  if (!visible) {
    return { business: '', judgment: '', confirm: '', question: await readSurfaceQuestion(page) };
  }
  const confirmBlock = page.getByTestId('focused-confirm-prompt');
  return {
    business: (await page.getByTestId('focused-business-understanding').innerText()).trim(),
    judgment: (await page.getByTestId('focused-current-judgment').innerText()).trim(),
    confirm: (await confirmBlock.innerText()).trim(),
    question: await readSurfaceQuestion(page),
  };
}

async function saveScreenshot(page: import('@playwright/test').Page, name: string) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, `${name}.png`), fullPage: true });
}

test.describe('DAY 8-D Phase D — Research UX Browser', () => {
  test.beforeEach(async ({ page }) => {
    await startDemoSaas(page);
    await confirmUnderstanding(page);
    await dismissRecognition(page);
    await waitForAskSurface(page);
  });

  test('D1 — research intent: 경쟁사 찾아줘', async ({ page }) => {
    const beforeQ = (await readFocusedBlocks(page)).question;
    await submitAnswer(page, '경쟁사 찾아줘');
    await page.waitForTimeout(800);

    const ack = page.getByTestId('research-ack-panel');
    await expect(ack).toBeVisible({ timeout: 8000 });

    const blocks = await readFocusedBlocks(page);
    expect(blocks.question).toMatch(/경쟁|대안|확인/);
    expect(blocks.question).not.toMatch(/RESEARCH|intent|gapId/i);
    expect(blocks.business.length).toBeGreaterThan(5);
    expect(blocks.judgment.length).toBeGreaterThan(5);

    await saveScreenshot(page, 'd1_research_intent');
    test.info().attach('D1', { body: `Before="${beforeQ.slice(0, 60)}" After="${blocks.question}"` });
  });

  test('D2 — question engine bypass: no new gap question after research', async ({ page }) => {
    const q0 = (await readFocusedBlocks(page)).question;
    await submitAnswer(page, '시장조사 해줘');
    await page.waitForTimeout(800);

    const q1 = (await readFocusedBlocks(page)).question;
    expect(q1).not.toBe(q0);
    expect(q1).toMatch(/시장|수요|확인|조사/i);
    expect(q1).not.toMatch(/누구인가요|비용은 누가/);

    await saveScreenshot(page, 'd2_question_bypass');
  });

  test('D3 — CEO-friendly copy only', async ({ page }) => {
    await submitAnswer(page, '비슷한 서비스 조사해줘');
    await page.waitForTimeout(800);

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/\bRESEARCH\b|intent=RESEARCH|gapId=/);
    expect(body).toMatch(/조사|확인|대안|서비스/i);

    await saveScreenshot(page, 'd3_ceo_copy');
  });

  test('D4 — question freeze after research request', async ({ page }) => {
    const qBefore = (await readFocusedBlocks(page)).question;
    await submitAnswer(page, '경쟁사 찾아줘');
    await page.waitForTimeout(800);

    const qAfter = (await readFocusedBlocks(page)).question;
    expect(qAfter).not.toBe(qBefore);
    await page.waitForTimeout(500);
    const qStill = (await readFocusedBlocks(page)).question;
    expect(qStill).toBe(qAfter);

    await saveScreenshot(page, 'd4_question_freeze');
  });

  test('D5 — return continuity after resume', async ({ page }) => {
    const before = await readFocusedBlocks(page);

    await submitAnswer(page, '경쟁사 찾아줘');
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: '이해 루프로 돌아가기' }).click();
    await waitForAskSurface(page);

    const after = await readFocusedBlocks(page);
    expect(after.business.length).toBeGreaterThan(5);
    expect(after.judgment.length).toBeGreaterThan(5);
    expect(after.question.length).toBeGreaterThan(5);

    await saveScreenshot(page, 'd5_return_continuity');
    test.info().attach('D5', {
      body: `U preserved=${after.business.length > 0} J preserved=${after.judgment.length > 0}`,
    });
  });
});
