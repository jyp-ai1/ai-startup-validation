#!/usr/bin/env node
/**
 * DAY 8-I P0-11 — Actual Browser Journey R1~R5 (CPO 2nd verification).
 *
 * Requires apps/web/.env.local:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
 *   (optional) QA_EMAIL — defaults to cto-qa@launchlens.dev
 *
 * Usage (local P0-11 build):
 *   pnpm build
 *   PORT=3333 pnpm exec next start --port 3333 &
 *   node scripts/run-day8i-p0-11-browser-journey.mjs
 *
 * Usage (production after P0-11 deploy):
 *   PLAYWRIGHT_BASE_URL=https://ai-startup-validation-tau.vercel.app \
 *   node scripts/run-day8i-p0-11-browser-journey.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, '..');
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3333';
const EVIDENCE_DIR = join(WEB_ROOT, '../../docs/evidence/ALABOM/p0-11-browser');
const MEDIA_DIR = join(EVIDENCE_DIR, 'media');
const FIXTURE_A = join(WEB_ROOT, 'e2e/fixtures/p0-11-brewery-plan.txt');
const FIXTURE_B = join(WEB_ROOT, 'e2e/fixtures/p0-11-banchan-plan.txt');

const report = {
  label: 'P0-11 Actual Browser Journey R1~R5',
  baseURL: BASE,
  executedAt: new Date().toISOString(),
  results: {},
  projectIds: {},
  errors: [],
};

function loadEnv() {
  const envPath = join(WEB_ROOT, '.env.local');
  const merged = { ...process.env };
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) merged[m[1]] = m[2].replace(/^"|"$/g, '');
    }
  }
  return merged;
}

async function snap(page, name) {
  mkdirSync(MEDIA_DIR, { recursive: true });
  const file = join(MEDIA_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file.replace(/\\/g, '/');
}

async function dismissCookies(page) {
  const accept = page.getByRole('button', { name: /분석 수락|수락|Accept/i });
  if (await accept.first().isVisible({ timeout: 1500 }).catch(() => false)) {
    await accept.first().click({ force: true });
    await page.waitForTimeout(400);
  }
}

async function createMagicSession(env) {
  const supabaseUrl = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = env.QA_EMAIL ?? 'cto-qa@launchlens.dev';

  if (!supabaseUrl || !serviceKey || !anonKey) {
    throw new Error(
      'Missing Supabase env — need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY in apps/web/.env.local',
    );
  }

  const gen = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  const genBody = await gen.json();
  if (!genBody.hashed_token) {
    throw new Error(`Magic link generate failed: ${JSON.stringify(genBody).slice(0, 200)}`);
  }

  const verify = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', token_hash: genBody.hashed_token }),
  });
  const session = await verify.json();
  if (!session.access_token) {
    throw new Error(`Magic link verify failed: ${JSON.stringify(session).slice(0, 200)}`);
  }
  return { session, supabaseUrl, email };
}

async function injectSession(context, session, supabaseUrl, baseUrl) {
  const host = new URL(baseUrl).hostname;
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  await context.addCookies([
    {
      name: cookieName,
      value: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: session.user,
      }),
      domain: host,
      path: '/',
      secure: host !== 'localhost' && host !== '127.0.0.1',
      sameSite: 'Lax',
    },
  ]);
}

async function login(page, context, env) {
  const { session, supabaseUrl } = await createMagicSession(env);
  await injectSession(context, session, supabaseUrl, BASE);
  await page.goto(`${BASE}/ko/workspace`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await dismissCookies(page);
  await page.waitForTimeout(1500);
  if (/\/auth\/login/i.test(page.url())) {
    throw new Error(`Auth injection failed — redirected to ${page.url()}`);
  }
}

async function readAiUnderstanding(page) {
  const ai = page.getByTestId('ceo-surface-ai-understanding');
  if (await ai.isVisible({ timeout: 8_000 }).catch(() => false)) {
    return (await ai.innerText()).trim();
  }
  const s11 = page.getByTestId('s11-surface-understanding');
  if (await s11.isVisible({ timeout: 4_000 }).catch(() => false)) {
    return (await s11.innerText()).trim();
  }
  return (await page.locator('body').innerText()).slice(0, 800);
}

async function createProject(page, { title, description, fixturePath }) {
  await page.goto(`${BASE}/ko/workspace`, { waitUntil: 'domcontentloaded' });
  await dismissCookies(page);
  await page.getByTestId('my-projects-create-form').waitFor({ state: 'visible', timeout: 30_000 });

  await page.locator('#new-project-title').fill(title);
  await page.locator('input[name="reviewType"]').first().check({ force: true });

  if (description) {
    await page.locator('#project-description').fill(description);
  }

  if (fixturePath) {
    const upload = page.getByTestId('project-intake-upload').locator('input[type="file"]');
    await upload.setInputFiles(fixturePath);
    await page.getByText(/업로드 완료|Upload complete|문서를 불러오는/i).first().waitFor({ timeout: 30_000 });
  }

  await page.getByRole('button', { name: /새 프로젝트|Create new project/i }).click();
  await page.waitForURL(/project=/, { timeout: 45_000 });
  const projectId = new URL(page.url()).searchParams.get('project') ?? '';
  await page.waitForTimeout(2000);
  return projectId;
}

async function runR1(page) {
  const projectId = await createProject(page, {
    title: '주인집1',
    description: '',
    fixturePath: FIXTURE_A,
  });
  report.projectIds.r1 = projectId;
  const shot = await snap(page, 'r1_upload_understanding');
  const understanding = await readAiUnderstanding(page);
  const body = await page.locator('body').innerText();
  const titleSeparated =
    understanding.includes('양조장') &&
    !/AI가 이해한 내용[\s\S]{0,120}주인집1/.test(body) &&
    body.includes('주인집1');
  const pass = Boolean(projectId) && understanding.includes('양조장') && titleSeparated;
  report.results.R1 = {
    pass,
    projectId,
    understandingSnippet: understanding.slice(0, 400),
    titleSeparated,
    expected: 'Project name ≠ business one-liner; brewery content in AI Understanding',
    screenshot: shot,
  };
  if (!pass) throw new Error('R1 FAIL — title/business separation or upload intake');
}

async function runR2(page) {
  const projectId = await createProject(page, {
    title: '텍스트온리QA',
    description: '동네 카페 원두 구독 서비스 — 바리스타가 매일 다른 원두를 추천합니다.',
    fixturePath: null,
  });
  report.projectIds.r2 = projectId;
  const shot = await snap(page, 'r2_text_only_understanding');
  const understanding = await readAiUnderstanding(page);
  const pass = Boolean(projectId) && /카페|원두|구독/.test(understanding);
  report.results.R2 = {
    pass,
    projectId,
    understandingSnippet: understanding.slice(0, 400),
    expected: 'Text-only create → AI Understanding with description content',
    screenshot: shot,
  };
  if (!pass) throw new Error('R2 FAIL — text-only intake');
}

async function runR3(page) {
  const projectA = report.projectIds.r1;
  const projectB = await createProject(page, {
    title: '반찬가게 배송관리',
    description: '',
    fixturePath: FIXTURE_B,
  });
  report.projectIds.r3b = projectB;

  await page.goto(`${BASE}/ko/workspace?project=${encodeURIComponent(projectB)}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(2000);
  const bUnderstanding = await readAiUnderstanding(page);
  const bBody = await page.locator('body').innerText();
  const bShot = await snap(page, 'r3_project_b');

  const bClean =
    /반찬|배송/.test(bUnderstanding) &&
    !/양조장/.test(bUnderstanding) &&
    !/양조장/.test(bBody);

  await page.goto(`${BASE}/ko/workspace?project=${encodeURIComponent(projectA)}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(2000);
  const aUnderstanding = await readAiUnderstanding(page);
  const aBody = await page.locator('body').innerText();
  const aShot = await snap(page, 'r3_project_a_reentry');

  const aClean =
    /양조장/.test(aUnderstanding) &&
    !/반찬가게 배송관리/.test(aUnderstanding) &&
    !/반찬/.test(aBody.slice(0, 600));

  const pass = bClean && aClean;
  report.results.R3 = {
    pass,
    projectA,
    projectB,
    bUnderstandingSnippet: bUnderstanding.slice(0, 300),
    aUnderstandingSnippet: aUnderstanding.slice(0, 300),
    bLeakedA: /양조장/.test(bUnderstanding),
    aLeakedB: /반찬/.test(aUnderstanding),
    expected: 'A and B isolated — no cross-project understanding bleed',
    screenshots: [bShot, aShot],
  };
  if (!pass) throw new Error('R3 FAIL — project data isolation');
}

async function runR4(page) {
  const projectA = report.projectIds.r1;
  await page.goto(`${BASE}/ko/workspace`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const row = page.getByTestId(`project-list-item-${projectA}`);
  await row.getByRole('button', { name: /프로젝트 메뉴|Project menu/i }).click();
  await row.getByRole('menuitem', { name: /이름 변경|Rename/i }).click();
  await page.locator('input[value="주인집1"], input').last().fill('주인집1-renamed');
  await page.getByRole('button', { name: /저장|Save/i }).click();
  await page.waitForTimeout(1500);
  const renameShot = await snap(page, 'r4_rename');

  const renamedVisible = await page.getByText('주인집1-renamed').isVisible().catch(() => false);

  await row.getByRole('button', { name: /프로젝트 메뉴|Project menu/i }).click();
  await row.getByRole('menuitem', { name: /보관|Archive/i }).click();
  await page.waitForTimeout(1500);
  const archiveShot = await snap(page, 'r4_archived');

  const archivedHidden = !(await page.getByText('주인집1-renamed').isVisible().catch(() => false));
  await page.getByRole('button', { name: /보관함|archived/i }).click();
  await page.waitForTimeout(500);
  const archivedVisible = await page.getByText('주인집1-renamed').isVisible().catch(() => false);

  const projectC = report.projectIds.r3b;
  const rowC = page.getByTestId(`project-list-item-${projectC}`);
  await rowC.getByRole('button', { name: /프로젝트 메뉴|Project menu/i }).click();
  await rowC.getByRole('menuitem', { name: /삭제|Delete/i }).click();
  await page.getByRole('button', { name: /^삭제$|^Delete$/i }).click();
  await page.waitForTimeout(1500);
  const deleteShot = await snap(page, 'r4_deleted');

  const cGone = !(await page.getByText('반찬가게 배송관리').isVisible().catch(() => false));

  const pass = renamedVisible && archivedHidden && archivedVisible && cGone;
  report.results.R4 = {
    pass,
    renamedVisible,
    archivedHidden,
    archivedVisible,
    deleteConfirmed: cGone,
    expected: 'rename → archive → delete with confirmation',
    screenshots: [renameShot, archiveShot, deleteShot],
  };
  if (!pass) throw new Error('R4 FAIL — lifecycle');
}

async function runR5(page, context, env) {
  const projectA = report.projectIds.r1;
  await context.clearCookies();
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await login(page, context, env);
  await page.goto(`${BASE}/ko/workspace?project=${encodeURIComponent(projectA)}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(2000);
  const shot = await snap(page, 'r5_relogin_restore');
  const understanding = await readAiUnderstanding(page);
  const pass = /양조장|주인집1-renamed|주인집1/.test(understanding);
  report.results.R5 = {
    pass,
    projectA,
    understandingSnippet: understanding.slice(0, 400),
    expected: 'After re-login, project A state restored',
    screenshot: shot,
  };
  if (!pass) throw new Error('R5 FAIL — re-login persistence');
}

async function main() {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const env = loadEnv();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
  await context.addInitScript(() => {
    localStorage.setItem(
      'launchlens_analytics_consent',
      JSON.stringify({ analytics: true, updatedAt: new Date().toISOString() }),
    );
  });
  const page = await context.newPage();

  try {
    await login(page, context, env);
    report.results.auth = { pass: true };

    for (const [id, fn] of [
      ['R1', () => runR1(page)],
      ['R2', () => runR2(page)],
      ['R3', () => runR3(page)],
      ['R4', () => runR4(page)],
      ['R5', () => runR5(page, context, env)],
    ]) {
      try {
        console.log(`RUN ${id}`);
        await fn();
        console.log(`PASS ${id}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        report.errors.push({ id, msg });
        if (!report.results[id]) report.results[id] = { pass: false, error: msg };
        console.error(`FAIL ${id}:`, msg);
        await snap(page, `${id.toLowerCase()}_fail`).catch(() => {});
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    report.errors.push({ id: 'auth', msg });
    report.results.auth = { pass: false, error: msg };
    await snap(page, 'auth_fail').catch(() => {});
    console.error('AUTH FAIL:', msg);
  }

  writeFileSync(join(EVIDENCE_DIR, 'p0-11-browser-journey.json'), JSON.stringify(report, null, 2));
  await browser.close();

  const allPass = ['R1', 'R2', 'R3', 'R4', 'R5'].every((k) => report.results[k]?.pass === true);
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
