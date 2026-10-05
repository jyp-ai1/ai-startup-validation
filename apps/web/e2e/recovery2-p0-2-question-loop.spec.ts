/**
 * Recovery 2 P0-2 — browser question-loop gates J1–J3 + J5.
 * Data-path SoT: recovery2-p0-2-question-loop.test.ts
 */
import { expect, test } from '@playwright/test';

import { dismissCookies, dismissRecognition, readLoopFromSession, submitAnswer } from './_helpers/v3-p0-e2e-helpers';
import { loginWithQaMagicLink, qaAuthReady } from './_helpers/qa-magic-auth';

const TITLE = '양조장 체험 관광 서비스';
const LONG_SOURCE =
  '다양한 관광객이 늘며 개인별 다양한 경험을 중요하게 생각한다. 전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광을 연결하고, 양조장의 온라인 마케팅을 지원하는 사업이다.';

function e2eBaseUrl(): string {
  if (process.env.PLAYWRIGHT_BASE_URL?.trim()) {
    return process.env.PLAYWRIGHT_BASE_URL.replace(/\/$/, '');
  }
  const host = process.env.PLAYWRIGHT_E2E_HOST ?? '127.0.0.1';
  const port = process.env.PLAYWRIGHT_E2E_PORT ?? '3199';
  return `http://${host}:${port}`;
}

async function clickThroughReading(page: import('@playwright/test').Page) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await dismissCookies(page);
    if (await page.getByTestId('answer-input').isVisible().catch(() => false)) return;
    if (await page.getByTestId('document-first-card').isVisible().catch(() => false)) return;
    const cont = page.getByRole('button', {
      name: /답변으로 같이 정리하기|같이 확인|계속하기|Continue/i,
    });
    if (await cont.first().isVisible().catch(() => false)) {
      await cont.first().click({ force: true });
      await page.waitForTimeout(800);
      continue;
    }
    await page.waitForTimeout(400);
  }
  throw new Error('Reading sequence never reached understanding or answer UI');
}

async function waitForLoopPrompt(page: import('@playwright/test').Page) {
  await expect
    .poll(
      async () => {
        const yes = await page.getByTestId('confirm-yes-cta').isVisible().catch(() => false);
        const input = await page.getByTestId('answer-input').isVisible().catch(() => false);
        return yes || input;
      },
      { timeout: 30_000 },
    )
    .toBe(true);
}

test('P0-2 J1–J3 + J5 priority, no CLOSED re-ask, no multi-fact steal, longitudinal', async ({
  page,
  context,
}) => {
  test.setTimeout(300_000);
  expect(qaAuthReady(), 'QA magic-link env must be present — do not skip').toBe(true);
  await loginWithQaMagicLink(page, context, e2eBaseUrl());
  await dismissCookies(page);

  await expect(page.getByTestId('my-projects-create-form')).toBeVisible({ timeout: 20_000 });
  await page.locator('#new-project-title').fill(TITLE);
  await page.locator('input[name="reviewType"][value="startup-idea"]').check();
  await page.locator('#project-description').fill(LONG_SOURCE);
  await page.getByRole('button', { name: /사업 검토 시작|Start business review/ }).click();
  await page.waitForURL(/\/workspace\?project=/, { timeout: 60_000 });
  await clickThroughReading(page);

  if (await page.getByTestId('understanding-confirm-yes').isVisible().catch(() => false)) {
    await page.getByTestId('understanding-confirm-yes').click();
    await page.waitForTimeout(1_200);
  }
  await waitForLoopPrompt(page);
  await dismissRecognition(page);
  if (await page.getByTestId('confirm-yes-cta').isVisible().catch(() => false)) {
    await page.getByTestId('confirm-yes-cta').click();
    await page.waitForTimeout(1_500);
  }

  const afterBusiness = await expect
    .poll(
      async () => {
        const loop = await readLoopFromSession(page);
        return loop?.lastDecision?.targetGapId ?? loop?.lockedAskSurface?.targetGap ?? '';
      },
      { timeout: 45_000 },
    )
    .toBe('customerPersona');
  void afterBusiness;
  const businessLoop = await readLoopFromSession(page);
  expect(businessLoop?.gapState?.gaps?.customerPersona?.completeness).not.toBe('CLOSED');
  expect(businessLoop?.lastDecision?.questionText ?? '').toMatch(/누구|고객/);

  await waitForLoopPrompt(page);
  await expect(page.getByTestId('answer-input')).toBeVisible({ timeout: 30_000 });
  const submitted = await submitAnswer(page, '방한 외국인');
  expect(submitted).toBe(true);

  await expect
    .poll(
      async () => {
        const loop = await readLoopFromSession(page);
        return loop?.gapState?.gaps?.customerPersona?.completeness ?? '';
      },
      { timeout: 20_000 },
    )
    .toBe('CLOSED');

  const afterCustomer = await readLoopFromSession(page);
  const nextGap =
    afterCustomer?.lastDecision?.targetGapId ?? afterCustomer?.lockedAskSurface?.targetGap ?? '';
  expect(nextGap).not.toBe('customerPersona');
  expect(nextGap).not.toBe('businessOneLiner');
  expect(nextGap === 'payer' || nextGap === 'problemJtbd').toBe(true);
  expect(afterCustomer?.gapState?.gaps?.businessOneLiner?.completeness).toBe('CLOSED');
  expect(afterCustomer?.gapState?.gaps?.payer?.completeness).not.toBe('CLOSED');
  expect(afterCustomer?.gapState?.gaps?.problemJtbd?.completeness).not.toBe('CLOSED');
  const customerEvidence = (afterCustomer?.gapState?.gaps?.customerPersona?.evidence ?? [])
    .map((item) => item.value)
    .join(' ');
  expect(customerEvidence).not.toMatch(/다양한 관광객이 늘며/);

  await waitForLoopPrompt(page);
  await expect(page.getByTestId('answer-input')).toBeVisible({ timeout: 30_000 });
  const thirdAnswer =
    nextGap === 'payer'
      ? '체험 예약은 관광객이 결제합니다.'
      : '양조장마다 홍보 채널이 달라 관광객이 체험을 찾기 어렵습니다.';
  expect(await submitAnswer(page, thirdAnswer)).toBe(true);
  await expect
    .poll(
      async () => {
        const loop = await readLoopFromSession(page);
        return loop?.gapState?.gaps?.customerPersona?.completeness ?? '';
      },
      { timeout: 20_000 },
    )
    .toBe('CLOSED');
  const afterThird = await readLoopFromSession(page);
  expect(afterThird?.gapState?.gaps?.businessOneLiner?.completeness).toBe('CLOSED');
  const afterThirdNext =
    afterThird?.lastDecision?.targetGapId ?? afterThird?.lockedAskSurface?.targetGap ?? '';
  expect(afterThirdNext).not.toBe('customerPersona');
  expect(afterThirdNext).not.toBe('businessOneLiner');
  const afterThirdCustomer = (afterThird?.gapState?.gaps?.customerPersona?.evidence ?? [])
    .map((item) => item.value)
    .join(' ');
  expect(afterThirdCustomer).not.toMatch(/다양한 관광객이 늘며/);
});
