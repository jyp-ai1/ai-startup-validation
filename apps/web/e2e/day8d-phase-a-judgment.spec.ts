/**
 * DAY 8-D Phase A — Browser J1/J2 Dynamic Judgment verification.
 * Requires: V3 + Focused UI + AI_PM_JUDGMENT_POLICY_V1.
 */
import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import {
  confirmUnderstanding,
  dismissRecognition,
  startDemoSaas,
  submitAnswer,
  waitForAskSurface,
} from './_helpers/v3-p0-e2e-helpers';

const ARTIFACT_DIR =
  process.env.DAY8D_ARTIFACT_DIR ?? '/opt/cursor/artifacts/screenshots/day8d';

async function readJudgment(page: import('@playwright/test').Page): Promise<string> {
  const focused = page.getByTestId('focused-current-judgment');
  if (await focused.isVisible({ timeout: 5000 }).catch(() => false)) {
    return (await focused.innerText()).trim();
  }
  return '';
}

async function saveScreenshot(page: import('@playwright/test').Page, name: string) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, `${name}.png`), fullPage: true });
}

test.describe('DAY 8-D Phase A — Dynamic Judgment Browser', () => {
  test.beforeEach(async ({ page }) => {
    await startDemoSaas(page);
    await confirmUnderstanding(page);
    await dismissRecognition(page);
    await waitForAskSurface(page);
  });

  test('J1 — judgment changes after CEO answer (not static template)', async ({ page }) => {
    const beforeJ = await readJudgment(page);
    expect(beforeJ.length).toBeGreaterThan(5);

    const answer =
      '반찬가게와 꽃집에 직접 배송하는 소상공인을 위한 주문·배송 관리 SaaS입니다.';
    await submitAnswer(page, answer);
    await waitForAskSurface(page);

    const afterJ = await readJudgment(page);
    expect(afterJ.length).toBeGreaterThan(5);
    expect(afterJ).not.toBe(beforeJ);

    await saveScreenshot(page, 'j1_judgment_after_answer');
    test.info().attach('J1', {
      body: `Before="${beforeJ.slice(0, 80)}" → After="${afterJ.slice(0, 80)}"`,
    });
  });

  test('J2 — judgment does not repeat DAY 8-C static competitor template', async ({ page }) => {
    const STATIC_RE =
      /경쟁·대안 환경을 더 구체적으로 알면 차별 포인트 판단이 가능합니다/;

    const judgments: string[] = [];
    judgments.push(await readJudgment(page));

    await submitAnswer(
      page,
      '반찬가게와 꽃집에 직접 배송하는 소상공인을 위한 주문·배송 관리 SaaS입니다.',
    );
    await waitForAskSurface(page);
    judgments.push(await readJudgment(page));

    await submitAnswer(
      page,
      'Notion, Linear, Jira 같은 도구는 있지만 AI PM 전략 검토는 없습니다.',
    );
    await waitForAskSurface(page);
    judgments.push(await readJudgment(page));

    await submitAnswer(page, '아니요. 제가 말한 핵심 고객은 꽃집이 아니라 반찬가게입니다.');
    await waitForAskSurface(page);
    judgments.push(await readJudgment(page));

    await saveScreenshot(page, 'j2_judgment_sequence');

    const nonEmpty = judgments.filter((j) => j.length > 5);
    expect(new Set(nonEmpty).size).toBeGreaterThan(1);
    expect(nonEmpty.every((j) => !STATIC_RE.test(j))).toBe(true);
    expect(judgments[3]).toMatch(/반찬|좁혔|핵심 고객/);

    test.info().attach('J2', {
      body: judgments.map((j, i) => `Turn${i}: ${j.slice(0, 100)}`).join('\n'),
    });
  });
});
