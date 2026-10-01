/**
 * P0-3 Production E2E — Scenario A (Demo custom/edit) + C (loop forward, no rollback).
 *
 * Usage: cd apps/web && node scripts/production-p0-3-demo-ac.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVIDENCE = path.join(__dirname, '..', '..', '..', 'docs', 'evidence', 'ALABOM', 'P0-3-production');
fs.mkdirSync(EVIDENCE, { recursive: true });

const BASE = process.env.PRODUCTION_URL ?? 'https://ai-startup-validation-tau.vercel.app';
const EXPECTED_SHA = process.env.EXPECTED_PRODUCTION_SHA?.trim() || '';

const CEO_DOC = `사업명: 소상공인 매장 홍보 자동화 서비스

고객: 지역 소상공인
문제: 온라인 홍보를 직접 할 시간과 전문성이 부족함
해결방향: 매장 정보를 입력하면 SNS 홍보 콘텐츠를 자동 생성하고 게시를 지원`;

const SMARTPM_MARK = '스마트PM';

const report = {
  gate: 'P0-3-A-C',
  at: new Date().toISOString(),
  baseUrl: BASE,
  productionSha: '',
  expectedSha: EXPECTED_SHA,
  shaMatch: null,
  scenarioA: { pass: false, notes: [] },
  scenarioC: { pass: false, notes: [], firstQuestion: '', secondQuestion: '' },
  verdict: 'PENDING',
};

async function fetchProductionSha() {
  try {
    const res = await fetch(`${BASE}/api/health`);
    const json = await res.json();
    return json?.data?.commit ?? '';
  } catch {
    return '';
  }
}

async function dismissCookies(page) {
  for (let i = 0; i < 5; i++) {
    const accept = page.getByRole('button', { name: /분석 수락|수락|Accept/i });
    if (await accept.first().isVisible().catch(() => false)) {
      await accept.first().click({ force: true });
      await page.waitForTimeout(400);
      return;
    }
    await page.waitForTimeout(250);
  }
}

async function startDemoCustom(page) {
  await page.goto(`${BASE}/demo/start`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(800);
  await dismissCookies(page);
  await page.getByRole('button', { name: /내 사업 문서로 체험하기/i }).click();
  await page.waitForTimeout(400);
  await page.locator('textarea').fill(CEO_DOC);
  await page.getByRole('button', { name: /AI Read 시작/i }).click();
  await page.waitForURL(/\/workspace\?.*demo=guided.*sample=custom/, { timeout: 60_000 });
  await page.waitForTimeout(1500);
  await dismissCookies(page);
}

async function reachUnderstandingConfirm(page) {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    await dismissCookies(page);
    const confirm = page.getByRole('button', { name: /✓ 맞습니다(?! —)/ });
    if (await confirm.first().isVisible().catch(() => false)) return true;
    const trustContinue = page.getByRole('button', {
      name: /답변으로 같이 정리하기|같이 확인|계속하기|Continue/i,
    });
    if (await trustContinue.first().isVisible().catch(() => false)) {
      await trustContinue.first().click({ force: true });
      await page.waitForTimeout(1200);
      continue;
    }
    const startAi = page.getByRole('button', { name: /AI PM과 시작하기/i });
    if (await startAi.isVisible().catch(() => false)) {
      await startAi.click({ force: true });
      await page.waitForTimeout(1500);
      continue;
    }
    await page.waitForTimeout(800);
  }
  return false;
}

async function waitForPmAskSurface(page) {
  const started = Date.now();
  while (Date.now() - started < 90_000) {
    if (await page.getByTestId('ai-pm-simple-question').isVisible().catch(() => false)) return;
    if (await page.getByTestId('ai-pm-focused-surface').isVisible().catch(() => false)) return;
    if (await page.getByTestId('s11-surface').isVisible().catch(() => false)) return;
    await page.waitForTimeout(300);
  }
  throw new Error('PM ask surface not visible');
}

async function readSurfaceQuestion(page) {
  const simple = page.getByTestId('ai-pm-simple-question');
  if (await simple.isVisible().catch(() => false)) {
    return (await page.getByTestId('simple-question-text').innerText()).trim();
  }
  const focused = page.getByTestId('ai-pm-focused-surface');
  if (await focused.isVisible().catch(() => false)) {
    const prompt = page.getByTestId('focused-confirm-prompt');
    const line = prompt.locator('p.font-medium').last();
    if (await line.isVisible().catch(() => false)) return (await line.innerText()).trim();
    return (await prompt.innerText()).trim();
  }
  const ceo = page.getByTestId('ceo-surface-next-question');
  if (await ceo.isVisible().catch(() => false)) {
    return (await ceo.innerText()).trim().replace(/^다음\s*질문\s*/i, '').trim();
  }
  return '';
}

