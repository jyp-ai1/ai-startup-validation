/**
 * Existing Sprint-1 QA magic-link session.
 * Does not change Auth/OAuth code — only generate_link + cookie injection.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { type Browser, type BrowserContext, type Page } from '@playwright/test';

export const QA_STATE_PATH = path.join(process.cwd(), '.qa-auth/storageState.json');

type MagicSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: unknown;
};

function env(name: string): string {
  return (process.env[name] ?? '').trim();
}

export function qaAuthReady(): boolean {
  return Boolean(
    (env('SUPABASE_URL') || env('NEXT_PUBLIC_SUPABASE_URL')) &&
      env('SUPABASE_SERVICE_ROLE_KEY') &&
      (env('SUPABASE_ANON_KEY') || env('NEXT_PUBLIC_SUPABASE_ANON_KEY')),
  );
}

export async function createQaMagicSession(): Promise<{
  session: MagicSession;
  supabaseUrl: string;
  email: string;
}> {
  const supabaseUrl = env('SUPABASE_URL') || env('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = env('SUPABASE_ANON_KEY') || env('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const email = env('QA_EMAIL') || 'cto-qa@launchlens.dev';

  if (!supabaseUrl || !serviceKey || !anonKey) {
    throw new Error('QA magic-link blocked — Supabase service role is not configured');
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
  const genBody = (await gen.json()) as {
    hashed_token?: string;
    properties?: { hashed_token?: string };
    error?: string;
    msg?: string;
  };
  const hashedToken = genBody.hashed_token ?? genBody.properties?.hashed_token;
  if (!hashedToken) {
    throw new Error(`Magic link generate failed: ${JSON.stringify(genBody).slice(0, 180)}`);
  }

  const verify = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', token_hash: hashedToken }),
  });
  const session = (await verify.json()) as MagicSession & { error?: string; msg?: string };
  if (!session.access_token) {
    throw new Error(`Magic link verify failed: ${JSON.stringify(session).slice(0, 180)}`);
  }
  return { session, supabaseUrl, email };
}

export async function injectQaSession(
  context: BrowserContext,
  session: MagicSession,
  supabaseUrl: string,
  baseUrl: string,
) {
  const host = new URL(baseUrl).hostname;
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const value = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type ?? 'bearer',
    user: session.user,
  });

  await context.addCookies([
    {
      name: cookieName,
      value,
      domain: host,
      path: '/',
      httpOnly: false,
      secure: host !== 'localhost' && host !== '127.0.0.1',
      sameSite: 'Lax',
    },
  ]);
}

export async function loginWithQaMagicLink(
  page: Page,
  context: BrowserContext,
  baseUrl = process.env.PLAYWRIGHT_BASE_URL ??
    `http://${process.env.PLAYWRIGHT_E2E_HOST ?? '127.0.0.1'}:${process.env.PLAYWRIGHT_E2E_PORT ?? '3199'}`,
) {
  const { session, supabaseUrl, email } = await createQaMagicSession();
  await injectQaSession(context, session, supabaseUrl, baseUrl);
  await page.goto(`${baseUrl}/ko/workspace`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  if (page.url().includes('/auth/login')) {
    throw new Error(`QA magic-link injection failed — redirected to /auth/login (${email})`);
  }
  return { email };
}

export async function exportQaStorageState(browser: Browser, baseUrl: string): Promise<string> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginWithQaMagicLink(page, context, baseUrl);
  mkdirSync(path.dirname(QA_STATE_PATH), { recursive: true });
  await context.storageState({ path: QA_STATE_PATH });
  await context.close();
  if (!existsSync(QA_STATE_PATH)) {
    throw new Error('QA storageState was not written');
  }
  writeFileSync(
    path.join(path.dirname(QA_STATE_PATH), 'exported-at.txt'),
    new Date().toISOString(),
    'utf8',
  );
  return QA_STATE_PATH;
}
