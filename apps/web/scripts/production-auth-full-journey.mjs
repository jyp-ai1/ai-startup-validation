/**
 * Track A — Auth full journey on Production (requires valid storageState).
 *
 * Env:
 *   QA_AUTH_STORAGE_STATE_PATH — path to Playwright storageState.json
 *   PRODUCTION_URL
 *
 * Usage (apps/web):
 *   node scripts/production-auth-full-journey.mjs
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, '..');
const OUT = join(WEB_ROOT, '../../docs/evidence/ALABOM/AI-REASONING-CLOSURE-SPRINT/PRODUCTION');
const PRODUCTION_URL =
  process.env.PRODUCTION_URL ?? 'https://ai-startup-validation-tau.vercel.app';
const STATE_PATH =
  process.env.QA_AUTH_STORAGE_STATE_PATH?.trim() ||
  join(WEB_ROOT, '.qa-auth/storageState.json');

const SAMPLE_DOC = `QA Auth Journey Co
Founder CEO
B2B SaaS PM tool
고객: 10~50인 스타트업 PM
문제: 전략 검토가 매번 리셋됨
수익: 월 구독`;

const report = {
  status: 'BLOCKED',
  storageStatePath: STATE_PATH,
  storageStatePresent: false,
  steps: [],
  productionUrl: PRODUCTION_URL,
  finishedAt: null,
};

async function dismissCookie(page) {
  const reject = page.getByRole('button', { name: /거부/i });
  if ((await reject.count()) > 0) await reject.first().click({ timeout: 3000 }).catch(() => {});
}

async function step(name, fn) {
  try {
    await fn();
    report.steps.push({ name, pass: true });
    return true;
  } catch (e) {
    report.steps.push({ name, pass: false, error: e instanceof Error ? e.message : String(e) });
    return false;
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  report.storageStatePresent = existsSync(STATE_PATH);

  if (!report.storageStatePresent) {
    report.reason =
      'Missing QA_AUTH_STORAGE_STATE_PATH or apps/web/.qa-auth/storageState.json — cannot run Production authenticated E2E in this environment.';
    report.finishedAt = new Date().toISOString();
    writeFileSync(join(OUT, 'auth-full-journey.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ status: report.status, reason: report.reason }, null, 2));
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: STATE_PATH });
  const page = await context.newPage();

  let ok = true;
  ok &&= await step('workspace entry', async () => {
    await page.goto(`${PRODUCTION_URL}/workspace`, { waitUntil: 'domcontentloaded' });
    await dismissCookie(page);
    await page.waitForTimeout(2000);
    if (/\/auth\/login/i.test(page.url())) throw new Error('redirected to login — storageState expired');
  });

  ok &&= await step('new project + intake', async () => {
    await page.getByRole('button', { name: /새 프로젝트|New project/i }).click({ timeout: 20_000 });
    await page.waitForURL(/project=/, { timeout: 45_000 });
    const paste = page.locator('#workspace-doc-paste');
    await paste.waitFor({ state: 'visible', timeout: 30_000 });
    await paste.fill(SAMPLE_DOC);
    await page.getByRole('button', { name: /AI Read|분석/i }).click();
    await page.getByText(/문서를 읽|읽었습니다|Reading/i).first().waitFor({ timeout: 90_000 });
  });

  ok &&= await step('reload persistence', async () => {
    const urlBefore = page.url();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    if (/\/auth\/login/i.test(page.url())) throw new Error('session lost on reload');
    if (!page.url().includes('project=')) throw new Error('project context lost on reload');
    if (urlBefore !== page.url() && !page.url().includes('project=')) {
      throw new Error('unexpected url after reload');
    }
  });

  ok &&= await step('ai pm loop surface', async () => {
    await page
      .locator('#ai-pm-loop, [data-testid="s11-surface"], [data-testid="ai-pm-focused-surface"]')
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 });
  });

  await browser.close();

  report.status = ok ? 'PASS' : 'FAIL';
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT, 'auth-full-journey.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, steps: report.steps.length }, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
