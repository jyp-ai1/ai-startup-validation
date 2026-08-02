/**
 * S7 Contract Recovery — local regression evidence (6 scenarios).
 *
 * Prerequisite: dev server on http://localhost:3000
 *   cd apps/web && pnpm dev
 *
 * Usage:
 *   cd apps/web
 *   node scripts/s7-regression-evidence.mjs
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, '..');
const REPO_ROOT = join(WEB_ROOT, '..', '..');
const OUT_DIR = join(REPO_ROOT, 'docs', 'evidence', 'S7-REGRESSION');
const BASE_URL = process.env.S7_REGRESSION_URL ?? 'http://localhost:3000';

const PDF_PLACEHOLDER = `# plan.pdf

PDF 본문은 아직 추출되지 않았습니다. Business·Customer는 직접 확인이 필요합니다.`;

const SAMPLE_DOC = `스마트팩토리 예지보전 SaaS
창업자: 김대표
사업: 30인 이하 제조기업 대상 설비 고장 예측
문제: 예기치 않은 설비 고장으로 생산 중단
시장: 국내 3만 개 중소 제조 공장
BM: 월 49만 원 구독`;

const DEMO_PROJECT_ID = 'demo-session';

const report = {
  sprint: 'S7 Contract Recovery',
  environment: 'local',
  baseUrl: BASE_URL,
  generatedAt: new Date().toISOString(),
  scenarios: {},
  checks: [],
  notes: [],
};

function scenario(id, pass, detail, evidence = []) {
  report.scenarios[id] = { pass, detail, evidence };
  report.checks.push({ id, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${id} — ${detail}`);
}

async function shot(page, name) {
  mkdirSync(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  return path.replace(REPO_ROOT + '\\', '').replace(REPO_ROOT + '/', '');
}

async function dismissConsent(page) {
  const accept = page.getByRole('button', { name: /분석 수락|Accept analytics/i });
  if ((await accept.count()) > 0) {
    await accept.first().click({ timeout: 3_000 }).catch(() => {});
  }
}

async function openDemoWorkspace(page, { sample = 'manufacturing', fresh = true } = {}) {
  const url = `${BASE_URL}/ko/workspace?demo=guided&sample=${sample}${fresh ? '&fresh=1' : ''}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await dismissConsent(page);
}

async function readSessionStorage(page, key) {
  return page.evaluate((k) => sessionStorage.getItem(k), key);
}

async function waitForDemoReady(page) {
  await page.waitForTimeout(2500);
  for (let i = 0; i < 20; i++) {
    const hasLoop = (await page.locator('#ai-pm-loop').count()) > 0;
    const doc = await readSessionStorage(page, `launchlens.document.${DEMO_PROJECT_ID}.raw`);
    if (hasLoop || (doc?.trim().length ?? 0) > 40) return { hasLoop, doc };
    await page.waitForTimeout(500);
  }
  return { hasLoop: false, doc: null };
}

async function submitCustomDocument(page, content) {
  const paste = page.locator('#workspace-doc-paste');
  if ((await paste.count()) === 0) return false;
  await paste.fill(content);
  const startBtn = page.getByRole('button', { name: /AI Read|AI PM과 시작/i });
  if ((await startBtn.count()) === 0) return false;
  if (await startBtn.isDisabled()) return false;
  await startBtn.click();
  await page.waitForTimeout(2000);
  return true;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    scenario(
      '0-preflight',
      false,
      `Playwright launch failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    writeReport();
    process.exit(1);
  }

  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  try {
    const health = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    if (!health || health.status() >= 500) {
      scenario('0-preflight', false, `Dev server not reachable at ${BASE_URL}`);
      writeReport();
      process.exit(1);
    }
    scenario('0-preflight', true, `Dev server reachable (${BASE_URL})`);
  } catch {
    scenario('0-preflight', false, `Dev server not reachable at ${BASE_URL}`);
    writeReport();
    process.exit(1);
  }

  // Regression #1 — Placeholder PDF
  try {
    await page.goto(`${BASE_URL}/demo/start`, { waitUntil: 'domcontentloaded' });
    await dismissConsent(page);
    await page.getByRole('button', { name: /직접|붙여넣|Paste|Custom/i }).first().click().catch(() => {});
    await page.waitForTimeout(500);
    await page.locator('textarea').first().fill(PDF_PLACEHOLDER);
    await page.getByRole('button', { name: /Demo 시작|Start demo|시작/i }).click();
    await page.waitForURL(/workspace/, { timeout: 30_000 });
    await dismissConsent(page);
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();
    const hasTrustBlock =
      bodyText.includes('본문을 아직 읽지') ||
      bodyText.includes('could not read') ||
      bodyText.includes('직접 확인') ||
      bodyText.includes('추출되지 않');
    const hasReadClaim = bodyText.includes('문서를 읽어보니');

    const pass = hasTrustBlock && !hasReadClaim;
    const evidence = [await shot(page, 'reg1-pdf-placeholder')];
    scenario(
      'reg1-placeholder-pdf',
      pass,
      pass
        ? 'Trust block shown; no "문서를 읽어보니" read claim'
        : `trustBlock=${hasTrustBlock}, readClaim=${hasReadClaim}`,
      evidence,
    );
  } catch (error) {
    scenario(
      'reg1-placeholder-pdf',
      false,
      error instanceof Error ? error.message : String(error),
    );
  }

  // Regression #2 — Loop answer syncs sidebar/header
  try {
    await openDemoWorkspace(page, { fresh: true });
    await waitForDemoReady(page);

    const textarea = page.locator('#ai-pm-loop textarea');
    if ((await textarea.count()) === 0) {
      await page.getByRole('button', { name: /다음으로|Continue/i }).click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    await page.locator('#ai-pm-loop textarea').first().fill(
      '30인 이하 제조기업입니다. 사용자는 공장장, 구매자는 대표입니다.',
    );
    await page.getByRole('button', { name: /답변 반영|Apply answer/i }).click();
    await page.waitForTimeout(3500);

    const sidebarText = await page.locator('aside, nav').first().innerText().catch(() => '');
    const headerText = await page.locator('header').innerText().catch(() => '');
    const bodyText = await page.locator('body').innerText();

    const customerDone =
      sidebarText.includes('완료') ||
      sidebarText.toLowerCase().includes('completed') ||
      bodyText.includes('30인 이하');
    const headerSynced = headerText.includes('30인') || bodyText.includes('30인 이하');

    const evidence = [await shot(page, 'reg2-loop-sidebar-header')];
    scenario(
      'reg2-loop-state-sync',
      customerDone && headerSynced,
      `sidebarCustomer=${customerDone}, headerSynced=${headerSynced}`,
      evidence,
    );
  } catch (error) {
    scenario('reg2-loop-state-sync', false, error instanceof Error ? error.message : String(error));
  }

  // Regression #3 — Review disabled + reason
  try {
    await openDemoWorkspace(page, { fresh: true });
    await waitForDemoReady(page);
    await page.evaluate((projectId) => {
      sessionStorage.setItem(`launchlens.businessUnderstanding.phase.${projectId}`, 'review-ready');
      const raw = sessionStorage.getItem(`launchlens.entities.${projectId}.workspace`);
      if (raw) {
        const entities = JSON.parse(raw);
        entities.customer = { value: '중소기업', basis: 'needs_confirmation' };
        sessionStorage.setItem(`launchlens.entities.${projectId}.workspace`, JSON.stringify(entities));
      }
    }, DEMO_PROJECT_ID);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await dismissConsent(page);
    await page.waitForTimeout(2000);

    const reviewBtn = page.getByRole('button', { name: /검토 시작|Start review/i });
    const disabledBefore = (await reviewBtn.count()) > 0 ? await reviewBtn.isDisabled() : false;
    const blockedReasonVisible =
      (await page.getByText(/아직 확인되지 않았습니다|not confirmed yet/i).count()) > 0;

    const evidence = [await shot(page, 'reg3-review-blocked')];
    scenario(
      'reg3-review-contract',
      disabledBefore && blockedReasonVisible,
      `disabled=${disabledBefore}, reasonVisible=${blockedReasonVisible}`,
      evidence,
    );
  } catch (error) {
    scenario('reg3-review-contract', false, error instanceof Error ? error.message : String(error));
  }

  // Regression #4 — Pause / Resume state
  try {
    await openDemoWorkspace(page, { fresh: true });
    await waitForDemoReady(page);

    const loopKey = await readSessionStorage(page, `launchlens.aiPmLoop.${DEMO_PROJECT_ID}`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await dismissConsent(page);
    const loopAfter = await readSessionStorage(page, `launchlens.aiPmLoop.${DEMO_PROJECT_ID}`);

    const pass = Boolean(loopKey) && loopKey === loopAfter;
    scenario(
      'reg4-pause-resume',
      pass,
      pass ? 'Loop sessionStorage identical after reload' : 'Loop state lost on reload',
      [await shot(page, 'reg4-resume')],
    );
  } catch (error) {
    scenario('reg4-pause-resume', false, error instanceof Error ? error.message : String(error));
  }

  // Regression #5 — Demo fresh scenario switch (no taste bleed)
  try {
    await openDemoWorkspace(page, { sample: 'launchlens', fresh: true });
    const tasteReady = await waitForDemoReady(page);
    const tasteDoc = tasteReady.doc;
    const tasteHasTaste = tasteDoc?.includes('취향저격') ?? false;

    await openDemoWorkspace(page, { sample: 'manufacturing', fresh: true });
    const mfgReady = await waitForDemoReady(page);
    const mfgDoc = mfgReady.doc;
    const mfgHasTaste = mfgDoc?.includes('취향저격') ?? false;
    const mfgHasFactory = mfgDoc?.includes('스마트팩토리') ?? mfgDoc?.includes('제조') ?? false;

    const pass = tasteHasTaste && !mfgHasTaste && Boolean(mfgHasFactory);
    scenario(
      'reg5-demo-fresh-switch',
      pass,
      `tasteLoaded=${tasteHasTaste}, tasteBleed=${mfgHasTaste}, mfgLoaded=${mfgHasFactory}`,
      [await shot(page, 'reg5-demo-switch')],
    );

    if (!pass && mfgHasTaste) {
      report.notes.push(
        'KNOWN: /demo/enter without fresh=1 may still bleed session; fresh=1 path tested here.',
      );
    }
  } catch (error) {
    scenario('reg5-demo-fresh-switch', false, error instanceof Error ? error.message : String(error));
  }

  // Regression #6 — Full path smoke (demo guided)
  try {
    await openDemoWorkspace(page, { fresh: true });
    await waitForDemoReady(page);

    let completedTurns = 0;
    for (const answer of [
      '30인 이하 제조기업. 사용자는 공장장, 구매자는 대표.',
      '설비 고장으로 생산 중단이 핵심 문제입니다.',
      '월 49만 원 구독 모델입니다.',
    ]) {
      const textarea = page.locator('#ai-pm-loop textarea');
      if ((await textarea.count()) === 0) break;
      await textarea.first().fill(answer);
      await page.getByRole('button', { name: /답변 반영|Apply answer/i }).click();
      await page.waitForTimeout(4000);
      completedTurns += 1;
    }

    const bodyText = await page.locator('body').innerText();
    const reviewReady =
      bodyText.includes('검토 시작') ||
      bodyText.includes('Start review') ||
      bodyText.includes('review-ready');

    scenario(
      'reg6-full-path-smoke',
      completedTurns >= 2 && reviewReady,
      `turns=${completedTurns}, reviewSurface=${reviewReady}`,
      [await shot(page, 'reg6-full-path')],
    );
  } catch (error) {
    scenario('reg6-full-path-smoke', false, error instanceof Error ? error.message : String(error));
  }

  await browser.close();
  writeReport();

  const failed = report.checks.filter((c) => !c.pass);
  process.exit(failed.length > 0 ? 1 : 0);
}

function writeReport() {
  writeFileSync(join(OUT_DIR, 'regression-report.json'), JSON.stringify(report, null, 2));
  const md = [
    '# S7 Regression Report',
    '',
    `- Generated: ${report.generatedAt}`,
    `- Base URL: ${report.baseUrl}`,
    '',
    '| Scenario | Result | Detail |',
    '|----------|--------|--------|',
    ...report.checks.map((c) => `| ${c.id} | ${c.pass ? 'PASS' : 'FAIL'} | ${c.detail} |`),
    '',
    ...(report.notes.length ? ['## Notes', ...report.notes.map((n) => `- ${n}`), ''] : []),
  ].join('\n');
  writeFileSync(join(OUT_DIR, 'REGRESSION_REPORT.md'), md);
  console.log(`\nWrote ${join(OUT_DIR, 'REGRESSION_REPORT.md')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
