/**
 * PR #197 remaining merge gates — Google OAuth start + Production SHA.
 * Does not complete Google 8-turn. Does not deploy.
 */
import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const OUT = '/workspace/docs/evidence/ALABOM/AI-PM/PR197-CPO-OAUTH-PROD-DUMP.json';
const PROD = 'https://ai-startup-validation-tau.vercel.app';
const LOCKED_SHA = '0b465226';

function gitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'UNKNOWN';
  }
}

function localBase() {
  return (process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3210').replace(/\/$/, '');
}

async function inspectLogin(page: Page, base: string) {
  const loginUrl = `${base}/auth/login`;
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  const google = page.getByRole('button', { name: /Google|구글|Continue with Google|Google로/i });
  const googleVisible = await google.first().isVisible({ timeout: 8_000 }).catch(() => false);
  let afterClick = {
    navigated: false,
    url: page.url(),
    host: '',
    looksLikeGoogleAccounts: false,
    errorText: null as string | null,
  };
  if (googleVisible) {
    const before = page.url();
    await google.first().click({ force: true }).catch(() => null);
    await page.waitForTimeout(2500);
    const url = page.url();
    let host = '';
    try {
      host = new URL(url).host;
    } catch {
      host = '';
    }
    afterClick = {
      navigated: url !== before,
      url: host || '(no host)',
      host,
      looksLikeGoogleAccounts: /accounts\.google\.com|google\.com$/.test(host),
      errorText: null,
    };
  }
  return {
    loginUrl,
    landed: (() => {
      try {
        return new URL(page.url()).host;
      } catch {
        return '(unknown)';
      }
    })(),
    googleVisible,
    afterClick,
    eightTurns: 'NOT EXECUTED — Google OAuth session was not completed',
  };
}

test('PR #197 merge-gate OAuth start + Production SHA', async ({ page }) => {
  test.setTimeout(120_000);

  let prodBuild: Record<string, unknown> = { error: 'not fetched' };
  try {
    const res = await page.request.get(`${PROD}/api/build-info`, { timeout: 20_000 });
    prodBuild = {
      ok: res.ok(),
      status: res.status(),
      body: await res.json().catch(async () => await res.text()),
    };
  } catch (error) {
    prodBuild = { error: error instanceof Error ? error.message : String(error) };
  }

  const prodCommit = String(
    (prodBuild.body as { data?: { commit?: string }; commit?: string } | undefined)?.data
      ?.commit ??
      (prodBuild.body as { commit?: string } | undefined)?.commit ??
      '',
  );
  const prodShaMatchesLock =
    prodCommit.startsWith(LOCKED_SHA) || prodCommit.includes(LOCKED_SHA);

  const local = await inspectLogin(page, localBase());
  const productionLogin = await inspectLogin(page, PROD);

  const dump = {
    meta: {
      implSha: gitSha(),
      executedAt: new Date().toISOString(),
      note: 'Google OAuth 8-turn was not completed. Production was not deployed. SHA lock held.',
      productionLock: LOCKED_SHA,
    },
    production: {
      url: PROD,
      buildInfo: prodBuild,
      commit: prodCommit || null,
      matchesLockedSha: prodShaMatchesLock,
      thisPrOnProduction: false,
      eightTurnConversation: 'NOT VERIFIED',
      verdict: {
        status: 'NOT VERIFIED',
        reason: prodShaMatchesLock
          ? `Production commit ${prodCommit || '(empty)'} is the locked SHA ${LOCKED_SHA}. PR #197 T7/payer-hold is not on Production.`
          : `Production commit ${prodCommit || '(empty)'} vs lock ${LOCKED_SHA}. Conversation on Production was not run.`,
      },
    },
    googleOauth: {
      local,
      production: productionLogin,
      eightTurnsCompleted: false,
      verdict: {
        status: 'NOT VERIFIED',
        reason:
          local.googleVisible || productionLogin.googleVisible
            ? 'Google button visible. Click did not produce an authenticated 8-turn workspace session. QA magic-link is not this gate.'
            : 'Google button not visible. 8-turn Google OAuth not executed.',
      },
    },
  };

  writeFileSync(OUT, `${JSON.stringify(dump, null, 2)}\n`);
  expect(dump.googleOauth.eightTurnsCompleted).toBe(false);
  expect(dump.production.eightTurnConversation).toBe('NOT VERIFIED');
});