async function advanceToOpenAnswerSurface(page) {
  for (let i = 0; i < 5; i += 1) {
    const textarea = page.locator('textarea').last();
    if (await textarea.isVisible().catch(() => false)) return true;
    const yes = page.getByTestId('confirm-yes-cta');
    if (await yes.isVisible().catch(() => false)) {
      await yes.click({ force: true });
      await page.waitForTimeout(1200);
      const thinking = page.getByTestId('ai-pm-thinking-stages');
      if (await thinking.isVisible().catch(() => false)) {
        await thinking.waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => null);
      }
      continue;
    }
    const cont = page.getByRole('button', { name: /같이 확인|계속|Continue/i });
    if (await cont.first().isVisible().catch(() => false)) {
      await cont.first().click({ force: true });
      await page.waitForTimeout(900);
      continue;
    }
    break;
  }
  return page.locator('textarea').last().isVisible().catch(() => false);
}

async function submitAnswer(page, text) {
  await advanceToOpenAnswerSurface(page);
  const box = page.locator('textarea').last();
  if (!(await box.isVisible().catch(() => false))) return false;
  await box.fill(text);
  const submit = page.getByTestId('submit-answer-cta');
  if (!(await submit.isEnabled().catch(() => false))) return false;
  await submit.click({ force: true });
  const thinking = page.getByTestId('ai-pm-thinking-stages');
  if (await thinking.isVisible().catch(() => false)) {
    await thinking.waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => null);
  }
  await page.waitForTimeout(1500);
  return true;
}

