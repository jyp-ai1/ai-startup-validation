/**
 * Track A — Historical P0 browser checks (Demo / My Business paths).
 * Usage: node scripts/production-historical-p0-browser.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../../../docs/evidence/ALABOM/AI-REASONING-CLOSURE-SPRINT/PRODUCTION');
const PRODUCTION_URL =
  process.env.PRODUCTION_URL ?? 'https://ai-startup-validation-tau.vercel.app';

const SMARTPM = ['스마트PM', '전략 검토가 회의마다 리셋'];
const MB_DOC = `사업명: P0 회귀 QA
고객: 테스트 F&B 사장
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
  const doc = page.getByTestId('demo-my-business-document');
  await doc.waitFor({ state: 'visible', timeout: 45_000 });
  return doc;
}

async function storage(page) {
  return page.evaluate(() => {
    const s = {};
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (k) s[k] = sessionStorage.getItem(k) ?? '';
    }
    return s;
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  // ① SmartPM / sample contamination on My Business
  {
    const page = await browser.newPage();
    try {
      const doc = await openMyBusinessPastePanel(page);
      await doc.fill(MB_DOC);
      await page.getByRole('button', { name: /AI Read/i }).click();
      await page.waitForURL(/sample=custom/, { timeout: 60_000 });
      await page.waitForTimeout(4000);
      const blob = JSON.stringify(await storage(page));
      const bad = SMARTPM.filter((m) => blob.includes(m));
      const clinic = /클리닉플로우|demo-sample-clinicflow/.test(blob);
      report.checks.smartPmMyBusiness = { pass: bad.length === 0 && !clinic, bad, clinicInStorage: clinic };
    } catch (e) {
      report.checks.smartPmMyBusiness = { pass: false, error: String(e) };
    } finally {
      await page.close();
    }
  }

  // ② Cross-demo isolation (Sample then MB keys distinct)
  {
    const page = await browser.newPage();
    try {
      await page.goto(`${PRODUCTION_URL}/workspace?demo=guided&sample=clinicflow&fresh=1`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForTimeout(6000);
      const afterSample = await storage(page);
      const doc = await openMyBusinessPastePanel(page);
      await doc.fill(MB_DOC);
      await page.getByRole('button', { name: /AI Read/i }).click();
      await page.waitForURL(/sample=custom/, { timeout: 60_000 });
      await page.waitForTimeout(3000);
      const afterMb = await storage(page);
      const mbDocKey = Object.keys(afterMb).find((k) => k.includes('demo-my-') && k.includes('document'));
      const mbDoc = mbDocKey ? afterMb[mbDocKey] : '';
      report.checks.sampleToMyBusinessIsolation = {
        pass: !/클리닉플로우|no-show 15/.test(mbDoc),
        mbDocSnippet: mbDoc.slice(0, 120),
        legacySampleKeysCoexist: Object.keys(afterMb).some((k) => k.includes('demo-sample-clinicflow')),
      };
    } catch (e) {
      report.checks.sampleToMyBusinessIsolation = { pass: false, error: String(e) };
    } finally {
      await page.close();
    }
  }

  await browser.close();
  report.verdict = Object.values(report.checks).every((c) => c.pass) ? 'PASS' : 'FAIL';
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT, 'historical-p0-browser.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict }, null, 2));
  process.exit(report.verdict === 'PASS' ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
