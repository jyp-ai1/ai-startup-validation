/**
 * Track G — Production CEO verification UX (demo sample + My Business preview).
 *
 * Usage (apps/web):
 *   node scripts/production-track-g-browser.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../../../docs/evidence/ALABOM/AI-REASONING-CLOSURE-SPRINT/PRODUCTION');
const PRODUCTION_URL =
  process.env.PRODUCTION_URL ?? 'https://ai-startup-validation-tau.vercel.app';

const MB_DOC = `사업명: Track G QA
고객: 소규모 F&B 사장
문제: 홍보 시간 부족
수익: 월 구독`;

const report = { checks: {}, verdict: 'FAIL', finishedAt: null };

async function dismissCookie(page) {
  const reject = page.getByRole('button', { name: /거부/i });
  if ((await reject.count()) > 0) await reject.first().click({ timeout: 3000 }).catch(() => {});
}

async function openMyBusinessPastePanel(page) {
  await page.goto(`${PRODUCTION_URL}/demo/start`, { waitUntil: 'domcontentloaded' });
  await dismissCookie(page);
  const entry = page.getByRole('button', { name: /내 사업 문서로 체험/i });
  await entry.waitFor({ state: 'visible', timeout: 30_000 });
  await entry.click();
  const docInput = page.getByTestId('demo-my-business-document');
  await docInput.waitFor({ state: 'visible', timeout: 45_000 });
  return docInput;
}

async function visible(page, testId) {
  const loc = page.getByTestId(testId);
  return (await loc.count()) > 0 && (await loc.first().isVisible().catch(() => false));
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  {
    const page = await browser.newPage();
    try {
      await page.goto(`${PRODUCTION_URL}/workspace?demo=guided&sample=clinicflow&fresh=1`, {
        waitUntil: 'domcontentloaded',
      });
      await dismissCookie(page);
      await page.waitForSelector('#ai-pm-loop, [data-testid="demo-sample-playback-bar"]', {
        timeout: 120_000,
      });
      report.checks.sampleAiPmLoop = {
        pass:
          (await page.locator('#ai-pm-loop').count()) > 0 ||
          (await visible(page, 'ai-pm-loop')),
      };
      report.checks.samplePlaybackBar = { pass: await visible(page, 'demo-sample-playback-bar') };
    } catch (e) {
      report.checks.samplePath = { pass: false, error: String(e) };
    } finally {
      await page.close();
    }
  }

  {
    const page = await browser.newPage();
    try {
      const doc = await openMyBusinessPastePanel(page);
      await doc.fill(MB_DOC);
      await page.getByRole('button', { name: /AI Read/i }).click();
      await page.waitForURL(/sample=custom/, { timeout: 60_000 });
      await page.waitForTimeout(5000);
      report.checks.myBusinessPreview = { pass: await visible(page, 'demo-my-business-preview') };
    } catch (e) {
      report.checks.myBusinessPreview = { pass: false, error: String(e) };
    } finally {
      await page.close();
    }
  }

  await browser.close();

  const sampleOk =
    report.checks.sampleAiPmLoop?.pass && report.checks.samplePlaybackBar?.pass;
  const mbOk = report.checks.myBusinessPreview?.pass;
  report.checks.ceoVerificationUx = { pass: Boolean(sampleOk && mbOk) };
  report.verdict = report.checks.ceoVerificationUx.pass ? 'PASS' : 'FAIL';
  report.finishedAt = new Date().toISOString();

  writeFileSync(join(OUT, 'track-g-browser.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict }, null, 2));
  process.exit(report.verdict === 'PASS' ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
