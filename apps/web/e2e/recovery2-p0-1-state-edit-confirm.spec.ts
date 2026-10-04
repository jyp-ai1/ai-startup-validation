/**
 * Recovery 2 PR-A — P0-1 browser J1–J5.
 * Data-path SoT is the unit file recovery2-p0-1-state-edit-confirm.test.ts.
 * This spec exercises the same Founder actions in the authenticated workspace.
 */
import { expect, test } from '@playwright/test';

import { dismissCookies, dismissRecognition, readLoopFromSession, submitAnswer } from './_helpers/v3-p0-e2e-helpers';
import { loginWithQaMagicLink, qaAuthReady } from './_helpers/qa-magic-auth';

const TITLE = '양조장 체험 관광 서비스';
const LONG_SOURCE =
  '다양한 관광객이 늘며 개인별 다양한 경험을 중요하게 생각한다. 전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광을 연결하고, 양조장의 온라인 마케팅을 지원하는 사업이다.';
const FOUNDER_CORRECTION = '방한 외국인이 아니라 내국인과 외국인 모두입니다.';
const EDITED = '전통주 양조장 체험객';

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

async function currentCustomer(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => {
    const keys = Object.keys(sessionStorage).filter((key) =>
      key.includes('conversationMemory'),
    );
    for (const key of keys) {
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as {
          facts?: Array<{ key: string; value: string; lifecycle?: string }>;
        };
        const hit = parsed.facts?.find(
          (fact) => fact.key === 'customer' && (fact.lifecycle ?? 'current') === 'current',
        );
        if (hit?.value) return hit.value;
      } catch {
        /* ignore */
      }
    }
    return '';
  });
}

test.describe('Recovery 2 P0-1 State / Edit / Confirm', () => {
  test('J1–J5 confirm, long correction, remount, CLOSED hold, edit prior', async ({
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
    const projectUrl = page.url();
    await clickThroughReading(page);

    await expect(page.getByTestId('project-display-title')).toHaveText(TITLE);
    await expect(page.getByTestId('document-first-card')).toBeVisible({ timeout: 20_000 });
    const firstCard = await page.getByTestId('document-first-card').innerText();
    expect(firstCard).toContain('AI가 이해한 내용');
    expect(firstCard).not.toBe(LONG_SOURCE);
    expect(firstCard).not.toMatch(/방한 외국인/);
    const sourceToggle = page.getByTestId('source-document-text-toggle');
    if (await sourceToggle.isVisible().catch(() => false)) {
      await sourceToggle.click();
      await expect(page.getByTestId('source-document-text')).toContainText('다양한 관광객이 늘며');
    }

    await page.getByTestId('understanding-confirm-yes').click();
    await page.waitForTimeout(1_200);
    await expect(page.getByTestId('document-first-card')).toHaveCount(0);
    await expect(
      page.getByTestId('answer-input').or(page.getByTestId('confirm-yes-cta')),
    ).toBeVisible({ timeout: 30_000 });

    await dismissRecognition(page);
    if (await page.getByTestId('confirm-yes-cta').isVisible().catch(() => false)) {
      await page.getByTestId('confirm-no-cta').click();
      await page.waitForTimeout(600);
    }
    const input = page.getByTestId('answer-input');
    await expect(input).toBeVisible({ timeout: 30_000 });
    await input.fill(FOUNDER_CORRECTION);
    await expect(page.getByTestId('submit-answer-cta')).toBeEnabled();
    await submitAnswer(page, FOUNDER_CORRECTION);
    await page.waitForTimeout(1_500);
    const afterCorrection = await currentCustomer(page);
    expect(afterCorrection).toMatch(/내국인/);
    expect(afterCorrection).toMatch(/외국인/);
    expect(afterCorrection).not.toMatch(/방한/);
    expect(afterCorrection).not.toBe('외국인');
    const loopAfterCorrection = await readLoopFromSession(page);
    const customerEvidence = (loopAfterCorrection?.gapState?.gaps?.customerPersona?.evidence ?? [])
      .map((item) => item.value)
      .join(' ');
    expect(customerEvidence).toMatch(/내국인/);
    expect(customerEvidence).not.toMatch(/방한 외국인/);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await clickThroughReading(page);
    expect(await currentCustomer(page)).toBe(afterCorrection);
    const loopAfterReload = await readLoopFromSession(page);
    expect(loopAfterReload?.gapState?.gaps?.customerPersona?.completeness).toBe('CLOSED');
    expect(
      (loopAfterReload?.gapState?.gaps?.customerPersona?.evidence ?? [])
        .map((item) => item.value)
        .join(' '),
    ).toMatch(/내국인/);

    if (await page.getByTestId('confirm-yes-cta').isVisible().catch(() => false)) {
      await page.getByTestId('confirm-yes-cta').click();
      await page.waitForTimeout(1_000);
    } else if (await page.getByTestId('answer-input').isVisible().catch(() => false)) {
      await submitAnswer(page, '체험 예약은 관광객이 결제합니다.');
      await page.waitForTimeout(1_200);
    }
    expect(await currentCustomer(page)).toBe(afterCorrection);
    const afterNext = await readLoopFromSession(page);
    expect(afterNext?.gapState?.gaps?.customerPersona?.completeness).toBe('CLOSED');
    expect(afterNext?.gapState?.gaps?.payer?.completeness).not.toBe('CONTRADICTED');

    const editCta = page.getByTestId('edit-prior-answer-cta');
    if (await editCta.isVisible().catch(() => false)) {
      await editCta.click();
      await expect(page.getByTestId('answer-input')).toBeVisible();
      await page.getByTestId('answer-input').fill(EDITED);
      await submitAnswer(page, EDITED);
      await page.waitForTimeout(1_200);
      expect(await currentCustomer(page)).toBe(EDITED);
      await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
      await clickThroughReading(page);
      expect(await currentCustomer(page)).toBe(EDITED);
    }
  });

  test('J6–J8 business confirm does not close customerPersona', async ({ page, context }) => {
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

    await page.getByTestId('understanding-confirm-yes').click();
    await page.waitForTimeout(1_200);
    await expect(
      page.getByTestId('answer-input').or(page.getByTestId('confirm-yes-cta')),
    ).toBeVisible({ timeout: 30_000 });
    await dismissRecognition(page);

    const question = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('p, h2, h3, [data-testid]'));
      return nodes.map((node) => node.textContent ?? '').find((text) => /맞나요/.test(text)) ?? '';
    });
    if (/제가 이해한 사업/.test(question) || (await page.getByTestId('confirm-yes-cta').isVisible().catch(() => false))) {
      await page.getByTestId('confirm-yes-cta').click();
      await page.waitForTimeout(1_500);
    }

    const afterBusinessYes = await readLoopFromSession(page);
    const customerGap = afterBusinessYes?.gapState?.gaps?.customerPersona?.completeness;
    expect(customerGap).not.toBe('CLOSED');
    const customer = await currentCustomer(page);
    expect(customer).not.toMatch(/다양한 관광객이 늘며/);

    if (await page.getByTestId('answer-input').isVisible().catch(() => false)) {
      await submitAnswer(page, '방한 외국인');
      await page.waitForTimeout(1_200);
      await submitAnswer(page, FOUNDER_CORRECTION);
      await page.waitForTimeout(1_500);
      const corrected = await currentCustomer(page);
      expect(corrected).toMatch(/내국인/);
      expect(corrected).toMatch(/외국인/);
      expect(corrected).not.toMatch(/방한/);
    }
  });
});
