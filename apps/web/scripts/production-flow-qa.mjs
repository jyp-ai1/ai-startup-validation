/**
 * Production Flow QA — CTO runs end-to-end on Production before CEO test.
 *
 * Usage (from apps/web):
 *   pnpm exec node scripts/production-flow-qa.mjs
 *
 * Uses persistent Chrome profile at .qa-chrome-profile (CTO Google account).
 * First run opens Chrome — complete Google Login in that window. Session is reused.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, '..');
const PRODUCTION_URL = process.env.PRODUCTION_URL ?? 'https://ai-startup-validation-tau.vercel.app';
const PROFILE_DIR = join(WEB_ROOT, '.qa-chrome-profile');
const STORAGE_STATE = join(WEB_ROOT, '.qa-auth/storageState.json');
const SAMPLE_DOC = `QA Test Company
예비창업자 대표
B2C SaaS
타겟 고객: 초기 스타트업 PM
문제: 전략 검토가 매번 처음부터 시작됨`;

const results = {
  flow1: { status: 'FAIL', failure: 'Not started' },
  flow2: { status: 'FAIL', failure: 'Not started' },
  knownIssues: [],
  commit: process.env.QA_COMMIT ?? '896e757cad38606f4648da7e7410ace30ef3429f',
  productionUrl: PRODUCTION_URL,
};

function log(step, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${step}${detail ? ` — ${detail}` : ''}`);
}

async function ensureAuthenticated(page, context) {
  await page.goto(`${PRODUCTION_URL}/auth/login?next=/workspace`, { waitUntil: 'domcontentloaded' });

  const googleBtn = page.getByRole('button', { name: /Google/i });
  if ((await googleBtn.count()) === 0) {
    const onList = page.url().includes('/workspace') && (await page.getByText(/프로젝트|Projects/i).count()) > 0;
    if (onList) {
      log('Auth session', true, 'already authenticated');
      return true;
    }
    log('Google Login button', false, 'not found');
    return false;
  }

  await googleBtn.click();
  log('Google Login', true, 'waiting for callback (max 3 min)');

  try {
    await page.waitForURL(
      (u) => u.hostname.includes('ai-startup-validation') && u.pathname.includes('/workspace'),
      { timeout: 180_000 },
    );
    await context.storageState({ path: STORAGE_STATE });
    log('Google Login callback', true, page.url());
    return true;
  } catch {
    log('Google Login callback', false, `stuck at ${page.url()}`);
    return false;
  }
}

async function runDemoGuestSteps(page) {
  await page.goto(`${PRODUCTION_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Open Demo/i }).first().click();
  await page.waitForURL(/\/demo\/start/, { timeout: 30_000 });
  await page.getByRole('button', { name: /LaunchLens Sample/i }).first().click();
  await page.getByRole('button', { name: /AI 분석 시작/i }).click();
  await page.waitForURL(/\/workspace\?.*demo=guided/, { timeout: 30_000 });
  await page.getByRole('button', { name: /하나씩 확인/i }).click({ timeout: 15_000 }).catch(() => {});
  await page.getByRole('button', { name: /검토 결과를 보고/i }).click({ timeout: 15_000 }).catch(() => {});
  await page.getByRole('button', { name: /이 기준으로 검토하기/i }).click({ timeout: 15_000 }).catch(() => {});
  await page.getByRole('button', { name: /검토 시작/i }).click({ timeout: 15_000 });
  await page.getByText(/검토 완료|Insight|인사이트/i).first().waitFor({ timeout: 60_000 });
}

async function runFlow1(page) {
  const steps = [];
  try {
    await page.goto(`${PRODUCTION_URL}/`, { waitUntil: 'domcontentloaded' });
    steps.push(['Landing', true]);

    await page.getByRole('link', { name: /Start Free/i }).first().click();
    await page.waitForURL(/\/auth\/login|\/workspace/, { timeout: 30_000 });
    if (!page.url().includes('/workspace')) {
      throw new Error('Google Login — session not established');
    }
    steps.push(['Google Login → 프로젝트 목록', true]);

    if (page.url().includes('project=')) {
      throw new Error('마지막 프로젝트 자동 진입');
    }

    await page.getByRole('button', { name: /새 프로젝트|New project/i }).click({ timeout: 15_000 });
    await page.waitForURL(/project=/, { timeout: 30_000 });
    steps.push(['새 프로젝트', true]);

    await page.locator('#workspace-doc-paste').fill(SAMPLE_DOC);
    await page.getByRole('button', { name: /AI Read|분석/i }).click();
    await page.getByText(/문서를 읽었습니다|읽었습니다/i).first().waitFor({ timeout: 60_000 });
    steps.push(['문서 → AI Read', true]);

    await page.getByRole('button', { name: /맞습니다|하나씩/i }).first().click({ timeout: 15_000 }).catch(() => {});
    await page.getByRole('button', { name: /검토 결과를 보고/i }).click({ timeout: 15_000 }).catch(() => {});
    await page.getByRole('button', { name: /이 기준으로 검토하기/i }).click({ timeout: 15_000 }).catch(() => {});
    await page.getByRole('button', { name: /검토 시작/i }).click({ timeout: 15_000 });
    await page.getByText(/검토 완료|Insight|인사이트/i).first().waitFor({ timeout: 90_000 });
    steps.push(['Review → Insight', true]);

    await page.getByText(/다음 행동|Next Action|같이 보기/i).first().waitFor({ timeout: 15_000 });
    steps.push(['Next Action', true]);

    await page.reload({ waitUntil: 'domcontentloaded' });
    if (page.url().includes('/auth/login')) throw new Error('새로고침 후 세션 유실');
    steps.push(['새로고침', true]);

    await page.getByRole('button', { name: /Logout|로그아웃/i }).click({ timeout: 15_000 });
    await page.waitForURL(/\/($|\?)/, { timeout: 30_000 });
    steps.push(['Logout → Landing', true]);

    for (const [step, ok] of steps) log(`Flow1 ${step}`, ok);
    results.flow1 = { status: 'PASS', failure: '' };
  } catch (error) {
    for (const [step, ok] of steps) log(`Flow1 ${step}`, ok);
    results.flow1 = {
      status: 'FAIL',
      failure: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runFlow2(page, context) {
  try {
    await runDemoGuestSteps(page);
    await page.getByRole('button', { name: /Google/i }).click();
    await page.waitForURL(/\/workspace/, { timeout: 180_000 });
    await page.getByText(/프로젝트|Projects/i).first().waitFor({ timeout: 15_000 });

    const openProject = page.getByRole('link', { name: /열기|Open/i }).first();
    if ((await openProject.count()) > 0) {
      await openProject.click();
      await page.waitForURL(/project=/, { timeout: 30_000 });
    }

    results.flow2 = { status: 'PASS', failure: '' };
  } catch (error) {
    results.flow2 = {
      status: 'FAIL',
      failure: error instanceof Error ? error.message : String(error),
    };
  }

  await context.storageState({ path: STORAGE_STATE }).catch(() => {});
}

function printReport() {
  console.log('\nFlow1');
  console.log(results.flow1.status);
  console.log(results.flow1.failure || '');
  console.log('\nFlow2');
  console.log(results.flow2.status);
  console.log(results.flow2.failure || '');
  console.log('\nKnown Issues');
  console.log(results.knownIssues.join('\n') || '(none logged)');
  console.log('\nCommit');
  console.log(results.commit);
  console.log('\nProduction URL');
  console.log(results.productionUrl);
}

async function main() {
  mkdirSync(dirname(STORAGE_STATE), { recursive: true });
  mkdirSync(PROFILE_DIR, { recursive: true });

  const launchOptions = {
    headless: false,
    channel: 'chrome',
  };

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    ...launchOptions,
    ...(existsSync(STORAGE_STATE) ? { storageState: STORAGE_STATE } : {}),
  });

  const page = context.pages()[0] ?? (await context.newPage());
  const authed = await ensureAuthenticated(page, context);

  if (!authed) {
    results.flow1.failure = 'Google Login — 직접 수행 미완료';
    results.flow2.failure = 'Google Login — 직접 수행 미완료';
    printReport();
    await context.close();
    process.exit(1);
  }

  await runFlow1(page);
  await runFlow2(page, context);
  printReport();
  await context.close();
  process.exit(results.flow1.status === 'PASS' && results.flow2.status === 'PASS' ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
