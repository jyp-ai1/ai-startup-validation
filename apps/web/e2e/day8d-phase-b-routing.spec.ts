/**
 * DAY 8-D Phase B — Browser B1–B5 Answer-First Routing verification.
 * Requires: V3 + Focused UI + Judgment + Answer-First Routing flags.
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
  process.env.DAY8D_ARTIFACT_DIR ?? '/opt/cursor/artifacts/screenshots/day8d-phase-b';

async function readFocusedBlocks(page: import('@playwright/test').Page) {
  const focused = page.getByTestId('ai-pm-focused-surface');
  const visible = await focused.isVisible({ timeout: 8000 }).catch(() => false);
  if (!visible) {
    return {
      focusedVisible: false,
      business: '',
      judgment: '',
      question: await readSurfaceQuestion(page),
    };
  }
  return {
    focusedVisible: true,
    business: (await page.getByTestId('focused-business-understanding').innerText()).trim(),
    judgment: (await page.getByTestId('focused-current-judgment').innerText()).trim(),
    question: await readSurfaceQuestion(page),
  };
}

async function saveScreenshot(page: import('@playwright/test').Page, name: string) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, `${name}.png`), fullPage: true });
}

test.describe('DAY 8-D Phase B — Answer-First Routing Browser', () => {
  test.beforeEach(async ({ page }) => {
    await startDemoSaas(page);
    await confirmUnderstanding(page);
    await dismissRecognition(page);
    await waitForAskSurface(page);
  });

  test('B1 — wrong-slot: competitor answer not stored as solution', async ({ page }) => {
    await submitAnswer(
      page,
      '반찬가게와 꽃집에 직접 배송하는 소상공인을 위한 주문·배송 관리 SaaS입니다.',
    );
    await waitForAskSurface(page);

    const competitorAnswer =
      '경쟁사는 A, B가 있고 기존 서비스는 배송 관리가 안 됩니다.';
    await submitAnswer(page, competitorAnswer);
    await waitForAskSurface(page);

    const blocks = await readFocusedBlocks(page);
    expect(blocks.business.length).toBeGreaterThan(5);
    expect(blocks.business).toMatch(/경쟁|A|B|대안/i);
    expect(blocks.judgment.length).toBeGreaterThan(5);

    await saveScreenshot(page, 'b1_wrong_slot_competitor');
    test.info().attach('B1', {
      body: `U="${blocks.business.slice(0, 120)}" J="${blocks.judgment.slice(0, 80)}"`,
    });
  });

  test('B2 — multi-fact: one answer reflects multiple meanings', async ({ page }) => {
    const answer =
      '주 고객은 반찬가게고, 주문은 전화와 네이버에서 받고, 배송은 직접 합니다.';
    await submitAnswer(page, answer);
    await waitForAskSurface(page);

    const blocks = await readFocusedBlocks(page);
    expect(blocks.business).toMatch(/반찬/);
    expect(blocks.business.length).toBeGreaterThan(20);

    await saveScreenshot(page, 'b2_multi_fact');
    test.info().attach('B2', { body: blocks.business.slice(0, 200) });
  });

  test('B3 — existing knowledge: customer preserved after competitor answer', async ({ page }) => {
    await submitAnswer(page, '주 고객은 반찬가게와 꽃집 같은 직접 배송 소상공인입니다.');
    await waitForAskSurface(page);

    const afterCustomer = await readFocusedBlocks(page);
    expect(afterCustomer.business).toMatch(/반찬/);

    await submitAnswer(page, '경쟁사는 A, B, C입니다.');
    await waitForAskSurface(page);

    const afterCompetitor = await readFocusedBlocks(page);
    expect(afterCompetitor.business).toMatch(/반찬/);
    expect(afterCompetitor.business).toMatch(/경쟁|A|B|C/i);

    await saveScreenshot(page, 'b3_knowledge_preserved');
    test.info().attach('B3', { body: afterCompetitor.business.slice(0, 200) });
  });

  test('B4 — judgment continuity after answer-first routing', async ({ page }) => {
    const before = await readFocusedBlocks(page);
    const j0 = before.judgment;

    await submitAnswer(
      page,
      '반찬가게와 꽃집에 직접 배송하는 소상공인을 위한 주문·배송 관리 SaaS입니다.',
    );
    await waitForAskSurface(page);
    const j1 = (await readFocusedBlocks(page)).judgment;

    await submitAnswer(page, '경쟁사는 Notion과 Linear가 있지만 AI PM 전략 검토는 없습니다.');
    await waitForAskSurface(page);
    const j2 = (await readFocusedBlocks(page)).judgment;

    expect(j1.length).toBeGreaterThan(5);
    expect(j2.length).toBeGreaterThan(5);
    expect(j2).not.toBe(j0);

    await saveScreenshot(page, 'b4_judgment_continuity');
    test.info().attach('B4', { body: `J0→J1→J2 changed: ${j0 !== j1 && j1 !== j2}` });
  });

  test('B5 — correction still works after routing (꽃집 → 반찬가게)', async ({ page }) => {
    await submitAnswer(page, '주 고객은 꽃집과 반찬가게입니다.');
    await waitForAskSurface(page);

    await submitAnswer(
      page,
      '아니요. 제가 말한 핵심 고객은 꽃집이 아니라 반찬가게입니다.',
    );
    await waitForAskSurface(page);

    const blocks = await readFocusedBlocks(page);
    expect(blocks.business).toMatch(/반찬/);
    expect(blocks.judgment).toMatch(/반찬|좁혔|핵심 고객/);

    await saveScreenshot(page, 'b5_correction_routing');
    test.info().attach('B5', {
      body: `U="${blocks.business.slice(0, 120)}" J="${blocks.judgment.slice(0, 80)}"`,
    });
  });
});
