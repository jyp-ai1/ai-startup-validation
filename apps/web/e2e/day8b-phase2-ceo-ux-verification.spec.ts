/**
 * DAY 8-B Phase 2 — CPO CEO UX Verification (screenshots A~F + leak scan).
 * Requires: V3_REVIEW_PIPELINE + NEXT_PUBLIC_AI_PM_FOCUSED_UI at dev start.
 */
import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import {
  confirmUnderstanding,
  dismissRecognition,
  readActiveTargetGap,
  readSurfaceQuestion,
  startDemoSaas,
  submitAnswer,
  waitForAskSurface,
  WORKSPACE_SAAS_DEMO_URL,
} from './_helpers/v3-p0-e2e-helpers';

const ARTIFACT_DIR =
  process.env.DAY8B_UX_ARTIFACT_DIR ?? '/opt/cursor/artifacts/screenshots';

const INTERNAL_LEAK_PATTERNS = [
  'businessOneLiner',
  'customerPersona',
  'problemJtbd',
  'marketChannel',
  'targetGap',
  'gapState',
  'Prior turn',
  'score',
  'completeness',
];

async function saveScreenshot(page: import('@playwright/test').Page, name: string) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const filePath = path.join(ARTIFACT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function readFocusedBlocks(page: import('@playwright/test').Page) {
  const focused = page.getByTestId('ai-pm-focused-surface');
  const visible = await focused.isVisible({ timeout: 5_000 }).catch(() => false);
  if (!visible) {
    return {
      focusedVisible: false,
      business: '',
      judgment: '',
      confirm: '',
      question: await readSurfaceQuestion(page),
    };
  }
  return {
    focusedVisible: true,
    business: (await page.getByTestId('focused-business-understanding').innerText()).trim(),
    judgment: (await page.getByTestId('focused-current-judgment').innerText()).trim(),
    confirm: (await page.getByTestId('focused-confirm-prompt').innerText()).trim(),
    question: (await page.getByTestId('focused-confirm-prompt').innerText())
      .split('\n')
      .pop()
      ?.trim() ?? '',
  };
}

async function leakScan(page: import('@playwright/test').Page): Promise<string[]> {
  const body = await page.locator('body').innerText();
  return INTERNAL_LEAK_PATTERNS.filter((p) => body.includes(p));
}

async function waitForFocusedOrS11(page: import('@playwright/test').Page) {
  const focused = page.getByTestId('ai-pm-focused-surface');
  if (await focused.isVisible({ timeout: 8_000 }).catch(() => false)) return;
  await waitForAskSurface(page);
}

test.describe('DAY 8-B Phase 2 CEO UX Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/start?fresh=1', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForTimeout(1_000);
    const sampleEntry = page.getByTestId('demo-entry-sample');
    await sampleEntry.waitFor({ state: 'visible', timeout: 30_000 });
    await sampleEntry.click();
    await page.getByTestId('demo-sample-saas').click();
    await page.getByTestId('demo-start-sample-read').click();
    await page.waitForURL(/\/workspace/, { timeout: 45_000 });
    await page.waitForTimeout(2_000);
  });

  test('A — first entry bootstrap (no marketChannel)', async ({ page }) => {
    await confirmUnderstanding(page);
    await dismissRecognition(page);
    await waitForFocusedOrS11(page);

    const q = await readSurfaceQuestion(page);
    const gap = await readActiveTargetGap(page);
    const blocks = await readFocusedBlocks(page);
    const leaks = await leakScan(page);

    expect(q).not.toMatch(/검증할 채널|marketChannel/i);
    expect(gap).not.toBe('marketChannel');
    expect(leaks).toEqual([]);

    await saveScreenshot(page, 'day8b_a_first_entry');
    test.info().attach('trace-A', {
      body: `CEO input=(none) → Bootstrap → Q="${q}" gap=${gap} focused=${blocks.focusedVisible}`,
    });
  });

  test('B — first answer → understanding → judgment → next question', async ({ page }) => {
    await confirmUnderstanding(page);
    await dismissRecognition(page);
    await waitForFocusedOrS11(page);

    const answer =
      '반찬가게나 꽃집처럼 직접 배송하는 소상공인이 주문부터 배송까지 한 번에 관리할 수 있게 하는 서비스입니다.';
    await submitAnswer(page, answer);
    await waitForFocusedOrS11(page);

    const blocks = await readFocusedBlocks(page);
    const leaks = await leakScan(page);
    const q = await readSurfaceQuestion(page);

    expect(blocks.business.length).toBeGreaterThan(5);
    expect(blocks.judgment.length).toBeGreaterThan(5);
    expect(blocks.judgment).not.toMatch(/customerPersona|businessOneLiner/i);
    expect(q.length).toBeGreaterThan(5);
    expect(leaks).toEqual([]);

    await saveScreenshot(page, 'day8b_b_first_answer');
    test.info().attach('trace-B', {
      body: `CEO="${answer.slice(0, 40)}…" → Understanding="${blocks.business.slice(0, 40)}" → Judgment="${blocks.judgment.slice(0, 40)}" → Q="${q.slice(0, 40)}"`,
    });
  });

  test('C — RESEARCH intent stops question engine', async ({ page }) => {
    await confirmUnderstanding(page);
    await dismissRecognition(page);
    await waitForFocusedOrS11(page);

    const beforeQ = await readSurfaceQuestion(page);
    await submitAnswer(page, '경쟁사 찾아줘');

    const midPanel = page.getByTestId('mid-judgment-panel');
    const stubVisible = await midPanel.isVisible({ timeout: 5_000 }).catch(() => false);
    const afterQ = await readSurfaceQuestion(page);

    expect(stubVisible).toBe(true);
    expect(afterQ).toBe(beforeQ);

    await saveScreenshot(page, 'day8b_c_research_intent');
    test.info().attach('trace-C', {
      body: `CEO="경쟁사 찾아줘" → Intent=RESEARCH → stub=${stubVisible} → Q unchanged="${afterQ.slice(0, 40)}"`,
    });
  });

  test('F — draft persistence on refresh', async ({ page }) => {
    await confirmUnderstanding(page);
    await dismissRecognition(page);
    await waitForFocusedOrS11(page);

    const draft = '입력 중 refresh 테스트 — 소상공인 배송';
    const box = page.locator('textarea').last();
    await box.fill(draft);
    await page.waitForTimeout(300);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2_000);
    await dismissRecognition(page);
    await waitForFocusedOrS11(page);

    const restored = await box.inputValue();
    expect(restored).toBe(draft);

    await saveScreenshot(page, 'day8b_f_draft_refresh');
    test.info().attach('trace-F', {
      body: `Draft="${draft}" → F5 → restored="${restored}" → PASS`,
    });
  });
});
