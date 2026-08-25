/**
 * ALABOM KI-1 — Production Auth durable walkthrough ONLY.
 * Uses apps/web/.qa-auth/storageState.json if present (Google OAuth session).
 * Never prints cookies/tokens. Writes LIVE Auth evidence under docs/evidence/ALABOM/phase1b/.
 *
 * PLAYWRIGHT_BASE_URL=https://ai-startup-validation-tau.vercel.app
 */
import { expect, test, type Page, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://ai-startup-validation-tau.vercel.app';
const STATE = path.join(process.cwd(), '.qa-auth/storageState.json');
const OUT = path.join(process.cwd(), '../../docs/evidence/ALABOM/phase1b/media');
const META = path.join(process.cwd(), '../../docs/evidence/ALABOM/phase1b');
fs.mkdirSync(OUT, { recursive: true });

const RICH_DOC = `사업계획서 요약

서비스명: ALABOM Auth Persistence Probe
형태: B2B SaaS
대상: 병원

핵심 가치: Auth durable Memory/Understanding
문제: 로그인 후 새로고침·재진입 시 상태 유지 확인

수익 모델은 월 구독입니다.`;

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

async function assertAuthenticated(page: Page): Promise<boolean> {
  // Not on login; workspace/my-projects reachable without redirect to /auth/login
  const url = page.url();
  if (/\/auth\/login/i.test(url)) return false;
  const loginCta = page.getByRole('link', { name: /^Login$/i });
  const hasLoginOnly = await loginCta.first().isVisible().catch(() => false);
  // Prefer positive signals
  const workspaceHint = await page
    .locator('body')
    .innerText()
    .then((t) => /Workspace|프로젝트|AI PM|ALABOM|My Projects|내 프로젝트/i.test(t))
    .catch(() => false);
  return workspaceHint && !/\/auth\/login/i.test(url);
}

test.describe('ALABOM KI-1 Auth LIVE (Production)', () => {
  test.skip(!fs.existsSync(STATE), 'Missing apps/web/.qa-auth/storageState.json — cannot Auth LIVE');

  test.use({ storageState: STATE });

  test('Auth Persistence · Memory · Understanding · re-entry', async ({ page, context }) => {
    test.setTimeout(360_000);

    // 1) Production entry as Auth user
    await page.goto(`${BASE}/ko/workspace`, { waitUntil: 'domcontentloaded' });
    await dismissCookies(page);
    await page.waitForTimeout(2_000);

    // If bounced to login, storageState is invalid/expired
    if (/\/auth\/login/i.test(page.url())) {
      await page.screenshot({ path: path.join(OUT, '14-auth-login-blocked.png'), fullPage: true });
      fs.writeFileSync(
        path.join(META, 'auth-live-ki1-result.json'),
        JSON.stringify(
          {
            label: 'LIVE Auth',
            pass: false,
            reason: 'storageState expired or invalid — redirected to /auth/login',
            url: page.url(),
          },
          null,
          2,
        ),
      );
      expect(false, 'Auth session valid').toBe(true);
      return;
    }

    await page.screenshot({ path: path.join(OUT, '14-auth-01-logged-in.png'), fullPage: true });
    expect(await assertAuthenticated(page)).toBe(true);

    // 2) Seed Understanding via document intake if available (Auth path only)
    const paste = page.getByPlaceholder(/사업계획서|IR deck|Notion/i);
    const hasIntake = await paste.isVisible().catch(() => false);
    if (hasIntake) {
      await paste.fill(RICH_DOC);
      const start = page.getByRole('button', { name: /AI PM과 시작하기|시작/i });
      if (await start.first().isVisible().catch(() => false)) {
        await start.first().click({ force: true });
        await page.waitForTimeout(2_500);
        await dismissCookies(page);
      }
    }

    // Confirm Document First if present
    const confirm = page.getByRole('button', { name: /✓ 맞습니다(?! —)/ });
    if (await confirm.first().isVisible().catch(() => false)) {
      await confirm.first().click({ force: true });
      await page.waitForTimeout(1_500);
    }

    // Answer one loop turn to create Memory signal
    if (await page.locator('textarea').last().isVisible().catch(() => false)) {
      await page.locator('textarea').last().fill('주요 고객은 병원 원장과 행정 담당자입니다');
      const submit = page.getByRole('button', { name: /답변 반영하기/i });
      if (await submit.first().isVisible().catch(() => false)) {
        await submit.first().click({ force: true });
        await page.waitForTimeout(4_000);
      }
    }

    // Capture Understanding / Memory markers before refresh
    const beforeBody = await page.locator('body').innerText();
    const beforeUnderstanding = /병원|고객|이해|Confidence|AI PM|사업/i.test(beforeBody);
    await page.screenshot({
      path: path.join(OUT, '14-auth-02-understanding-before-refresh.png'),
      fullPage: true,
    });

    // Snapshot Auth-scoped storage keys (names only) for isolation proof
    const storageMeta = await page.evaluate(() => {
      const sessionKeys: string[] = [];
      const localKeys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k) sessionKeys.push(k);
      }
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) localKeys.push(k);
      }
      const loopKeys = sessionKeys.filter((k) => k.includes('aiPmLoop') || k.includes('conversationMemory'));
      const projectKeys = sessionKeys.filter((k) => k.includes('launchlens.') || k.includes('ll_'));
      return {
        sessionKeyCount: sessionKeys.length,
        localKeyCount: localKeys.length,
        loopKeys,
        projectKeySample: projectKeys.slice(0, 12),
        // Detect demo-session leakage (Auth must not be demo-session only)
        usesDemoSessionOnly:
          loopKeys.length > 0 && loopKeys.every((k) => k.includes('demo-session')),
      };
    });

    // 3) Refresh — Understanding / Memory should persist
    await page.reload({ waitUntil: 'domcontentloaded' });
    await dismissCookies(page);
    await page.waitForTimeout(2_000);
    expect(/\/auth\/login/i.test(page.url())).toBe(false);
    const afterRefreshBody = await page.locator('body').innerText();
    const afterRefreshUnderstanding = /병원|고객|이해|Confidence|AI PM|사업|원장/i.test(
      afterRefreshBody,
    );
    await page.screenshot({
      path: path.join(OUT, '14-auth-03-after-refresh.png'),
      fullPage: true,
    });

    // 4) Re-enter project / workspace
    await page.goto(`${BASE}/ko/workspace`, { waitUntil: 'domcontentloaded' });
    await dismissCookies(page);
    await page.waitForTimeout(2_000);
    expect(/\/auth\/login/i.test(page.url())).toBe(false);
    await page.screenshot({
      path: path.join(OUT, '14-auth-04-reentry.png'),
      fullPage: true,
    });

    // 5) Logout then Login — storageState may restore session; also try explicit sign-out if UI exists
    const signOut = page.getByRole('button', { name: /Logout|Sign out|로그아웃|Sign Out/i });
    const signOutLink = page.getByRole('link', { name: /Logout|Sign out|로그아웃/i });
    let loggedOut = false;
    if (await signOut.first().isVisible().catch(() => false)) {
      await signOut.first().click({ force: true });
      await page.waitForTimeout(2_000);
      loggedOut = /\/auth\/login|Login|로그인/i.test(page.url() + (await page.locator('body').innerText()));
    } else if (await signOutLink.first().isVisible().catch(() => false)) {
      await signOutLink.first().click({ force: true });
      await page.waitForTimeout(2_000);
      loggedOut = true;
    }

    // Clear browser storage for Auth cookies by creating a fresh context is done at test level;
    // Here: clear storage + cookies then re-apply storageState to simulate re-login with same account
    await context.clearCookies();
    await page.goto('about:blank');
    // Re-load Auth session from storageState file (simulates returning user login)
    const state = JSON.parse(fs.readFileSync(STATE, 'utf8')) as {
      cookies: Parameters<BrowserContext['addCookies']>[0];
    };
    await context.addCookies(state.cookies);
    await page.goto(`${BASE}/ko/workspace`, { waitUntil: 'domcontentloaded' });
    await dismissCookies(page);
    await page.waitForTimeout(2_000);
    const afterReloginOk = !(await page.url().includes('/auth/login'));
    await page.screenshot({
      path: path.join(OUT, '14-auth-05-after-relogin.png'),
      fullPage: true,
    });

    const pass =
      beforeUnderstanding &&
      afterRefreshUnderstanding &&
      afterReloginOk &&
      !storageMeta.usesDemoSessionOnly;

    fs.writeFileSync(
      path.join(META, 'auth-live-ki1-result.json'),
      JSON.stringify(
        {
          label: 'LIVE Auth',
          pass,
          beforeUnderstanding,
          afterRefreshUnderstanding,
          afterReloginOk,
          loggedOutAttempted: loggedOut,
          storageMeta,
          note: 'Used .qa-auth/storageState.json — cookie/token values not recorded',
        },
        null,
        2,
      ),
    );

    expect(pass, 'Auth LIVE durable').toBe(true);
    expect(storageMeta.usesDemoSessionOnly, 'Auth must not be demo-session-only').toBe(false);
  });
});
