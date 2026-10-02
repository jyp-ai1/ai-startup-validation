#!/usr/bin/env node
/**
 * Phase ② — Real Business Review session trace (Production, authenticated).
 * Requires QA_AUTH_STORAGE_STATE_PATH or apps/web/.qa-auth/storageState.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

import { mapLoopTurnToPhase2Trace } from '../lib/ai-pm-accuracy/map-real-business-turn-trace.mjs';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(webRoot, '../..');
const storageDefault = path.join(webRoot, '.qa-auth/storageState.json');
const storagePath = process.env.QA_AUTH_STORAGE_STATE_PATH || storageDefault;
const PRODUCTION_URL =
  process.env.PRODUCTION_URL ?? 'https://ai-startup-validation-tau.vercel.app';
const MAX_TURNS = Number(process.env.REAL_BUSINESS_REVIEW_MAX_TURNS ?? '12');

const outDir = path.resolve(
  webRoot,
  '../../docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/PRODUCTION',
);
const outFile = path.join(outDir, 'real-business-review-trace.json');

const BUSINESS_DOC = `사업명: ALABOM Phase 2 QA
고객: 동네 1~3호점 F&B 사장 (직접 운영)
문제: 온라인 홍보·리뷰 관리에 시간이 없음
대안: 배달앱, 인스타 직접 운영
수익: 월 매출 약 3천만원, 구독형 SaaS 검토 중`;

/** Longitudinal scripted answers — extend for 20–30 turn runs. */
const SCRIPTED_ANSWERS = [
  '주 고객은 동네 카페·음식점을 직접 운영하는 1~3호점 사장님입니다.',
  '가장 큰 문제는 SNS·리뷰 관리 시간이 없어 신규 유입이 줄었다는 점입니다.',
  '현재 대안은 배달앱 노출과 인스타를 직접 하는 정도입니다.',
  '월 매출은 약 3천만원 수준이고, 순이익은 더 낮습니다.',
  '아마 고객들이 월 구독료를 낼 것 같지만 아직 검증은 안 했습니다.',
  '경쟁사는 지역 마케팅 대행사와 배달앱 광고 상품입니다.',
  '우리 차별점은 AI가 매장 상황을 보고 홍보 문구를 제안한다는 점입니다.',
  '아직 파일럿 매장 2곳에서만 써봤고 전환 데이터는 없습니다.',
  '결제는 카드 자동결제 구독을 생각하고 있습니다.',
  '다음 분기까지 30곳 파일럿이 목표입니다.',
  '규제나 라이선스 이슈는 없습니다.',
  '팀은 대표 1명과 외주 개발 1명입니다.',
];

function gitRev(args) {
  const r = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  return r.stdout?.trim() ?? null;
}

function writeTrace(body) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ status: body.status, outFile, turns: body.turns?.length ?? 0 }, null, 2));
}

function blocked(reason, extra = {}) {
  writeTrace({
    status: 'BLOCKED',
    phase: 2,
    sessionId: null,
    productionUrl: PRODUCTION_URL,
    gitSha: gitRev(['rev-parse', 'HEAD']),
    startedAt: null,
    finishedAt: new Date().toISOString(),
    turns: [],
    finalKnowledgeState: null,
    reasoning: null,
    judgment: null,
    uncertainty: null,
    nextValidation: null,
    blockReason: reason,
    nextStep: 'Provide valid storageState → re-run pnpm evidence:real-business-review',
    ...extra,
  });
}

function projectIdFromUrl(url) {
  try {
    return new URL(url).searchParams.get('project');
  } catch {
    return null;
  }
}

async function readLoopSnapshot(page, projectId) {
  return page.evaluate((pid) => {
    const key = pid ? `launchlens.aiPmLoop.${pid}` : 'launchlens.aiPmLoop';
    const raw = sessionStorage.getItem(key);
    if (!raw) return { loop: null, lastTurn: null };
    let loop;
    try {
      loop = JSON.parse(raw);
    } catch {
      return { loop: null, lastTurn: null };
    }
    const turns = Array.isArray(loop.turns) ? loop.turns : [];
    const last = turns.length ? turns[turns.length - 1] : null;
    return {
      loop: {
        phase: loop.phase,
        currentIssueId: loop.currentIssueId,
        gapState: loop.gapState ?? null,
        turnCount: turns.length,
      },
      lastTurn: last,
    };
  }, projectId);
}

async function dismissCookie(page) {
  const reject = page.getByRole('button', { name: /거부/i });
  if ((await reject.count()) > 0) await reject.first().click({ timeout: 3000 }).catch(() => {});
}

