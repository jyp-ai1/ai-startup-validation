/**
 * S15 Internal QA — user scenarios (no feature work).
 * RUN against local RC: PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000
 */
import { expect, test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const OUT = path.join(process.cwd(), '../../docs/evidence/S15/qa');
const DOC = `사업계획서 요약

서비스명: 병원 AI 스크리닝
형태: B2B SaaS
대상: 병원

핵심 가치: 재방문·대기 관리

아직 수익 모델은 미정입니다.`;

const PDF_PLACEHOLDER = `# plan.pdf

PDF 본문은 아직 추출되지 않았습니다. Business·Customer는 직접 확인이 필요합니다.`;

fs.mkdirSync(OUT, { recursive: true });

async function dismiss(page: import('@playwright/test').Page) {
  const b = page.getByRole('button', { name: /수락|동의|Accept|허용|분석 수락/i });
  if (await b.first().isVisible().catch(() => false)) {
    await b.first().click({ force: true });
  }
}

test('QA-2 PDF upload → Trust → Loop (no filename as business)', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/demo/start', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await dismiss(page);

  await page.getByRole('button', { name: /내 사업 문서로 체험하기/i }).click();
  await page.waitForTimeout(500);

  // Simulate upload by filling paste with PDF placeholder (same analyzer path as file upload)
  await page.locator('textarea').fill(PDF_PLACEHOLDER);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'qa2-upload.png'), fullPage: true });

  await expect(page.getByRole('button', { name: /AI Read 시작/i })).toBeEnabled();
  await page.getByRole('button', { name: /AI Read 시작/i }).click();
  await page.waitForTimeout(4_000);

  await page.screenshot({ path: path.join(OUT, 'qa2-workspace.png'), fullPage: true });

  const body = await page.locator('body').innerText();
  const filenameAsBusiness =
    /현재 사업[^\n]*plan\.pdf/i.test(body) ||
    /사업[:\s]*plan\.pdf/i.test(body) ||
    /제가 이해한 내용[\s\S]{0,200}plan\.pdf/i.test(body);
  expect(filenameAsBusiness, 'filename must not be business name').toBe(false);

  const overclaim = /읽어보니|문서를 읽었습니다|본문을 확인했습니다/.test(body);
  expect(overclaim, 'must not overclaim read').toBe(false);

  // Trust or Loop surface
  const trustOrLoop =
    (await page.getByText(/본문|아직 추출|Trust|함께 확인|읽기/i).first().isVisible().catch(() => false)) ||
    (await page.locator('textarea').first().isVisible().catch(() => false)) ||
    (await page.getByRole('button', { name: /같이 확인|계속|답변/i }).first().isVisible().catch(() => false));
  expect(trustOrLoop).toBe(true);

  fs.writeFileSync(
    path.join(OUT, 'qa2-result.json'),
    JSON.stringify({ filenameAsBusiness, overclaim, bodySnippet: body.slice(0, 800) }, null, 2),
  );
});

test('QA-3/4/5 Loop → Review reason-or-start → Analysis Hero', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/ko/workspace?demo=guided&sample=custom&fresh=1', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(1_000);
  await dismiss(page);

  const paste = page.getByPlaceholder(/사업계획서|IR deck|Notion/i);
  if (await paste.isVisible().catch(() => false)) {
    await paste.fill(DOC);
    await page.getByRole('button', { name: /AI PM과 시작하기/i }).click({ force: true });
    await page.waitForTimeout(3_000);
  }

  await Promise.race([
    page.locator('textarea').last().waitFor({ state: 'visible', timeout: 90_000 }),
    page.getByTestId('ai-pm-thinking-update').waitFor({ state: 'visible', timeout: 90_000 }).catch(() => null),
  ]);

  // Answer customer
  const area = page.locator('textarea').last();
  if (await area.isVisible().catch(() => false)) {
    await area.fill('병원 원장입니다');
    await page.getByRole('button', { name: /답변 반영하기/i }).click({ force: true });
    await page.waitForTimeout(5_000);
  }

  for (let i = 0; i < 6; i++) {
    const cont = page.getByRole('button', { name: /같이 확인하기|계속|다음/i });
    if (await cont.first().isVisible().catch(() => false)) {
      await cont.first().click({ force: true });
      await page.waitForTimeout(1_200);
    }
    const area2 = page.locator('textarea').last();
    if (!(await area2.isVisible().catch(() => false))) continue;
    await area2.fill('원장이 가장 크게 느끼는 문제는 재방문·대기 관리 비용입니다');
    await page.getByRole('button', { name: /답변 반영하기/i }).click({ force: true });
    await page.waitForTimeout(4_500);
  }

  // QA-5 Review gate
  await page.waitForTimeout(1_500);
  const review = page.getByRole('button', { name: /검토 시작/i });
  let reviewMode: 'start' | 'reason' | 'silent' = 'silent';
  if (await review.first().isVisible().catch(() => false)) {
    const enabled = await review.first().isEnabled();
    if (enabled) {
      reviewMode = 'start';
      await review.first().click({ force: true });
      await page.waitForTimeout(6_000);
    } else {
      const body = await page.locator('body').innerText();
      const hasReason =
        /아직 확인|아직 읽지|다음 질문|조건이 모이지|미리보기/i.test(body);
      reviewMode = hasReason ? 'reason' : 'silent';
    }
  } else {
    const body = await page.locator('body').innerText();
    reviewMode = /아직 확인|아직 읽지|다음 질문|조건이 모이지/i.test(body) ? 'reason' : 'silent';
  }
  await page.screenshot({ path: path.join(OUT, 'qa5-review.png'), fullPage: true });
  expect(reviewMode, 'Review must be start OR reason').not.toBe('silent');

  // QA-3 / QA-4 Analysis
  await page.waitForTimeout(2_000);
  await page.screenshot({ path: path.join(OUT, 'qa3-analysis.png'), fullPage: true });
  const body = await page.locator('body').innerText();

  const hasJudgment = /현재 판단|RevenueValidation|판단/i.test(body);
  const hasEvidence = /근거/i.test(body);
  const hasHero = /지금 해야 할 일|수익구조 검증하기|인터뷰 계획|다음 액션/i.test(body);

  // Count primary CTAs in analysis hero zone — look for "지금 해야 할 일" section buttons
  const heroButtons = page.locator('section').filter({ hasText: /지금 해야 할 일/ }).getByRole('button');
  const heroCount = await heroButtons.count().catch(() => 0);
  // Plus analysis panel primary CTA pattern
  const primaryCtas = page.getByRole('button', {
    name: /수익구조 검증하기|인터뷰 계획 만들기|수익 근거 확인하기|고객 확인하기|다음 액션 진행/i,
  });
  const primaryCount = await primaryCtas.count().catch(() => 0);

  fs.writeFileSync(
    path.join(OUT, 'qa345-result.json'),
    JSON.stringify(
      {
        reviewMode,
        hasJudgment,
        hasEvidence,
        hasHero,
        heroCount,
        primaryCount,
        bodySnippet: body.slice(0, 1500),
      },
      null,
      2,
    ),
  );

  expect(hasJudgment && hasEvidence && hasHero).toBe(true);
  // Hero: at most one primary action CTA visible in the action names set when analysis shown
  if (hasHero && /지금 해야 할 일/.test(body)) {
    expect(primaryCount).toBeLessThanOrEqual(1);
  }

  await page.screenshot({ path: path.join(OUT, 'qa4-hero.png'), fullPage: true });
});
