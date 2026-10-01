/**
 * Track B/D — Production acceptance (gap CEO surfaces on My Business demo path).
 * Judgment trace: not asserted here (requires authenticated loop turn).
 *
 * Usage (apps/web):
 *   node scripts/production-track-bd-browser.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../../../docs/evidence/ALABOM/AI-REASONING-CLOSURE-SPRINT/PRODUCTION');
const PRODUCTION_URL =
  process.env.PRODUCTION_URL ?? 'https://ai-startup-validation-tau.vercel.app';

const MB_DOC = `사업명: Track B Production QA
고객: 소규모 F&B 사장
문제: 홍보 시간 부족
수익: 월 구독`;

const report = { trackB: {}, trackD: {}, verdict: 'FAIL', finishedAt: null };

async function dismissCookie(page) {
  const reject = page.getByRole('button', { name: /거부/i });
  if ((await reject.count()) > 0) await reject.first().click({ timeout: 3000 }).catch(() => {});
}

async function openMyBusinessPastePanel(page) {
  await page.goto(`${PRODUCTION_URL}/demo/start`, { waitUntil: 'domcontentloaded' });
  await dismissCookie(page);
  await page.getByRole('button', { name: /내 사업 문서로 체험/i }).click();
  const doc = page.getByTestId('demo-my-business-document');
  await doc.waitFor({ state: 'visible', timeout: 45_000 });
  return doc;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const doc = await openMyBusinessPastePanel(page);
    await doc.fill(MB_DOC);
    await page.getByRole('button', { name: /AI Read/i }).click();
    await page.waitForURL(/sample=custom/, { timeout: 60_000 });
    await page.waitForTimeout(6000);

    const list = page.getByTestId('gap-ceo-surface-list');
    const lines = page.getByTestId('gap-ceo-surface-line');
    report.trackB.gapListVisible = {
      pass: await list.isVisible().catch(() => false),
    };
    report.trackB.gapLineCount = await lines.count();
    const firstLine =
      report.trackB.gapLineCount > 0 ? (await lines.first().innerText()).trim() : '';
    report.trackB.firstLineSnippet = firstLine.slice(0, 120);
    report.trackB.ceoLabelPresent = {
      pass: /아직 확인되지 않음|검증 필요|불명확/.test(firstLine),
    };
    report.trackB.pass =
      report.trackB.gapListVisible.pass &&
      report.trackB.gapLineCount > 0 &&
      report.trackB.ceoLabelPresent.pass;

    report.trackD.judgmentTrace = {
      pass: false,
      reason: 'Judgment trace Production check requires authenticated loop turn — not run on demo preview path.',
    };
  } catch (e) {
    report.trackB.error = String(e);
    report.trackB.pass = false;
  } finally {
    await browser.close();
  }

  report.verdict = report.trackB.pass ? 'PARTIAL' : 'FAIL';
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT, 'track-bd-production.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict, trackB: report.trackB.pass }, null, 2));
  process.exit(report.trackB.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