async function startBusinessReview(page) {
  await page.goto(`${PRODUCTION_URL}/workspace`, { waitUntil: 'domcontentloaded' });
  await dismissCookie(page);
  if (page.url().includes('/auth/login')) {
    throw new Error('storageState expired — redirected to /auth/login');
  }

  await page.getByRole('button', { name: /새 프로젝트|New project/i }).click({ timeout: 20_000 });
  await page.waitForURL(/project=/, { timeout: 45_000 });
  const projectId = projectIdFromUrl(page.url());

  const paste = page.locator('#workspace-doc-paste');
  if ((await paste.count()) > 0) {
    await paste.fill(BUSINESS_DOC);
    await page.getByRole('button', { name: /AI Read|분석/i }).click();
    await page.getByText(/문서를 읽었습니다|읽었습니다/i).first().waitFor({ timeout: 90_000 });
  }

  await page.getByRole('button', { name: /맞습니다|하나씩/i }).first().click({ timeout: 15_000 }).catch(() => {});
  await page.getByRole('button', { name: /검토 결과를 보고/i }).click({ timeout: 15_000 }).catch(() => {});
  await page.getByRole('button', { name: /이 기준으로 검토하기/i }).click({ timeout: 15_000 }).catch(() => {});
  await page.getByRole('button', { name: /검토 시작/i }).click({ timeout: 20_000 });
  await page.locator('#ai-pm-loop').waitFor({ timeout: 90_000 });

  return projectId;
}

async function captureTurn(page, projectId, turnIndex, userAnswer) {
  const questionEl = page.locator('#ai-pm-loop').getByRole('heading').first();
  const questionText =
    (await questionEl.textContent({ timeout: 5000 }).catch(() => null))?.trim() ?? '';

  const textarea = page.locator('#ai-pm-loop textarea').first();
  await textarea.waitFor({ state: 'visible', timeout: 30_000 });
  await textarea.fill(userAnswer);
  await page.locator('[data-testid="submit-answer-cta"]').first().click();

  await page.waitForTimeout(1500);
  await page
    .locator('#ai-pm-loop [data-testid="submit-answer-cta"]:not([disabled])')
    .first()
    .waitFor({ state: 'visible', timeout: 90_000 })
    .catch(() => {});

  const snap = await readLoopSnapshot(page, projectId);

  return mapLoopTurnToPhase2Trace({
    turn: turnIndex,
    userAnswer,
    questionBefore: questionText,
    lastTurn: snap.lastTurn,
    gapState: snap.loop?.gapState ?? null,
  });
}

async function main() {
  if (!fs.existsSync(storagePath)) {
    blocked(
      'Missing QA_AUTH_STORAGE_STATE_PATH or apps/web/.qa-auth/storageState.json — Real Business Review trace requires authenticated Production session.',
    );
    process.exit(0);
  }

  const startedAt = new Date().toISOString();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storagePath });
  const page = await context.newPage();
  const turns = [];
  let projectId = null;
  let captureError = null;
  let finalSnap = null;

  try {
    projectId = await startBusinessReview(page);
    const answers = SCRIPTED_ANSWERS.slice(0, MAX_TURNS);
    for (let i = 0; i < answers.length; i += 1) {
      turns.push(await captureTurn(page, projectId, i + 1, answers[i]));
    }
    finalSnap = await readLoopSnapshot(page, projectId);
  } catch (e) {
    captureError = e instanceof Error ? e.message : String(e);
  } finally {
    await context.storageState({ path: storagePath }).catch(() => {});
    await browser.close();
  }

  if (captureError && turns.length === 0) {
    blocked(`Authenticated session present but capture failed: ${captureError}`, {
      storageStatePath: storagePath,
    });
    process.exit(1);
  }

  writeTrace({
    status: captureError ? 'PARTIAL' : 'CAPTURED',
    phase: 2,
    sessionId: projectId,
    productionUrl: PRODUCTION_URL,
    gitSha: gitRev(['rev-parse', 'HEAD']),
    storageStatePath: storagePath,
    startedAt,
    finishedAt: new Date().toISOString(),
    turns,
    finalKnowledgeState: finalSnap?.loop ?? null,
    reasoning: null,
    judgment: null,
    uncertainty: captureError ? [captureError] : null,
    nextValidation: [
      'CPO Layer 1–3 review on turn trace',
      'Extend to 20–30 turns for longitudinal gate',
    ],
    blockReason: captureError ?? undefined,
  });

  process.exit(captureError ? 1 : 0);
}

main().catch((e) => {
  blocked(String(e));
  process.exit(1);
});
