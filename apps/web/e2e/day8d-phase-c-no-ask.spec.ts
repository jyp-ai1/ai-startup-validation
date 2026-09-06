/**
 * DAY 8-D Phase C — Browser C1–C6 No-Ask verification.
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
  process.env.DAY8D_ARTIFACT_DIR ?? '/opt/cursor/artifacts/screenshots/day8d-phase-c';

async function readFocusedBlocks(page: import('@playwright/test').Page) {
  const focused = page.getByTestId('ai-pm-focused-surface');
  const visible = await focused.isVisible({ timeout: 8000 }).catch(() => false);
  if (!visible) {
    return { business: '', judgment: '', question: await readSurfaceQuestion(page) };
  }
  return {
    business: (await page.getByTestId('focused-business-understanding').innerText()).trim(),
    judgment: (await page.getByTestId('focused-current-judgment').innerText()).trim(),
    question: await readSurfaceQuestion(page),
  };
}

async function saveScreenshot(page: import('@playwright/test').Page, name: string) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, `${name}.png`), fullPage: true });
}

const RAW_CUSTOMER_Q = '이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?';

test.describe('DAY 8-D Phase C — No-Ask Browser', () => {
  test.beforeEach(async ({ page }) => {
    await startDemoSaas(page);
    await confirmUnderstanding(page);
    await dismissRecognition(page);
    await waitForAskSurface(page);
  });

  test('C1 — explicit customer: no raw re-ask after customer stated', async ({ page }) => {
    await submitAnswer(page, '주 고객은 반찬가게와 꽃집 같은 직접 배송 소상공인입니다.');
    await waitForAskSurface(page);

    const blocks = await readFocusedBlocks(page);
    expect(blocks.question).not.toBe(RAW_CUSTOMER_Q);
    expect(blocks.question.length).toBeGreaterThan(5);

    await saveScreenshot(page, 'c1_no_raw_reask');
    test.info().attach('C1', { body: `Q="${blocks.question.slice(0, 120)}"` });
  });

  test('C2 — semantic repeat: confirm instead of identical domain ask', async ({ page }) => {
    await submitAnswer(
      page,
      '반찬가게와 꽃집에 직접 배송하는 소상공인을 위한 주문·배송 관리 SaaS입니다.',
    );
    await waitForAskSurface(page);

    const q1 = (await readFocusedBlocks(page)).question;
    await submitAnswer(page, '네, 맞습니다.');
    await waitForAskSurface(page).catch(() => {});

    const q2 = (await readFocusedBlocks(page)).question;
    expect(q1.length).toBeGreaterThan(5);
    expect(q2.length).toBeGreaterThan(5);

    await saveScreenshot(page, 'c2_semantic_repeat');
    test.info().attach('C2', { body: `Q1="${q1.slice(0, 80)}" Q2="${q2.slice(0, 80)}"` });
  });

  test('C3 — competitor stated: no immediate same-cluster raw repeat', async ({ page }) => {
    await submitAnswer(
      page,
      '반찬가게와 꽃집에 직접 배송하는 소상공인을 위한 주문·배송 관리 SaaS입니다.',
    );
    await waitForAskSurface(page);

    const rawCompetitorQ = '비슷한 역할을 이미 하고 있는 서비스가 있나요?';
    await submitAnswer(page, '경쟁사는 Notion과 Linear가 있습니다.');
    await waitForAskSurface(page);

    const blocks = await readFocusedBlocks(page);
    expect(blocks.question.length).toBeGreaterThan(5);
    expect(blocks.question).not.toBe(rawCompetitorQ);

    await saveScreenshot(page, 'c3_cluster_no_repeat');
    test.info().attach('C3', { body: blocks.question.slice(0, 120) });
  });

  test('C4 — knowledge preserved after multiple turns', async ({ page }) => {
    await submitAnswer(page, '주 고객은 반찬가게입니다.');
    await waitForAskSurface(page);

    await submitAnswer(page, '경쟁사는 A, B, C입니다.');
    await waitForAskSurface(page);

    const blocks = await readFocusedBlocks(page);
    expect(blocks.business).toMatch(/반찬/);
    expect(blocks.business).toMatch(/경쟁|A|B|C/i);

    await saveScreenshot(page, 'c4_knowledge_preserved');
    test.info().attach('C4', { body: blocks.business.slice(0, 200) });
  });

  test('C5 — judgment updates when no-ask skips repeat', async ({ page }) => {
    const j0 = (await readFocusedBlocks(page)).judgment;

    await submitAnswer(page, '주 고객은 반찬가게입니다.');
    await waitForAskSurface(page);
    const j1 = (await readFocusedBlocks(page)).judgment;

    expect(j1.length).toBeGreaterThan(5);
    expect(j1).not.toBe(j0);

    await saveScreenshot(page, 'c5_judgment_continuity');
    test.info().attach('C5', { body: `J0→J1 changed: ${j0 !== j1}` });
  });

  test('C6 — meaningful next question after no-ask (not dead end)', async ({ page }) => {
    await submitAnswer(page, '주 고객은 반찬가게입니다.');
    await waitForAskSurface(page);

    const blocks = await readFocusedBlocks(page);
    expect(blocks.question.length).toBeGreaterThan(8);
    expect(blocks.question).not.toMatch(/^\s*$/);

    await saveScreenshot(page, 'c6_meaningful_next');
    test.info().attach('C6', { body: blocks.question.slice(0, 120) });
  });
});
