#!/usr/bin/env node
/**
 * DAY 8-I P0-11 — Actual Browser Journey R1~R5 (CPO 2nd verification).
 *
 * Prerequisite: Supabase QA secrets in environment or apps/web/.env.local
 *   Run: node scripts/sync-qa-env.mjs  (syncs Cursor secrets → .env.local)
 *
 * Usage:
 *   pnpm build && PORT=3333 pnpm exec next start --port 3333 &
 *   node scripts/sync-qa-env.mjs && node scripts/run-day8i-p0-11-browser-journey.mjs
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
  gate: 'BLOCKED',
  auth: { pass: false },
  audit: [],
  projectIds: {},
  errors: [],
};

function audit(id, row) {
  report.audit.push({ id, ...row });
}

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
    throw new Error('AUTH_BLOCKED — Supabase service role not configured');
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
    throw new Error(`Magic link generate failed: ${JSON.stringify(genBody).slice(0, 120)}`);
  }

  const verify = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', token_hash: genBody.hashed_token }),
  });
  const session = await verify.json();
  if (!session.access_token) {
    throw new Error(`Magic link verify failed: ${JSON.stringify(session).slice(0, 120)}`);
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
  const { session, supabaseUrl, email } = await createMagicSession(env);
  await injectSession(context, session, supabaseUrl, BASE);
  await page.goto(`${BASE}/ko/workspace`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await dismissCookies(page);
  await page.waitForTimeout(1500);
  if (/\/auth\/login/i.test(page.url())) {
    throw new Error(`Auth injection failed — redirected to login`);
  }
  report.auth = { pass: true, method: 'magic-link', emailDomain: email.split('@')[1] ?? 'unknown' };
}

async function readSurface(page, testId) {
  const el = page.getByTestId(testId);
  if (await el.isVisible({ timeout: 4_000 }).catch(() => false)) {
    return (await el.innerText()).trim();
  }
  return '';
}

async function readWorkspaceSignals(page) {
  const body = await page.locator('body').innerText();
  return {
    aiUnderstanding: await readSurface(page, 'ceo-surface-ai-understanding'),
    judgment: await readSurface(page, 'ai-pm-judgment-view'),
    nextQuestion: await readSurface(page, 'ceo-surface-next-question'),
    simpleQuestion: await readSurface(page, 'simple-question-text'),
    bodySnippet: body.slice(0, 1200),
  };
}

async function confirmUnderstandingIfPresent(page) {
  const confirm = page.getByRole('button', {
    name: /^(✓\s*)?(맞습니다|That'?s right)/i,
  });
  if (await confirm.first().isVisible({ timeout: 15_000 }).catch(() => false)) {
    await confirm.first().click({ force: true });
    await page.waitForTimeout(1500);
    return true;
  }
  return false;
}

async function submitOneAnswer(page) {
  const box = page.locator('textarea').last();
  if (!(await box.isVisible({ timeout: 8_000 }).catch(() => false))) return false;
  await box.fill('주요 고객은 소규모 양조장 사장님과 지역 관광객입니다.');
  const submit = page.getByTestId('submit-answer-cta');
  if (await submit.isEnabled({ timeout: 5_000 }).catch(() => false)) {
    await submit.click({ force: true });
    await page.waitForTimeout(2500);
    return true;
  }
  return false;
}

async function createProject(page, { title, description, fixturePath }) {
  await page.goto(`${BASE}/ko/workspace`, { waitUntil: 'domcontentloaded' });
  await dismissCookies(page);
  await page.getByTestId('my-projects-create-form').waitFor({ state: 'visible', timeout: 30_000 });

  await page.locator('#new-project-title').fill(title);
  await page.locator('input[name="reviewType"]').first().check({ force: true });
  if (description) await page.locator('#project-description').fill(description);

  if (fixturePath) {
    await page.getByTestId('project-intake-upload').locator('input[type="file"]').setInputFiles(fixturePath);
    await page.getByText(/업로드 완료|Upload complete|문서를 불러오는/i).first().waitFor({ timeout: 30_000 });
  }

  await page.getByRole('button', { name: /새 프로젝트|Create new project/i }).click();
  await page.waitForURL(/project=/, { timeout: 45_000 });
  const projectId = new URL(page.url()).searchParams.get('project') ?? '';
  await page.waitForTimeout(2000);
  return projectId;
}

async function openProject(page, projectId) {
  await page.goto(`${BASE}/ko/workspace?project=${encodeURIComponent(projectId)}`, {
    waitUntil: 'domcontentloaded',
  });
  await dismissCookies(page);
  await page.waitForTimeout(2000);
}

async function runR1(page) {
  const input = '주인집1 + p0-11-brewery-plan.txt upload';
  const projectId = await createProject(page, { title: '주인집1', description: '', fixturePath: FIXTURE_A });
  report.projectIds.A = projectId;
  const shot = await snap(page, 'r1_upload_understanding');
  const signals = await readWorkspaceSignals(page);
  const pass =
    Boolean(projectId) &&
    /양조장/.test(signals.aiUnderstanding || signals.bodySnippet) &&
    !/^주인집1$/m.test(signals.aiUnderstanding);

  audit('R1', {
    input,
    uiAction: 'My Projects → create with file upload → Workspace AI Understanding',
    actualResult: { projectId, understandingSnippet: (signals.aiUnderstanding || signals.bodySnippet).slice(0, 300) },
    expected: 'Project name ≠ business one-liner; brewery in AI Understanding',
    pass,
    screenshot: shot,
  });
  if (!pass) throw new Error('R1 FAIL');
}

async function runR2(page) {
  const input = '텍스트온리QA + cafe subscription description';
  const projectId = await createProject(page, {
    title: '텍스트온리QA',
    description: '동네 카페 원두 구독 서비스 — 바리스타가 매일 다른 원두를 추천합니다.',
    fixturePath: null,
  });
  report.projectIds.R2 = projectId;
  const shot = await snap(page, 'r2_text_only_understanding');
  const signals = await readWorkspaceSignals(page);
  const pass = Boolean(projectId) && /카페|원두|구독/.test(signals.aiUnderstanding || signals.bodySnippet);

  audit('R2', {
    input,
    uiAction: 'Create project text-only → Workspace',
    actualResult: { projectId, understandingSnippet: (signals.aiUnderstanding || signals.bodySnippet).slice(0, 300) },
    expected: 'Description appears in AI Understanding',
    pass,
    screenshot: shot,
  });
  if (!pass) throw new Error('R2 FAIL');
}

async function runR3(page) {
  const projectA = report.projectIds.A;
  await openProject(page, projectA);
  await confirmUnderstandingIfPresent(page);
  const answered = await submitOneAnswer(page);
  const aProgressShot = await snap(page, 'r3_a_partial_review');
  const aProgress = await readWorkspaceSignals(page);

  const projectB = await createProject(page, {
    title: '반찬가게 배송관리',
    description: '',
    fixturePath: FIXTURE_B,
  });
  report.projectIds.B = projectB;

  await openProject(page, projectB);
  await confirmUnderstandingIfPresent(page);
  const bSignals = await readWorkspaceSignals(page);
  const bShot = await snap(page, 'r3_project_b');

  await openProject(page, projectA);
  const aSignals = await readWorkspaceSignals(page);
  const aShot = await snap(page, 'r3_project_a_reentry');

  const bClean =
    /반찬|배송/.test(bSignals.aiUnderstanding || bSignals.bodySnippet) &&
    !/양조장/.test(bSignals.aiUnderstanding) &&
    !/양조장/.test(bSignals.judgment) &&
    !/양조장/.test(bSignals.nextQuestion);

  const aClean =
    /양조장/.test(aSignals.aiUnderstanding || aSignals.bodySnippet) &&
    !/반찬가게/.test(aSignals.aiUnderstanding) &&
    !/반찬/.test(aSignals.judgment) &&
    !/반찬/.test(aSignals.nextQuestion);

  const pass = bClean && aClean;

  audit('R3', {
    input: 'A=양조장(+partial review) B=반찬 → B → A',
    uiAction: 'A confirm+answer → create B → open B → re-open A',
    actualResult: {
      projectA,
      projectB,
      aPartialReview: answered,
      bUnderstanding: (bSignals.aiUnderstanding || bSignals.bodySnippet).slice(0, 250),
      aUnderstanding: (aSignals.aiUnderstanding || aSignals.bodySnippet).slice(0, 250),
      bLeakedA: /양조장/.test(`${bSignals.aiUnderstanding}${bSignals.judgment}${bSignals.nextQuestion}`),
      aLeakedB: /반찬/.test(`${aSignals.aiUnderstanding}${aSignals.judgment}${aSignals.nextQuestion}`),
    },
    expected: 'No cross-project Understanding/Judgment/Question bleed',
    pass,
    screenshots: [aProgressShot, bShot, aShot],
  });
  if (!pass) throw new Error('R3 FAIL');
}

async function runR4(page) {
  const projectA = report.projectIds.A;
  const projectB = report.projectIds.B;
  await page.goto(`${BASE}/ko/workspace`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const rowA = page.getByTestId(`project-list-item-${projectA}`);
  await rowA.getByRole('button', { name: /프로젝트 메뉴|Project menu/i }).click();
  await rowA.getByRole('menuitem', { name: /이름 변경|Rename/i }).click();
  await page.locator('input').last().fill('주인집1-renamed');
  await page.getByRole('button', { name: /저장|Save/i }).click();
  await page.waitForTimeout(1500);
  const renameShot = await snap(page, 'r4_rename');
  const renamedVisible = await page.getByText('주인집1-renamed').isVisible().catch(() => false);

  await page.getByTestId(`project-list-item-${projectA}`).getByRole('button', { name: /프로젝트 메뉴|Project menu/i }).click();
  await page.getByRole('menuitem', { name: /보관|Archive/i }).click();
  await page.waitForTimeout(1500);
  const archiveShot = await snap(page, 'r4_archived');
  const archivedHidden = !(await page.getByText('주인집1-renamed').isVisible().catch(() => false));

  await page.getByRole('button', { name: /보관함|View archived|archived/i }).click();
  await page.waitForTimeout(500);
  const archivedVisible = await page.getByText('주인집1-renamed').isVisible().catch(() => false);

  const archivedRow = page.getByTestId(`project-list-item-${projectA}`);
  await archivedRow.getByRole('button', { name: /프로젝트 메뉴|Project menu/i }).click();
  await archivedRow.getByRole('menuitem', { name: /복구|Restore/i }).click();
  await page.waitForTimeout(1500);
  const restoreShot = await snap(page, 'r4_restored');
  const restoredVisible = await page.getByText('주인집1-renamed').isVisible().catch(() => false);

  const rowB = page.getByTestId(`project-list-item-${projectB}`);
  await rowB.getByRole('button', { name: /프로젝트 메뉴|Project menu/i }).click();
  await rowB.getByRole('menuitem', { name: /삭제|Delete/i }).click();
  await page.getByRole('button', { name: /^삭제$|^Delete$/i }).click();
  await page.waitForTimeout(1500);
  const deleteShot = await snap(page, 'r4_deleted');
  const bGone = !(await page.getByText('반찬가게 배송관리').isVisible().catch(() => false));

  const pass = renamedVisible && archivedHidden && archivedVisible && restoredVisible && bGone;

  audit('R4', {
    input: 'A rename/archive/restore; B delete',
    uiAction: '⋯ menu → rename → archive → archived view → restore → delete B with confirm',
    actualResult: { renamedVisible, archivedHidden, archivedVisible, restoredVisible, bGone, projectA, projectB },
    expected: 'List state changes at each lifecycle step',
    pass,
    screenshots: [renameShot, archiveShot, restoreShot, deleteShot],
  });
  if (!pass) throw new Error('R4 FAIL');
}

async function runR5(page, context, env) {
  const projectA = report.projectIds.A;
  await context.clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await login(page, context, env);
  await openProject(page, projectA);
  const shot = await snap(page, 'r5_relogin_restore');
  const signals = await readWorkspaceSignals(page);
  const pass = /양조장|주인집1-renamed|주인집1/.test(signals.aiUnderstanding || signals.bodySnippet);

  audit('R5', {
    input: 'clear session → magic-link re-login → open project A',
    uiAction: 'logout/clear → login → /workspace?project=A',
    actualResult: { projectA, understandingSnippet: (signals.aiUnderstanding || signals.bodySnippet).slice(0, 300) },
    expected: 'Project A business context restored after re-login',
    pass,
    screenshot: shot,
  });
  if (!pass) throw new Error('R5 FAIL');
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
        if (!report.audit.find((a) => a.id === id)) {
          audit(id, { pass: false, error: msg });
        }
        console.error(`FAIL ${id}:`, msg);
        await snap(page, `${id.toLowerCase()}_fail`).catch(() => {});
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    report.errors.push({ id: 'auth', msg });
    report.auth = { pass: false, error: msg };
    audit('AUTH', {
      input: 'magic-link QA session',
      uiAction: 'inject Supabase session cookie → /ko/workspace',
      actualResult: { error: msg },
      expected: 'Authenticated workspace list',
      pass: false,
      screenshot: await snap(page, 'auth_fail').catch(() => null),
    });
    console.error('AUTH FAIL:', msg.replace(/Bearer\s+\S+/g, 'Bearer [redacted]'));
  }

  const passed = report.audit.filter((a) => a.pass === true).map((a) => a.id);
  const failed = report.audit.filter((a) => a.pass === false).map((a) => a.id);
  const pending = ['R1', 'R2', 'R3', 'R4', 'R5'].filter((id) => !report.audit.find((a) => a.id === id));
  report.summary = { passed, failed, pending, passCount: passed.length, required: 5 };
  report.gate = passed.length === 5 ? 'PASS' : report.auth.pass ? 'PARTIAL' : 'BLOCKED';

  writeFileSync(join(EVIDENCE_DIR, 'p0-11-browser-journey.json'), JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(passed.length === 5 ? 0 : 1);
}

main().catch((e) => {
  console.error(e.message?.replace(/Bearer\s+\S+/g, 'Bearer [redacted]') ?? e);
  process.exit(1);
});
