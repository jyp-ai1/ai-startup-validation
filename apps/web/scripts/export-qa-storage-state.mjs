/**
 * Regenerate apps/web/.qa-auth/storageState.json via existing QA magic-link.
 * Auth/OAuth code is not modified.
 *
 * Usage: node scripts/export-qa-storage-state.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATE_PATH = join(WEB_ROOT, '.qa-auth/storageState.json');
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3198';

function loadEnv() {
  const merged = { ...process.env };
  const envPath = join(WEB_ROOT, '.env.local');
  if (!existsSync(envPath)) return merged;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) merged[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return merged;
}

const env = loadEnv();

async function createSession() {
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
  const hashedToken = genBody.hashed_token ?? genBody.properties?.hashed_token;
  if (!hashedToken) {
    throw new Error(`Magic link generate failed: ${JSON.stringify(genBody).slice(0, 180)}`);
  }

  const verify = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', token_hash: hashedToken }),
  });
  const session = await verify.json();
  if (!session.access_token) {
    throw new Error(`Magic link verify failed: ${JSON.stringify(session).slice(0, 180)}`);
  }
  return { session, supabaseUrl, email };
}

async function main() {
  const { session, supabaseUrl, email } = await createSession();
  const host = new URL(BASE).hostname;
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: `sb-${projectRef}-auth-token`,
      value: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type ?? 'bearer',
        user: session.user,
      }),
      domain: host,
      path: '/',
      secure: host !== 'localhost' && host !== '127.0.0.1',
      sameSite: 'Lax',
    },
  ]);
  const page = await context.newPage();
  await page.goto(`${BASE}/ko/workspace`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  if (/\/auth\/login/i.test(page.url())) {
    await browser.close();
    throw new Error(`QA magic-link injection failed — redirected to login (${email})`);
  }
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  await context.storageState({ path: STATE_PATH });
  writeFileSync(join(dirname(STATE_PATH), 'exported-at.txt'), new Date().toISOString(), 'utf8');
  const landed = page.url().replace(/[?#].*$/, '');
  await browser.close();
  console.log(
    JSON.stringify({
      saved: true,
      path: STATE_PATH,
      emailDomain: email.split('@')[1] ?? 'unknown',
      url: landed,
    }),
  );
}

main().catch((error) => {
  console.error(JSON.stringify({ saved: false, error: String(error?.message ?? error) }));
  process.exit(1);
});
