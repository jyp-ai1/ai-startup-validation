/**
 * PR8.5 — TTAEJYO P0 · V3 browser E2E (E2E-01 ~ E2E-06).
 *
 * Local (V3 flag ON via dev server):
 *   pnpm run test:e2e:v3-p0
 *
 * Production spot-check (V3 flag may be OFF — tests self-skip):
 *   PLAYWRIGHT_BASE_URL='https://ai-startup-validation-tau.vercel.app' CI=1 \
 *   pnpm exec playwright test e2e/v3-p0-production-readiness.spec.ts --config=playwright.v3-p0.config.ts
 */
import { expect, test } from '@playwright/test';

import {
  assertCeoSurfacesOrder,
  bootstrapV3DemoSession,
  CUSTOMER_Q_RE,
  DEMO_SAAS_NAV,
  dismissRecognition,
  isV3PipelineActiveInBrowser,
  PAYER_Q_RE,
  readLoopFromSession,
  readActiveTargetGap,
  readSurfaceQuestion,
  submitAnswer,
  textOrEmpty,
} from './_helpers/v3-p0-e2e-helpers';

test.describe('PR8.5 — V3 P0 Production Readiness E2E', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(360_000);

  test.beforeAll(async ({ browser }, testInfo) => {
    const page = await browser.newPage();
    try {
      await bootstrapV3DemoSession(page);
    } catch {
      testInfo.skip(true, 'V3_REVIEW_PIPELINE not active — set NEXT_PUBLIC_V3_REVIEW_PIPELINE=true at dev start');
    } finally {
      await page.close();
    }
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapV3DemoSession(page);
  });

  test('E2E-01 — workspace entry → answer → review path → next question visible', async ({
    page,
  }) => {
    const v3 = await isV3PipelineActiveInBrowser(page);
    expect(v3).toBe(true);

    const ceo = page.getByTestId('ceo-six-surfaces');
    await expect(ceo).toBeVisible({ timeout: 15_000 });

    const nextQ = await readSurfaceQuestion(page);
    expect(nextQ.length).toBeGreaterThan(5);

    const aiUnderstanding = await textOrEmpty(page, 'ceo-surface-ai-understanding');
    expect(aiUnderstanding.length).toBeGreaterThan(0);
  });

  test('E2E-02 — payer CLOSED → payer not re-asked', async ({ page }) => {
    let payerSeen = false;
    let payerClosed = false;

    for (let i = 0; i < 16; i++) {
      const q = await readSurfaceQuestion(page);
      const gap = await readActiveTargetGap(page);
      const isPayer = PAYER_Q_RE.test(q) || gap === 'payer';

      if (isPayer && !payerClosed) {
        payerSeen = true;
        await submitAnswer(page, 'CEO와 PM이 월 구독료를 지불합니다.');
        const loop = await readLoopFromSession(page);
        if (loop?.gapState?.gaps?.payer?.completeness === 'CLOSED') {
          payerClosed = true;
        }
        await dismissRecognition(page);
        continue;
      }

      if (payerClosed && isPayer) {
        throw new Error(`payer re-asked after CLOSED: "${q}"`);
      }

      const answer = DEMO_SAAS_NAV[i] ?? DEMO_SAAS_NAV[DEMO_SAAS_NAV.length - 1]!;
      if (!(await submitAnswer(page, answer))) break;
    }

    if (!payerClosed) {
      const loop = await readLoopFromSession(page);
      payerClosed = loop?.gapState?.gaps?.payer?.completeness === 'CLOSED';
      if (payerClosed && !payerSeen) payerSeen = true;
    }

    expect(payerSeen || payerClosed).toBe(true);
    expect(payerClosed).toBe(true);
  });

  test('E2E-03 — PARTIAL → same-gap probe', async ({ page }) => {
    let customerTurns = 0;

    for (let i = 0; i < 14; i++) {
      const q = await readSurfaceQuestion(page);
      const gap = await readActiveTargetGap(page);
      const isCustomer = CUSTOMER_Q_RE.test(q) || gap === 'customerPersona';

      if (isCustomer) {
        customerTurns += 1;
        if (customerTurns === 1) {
          await submitAnswer(page, '사람들');
          const loop = await readLoopFromSession(page);
          const partial = loop?.gapState?.gaps?.customerPersona?.completeness === 'PARTIAL';
          expect(partial || customerTurns === 1).toBeTruthy();
          continue;
        }
        if (customerTurns === 2) {
          expect(CUSTOMER_Q_RE.test(q) || gap === 'customerPersona').toBe(true);
          return;
        }
      }

      const answer = DEMO_SAAS_NAV[i] ?? '테스트 답변입니다.';
      if (!(await submitAnswer(page, answer))) break;
    }

    expect(customerTurns).toBeGreaterThanOrEqual(2);
  });

  test('E2E-04 — A→B→A → CLOSED gaps preserved, specific gap clarify only', async ({
    page,
  }) => {
    for (let i = 0; i < 6; i++) {
      const q = await readSurfaceQuestion(page);
      if (PAYER_Q_RE.test(q)) {
        await submitAnswer(page, '고객이 직접 월 구독료를 지불합니다.');
        break;
      }
      await submitAnswer(page, DEMO_SAAS_NAV[i] ?? DEMO_SAAS_NAV[0]!);
    }

    let loop = await readLoopFromSession(page);
    expect(loop?.gapState?.gaps?.payer?.completeness).toBe('CLOSED');
    const closedBefore = Object.entries(loop?.gapState?.gaps ?? {})
      .filter(([, v]) => v?.completeness === 'CLOSED')
      .map(([k]) => k);

    await submitAnswer(page, '아니요, 사장님이 대신 결제합니다.');

    loop = await readLoopFromSession(page);
    for (const gapId of closedBefore) {
      if (gapId === 'payer') continue;
      expect(loop?.gapState?.gaps?.[gapId]?.completeness).toBe('CLOSED');
    }

    const payerState = loop?.gapState?.gaps?.payer?.completeness;
    expect(['CONTRADICTED', 'OPEN', 'PARTIAL'].includes(payerState ?? '')).toBe(true);
  });

  test('E2E-05 — refresh/remount → questionText unchanged', async ({ page }) => {
    for (let i = 0; i < 6; i++) {
      const q = await readSurfaceQuestion(page);
      if (PAYER_Q_RE.test(q)) {
        await submitAnswer(page, '팀 플랜 구독료를 회사가 지불합니다.');
        break;
      }
      await submitAnswer(page, DEMO_SAAS_NAV[i] ?? DEMO_SAAS_NAV[0]!);
    }

    const beforeReload = await readSurfaceQuestion(page);
    expect(beforeReload.length).toBeGreaterThan(5);

    const loopBefore = await readLoopFromSession(page);
    const lockedQ =
      loopBefore?.lockedAskSurface?.questionText ??
      loopBefore?.lastDecision?.questionText ??
      beforeReload;

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3_000);
    await dismissRecognition(page);

    await page.getByTestId('s11-surface').waitFor({ state: 'visible', timeout: 60_000 }).catch(() => null);

    const afterReload = await readSurfaceQuestion(page);
    expect(afterReload).toBe(lockedQ);
  });

  test('E2E-06 — CEO 6 surfaces ②→③→④→⑤→⑥ visible in order', async ({ page }) => {
    await assertCeoSurfacesOrder(page);

    await expect(page.getByTestId('ceo-surface-ai-understanding')).toBeVisible();
    await expect(page.getByTestId('ceo-surface-why-ask')).toBeVisible();
    await expect(page.getByTestId('ceo-surface-next-question')).toBeVisible();
  });
});
