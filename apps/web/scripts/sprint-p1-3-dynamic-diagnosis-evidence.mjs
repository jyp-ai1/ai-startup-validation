/**
 * Sprint P1-3 — Dynamic Diagnosis evidence.
 *
 * Usage:
 *   cd apps/web && pnpm dev   (port 3002 if 3000 busy)
 *   node scripts/sprint-p1-3-dynamic-diagnosis-evidence.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const CASE_DOCUMENTS = {
  A: `스마트팩토리 예지보전 SaaS
창업자: 김대표
사업: 30인 이하 제조기업 대상 설비 고장 예측
문제: 예기치 않은 설비 고장으로 생산 중단
시장: 국내 3만 개 중소 제조 공장 · 예지보전 SW 침투율 8%
BM: 월 49만 원 구독 · 공장당 10대 센서 포함`,
  B: `스마트팩토리 예지보전 SaaS
창업자: 김대표
고객: 30인 이하 제조기업 설비 관리자
문제: 예기치 않은 설비 고장으로 생산 중단
BM: 월 49만 원 구독 · 공장당 10대 센서 포함`,
  C: `스마트팩토리 예지보전 SaaS
창업자: 김대표
고객: 30인 이하 제조기업 설비 관리자
문제: 예기치 않은 설비 고장으로 생산 중단
시장: 국내 3만 개 중소 제조 공장 · 예지보전 SW 침투율 8%`,
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const OUT_DIR = join(REPO_ROOT, 'docs', 'evidence', 'SPRINT-P1-3');
const SCREENS = join(OUT_DIR, 'screens');
const BASE_URL = process.env.LOCAL_BASE_URL ?? 'http://localhost:3002';

const EXPECTED = {
  A: { issue: 'customer_definition', riskLabel: /고객/, question: /누가 실제 고객/ },
  B: { issue: 'market_validation', riskLabel: /시장/, question: /왜 지금 이 시장/ },
  C: { issue: 'bm_design', riskLabel: /수익/, question: /누가 비용을 지불/ },
};

const report = {
  sprint: 'P1-3',
  title: 'Dynamic Diagnosis',
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

async function runCase(page, caseId, documentText) {
  await page.goto(`${BASE_URL}/demo/start`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await dismissConsent(page);
  await page.getByText(/내 사업 문서로 체험하기/).click();
  await page.locator('textarea').fill(documentText);
  await page.getByRole('button', { name: /AI Read 시작/i }).click();
  await page.waitForURL(/\/workspace\?.*demo=guided/, { timeout: 30_000 });
  await dismissConsent(page);
  await page.getByText(/AI PM이 문서를 읽고|AI PM is reading/i).waitFor({ timeout: 30_000 });
  await page
    .getByText(/초기 AI 분석 완료|Initial AI analysis complete/i)
    .waitFor({ timeout: 90_000 });
  await page.waitForTimeout(2600);
}

async function main() {
  mkdirSync(SCREENS, { recursive: true });

  const vitest = spawnSync(
    'pnpm',
    [
      'exec',
      'vitest',
      'run',
      'features/workflow-journey/lib/business-understanding/__tests__/build-ai-pm-dynamic-diagnosis.test.ts',
    ],
    {
      cwd: join(__dirname, '..'),
      env: { ...process.env, P1_3_EVIDENCE: '1' },
      encoding: 'utf8',
      shell: true,
    },
  );

  check(
    '1-engine-unit-tests',
    vitest.status === 0,
    vitest.status === 0 ? 'vitest 5/5' : vitest.stderr || vitest.stdout,
  );

  const browser = await chromium.launch({ headless: true });

  try {
    for (const [index, caseId] of ['A', 'B', 'C'].entries()) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      const documentText = CASE_DOCUMENTS[caseId];
      const expected = EXPECTED[caseId];

      await runCase(page, caseId, documentText);
      await page.screenshot({
        path: join(SCREENS, `0${index + 1}-case-${caseId.toLowerCase()}.png`),
        fullPage: true,
      });

      const riskVisible = await page.getByText(/Risk #1/i).isVisible().catch(() => false);
      check(`2${caseId.toLowerCase()}-risk-visible`, riskVisible, `Case ${caseId} Risk #1 block`);

      const primaryRiskText = await page.locator('section').filter({ hasText: /Risk #1/i }).innerText();
      check(
        `3${caseId.toLowerCase()}-primary-risk`,
        expected.riskLabel.test(primaryRiskText),
        `Case ${caseId} primary=${expected.issue}`,
      );

      await page.getByRole('button', { name: /부터 확인|Continue together|확인하기/i }).click({
        timeout: 15_000,
      });
      const questionText = await page.locator('section').filter({ hasText: /AI PM/i }).last().innerText();
      check(
        `4${caseId.toLowerCase()}-first-question`,
        expected.question.test(questionText),
        `Case ${caseId} question matches risk`,
      );

      await page.close();
    }
  } finally {
    await browser.close();
  }

  writeFileSync(join(OUT_DIR, 'qa-checklist.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nEvidence: ${OUT_DIR}`);
  const failed = report.checks.filter((item) => !item.ok);
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
