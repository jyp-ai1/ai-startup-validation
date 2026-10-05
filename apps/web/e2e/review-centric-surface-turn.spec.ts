/**
 * Sprint 1 — Review Surface one-turn Preview-equivalent.
 * Answer → same-screen judgment/uncertainty update → next question.
 * Does not reopen P0-1/P0-2 or CEO test. Does not replace decideNextQuestionFromReview.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import {
  dismissCookies,
  dismissRecognition,
  readLoopFromSession,
  submitAnswer,
} from './_helpers/v3-p0-e2e-helpers';
import { loginWithQaMagicLink, qaAuthReady } from './_helpers/qa-magic-auth';

const TITLE = '양조장 체험 관광 서비스';
const LONG_SOURCE =
  '다양한 관광객이 늘며 개인별 다양한 경험을 중요하게 생각한다. 전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광을 연결하고, 양조장의 온라인 마케팅을 지원하는 사업이다.';

function e2eBaseUrl(): string {
  if (process.env.PLAYWRIGHT_BASE_URL?.trim()) {
    return process.env.PLAYWRIGHT_BASE_URL.replace(/\/$/, '');
  }
  const host = process.env.PLAYWRIGHT_E2E_HOST ?? '127.0.0.1';
  const port = process.env.PLAYWRIGHT_E2E_PORT ?? '3001';
  return `http://${host}:${port}`;
}

async function clickThroughReading(page: import('@playwright/test').Page) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await dismissCookies(page);
    if (await page.getByTestId('review-centric-surface').isVisible().catch(() => false)) return;
    if (await page.getByTestId('answer-input').isVisible().catch(() => false)) return;
    const understood = page.getByTestId('understanding-confirm-yes').or(
      page.getByRole('button', { name: /^(✓\s*)?(맞습니다|That'?s right)/i }),
    );
    if (await understood.first().isVisible().catch(() => false)) {
      await understood.first().click({ force: true });
      await page.waitForTimeout(1_200);
      continue;
    }
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
  throw new Error('Reading sequence never reached Review surface or answer UI');
}

async function waitForReview(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('review-centric-surface')).toBeVisible({ timeout: 30_000 });
}

test('Preview-equivalent — one founder turn updates judgment and next question', async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);
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
  await dismissRecognition(page);
  if (await page.getByTestId('confirm-yes-cta').isVisible().catch(() => false)) {
    await page.getByTestId('confirm-yes-cta').click();
    await page.waitForTimeout(1_500);
  }
  await dismissRecognition(page);
  await waitForReview(page);

  const businessSlot = (await page.getByTestId('review-slot-business').innerText()).trim();
  const customerSlot = (await page.getByTestId('review-slot-customer').innerText()).trim();
  expect(businessSlot).not.toContain('다양한 관광객이 늘며');
  expect(customerSlot).not.toMatch(/^○?\s*관광객$/);
  expect(isSourceLike(businessSlot, LONG_SOURCE)).toBe(false);

  const judgmentBefore = (await page.getByTestId('review-judgment-text').innerText()).trim();
  const uncertaintyBefore = (await page.getByTestId('review-uncertainty-text').innerText()).trim();
  const whyText = (await page.getByTestId('review-why-text').innerText()).trim();
  expect(judgmentBefore).toMatch(/양조|관광|고객|지불|사업|검증|문서/);
  expect(judgmentBefore).not.toMatch(/고객이 명확|고객은 명확|고객이 확실|고객이 확인/);
  expect(uncertaintyBefore.length).toBeGreaterThan(4);
  expect(whyText).toMatch(/달라집니다/);

  const questionBefore = await readVisibleQuestion(page);
  expect(questionBefore.length).toBeGreaterThan(4);
  expect(whyAlignsWithQuestion(whyText, questionBefore)).toBe(true);
  const evidenceDir = resolve(process.cwd(), '../../docs/evidence/ALABOM/review-centric-preview');
  mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({
    path: resolve(evidenceDir, '01-before-answer.png'),
    fullPage: true,
  });

  await expect(page.getByTestId('answer-input')).toBeVisible({ timeout: 30_000 });
  const answer = answerForQuestion(questionBefore);
  const submitted = await submitAnswer(page, answer);
  expect(submitted).toBe(true);
  await dismissRecognition(page);
  await waitForReview(page);

  await expect
    .poll(
      async () => {
        const loop = await readLoopFromSession(page);
        return loop?.turns?.some((turn) => turn.answer?.includes(answer.slice(0, 6))) ?? false;
      },
      { timeout: 20_000 },
    )
    .toBe(true);

  const judgmentAfter = (await page.getByTestId('review-judgment-text').innerText()).trim();
  const uncertaintyAfter = (await page.getByTestId('review-uncertainty-text').innerText()).trim();
  expect(judgmentAfter).not.toBe(judgmentBefore);
  expect(judgmentAfter).toMatch(/지불|대안|고객|검증/);
  await expect(page.getByTestId('review-judgment-updated')).toBeVisible();
  expect(uncertaintyAfter.length).toBeGreaterThan(4);

  const loop = await readLoopFromSession(page);
  const nextGap = loop?.lastDecision?.targetGapId ?? loop?.lockedAskSurface?.targetGap ?? '';
  expect(nextGap.length).toBeGreaterThan(2);
  expect(loop?.lastDecision?.targetGapId ?? nextGap).toBe(nextGap);

  const questionAfter = await readVisibleQuestion(page);
  expect(questionAfter.length).toBeGreaterThan(4);
  expect(questionAfter).not.toBe(questionBefore);

  await page.screenshot({
    path: resolve(evidenceDir, '02-after-answer.png'),
    fullPage: true,
  });
  writeFileSync(
    resolve(evidenceDir, 'turn.json'),
    JSON.stringify(
      {
        baseUrl: e2eBaseUrl(),
        capturedAt: new Date().toISOString(),
        structure: {
          business: businessSlot,
          customer: customerSlot,
        },
        judgmentBefore,
        uncertaintyBefore,
        whyThisQuestion: whyText,
        questionBefore,
        answer,
        judgmentAfter,
        uncertaintyAfter,
        questionAfter,
        lastDecisionTargetGap: nextGap,
        judgmentUpdatedVisible: true,
      },
      null,
      2,
    ),
    'utf8',
  );
});

function isSourceLike(value: string, source: string): boolean {
  const slot = value.replace(/\s+/g, ' ').trim();
  const doc = source.replace(/\s+/g, ' ').trim();
  if (slot.length < 12) return false;
  return doc.startsWith(slot.slice(0, 36)) || slot.startsWith(doc.slice(0, 36));
}

function whyAlignsWithQuestion(why: string, question: string): boolean {
  if (/누구|고객/.test(question)) return /고객|전제/.test(why);
  if (/지불|결제|누가/.test(question)) return /지불|사업 모델/.test(why);
  if (/문제|불편/.test(question)) return /문제|대상/.test(why);
  if (/비슷한 역할|이미 하고 있는|대안/.test(question)) return /대안|차별/.test(why);
  return why.length > 4;
}

async function readVisibleQuestion(page: import('@playwright/test').Page): Promise<string> {
  const fromSimple = await page
    .getByTestId('simple-question-text')
    .innerText({ timeout: 1_200 })
    .catch(() => '');
  if (fromSimple.trim().length > 4) return fromSimple.trim();

  const fromRegion = await page
    .getByRole('region', { name: /question|질문/i })
    .locator('p')
    .last()
    .innerText({ timeout: 1_200 })
    .catch(() => '');
  if (fromRegion.trim().length > 4 && !/지금 질문|Current question/.test(fromRegion)) {
    return fromRegion.trim();
  }

  const fromPlaceholder = await page
    .locator('textarea')
    .last()
    .getAttribute('placeholder', { timeout: 1_200 })
    .catch(() => '');
  return (fromPlaceholder ?? '').trim();
}

function answerForQuestion(question: string): string {
  if (/비슷한 역할|이미 하고 있는|대안/.test(question)) {
    return '지금은 네이버 플레이스와 인스타로 홍보하고 있습니다.';
  }
  if (/지불|결제|누가/.test(question)) {
    return '체험 예약은 관광객이 결제합니다.';
  }
  if (/문제|불편/.test(question)) {
    return '양조장마다 홍보 채널이 달라 관광객이 체험을 찾기 어렵습니다.';
  }
  return '방한 외국인';
}
