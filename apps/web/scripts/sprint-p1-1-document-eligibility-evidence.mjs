/**
 * Sprint P1-1 — Document Eligibility evidence (minimal).
 *
 * Usage:
 *   cd apps/web && pnpm dev
 *   node scripts/sprint-p1-1-document-eligibility-evidence.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const OUT_DIR = join(REPO_ROOT, 'docs', 'evidence', 'SPRINT-P1-1');
const SCREENS = join(OUT_DIR, 'screens');
const BASE_URL = process.env.LOCAL_BASE_URL ?? 'http://localhost:3000';

const VALID_DOC = `테스트 제조 SaaS
창업자: 김대표
사업: 공장 설비 예지보전 SaaS
고객: 30인 이하 제조기업
문제: 설비 고장으로 생산 중단`;

const report = {
  sprint: 'P1-1',
  title: 'Document Eligibility & Upload-first',
  generatedAt: new Date().toISOString(),
  checks: [],
};

function check(id, ok, detail) {
  report.checks.push({ id, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${id}${detail ? ` — ${detail}` : ''}`);
}

async function dismissConsent(page) {
  const accept = page.getByRole('button', { name: /분석 수락|Accept analytics/i });
  try {
    await accept.first().click({ timeout: 5000 });
  } catch {
    // already dismissed
  }
}

async function main() {
  mkdirSync(SCREENS, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    await page.goto(`${BASE_URL}/demo/start`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await dismissConsent(page);

    await page.getByText(/내 사업 문서로 체험하기/).click();
    await page.locator('textarea').fill('내 프로젝트');
    const weakBtn = page.getByRole('button', { name: /AI Read 시작/i });
    const weakDisabled = await weakBtn.isDisabled();
    check('1-title-only-blocked', weakDisabled, weakDisabled ? 'Start disabled for title-only' : 'Button enabled');
    await page.screenshot({ path: join(SCREENS, '01-weak-input-blocked.png'), fullPage: true });

    await page.locator('textarea').fill(VALID_DOC);
    check('2-valid-enables', await weakBtn.isEnabled(), 'Start enabled after valid document');
    await weakBtn.click();

    await page.waitForURL(/\/workspace\?.*demo=guided/, { timeout: 30_000 });
    await dismissConsent(page);
    await page.getByText(/AI PM이 문서를 읽고|AI PM is reading/i).waitFor({ timeout: 30_000 });
    check('3-reading-starts', true, 'AI Reading visible after upload-first demo');
    await page.screenshot({ path: join(SCREENS, '02-reading-after-upload.png'), fullPage: true });

    await page
      .getByText(/초기 AI 분석 완료|Initial AI analysis complete/i)
      .waitFor({ timeout: 45_000 });
    check('4-diagnosis-reached', true, 'Diagnosis summary after Reading sequence');
  } finally {
    await browser.close();
  }

  writeFileSync(join(OUT_DIR, 'qa-checklist.json'), JSON.stringify(report, null, 2));
  console.log(`\nEvidence: ${OUT_DIR}`);
}

void main();
