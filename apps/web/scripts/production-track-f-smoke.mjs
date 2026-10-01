/**
 * Track F — Production smoke: demo start accepts paste (not binary upload E2E).
 * Real PDF/DOCX extraction on Production remains OPEN until Trust Block path is scripted.
 *
 * Usage (apps/web):
 *   node scripts/production-track-f-smoke.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../../../docs/evidence/ALABOM/AI-REASONING-CLOSURE-SPRINT/PRODUCTION');
const PRODUCTION_URL =
  process.env.PRODUCTION_URL ?? 'https://ai-startup-validation-tau.vercel.app';

const PASTE = `사업명: Track F paste QA
고객: 제조 30인 이하 공장
문제: 설비 고장 엑셀 관리
수익: SaaS`;

const report = {
  pasteIntakePass: false,
  binaryUploadTested: false,
  semanticParityPass: false,
  note: 'semanticParityPass requires post-workspace entity check — OPEN for PDF/DOCX binary.',
  finishedAt: null,
};

async function dismissCookie(page) {
  const reject = page.getByRole('button', { name: /거부/i });
  if ((await reject.count()) > 0) await reject.first().click({ timeout: 3000 }).catch(() => {});
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(`${PRODUCTION_URL}/demo/start`, { waitUntil: 'domcontentloaded' });
    await dismissCookie(page);
    await page.getByRole('button', { name: /내 사업 문서로 체험/i }).click();
    const doc = page.getByTestId('demo-my-business-document');
    await doc.waitFor({ state: 'visible', timeout: 45_000 });
    await doc.fill(PASTE);
    await page.getByRole('button', { name: /AI Read/i }).click();
    await page.waitForURL(/sample=custom/, { timeout: 60_000 });
    await page.waitForTimeout(4000);
    const text = await page.locator('body').innerText();
    report.pasteIntakePass = /제조|설비|Track F paste/.test(text);
    const storage = await page.evaluate(() => JSON.stringify(sessionStorage));
    report.semanticParityPass =
      report.pasteIntakePass && /설비|고장|제조/.test(storage);
  } catch (e) {
    report.error = String(e);
  } finally {
    await browser.close();
  }
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT, 'track-f-production-smoke.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pasteIntakePass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
