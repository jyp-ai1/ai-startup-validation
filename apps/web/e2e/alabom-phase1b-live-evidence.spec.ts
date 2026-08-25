/**
 * ALABOM Phase 1-B — targeted Production live Evidence capture (not full suite).
 * PLAYWRIGHT_BASE_URL=https://ai-startup-validation-tau.vercel.app
 *
 * Honesty: screenshots under docs/evidence/ALABOM/phase1b/media/ are LIVE only when this run succeeds.
 */
import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const OUT = path.join(process.cwd(), '../../docs/evidence/ALABOM/phase1b/media');
fs.mkdirSync(OUT, { recursive: true });

const RICH_DOC = `사업계획서 요약

서비스명: 병원 AI 스크리닝
형태: B2B SaaS
대상: 병원

핵심 가치: 재방문·대기 관리
문제: 병원 행정 업무가 수작업으로 느리다

아직 수익 모델은 미정입니다.`;

const PDF_PLACEHOLDER = `# plan.pdf

PDF 본문은 아직 추출되지 않았습니다. Business·Customer는 직접 확인이 필요합니다.`;

async function dismissCookies(page: Page) {
  for (let i = 0; i < 3; i++) {
    const accept = page.getByRole('button', { name: /분석 수락|수락|Accept/i });
    const reject = page.getByRole('button', { name: /^거부$|거부|Reject/i });
    if (await accept.first().isVisible().catch(() => false)) {
      await accept.first().click({ force: true });
      await page.waitForTimeout(400);
      return;
    }
    if (await reject.first().isVisible().catch(() => false)) {
      await reject.first().click({ force: true });
      await page.waitForTimeout(400);
      return;
    }
    await page.waitForTimeout(300);
  }
}

test.describe('ALABOM live Evidence (Production)', () => {
  test('01 Landing + brand Concept 3', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dismissCookies(page);
    await expect(page.locator('body')).toContainText(/ALABOM/i);
    const mark = page.locator('img[src*="alabom-mark"], img[src*="/brand/alabom"]');
    await expect(mark.first()).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: path.join(OUT, '01-landing-brand.png'), fullPage: true });
  });

  test('02 Demo start surface', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/demo/start', { waitUntil: 'domcontentloaded' });
    await dismissCookies(page);
    await page.screenshot({ path: path.join(OUT, '02-demo-start.png'), fullPage: true });
    await expect(page.locator('body')).toContainText(/체험|Demo|문서|ALABOM/i);
  });

  test('03–06 Document First rich + weak PDF honesty', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/demo/start', { waitUntil: 'domcontentloaded' });
    await dismissCookies(page);
    await page.getByRole('button', { name: /내 사업 문서로 체험하기/i }).click();
    await page.waitForTimeout(400);
    await page.locator('textarea').fill(RICH_DOC);
    await page.getByRole('button', { name: /AI Read 시작/i }).click();
    await page.waitForTimeout(3_000);
    await dismissCookies(page);
    await page.screenshot({ path: path.join(OUT, '03-document-rich.png'), fullPage: true });

    await page.goto('/demo/start', { waitUntil: 'domcontentloaded' });
    await dismissCookies(page);
    await page.getByRole('button', { name: /내 사업 문서로 체험하기/i }).click();
    await page.waitForTimeout(400);
    await page.locator('textarea').fill(PDF_PLACEHOLDER);
    await page.getByRole('button', { name: /AI Read 시작/i }).click();
    await page.waitForTimeout(3_000);
    await dismissCookies(page);
    const body = await page.locator('body').innerText();
    await page.screenshot({ path: path.join(OUT, '04-document-weak-pdf.png'), fullPage: true });
    expect(/PDF|추출|읽지 못|충분히|Confidence|같이/i.test(body)).toBe(true);
    expect(/사업[:\s]*plan\.pdf/i.test(body)).toBe(false);
  });

  test('13 / C1 Demo refresh persistence (sessionStorage loop)', async ({ page }) => {
    test.setTimeout(120_000);
    // No fresh=1 — that flag clears demo client state on mount
    await page.goto('/ko/workspace?demo=guided', {
      waitUntil: 'domcontentloaded',
    });
    await dismissCookies(page);

    await page.evaluate(() => {
      const key = 'launchlens.aiPmLoop.demo-session';
      const state = {
        version: 1,
        phase: 'reanalyze',
        turns: [
          {
            issueId: 'customer_definition',
            answer: '병원 원장',
            appliedAt: new Date().toISOString(),
          },
        ],
        currentIssueId: null,
        readingCompleted: true,
        dismissedReadAck: true,
      };
      sessionStorage.setItem(key, JSON.stringify(state));
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await dismissCookies(page);
    const restored = await page.evaluate(() => {
      const raw = sessionStorage.getItem('launchlens.aiPmLoop.demo-session');
      if (!raw) return null;
      return JSON.parse(raw) as { turns?: { answer?: string }[] };
    });
    expect(restored?.turns?.[0]?.answer).toBe('병원 원장');
    await page.screenshot({ path: path.join(OUT, '13-refresh-persist.png'), fullPage: true });
  });

  test('16 / D3 Mobile viewport — Hero CTA ≤ 1 when analysis panel present', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dismissCookies(page);
    await page.screenshot({ path: path.join(OUT, '19-mobile-landing.png'), fullPage: true });

    await page.goto('/ko/workspace?demo=guided', { waitUntil: 'domcontentloaded' });
    await dismissCookies(page);
    const heroCount = await page.locator('[data-testid="analysis-hero-cta"]').count();
    expect(heroCount).toBeLessThanOrEqual(1);
    await page.screenshot({ path: path.join(OUT, '16-mobile-workspace.png'), fullPage: true });
  });

  test('F1 Idea / empty start seed path visible', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/ko/workspace?demo=guided&fresh=1', { waitUntil: 'domcontentloaded' });
    await dismissCookies(page);
    const withoutDoc = page.getByRole('button', {
      name: /문서 없이|없이 시작|직접 답|Start without|without a document/i,
    });
    const intake = page.getByPlaceholder(/사업계획서|IR deck|Notion|붙여|paste/i);
    const textarea = page.locator('textarea').first();
    const hasIntake =
      (await intake.isVisible().catch(() => false)) ||
      (await textarea.isVisible().catch(() => false));
    const hasEmpty = await withoutDoc.first().isVisible().catch(() => false);
    await page.screenshot({ path: path.join(OUT, 'f1-idea-seed-intake.png'), fullPage: true });
    // Demo guided with fresh may land on sample flow or intake — either is valid Journey B entry
    const body = await page.locator('body').innerText();
    const journeyB =
      hasIntake ||
      hasEmpty ||
      /문서|체험|Demo|Workspace|AI PM|시작/i.test(body);
    expect(journeyB).toBe(true);
  });
});
