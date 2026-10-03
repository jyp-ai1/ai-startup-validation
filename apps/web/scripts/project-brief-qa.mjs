#!/usr/bin/env node
/**
 * Project Brief QA — cases A–F against a deployed URL (Preview or Production).
 * Auth: Supabase QA magic-link session injected as cookie (no OAuth, no auth code change).
 * Case D needs a READY project; a `[QA]` fixture is inserted for the QA account and deleted after the run.
 *
 * Usage: BASE_URL=https://<preview>.vercel.app node scripts/project-brief-qa.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = join(WEB_ROOT, '..', '..');
const OUT_DIR = join(REPO_ROOT, 'docs/evidence/ALABOM/PROJECT-BRIEF');
const MEDIA_DIR = join(OUT_DIR, 'media');

const BASE_URL = (process.env.BASE_URL ?? '').replace(/\/$/, '');
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const QA_EMAIL = process.env.QA_EMAIL ?? 'cto-qa@launchlens.dev';
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

const CASES = {
  A: process.env.QA_CASE_A ?? '9fc88893-5230-4aa2-be57-e1d07c55a4e5',
  B: process.env.QA_CASE_B ?? 'b742768b-49e3-49e2-b68c-366be47c0a10',
  C: process.env.QA_CASE_C ?? 'b58d8257-2b09-47fe-aed9-38fe10d64a98',
  E: process.env.QA_CASE_E ?? 'ca6b148b-5123-42eb-9c51-e62ae3412eac',
};

const LEAK =
  /targetGap|reviewId|\bscore\b|routing|recommendedAction|CONTRADICTED|PARTIAL|\bCLOSED\b|businessOneLiner|customerPersona|problemJtbd|alternativesCompetitors|differentiationVsAlternatives|validationTestability|marketChannel|\bGO\b|\bHOLD\b/;

const adminHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function createMagicSession() {
  const gen = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ type: 'magiclink', email: QA_EMAIL }),
  });
  const genBody = await gen.json();
  if (!genBody.hashed_token) throw new Error('AUTH_BLOCKED — magic link generate failed');
  const verify = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', token_hash: genBody.hashed_token }),
  });
  const session = await verify.json();
  if (!session.access_token) throw new Error('AUTH_BLOCKED — magic link verify failed');
  return session;
}

function readyGapState() {
  const ids = [
    'businessOneLiner',
    'customerPersona',
    'payer',
    'problemJtbd',
    'marketChannel',
    'alternativesCompetitors',
    'differentiationVsAlternatives',
    'validationTestability',
  ];
  const values = {
    businessOneLiner: '동네 반찬가게 주문·배송 통합 관리',
    customerPersona: '1~3호점 반찬가게 사장님',
    payer: '반찬가게 사장님',
    problemJtbd: '전화·메신저 주문 누락',
    marketChannel: '지역 상인회와 배달 기사 네트워크',
    alternativesCompetitors: '엑셀과 메신저 단체방',
    differentiationVsAlternatives: '주문과 배송을 한 화면에서 관리',
    validationTestability: '3개 매장 2주 파일럿',
  };
  const now = new Date().toISOString();
  const gaps = Object.fromEntries(
    ids.map((gapId) => [
      gapId,
      {
        gapId,
        completeness: 'CLOSED',
        sourceTurnId: 'qa',
        sourceReviewId: 'qa',
        evidence: [{ factKey: 'customer', value: values[gapId], evidenceClass: 'FACT' }],
        confidence: 'high',
        lastUpdated: now,
        rationale: 'QA fixture',
      },
    ]),
  );
  return { version: 1, gaps, lastReviewByGap: {} };
}

async function insertReadyFixture(userId) {
  const now = new Date().toISOString();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/startup_projects`, {
    method: 'POST',
    headers: { ...adminHeaders, Prefer: 'return=representation' },
    body: JSON.stringify({
      title: '[QA] Project Brief READY fixture',
      summary: '[QA] Project Brief READY fixture',
      user_id: userId,
      is_demo: false,
      status: 'DRAFT',
      onboarding_context: {
        v2Workspace: {
          updatedAt: now,
          understandingPhase: 'accepted',
          aiPmLoop: {
            version: 1,
            phase: 'answer',
            turns: [
              { issueId: 'customer_definition', answer: '반찬가게 사장님입니다.', appliedAt: now },
              { issueId: 'market_validation', answer: '3개 매장에서 2주 파일럿을 합니다.', appliedAt: now },
            ],
            currentIssueId: 'market_validation',
            readingCompleted: true,
            dismissedReadAck: true,
            gapState: readyGapState(),
          },
        },
      },
    }),
  });
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows[0]?.id) throw new Error(`fixture insert failed: ${JSON.stringify(rows).slice(0, 200)}`);
  return rows[0].id;
}

async function deleteFixture(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/startup_projects?id=eq.${id}`, {
    method: 'DELETE',
    headers: adminHeaders,
  });
}

async function findForeignProjectId(userId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/startup_projects?select=id&user_id=neq.${userId}&is_demo=eq.false&limit=1`,
    { headers: adminHeaders },
  );
  const rows = await res.json();
  return rows[0]?.id ?? null;
}

async function newAuthedContext(browser, session, viewport) {
  const context = await browser.newContext({
    viewport,
    extraHTTPHeaders: BYPASS ? { 'x-vercel-protection-bypass': BYPASS } : undefined,
  });
  const host = new URL(BASE_URL).hostname;
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
  await context.addCookies([
    {
      name: `sb-${projectRef}-auth-token`,
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
      secure: BASE_URL.startsWith('https'),
      sameSite: 'Lax',
    },
  ]);
  return context;
}

function trackPage(page) {
  const events = [];
  const consoleErrors = [];
  page.on('request', (req) => {
    if (!req.url().includes('/api/analytics/events') || req.method() !== 'POST') return;
    try {
      const body = JSON.parse(req.postData() ?? '{}');
      events.push({ name: body.name, project_id: body.params?.project_id, readiness: body.params?.readiness, entry: body.params?.entry });
    } catch {
      /* ignore */
    }
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200));
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${String(err).slice(0, 200)}`));
  return { events, consoleErrors };
}

/** Cookie consent banner is global and fixed to the bottom; a real first-time user dismisses it. */
async function dismissConsent(page) {
  const reject = page.getByRole('dialog').getByRole('button', { name: '거부' });
  if (await reject.count()) await reject.first().click();
}

async function inspectBrief(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="project-brief"]');
    const count = (id) => document.querySelectorAll(`[data-testid="${id}"] li`).length;
    const cta = document.querySelector('[data-testid="project-brief-cta"]');
    return {
      rendered: Boolean(root),
      title: document.querySelector('[data-testid="project-brief-title"]')?.textContent ?? null,
      reviewStatus:
        document.querySelector('[data-testid="project-brief-judgment"]')?.getAttribute('data-review-status') ?? null,
      judgment: document.querySelector('[data-testid="project-brief-judgment"]')?.textContent ?? null,
      emptyKind: document.querySelector('[data-testid="project-brief-empty"]')?.getAttribute('data-brief-kind') ?? null,
      confirmed: count('project-brief-confirmed'),
      unconfirmed: count('project-brief-unconfirmed'),
      conflicts: count('project-brief-conflicts'),
      nextQuestion: document.querySelector('[data-testid="project-brief-next-question"]')?.textContent ?? null,
      ctaText: cta?.textContent ?? null,
      ctaHref: cta?.getAttribute('href') ?? null,
      ctaCount: document.querySelectorAll('[data-testid="project-brief-cta"]').length,
      bodyText: root?.textContent ?? '',
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
}

async function runBriefCase(browser, session, label, projectId, { screenshot = true } = {}) {
  const results = {};
  for (const [vpName, viewport] of [
    ['desktop', { width: 1280, height: 900 }],
    ['mobile', { width: 390, height: 844 }],
  ]) {
    const context = await newAuthedContext(browser, session, viewport);
    const page = await context.newPage();
    const tracked = trackPage(page);
    await page.goto(`${BASE_URL}/workspace/brief?project=${projectId}&from=list`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="project-brief"]', { timeout: 30_000 });
    await page.waitForTimeout(800);
    await dismissConsent(page);
    const info = await inspectBrief(page);
    if (screenshot) {
      await page.screenshot({ path: join(MEDIA_DIR, `case-${label}-${vpName}.png`), fullPage: true });
    }
    const leak = info.bodyText.match(LEAK)?.[0] ?? null;
    results[vpName] = {
      ...info,
      bodyText: undefined,
      leak,
      url: new URL(page.url()).pathname,
      events: [...tracked.events],
      consoleErrors: tracked.consoleErrors,
    };
    if (vpName === 'desktop') {
      await Promise.all([
        page.waitForURL((url) => url.pathname === '/workspace' && url.searchParams.get('project') === projectId, {
          timeout: 30_000,
        }),
        page.click('[data-testid="project-brief-cta"]'),
      ]);
      await page.waitForTimeout(1500);
      results.ctaNavigation = {
        landedOn: `${new URL(page.url()).pathname}${new URL(page.url()).search}`,
        ctaEvent: tracked.events.find((e) => e.name === 'project_brief_cta_clicked') ?? null,
        canvasBriefLink: await page
          .locator('[data-testid="workspace-brief-link"]')
          .getAttribute('href')
          .catch(() => null),
      };
    }
    await context.close();
  }
  return results;
}

async function runInvalidCase(browser, session, label, projectParam) {
  const context = await newAuthedContext(browser, session, { width: 1280, height: 900 });
  const page = await context.newPage();
  const tracked = trackPage(page);
  const url = projectParam == null ? `${BASE_URL}/workspace/brief` : `${BASE_URL}/workspace/brief?project=${projectParam}`;
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  const result = {
    label,
    finalPath: new URL(page.url()).pathname,
    finalSearch: new URL(page.url()).search,
    status: response?.status() ?? null,
    briefRendered: (await page.locator('[data-testid="project-brief"]').count()) > 0,
    unavailableRendered: (await page.locator('[data-testid="project-brief-unavailable"]').count()) > 0,
    events: tracked.events,
    consoleErrors: tracked.consoleErrors,
  };
  await page.screenshot({ path: join(MEDIA_DIR, `case-F-${label.replace(/\W+/g, '-')}.png`), fullPage: true });
  await context.close();
  return result;
}

async function main() {
  if (!BASE_URL) throw new Error('BASE_URL required');
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) throw new Error('AUTH_BLOCKED — Supabase env missing');
  mkdirSync(MEDIA_DIR, { recursive: true });

  const session = await createMagicSession();
  const userId = session.user.id;
  const fixtureId = await insertReadyFixture(userId);
  const browser = await chromium.launch();
  const report = { baseUrl: BASE_URL, ranAt: new Date().toISOString(), authMethod: 'supabase_qa_magiclink', cases: {} };

  try {
    report.cases.A = await runBriefCase(browser, session, 'A-normal', CASES.A);
    report.cases.B = await runBriefCase(browser, session, 'B-partial', CASES.B);
    report.cases.C = await runBriefCase(browser, session, 'C-conflict', CASES.C);
    report.cases.D = await runBriefCase(browser, session, 'D-ready', fixtureId);
    report.cases.E = await runBriefCase(browser, session, 'E-empty', CASES.E);

    const foreignId = await findForeignProjectId(userId);
    report.cases.F = [
      await runInvalidCase(browser, session, 'missing project param', null),
      await runInvalidCase(browser, session, 'malformed id', 'not-a-uuid'),
      await runInvalidCase(browser, session, 'unknown uuid', '00000000-0000-4000-8000-000000000000'),
      await runInvalidCase(browser, session, 'project owned by another user', foreignId),
    ];

    const anon = await browser.newContext({
      extraHTTPHeaders: BYPASS ? { 'x-vercel-protection-bypass': BYPASS } : undefined,
    });
    const anonPage = await anon.newPage();
    await anonPage.goto(`${BASE_URL}/workspace/brief?project=${CASES.A}`, { waitUntil: 'networkidle' });
    report.unauthenticated = {
      finalPath: new URL(anonPage.url()).pathname,
      briefRendered: (await anonPage.locator('[data-testid="project-brief"]').count()) > 0,
    };
    await anon.close();

    const listContext = await newAuthedContext(browser, session, { width: 1280, height: 900 });
    const listPage = await listContext.newPage();
    await listPage.goto(`${BASE_URL}/workspace`, { waitUntil: 'networkidle' });
    await listPage.waitForSelector('[data-testid^="project-list-item-"]', { timeout: 30_000 });
    report.listEntry = {
      linkForAnsweredProject: await listPage
        .locator(`[data-testid="project-brief-link-${CASES.A}"]`)
        .getAttribute('href')
        .catch(() => null),
      linkForEmptyProject: (await listPage.locator(`[data-testid="project-brief-link-${CASES.E}"]`).count()) > 0,
    };
    await listPage.locator(`[data-testid="project-list-item-${CASES.A}"]`).scrollIntoViewIfNeeded();
    await listPage
      .locator(`[data-testid="project-list-item-${CASES.A}"]`)
      .screenshot({ path: join(MEDIA_DIR, 'entry-list-card.png') });
    await listContext.close();
  } finally {
    await browser.close();
    await deleteFixture(fixtureId);
    report.fixture = { inserted: fixtureId, deleted: true };
  }

  writeFileSync(join(OUT_DIR, 'project-brief-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
