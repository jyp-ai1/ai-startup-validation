/**
 * DAY 8-D Phase D — Browser D1–D5 Research UX verification.
 * Compatible with DAY 8-G simple question UI (no focused 3-block surface required).
 */
import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import {
  confirmUnderstanding,
  dismissRecognition,
  readSurfaceQuestion,
  startDemoSaas,
  submitResearchDelegation,
  waitForAskSurface,
} from './_helpers/v3-p0-e2e-helpers';

const ARTIFACT_DIR =
  process.env.DAY8D_ARTIFACT_DIR ?? '/tmp/cursor-artifacts/screenshots/day8d-phase-d';

async function readQuestionSurface(page: import('@playwright/test').Page) {
  const simple = page.getByTestId('ai-pm-simple-question');
  if (await simple.isVisible({ timeout: 2000 }).catch(() => false)) {
    return {
      mode: 'simple' as const,
      question: await readSurfaceQuestion(page),
    };
  }
  const focused = page.getByTestId('ai-pm-focused-surface');
  if (await focused.isVisible({ timeout: 2000 }).catch(() => false)) {
    return {
      mode: 'focused' as const,
      question: await readSurfaceQuestion(page),
      business: (await page.getByTestId('focused-business-understanding').innerText()).trim(),
      judgment: (await page.getByTestId('focused-current-judgment').innerText()).trim(),
    };
  }
  return { mode: 'legacy' as const, question: await readSurfaceQuestion(page) };
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
    await submitResearchDelegation(page, '경쟁사 찾아줘');
    await page.waitForTimeout(800);

    const ack = page.getByTestId('research-ack-panel');
    await expect(ack).toBeVisible({ timeout: 8000 });

    const ackText = await ack.innerText();
    expect(ackText).toMatch(/경쟁|대안|확인|조사/i);
    expect(ackText).not.toMatch(/RESEARCH|intent|gapId/i);

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/비슷한 역할을 이미 하고 있는 서비스가 있나요/);

    await saveScreenshot(page, 'd1_research_intent');
  });

  test('D2 — question engine bypass: no new gap question after research', async ({ page }) => {
    const q0 = (await readQuestionSurface(page)).question;
    await submitResearchDelegation(page, '시장조사 해줘');
    await page.waitForTimeout(800);

    await expect(page.getByTestId('research-ack-panel')).toBeVisible({ timeout: 8000 });
    const q1 = (await readQuestionSurface(page)).question;
    expect(q1).not.toBe(q0);
    expect(q1).not.toMatch(/누구인가요|비용은 누가/);

    await saveScreenshot(page, 'd2_question_bypass');
  });

  test('D3 — CEO-friendly copy only', async ({ page }) => {
    await submitResearchDelegation(page, '비슷한 서비스 조사해줘');
    await page.waitForTimeout(800);

    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/\bRESEARCH\b|intent=RESEARCH|gapId=/);
    expect(body).toMatch(/조사|확인|대안|서비스/i);

    await saveScreenshot(page, 'd3_ceo_copy');
  });

  test('D4 — question freeze after research request', async ({ page }) => {
    const qBefore = (await readQuestionSurface(page)).question;
    await submitResearchDelegation(page, '경쟁사 찾아줘');
    await page.waitForTimeout(800);

    const qAfter = (await readQuestionSurface(page)).question;
    expect(qAfter).not.toBe(qBefore);
    await page.waitForTimeout(500);
    const qStill = (await readQuestionSurface(page)).question;
    expect(qStill).toBe(qAfter);

    await saveScreenshot(page, 'd4_question_freeze');
  });

  test('D5 — return continuity after resume', async ({ page }) => {
    const before = await readQuestionSurface(page);

    await submitResearchDelegation(page, '경쟁사 찾아줘');
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: '이해 루프로 돌아가기' }).click();
    await waitForAskSurface(page);

    const after = await readQuestionSurface(page);
    expect(after.question.length).toBeGreaterThan(5);
    if (before.mode === 'focused' && after.mode === 'focused') {
      expect(after.business!.length).toBeGreaterThan(5);
      expect(after.judgment!.length).toBeGreaterThan(5);
    }

    await saveScreenshot(page, 'd5_return_continuity');
  });
});
