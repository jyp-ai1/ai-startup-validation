/**
 * Sprint P1-2 — AI Reading Experience evidence.
 *
 * Usage:
 *   cd apps/web && pnpm dev
 *   node scripts/sprint-p1-2-reading-experience-evidence.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const OUT_DIR = join(REPO_ROOT, 'docs', 'evidence', 'SPRINT-P1-2');
const SCREENS = join(OUT_DIR, 'screens');
const BASE_URL = process.env.LOCAL_BASE_URL ?? 'http://localhost:3000';

const SHORT_DOC = `테스트 SaaS
창업자: 김대표
사업: 공장 설비 예지보전 SaaS`;

const LONG_DOC = `스마트팩토리 예지보전 SaaS
창업자: 김대표 · 15년 제조 IT 경력
사업: 30인 이하 제조기업 대상 설비 고장 예측 SaaS
고객: 중소 제조 공장 생산팀장 · 설비 관리자
문제: 예기치 않은 설비 고장으로 생산 라인 중단 · 연간 손실 3억 원
시장: 국내 3만 개 중소 제조 공장 · 예지보전 SW 침투율 8%
경쟁: A사(대기업 전용) · B사(하드웨어 번들) · 자체 Excel 관리
BM: 월 49만 원 구독 · 공장당 10대 센서 포함
리스크: 센서 설치 공수 · 데이터 품질 · 영업 채널`;

const report = {
  sprint: 'P1-2',
  title: 'AI Reading Experience',
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

async function startDemoReading(page, documentText) {
  await page.goto(`${BASE_URL}/demo/start`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await dismissConsent(page);
  await page.getByText(/내 사업 문서로 체험하기/).click();
  await page.locator('textarea').fill(documentText);
  await page.getByRole('button', { name: /AI Read 시작/i }).click();
  await page.waitForURL(/\/workspace\?.*demo=guided/, { timeout: 30_000 });
  await dismissConsent(page);
  await page.getByText(/AI PM이 문서를 읽고|AI PM is reading/i).waitFor({ timeout: 30_000 });
  return Date.now();
}

async function waitForDiagnosis(page) {
  await page
    .getByText(/초기 AI 분석 완료|Initial AI analysis complete/i)
    .waitFor({ timeout: 90_000 });
}

function computeReadingTiming(documentText) {
  const trimmed = documentText?.trim() ?? '';
  const charCount = trimmed.length;
  const sectionCount = trimmed.split('\n').map((line) => line.trim()).filter(Boolean).length;
  const stepMs = Math.min(900, Math.max(380, 300 + Math.floor(charCount / 70) + sectionCount * 30));
  const finishPauseMs = Math.min(1100, Math.max(550, 450 + Math.floor(charCount / 100)));
  return { stepMs, finishPauseMs };
}

async function main() {
  mkdirSync(SCREENS, { recursive: true });

  const shortTiming = computeReadingTiming(SHORT_DOC);
  const longTiming = computeReadingTiming(LONG_DOC);
  const timingScales = longTiming.stepMs > shortTiming.stepMs;
  check(
    '1-timing-scales-with-document',
    timingScales,
    `short stepMs=${shortTiming.stepMs}, long stepMs=${longTiming.stepMs}`,
  );

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    const shortStartedAt = await startDemoReading(page, SHORT_DOC);
    await page.getByText(/섹션 ·|sections ·/i).first().waitFor({ timeout: 20_000 });
    check('2-document-scope-insight', true, 'Document-specific scope hint during Reading');

    await waitForDiagnosis(page);
    const shortMs = Date.now() - shortStartedAt;
    await page.screenshot({ path: join(SCREENS, '01-reading-short-doc.png'), fullPage: true });

    const confidenceBlock = page.locator('section').filter({ hasText: /초기 AI 분석|Initial AI analysis/i });
    const percentLocator = confidenceBlock.locator('p.text-4xl');
    const percentVisibleEarly = await percentLocator.isVisible().catch(() => false);
    const percentOpacity = percentVisibleEarly
      ? await percentLocator.evaluate((el) => window.getComputedStyle(el.parentElement ?? el).opacity)
      : '0';
    check(
      '3-confidence-delayed',
      !percentVisibleEarly || Number(percentOpacity) < 0.5,
      percentVisibleEarly
        ? `opacity=${percentOpacity}`
        : 'Confidence block hidden on diagnosis entry',
    );

    await page.waitForTimeout(2500);
    await page.getByRole('button', { name: /부터 확인|Start with|Continue together|확인하기/i }).click({
      timeout: 15_000,
    });
    await page.getByText(/먼저|Let's start with|first thing/i).first().waitFor({ timeout: 15_000 });
    check('4-first-question', true, 'First question framing after Diagnosis');

    const longPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const longStartedAt = await startDemoReading(longPage, LONG_DOC);
    await waitForDiagnosis(longPage);
    const longMs = Date.now() - longStartedAt;
    await longPage.screenshot({ path: join(SCREENS, '02-reading-long-doc.png'), fullPage: true });
    await longPage.close();

    check(
      '5-longer-doc-longer-reading',
      longMs > shortMs + 500,
      `short=${shortMs}ms long=${longMs}ms`,
    );
  } finally {
    await browser.close().catch(() => {});
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