async function run() {
  report.productionSha = await fetchProductionSha();
  if (EXPECTED_SHA) {
    report.shaMatch = report.productionSha.startsWith(EXPECTED_SHA.slice(0, 7));
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await startDemoCustom(page);
    const bodyAfterStart = await page.locator('body').innerText();
    if (bodyAfterStart.includes(SMARTPM_MARK)) {
      report.scenarioA.notes.push('SmartPM visible immediately after custom start');
    } else {
      report.scenarioA.notes.push('No SmartPM after custom start');
    }

    const editBtn = page.getByRole('button', { name: /다시 수정|수정하기|Edit/i });
    if (await editBtn.first().isVisible().catch(() => false)) {
      await editBtn.first().click({ force: true });
      await page.waitForTimeout(800);
      const customerField = page.locator('input, textarea').filter({ hasText: '' }).last();
      const domainInputs = page.locator('[data-testid="edit-understanding-confirm"], input, textarea');
      const customerInput = page.getByLabel(/고객|customer/i).first();
      if (await customerInput.isVisible().catch(() => false)) {
        await customerInput.fill('직원 5명 이하 음식점 운영자');
      } else {
        const textareas = page.locator('textarea');
        const count = await textareas.count();
        if (count > 0) await textareas.nth(Math.min(1, count - 1)).fill('직원 5명 이하 음식점 운영자');
      }
      const apply = page.getByRole('button', { name: /수정|Apply|반영/i });
      if (await apply.first().isVisible().catch(() => false)) {
        await apply.first().click({ force: true });
        await page.waitForTimeout(1000);
      }
      const confirmEdit = page.getByRole('button', { name: /맞습니다|다음으로|confirm/i });
      if (await confirmEdit.first().isVisible().catch(() => false)) {
        await confirmEdit.first().click({ force: true });
        await page.waitForTimeout(1000);
      }
    }

    if (!(await reachUnderstandingConfirm(page))) {
      report.scenarioA.notes.push('FAIL: could not reach Shared Understanding confirm');
      report.verdict = 'FAIL';
      return;
    }

    const bodyBeforeConfirm = await page.locator('body').innerText();
    if (bodyBeforeConfirm.includes(SMARTPM_MARK)) {
      report.scenarioA.notes.push('FAIL: SmartPM before confirm');
    }
    if (!bodyBeforeConfirm.includes('소상공인') && !bodyBeforeConfirm.includes('음식점')) {
      report.scenarioA.notes.push('WARN: CEO/custom tokens weak before confirm');
    }

    await page.screenshot({ path: path.join(EVIDENCE, 'a-before-confirm.png'), fullPage: true });

    const confirm = page.getByRole('button', { name: /✓ 맞습니다(?! —)/ });
    await confirm.first().click({ force: true });
    await page.waitForTimeout(1500);
    await waitForPmAskSurface(page).catch(() => null);
    await advanceToOpenAnswerSurface(page);

    const bodyAfterConfirm = await page.locator('body').innerText();
    await page.screenshot({ path: path.join(EVIDENCE, 'a-after-confirm.png'), fullPage: true });

    if (bodyAfterConfirm.includes(SMARTPM_MARK)) {
      report.scenarioA.notes.push('FAIL: SmartPM after confirm');
      report.scenarioA.pass = false;
    } else {
      report.scenarioA.notes.push('PASS: no SmartPM after confirm');
      report.scenarioA.pass = !report.scenarioA.notes.some((n) => n.startsWith('FAIL'));
    }

    report.scenarioC.firstQuestion = await readSurfaceQuestion(page);
    if (!report.scenarioC.firstQuestion) {
      report.scenarioC.notes.push('WARN: could not read first surface question via testid');
    }

    const submitted = await submitAnswer(
      page,
      '주요 고객은 직원 5명 이하 음식점 운영자입니다. 온라인 홍보 시간이 부족합니다.',
    );
    if (!submitted) {
      report.scenarioC.notes.push('FAIL: could not submit first loop answer');
    } else {
      await waitForPmAskSurface(page).catch(() => null);
      await advanceToOpenAnswerSurface(page);
      report.scenarioC.secondQuestion = await readSurfaceQuestion(page);
      await page.screenshot({ path: path.join(EVIDENCE, 'c-after-first-answer.png'), fullPage: true });

      if (
        report.scenarioC.firstQuestion &&
        report.scenarioC.secondQuestion &&
        report.scenarioC.firstQuestion === report.scenarioC.secondQuestion
      ) {
        report.scenarioC.notes.push('FAIL: same question after answer (rollback?)');
      } else if (report.scenarioC.secondQuestion) {
        report.scenarioC.notes.push('PASS: advanced to a different question');
      } else {
        report.scenarioC.notes.push('WARN: second question not read from surface');
      }
    }

    report.scenarioC.pass =
      !report.scenarioC.notes.some((n) => n.startsWith('FAIL')) &&
      Boolean(report.scenarioC.firstQuestion) &&
      submitted;

    report.scenarioA.pass =
      report.scenarioA.pass &&
      !report.scenarioA.notes.some((n) => n.startsWith('FAIL')) &&
      !bodyAfterConfirm.includes(SMARTPM_MARK);

    report.verdict =
      report.scenarioA.pass && report.scenarioC.pass
        ? 'PASS_CANDIDATE'
        : report.scenarioA.pass || report.scenarioC.pass
          ? 'PARTIAL'
          : 'FAIL';
  } finally {
    await browser.close();
  }

  const outPath = path.join(EVIDENCE, `PRODUCTION-P0-3-${report.verdict}-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(EVIDENCE, 'PRODUCTION-P0-3-LATEST.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.verdict === 'PASS_CANDIDATE' ? 0 : 1);
}

run();
