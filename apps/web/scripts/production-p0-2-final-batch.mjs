/**
 * P0-2 Final Batch — Production Flow1 (F5) + Flow2 regression evidence.
 * Usage: node scripts/production-p0-2-final-batch.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, '..');
const PRODUCTION_URL = 'https://ai-startup-validation-tau.vercel.app';
const COMMIT = '46f5a81';
const EVIDENCE_DIR = join(WEB_ROOT, '..', '..', 'docs', 'evidence', `P0-QA-${COMMIT}`, 'final');
const FLOW1_DOC = `P0-2 Refresh Verify
창업자 QA
EdTech B2C
타겟: 중학생 학부모
문제: 학습 진도 파악이 어려움`;

const env = readFileSync(join(WEB_ROOT, '.env.local'), 'utf8');
const get = (key) => env.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1]?.replace(/^"|"$/g, '');
const supabaseUrl = get('SUPABASE_URL');
const serviceKey = get('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = get('SUPABASE_ANON_KEY');
const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const authCookieName = `sb-${projectRef}-auth-token`;

const report = { commit: COMMIT, productionUrl: PRODUCTION_URL, flow1: null, flow2: null, buildInfo: null, errors: [] };

async function snap(page, folder, name) {
  const dir = join(EVIDENCE_DIR, folder);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${name}.png`);
  await page.getByText(/문서를 불러오는 중/i).waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: file, fullPage: true });
  return file.replace(/\\/g, '/');
}

async function createSession() {
  const gen = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', email: process.env.QA_EMAIL ?? 'cto-qa@launchlens.dev' }),
  });
  const genBody = await gen.json();
  const verify = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', token_hash: genBody.hashed_token }),
  });
  return verify.json();
}

async function injectSession(context, session) {
  await context.addCookies([
    {
      name: authCookieName,
      value: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: session.user,
      }),
      domain: 'ai-startup-validation-tau.vercel.app',
      path: '/',
      secure: true,
      sameSite: 'Lax',
    },
  ]);
}

async function login(page, context, next = '/workspace?auth=complete') {
  await injectSession(context, await createSession());
  await page.goto(`${PRODUCTION_URL}${next}`, { waitUntil: 'networkidle' });
}

async function fillDoc(page, doc) {
  const ta = page.locator('#workspace-doc-paste');
  await ta.waitFor({ state: 'visible', timeout: 30_000 });
  await ta.fill(doc);
  await ta.dispatchEvent('input');
  await page.getByRole('button', { name: /AI Read 시작/i }).click();
  await page.getByText(/문서를 읽었습니다|읽었습니다/i).first().waitFor({ timeout: 90_000 });
}

async function runReviewToInsight(page) {
  await page.getByRole('button', { name: /하나씩 확인|맞습니다/i }).first().click({ force: true, timeout: 15_000 }).catch(() => {});
  await page.getByRole('button', { name: /검토 결과를 보고/i }).first().click({ force: true, timeout: 15_000 }).catch(() => {});
  await page.getByRole('button', { name: /이 기준으로 검토하기/i }).first().click({ force: true, timeout: 15_000 }).catch(() => {});
  await page.getByRole('button', { name: /검토 시작/i }).first().click({ force: true, timeout: 15_000 });
  await page.getByText(/사업성을 검토하고 있습니다/i).waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => {});
  await page.getByRole('button', { name: /같이 보기|다음 주제 함께 보기/i }).first().waitFor({ state: 'visible', timeout: 120_000 });
  await page.getByText(/검토 완료|이번 검토에서/i).first().waitFor({ timeout: 30_000 });
}

async function flow1(page, context) {
  await login(page, context);
  if (page.url().includes('project=')) throw new Error('Flow1: auto-entered project');
  const listShot = await snap(page, 'flow1-refresh', '00-project-list-after-login');

  await page.locator('#new-project-title').fill(`P0-2 Refresh ${Date.now()}`);
  await page.locator('input[name="reviewType"][value="startup-idea"]').check();
  await page.getByRole('button', { name: /새 프로젝트|New project/i }).click();
  await page.waitForURL(/welcome=1/, { timeout: 30_000 });

  await fillDoc(page, FLOW1_DOC);
  await runReviewToInsight(page);

  const urlBeforeRefresh = page.url();
  const beforeShot = await snap(page, 'flow1-refresh', '01-insight-before-refresh');
  const bodyBefore = await page.locator('body').innerText();
  if (!bodyBefore.includes('같이 보기') && !bodyBefore.includes('다음 주제')) {
    throw new Error('Flow1: Next Action missing before refresh');
  }
  if (urlBeforeRefresh.includes('welcome=1')) {
    throw new Error('Flow1: welcome=1 still in URL before refresh');
  }

  await page.reload({ waitUntil: 'networkidle' });
  const urlAfterRefresh = page.url();
  const afterShot = await snap(page, 'flow1-refresh', '02-insight-after-refresh');
  const bodyAfter = await page.locator('body').innerText();

  if (urlAfterRefresh.includes('welcome=1')) throw new Error('Flow1: welcome=1 after refresh');
  if (bodyAfter.includes('문서 입력') && !bodyAfter.includes('같이 보기') && !bodyAfter.includes('검토 완료')) {
    throw new Error('Flow1: reverted to empty document intake after F5');
  }
  if (!bodyAfter.includes('같이 보기') && !bodyAfter.includes('다음 주제') && !bodyAfter.includes('검토 완료')) {
    throw new Error('Flow1: Insight/Next Action lost after F5');
  }

  await page.getByRole('button', { name: /^Logout$|^로그아웃$/i }).click();
  await page.waitForURL(/\/($|\?|#)/, { timeout: 30_000 });
  const logoutShot = await snap(page, 'flow1-refresh', '03-landing-after-logout');

  report.flow1 = {
    result: 'PASS',
    shots: [listShot, beforeShot, afterShot, logoutShot],
    urlBeforeRefresh,
    urlAfterRefresh,
    welcomeStripped: !urlAfterRefresh.includes('welcome=1'),
    insightKept: bodyAfter.includes('같이 보기') || bodyAfter.includes('다음 주제') || bodyAfter.includes('검토 완료'),
  };
}

async function flow2(page, context) {
  await context.clearCookies();
  await page.goto(`${PRODUCTION_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await page.getByRole('link', { name: /Open Demo/i }).first().click();
  await page.getByRole('button', { name: /LaunchLens Sample 체험하기/i }).click();
  await page.getByRole('button', { name: /AI 분석 시작/i }).click();
  await page.waitForURL(/fresh=1/, { timeout: 30_000 });
  await runReviewToInsight(page);
  const demoShot = await snap(page, 'flow2-demo', '01-demo-insight-before-login');

  await login(page, context, '/workspace?from=demo&promote=1&auth=complete');
  await page.getByText(/최근 프로젝트|프로젝트 이름|greeting/i).first().waitFor({ timeout: 20_000 });
  if (page.url().includes('project=') && !page.url().includes('promoted')) {
    throw new Error('Flow2: skipped project list after promote');
  }
  const listShot = await snap(page, 'flow2-demo', '02-project-list-after-promote');

  report.flow2 = {
    result: 'PASS',
    regression: 'none',
    shots: [demoShot, listShot],
    urlAfterPromote: page.url(),
  };
}

async function main() {
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const buildRes = await fetch(`${PRODUCTION_URL}/api/build-info`);
  const buildJson = await buildRes.json();
  report.buildInfo = buildJson.data ?? buildJson;
  if (!String(report.buildInfo.commit).startsWith(COMMIT)) {
    throw new Error(`Build-info commit mismatch: ${report.buildInfo.commit}`);
  }

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem('launchlens_analytics_consent', JSON.stringify({ analytics: true, updatedAt: new Date().toISOString() }));
  });
  const page = await context.newPage();

  try {
    console.log('RUN Flow1');
    await flow1(page, context);
    console.log('OK Flow1');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    report.errors.push({ flow: 'flow1', msg });
    report.flow1 = { result: 'FAIL', error: msg };
    console.error('FAIL Flow1:', msg);
    await snap(page, 'flow1-refresh', 'fail').catch(() => {});
  }

  try {
    console.log('RUN Flow2');
    await flow2(page, context);
    console.log('OK Flow2');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    report.errors.push({ flow: 'flow2', msg });
    report.flow2 = { result: 'FAIL', error: msg };
    console.error('FAIL Flow2:', msg);
    await snap(page, 'flow2-demo', 'fail').catch(() => {});
  }

  writeFileSync(join(EVIDENCE_DIR, 'p0-2-final-batch-report.json'), JSON.stringify(report, null, 2));
  await browser.close();

  const pass = report.flow1?.result === 'PASS' && report.flow2?.result === 'PASS';
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
