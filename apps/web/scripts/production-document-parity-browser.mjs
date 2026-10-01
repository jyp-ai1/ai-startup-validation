/**
 * Track F — Production document parity (paste + length; PDF/DOCX upload attempt).
 */
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../../../docs/evidence/ALABOM/AI-REASONING-CLOSURE-SPRINT/PRODUCTION');
const PRODUCTION_URL =
  process.env.PRODUCTION_URL ?? 'https://ai-startup-validation-tau.vercel.app';

const CORE = `사업명: Parity QA
고객: 5~30인 피부·치과 원장
문제: no-show 15~25%
수익: 병원 월 구독`;

function pad(n) {
  return `${CORE}\n\n${'배경 '.repeat(Math.ceil(n / 3))}`.slice(0, n);
}

const report = { checks: {}, verdict: 'FAIL', finishedAt: null };

async function dismissCookie(page) {
  const reject = page.getByRole('button', { name: /거부/i });
  if ((await reject.count()) > 0) await reject.first().click({ timeout: 3000 }).catch(() => {});
}

async function openCustom(page, attempt = 1) {
  await page.goto(`${PRODUCTION_URL}/demo/start`, { waitUntil: 'domcontentloaded' });
  await dismissCookie(page);
  await page.getByRole('button', { name: /내 사업 문서로 체험/i }).click();
  const doc = page.getByTestId('demo-my-business-document');
  try {
    await doc.waitFor({ state: 'visible', timeout: 45_000 });
  } catch (e) {
    if (attempt >= 2) throw e;
    return openCustom(page, attempt + 1);
  }
  return doc;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  for (const len of [1000, 3000, 5000]) {
    const page = await browser.newPage();
    try {
      const doc = await openCustom(page);
      await doc.fill(pad(len));
      await page.getByRole('button', { name: /AI Read/i }).click();
      await page.waitForURL(/sample=custom/, { timeout: 60_000 });
      await page.waitForTimeout(4000);
      const storage = await page.evaluate(() => JSON.stringify(sessionStorage));
      report.checks[`paste_${len}`] = {
        pass: /no-show|피부|Parity/.test(storage),
      };
    } catch (e) {
      report.checks[`paste_${len}`] = { pass: false, error: String(e) };
    } finally {
      await page.close();
    }
  }

  {
    const dir = mkdtempSync(join(tmpdir(), 'parity-'));
    const txtPath = join(dir, 'parity-qa.txt');
    writeFileSync(txtPath, pad(800), 'utf8');
    const page = await browser.newPage();
    try {
      await page.goto(`${PRODUCTION_URL}/demo/start`, { waitUntil: 'domcontentloaded' });
      await dismissCookie(page);
      await page.getByRole('button', { name: /내 사업 문서로 체험/i }).click();
      const input = page.locator('input[type="file"]');
      await input.setInputFiles(txtPath);
      await page.waitForTimeout(3000);
      const body = await page.locator('body').innerText();
      report.checks.txt_upload = { pass: /Parity|no-show|피부/.test(body) };
    } catch (e) {
      report.checks.txt_upload = { pass: false, error: String(e) };
    } finally {
      await page.close();
    }
  }

  report.checks.pdf_docx = {
    pass: false,
    status: 'NOT_RUN',
    reason: 'Binary PDF/DOCX semantic extraction on Production requires authenticated Trust Block path — not automated in demo-only pass.',
  };

  await browser.close();

  const pasteOk = [1000, 3000, 5000].every((n) => report.checks[`paste_${n}`]?.pass);
  report.verdict = pasteOk && report.checks.txt_upload?.pass ? 'PARTIAL' : 'FAIL';
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT, 'document-parity-production.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict }, null, 2));
  process.exit(pasteOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
