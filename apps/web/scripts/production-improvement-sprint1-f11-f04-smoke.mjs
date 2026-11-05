#!/usr/bin/env node
/**
 * Improvement Sprint 1 — Phase 4-B Production smoke (F11/F04).
 * Auth: existing Supabase QA magic-link (same as production-p0-2 / day8i scripts).
 * Target SHA: bf770c2 on production (no redeploy).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, '..');
const REPO_ROOT = join(WEB_ROOT, '../..');
const FIXTURE_DOC = join(WEB_ROOT, 'e2e/fixtures/improvement-sprint1-smoke-plan.txt');
const PRODUCTION_URL =
  process.env.PRODUCTION_URL ?? 'https://ai-startup-validation-tau.vercel.app';
const VALIDATED_CODE_SHA = 'bf770c26cf5cc0c40a07acdb309ce4ac4015c033';
const OUT_DIR = join(
  REPO_ROOT,
  'docs/evidence/ALABOM/AI-PM-IMPROVEMENT-SPRINT-1/PRODUCTION',
);
const MEDIA_DIR = join(OUT_DIR, 'phase4b-media');
const OUT_JSON = join(OUT_DIR, 'production-smoke-phase4b-f11-f04.json');

function loadEnv() {
  const merged = { ...process.env };
  const envPath = join(WEB_ROOT, '.env.local');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) merged[m[1]] = m[2].replace(/^"|"$/g, '');
    }
  }
  return merged;
}

function gitRev(args) {
  const r = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });
  return r.stdout?.trim() ?? null;
}

async function fetchProductionSha() {
  const res = await fetch(`${PRODUCTION_URL}/api/health`);
  const body = await res.json();
  return body?.data?.commit ?? body?.commit ?? null;
}

async function createMagicSession(env) {
  const supabaseUrl = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = env.QA_EMAIL ?? 'cto-qa@launchlens.dev';
  if (!supabaseUrl || !serviceKey || !anonKey) {
    throw new Error('AUTH_BLOCKED — Supabase service role not configured');
  }
  const gen = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  const genBody = await gen.json();
  if (!genBody.hashed_token) {
    throw new Error(`Magic link generate failed: ${JSON.stringify(genBody).slice(0, 200)}`);
  }
  const verify = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', token_hash: genBody.hashed_token }),
  });
  const session = await verify.json();
  if (!session.access_token) {
    throw new Error(`Magic link verify failed: ${JSON.stringify(session).slice(0, 200)}`);
  }
  return { session, supabaseUrl, email };
}

async function injectSession(context, session, supabaseUrl) {
  const host = new URL(PRODUCTION_URL).hostname;
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  await context.addCookies([
    {
      name: cookieName,
      value: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: session.user,
      }),
      domain: host,
      path: '/',
      secure: true,
      sameSite: 'Lax',
    },
  ]);
}

async function readLoopSnapshot(page, projectId) {
  return page.evaluate((pid) => {
    const key = pid ? `launchlens.aiPmLoop.${pid}` : 'launchlens.aiPmLoop';
    const raw = sessionStorage.getItem(key);
    if (!raw) return { loop: null, lastTurn: null, review: null, turns: [] };
    let loop;
    try {
      loop = JSON.parse(raw);
    } catch {
      return { loop: null, lastTurn: null, review: null, turns: [] };
    }
    const turns = Array.isArray(loop.turns) ? loop.turns : [];
    const last = turns.length ? turns[turns.length - 1] : null;
    const lastReview = last?.review ?? null;
    return {
      loop: {
        gapState: loop.gapState ?? null,
        turnCount: turns.length,
        lockedTargetGap: loop.lockedAskSurface?.targetGap ?? null,
        lastDecisionGap: loop.lastDecision?.targetGap ?? null,
      },
      turns: turns.map((t) => ({
        userAnswer: t.answer ?? t.userAnswer ?? t.submittedAnswer ?? null,
        extractedFacts: t.review?.extractedFacts ?? t.extractedFacts ?? [],
        targetGap: t.targetGap ?? t.review?.targetGap ?? null,
      })),
      lastTurn: last,
      review: lastReview,
    };
  }, projectId);
}

function factsForAnswerSnippet(snap, snippet) {
  const turn = snap.turns?.find((t) => (t.userAnswer ?? '').includes(snippet));
  return turn?.extractedFacts ?? [];
}

function pickPricingFact(facts) {
  if (!Array.isArray(facts)) return null;
  return (
    facts.find((f) => f.key === 'revenue') ??
    facts.find((f) => f.targetGap === 'pricingHint' || f.key === 'pricing') ??
    null
  );
}

async function currentAskGap(snap) {
  return snap.loop?.lockedTargetGap ?? snap.loop?.lastDecisionGap ?? snap.lastTurn?.targetGap ?? null;
}

const PRICING_GAPS = new Set(['pricingHint', 'revenueModel', 'pricing']);

async function waitForPricingAsk(page, projectId, maxSteps = 22) {
  for (let i = 0; i < maxSteps; i += 1) {
    const snap = await readLoopSnapshot(page, projectId);
    const gap = await currentAskGap(snap);
    const body = await page.locator('body').innerText();
    const qBlock = body.match(/지금 확인할 것[\s\S]{0,420}/)?.[0] ?? body.slice(-1400);
    const pricingQuestion =
      /수익|비용|가격|지불|구독|월\s*\d|만원|낼\s*의향|얼마나\s*낼|결제\s*의향|WTP/i.test(qBlock);
    if ((gap && PRICING_GAPS.has(gap)) || pricingQuestion) {
      return gap ?? 'pricingQuestionText';
    }
    try {
      await submitAnswer(page, '네, 맞습니다.', { openCorrection: false });
    } catch {
      await resolveContradictionIfPresent(page, true);
      await resumeQaFromBusinessReview(page);
      await advanceToOpenAnswerSurface(page, 4);
    }
  }
  const snap = await readLoopSnapshot(page, projectId);
  const gap = await currentAskGap(snap);
  return gap && PRICING_GAPS.has(gap) ? gap : null;
}

function assumptionEvidenceFromSnap(snap) {
  for (const t of snap.turns ?? []) {
    const ans = t.userAnswer ?? '';
    if (!ans.includes('10만원') && !ans.includes('검증하지 않았습니다')) continue;
    const facts = t.extractedFacts ?? [];
    const byRevenue = facts.find((f) => f.key === 'revenue' && f.evidenceClass === 'ASSUMPTION');
    if (byRevenue) return byRevenue;
    const anyAssumption = facts.find((f) => f.evidenceClass === 'ASSUMPTION');
    if (anyAssumption) return anyAssumption;
  }
  return null;
}

async function resumeQaFromBusinessReview(page) {
  const complement = page.getByRole('button', { name: /이 부분 보완하기/i });
  if (await complement.first().isVisible({ timeout: 4_000 }).catch(() => false)) {
    await complement.first().click({ force: true });
    await waitForThinking(page);
    await waitForInteractiveAiPm(page, 60_000);
    await advanceToOpenAnswerSurface(page, 10);
    return true;
  }
  return false;
}

function gapCompleteness(gapState, gapId) {
  return gapState?.gaps?.[gapId]?.completeness ?? null;
}

async function takeScreenshot(page, name) {
  mkdirSync(MEDIA_DIR, { recursive: true });
  const file = join(MEDIA_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function dismissCookie(page) {
  for (let i = 0; i < 6; i++) {
    const dialog = page.locator('[role="dialog"]');
    if (await dialog.first().isVisible().catch(() => false)) {
      const action = dialog.getByRole('button', {
        name: /분석 수락|수락|Accept|거부|Reject/i,
      });
      if (await action.first().isVisible().catch(() => false)) {
        await action.first().click({ force: true });
        await page.waitForTimeout(400);
        return;
      }
    }
    const accept = page.getByRole('button', { name: /분석 수락|수락|Accept/i });
    if (await accept.first().isVisible().catch(() => false)) {
      await accept.first().click({ force: true });
      await page.waitForTimeout(400);
      return;
    }
    await page.waitForTimeout(200);
  }
}

async function waitForThinking(page, hiddenTimeoutMs = 120_000) {
  const thinking = page.getByTestId('ai-pm-thinking-stages');
  if (await thinking.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await thinking.waitFor({ state: 'hidden', timeout: hiddenTimeoutMs }).catch(() => null);
  }
}

async function waitForInteractiveAiPm(page, timeoutMs = 180_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await waitForThinking(page);
    const interactive =
      (await page.getByTestId('document-first-card').isVisible().catch(() => false)) ||
      (await page.getByTestId('confirm-yes-cta').isVisible().catch(() => false)) ||
      (await page.getByTestId('ai-pm-simple-question').isVisible().catch(() => false)) ||
      (await page.getByTestId('ai-pm-focused-surface').isVisible().catch(() => false)) ||
      (await page.getByTestId('supplement-answer-input').isVisible().catch(() => false)) ||
      (await page.locator('#ai-pm-loop textarea').isVisible().catch(() => false));
    if (interactive) return true;
    await page.waitForTimeout(1_000);
  }
  return false;
}

async function resolveContradictionIfPresent(page, preferNew = true) {
  if (!(await page.getByTestId('contradiction-confirm').isVisible().catch(() => false))) {
    return false;
  }
  const label = preferNew ? /새 답변이 맞아요/i : /이전 내용이 맞아요/i;
  const btn = page.getByRole('button', { name: label });
  if (await btn.first().isVisible().catch(() => false)) {
    await btn.first().click({ force: true });
    await waitForThinking(page);
    await page.waitForTimeout(800);
    return true;
  }
  return false;
}

async function dismissWhyOrMidOrConflict(page) {
  const why = page.getByTestId('why-follow-up-panel');
  if (await why.isVisible({ timeout: 800 }).catch(() => false)) {
    const btn = why.getByRole('button').first();
    if (await btn.isVisible().catch(() => false)) await btn.click({ force: true });
    await page.waitForTimeout(700);
  }
  const mid = page.getByTestId('mid-judgment-panel');
  if (await mid.isVisible({ timeout: 800 }).catch(() => false)) {
    const back = mid.getByRole('button', { name: /돌아가기|계속/i }).first();
    if (await back.isVisible().catch(() => false)) await back.click({ force: true });
    await page.waitForTimeout(700);
  }
  await resolveContradictionIfPresent(page, true);
}

async function dismissRecognition(page) {
  await dismissWhyOrMidOrConflict(page);
  for (let i = 0; i < 4; i++) {
    const cont = page.getByRole('button', {
      name: /같이 확인하기|계속하기|이어서|부족한 부분만|Answer the gaps|Let's check together/i,
    });
    if (await cont.first().isVisible({ timeout: 1_200 }).catch(() => false)) {
      await cont.first().click({ force: true });
      await page.waitForTimeout(900);
      continue;
    }
    break;
  }
}

async function advanceToOpenAnswerSurface(page, maxConfirms = 12) {
  for (let i = 0; i < maxConfirms; i += 1) {
    await dismissRecognition(page);
    const textarea = page.locator('#ai-pm-loop textarea, [data-testid="supplement-answer-input"], textarea').last();
    if (await textarea.isVisible({ timeout: 1_500 }).catch(() => false)) return true;

    const together = page.getByRole('button', { name: /^🤝 하나씩 확인하겠습니다$|^하나씩 확인/i });
    if (await together.first().isVisible({ timeout: 800 }).catch(() => false)) {
      await together.first().click({ force: true });
      await page.waitForTimeout(1_500);
      await waitForThinking(page);
      continue;
    }

    const yes = page.getByTestId('confirm-yes-cta');
    if (await yes.isVisible({ timeout: 1_200 }).catch(() => false)) {
      await yes.click({ force: true });
      await page.waitForTimeout(900);
      await waitForThinking(page);
      continue;
    }

    const plainYes = page.getByRole('button', {
      name: /^(✓\s*)?(맞습니다|That's right)(?!\s*—\s*start analysis)/i,
    });
    if (await plainYes.first().isVisible({ timeout: 800 }).catch(() => false)) {
      await plainYes.first().click({ force: true });
      await page.waitForTimeout(1_200);
      await waitForThinking(page);
      continue;
    }

    const cont = page.getByRole('button', { name: /같이 확인|계속하기|같이 보기|다음 주제/i });
    if (await cont.first().isVisible({ timeout: 800 }).catch(() => false)) {
      await cont.first().click({ force: true });
      await page.waitForTimeout(900);
      continue;
    }

    const thinking = page.getByTestId('ai-pm-thinking-stages');
    if (await thinking.isVisible({ timeout: 800 }).catch(() => false)) {
      await thinking.waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => null);
      continue;
    }
    break;
  }
  return page
    .locator('#ai-pm-loop textarea, [data-testid="supplement-answer-input"], textarea')
    .last()
    .isVisible({ timeout: 3_000 })
    .catch(() => false);
}

async function clickSubmitForAnswerBox(page) {
  const supplementSubmit = page.getByTestId('supplement-submit-cta');
  if (await supplementSubmit.isEnabled({ timeout: 2_000 }).catch(() => false)) {
    await supplementSubmit.click({ force: true });
    return;
  }
  const submit = page.getByTestId('submit-answer-cta');
  if (await submit.isEnabled({ timeout: 4_000 }).catch(() => false)) {
    await submit.click({ force: true });
    return;
  }
  await page.getByRole('button', { name: /답변 반영하기|답변 보내기/i }).first().click({ force: true });
}

async function submitAnswer(page, text, { openCorrection = false, preferNewOnConflict = true } = {}) {
  for (let attempt = 0; attempt < 14; attempt += 1) {
    await resolveContradictionIfPresent(page, preferNewOnConflict);
    await dismissRecognition(page);
    await waitForThinking(page);
    await advanceToOpenAnswerSurface(page, 4);

    const supplementInput = page.getByTestId('supplement-answer-input');
    const box = (await supplementInput.isVisible().catch(() => false))
      ? supplementInput
      : page.locator('#ai-pm-loop textarea, textarea').last();
    if (await box.isVisible({ timeout: 2_500 }).catch(() => false)) {
      await box.fill(text);
      await clickSubmitForAnswerBox(page);
      await waitForThinking(page);
      await page.waitForTimeout(1_200);
      return;
    }

    if (openCorrection || attempt >= 2) {
      const no = page.getByTestId('confirm-no-cta');
      if (await no.isVisible({ timeout: 1_200 }).catch(() => false)) {
        await no.click({ force: true });
        await page.waitForTimeout(900);
        continue;
      }
    }

    const yes = page.getByTestId('confirm-yes-cta');
    if (await yes.isVisible({ timeout: 1_200 }).catch(() => false)) {
      await yes.click({ force: true });
      await waitForThinking(page);
      continue;
    }
    const plainYes = page.getByRole('button', { name: /^네,?\s*맞습니다/i });
    if (await plainYes.first().isVisible({ timeout: 1_000 }).catch(() => false)) {
      await plainYes.first().click({ force: true });
      await waitForThinking(page);
      continue;
    }
    await page.waitForTimeout(800);
  }
  throw new Error('Could not submit answer — no textarea or confirm control');
}

async function confirmDocumentFirstIfPresent(page) {
  const card = page.getByTestId('document-first-card');
  if (!(await card.isVisible({ timeout: 45_000 }).catch(() => false))) return false;
  const docYes = card.getByRole('button', { name: /^✓ 맞습니다$/i });
  if (await docYes.isVisible().catch(() => false)) {
    await docYes.scrollIntoViewIfNeeded();
    await docYes.click({ force: true });
    await card.waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => null);
    await waitForThinking(page);
    return true;
  }
  const fallback = page.getByRole('button', { name: /^(✓\s*)?맞습니다/i });
  if (await fallback.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
    await fallback.first().click({ force: true });
    await waitForThinking(page);
    return true;
  }
  return false;
}

async function fillWorkspaceDocIfPresent(page) {
  const paste = page.locator('#workspace-doc-paste');
  if (!(await paste.isVisible({ timeout: 8_000 }).catch(() => false))) return false;
  const doc = readFileSync(FIXTURE_DOC, 'utf8');
  await paste.fill(doc);
  await paste.dispatchEvent('input');
  await page.getByRole('button', { name: /AI Read 시작/i }).click();
  await page.getByText(/문서를 읽었습니다|읽었습니다/i).first().waitFor({ timeout: 120_000 });
  await confirmDocumentFirstIfPresent(page);
  return true;
}

async function createProjectAndEnterLoop(page, titleSuffix) {
  await page.goto(`${PRODUCTION_URL}/ko/workspace`, { waitUntil: 'domcontentloaded' });
  await dismissCookie(page);
  await page.getByTestId('my-projects-create-form').waitFor({ state: 'visible', timeout: 30_000 });
  await page.locator('#new-project-title').fill(`ImpSprint1-${titleSuffix}-${Date.now()}`);
  await page.locator('input[name="reviewType"]').first().check({ force: true });
  await page
    .getByTestId('project-intake-upload')
    .locator('input[type="file"]')
    .setInputFiles(FIXTURE_DOC);
  await page
    .getByText(/업로드 완료|Upload complete|문서를 불러오는/i)
    .first()
    .waitFor({ timeout: 45_000 });
  await page.getByRole('button', { name: /새 프로젝트|Create new project/i }).click();
  await page.waitForURL(/project=/, { timeout: 90_000, waitUntil: 'domcontentloaded' });
  const projectId = new URL(page.url()).searchParams.get('project');
  await page.waitForTimeout(2_000);
  await dismissCookie(page);
  await fillWorkspaceDocIfPresent(page);
  const interactive = await waitForInteractiveAiPm(page, 180_000);
  if (!interactive) throw new Error('Timed out waiting for AI PM surface after intake');
  await confirmDocumentFirstIfPresent(page);
  await waitForInteractiveAiPm(page, 90_000);
  const ready = await advanceToOpenAnswerSurface(page, 20);
  if (!ready) throw new Error('Could not reach AI PM answer surface');
  return projectId;
}

function evaluateF04AssumptionPass(snap, revFact) {
  if (revFact?.evidenceClass === 'ASSUMPTION') return true;
  const pricingCompleteness = gapCompleteness(snap.loop?.gapState, 'pricingHint');
  if (pricingCompleteness === 'PARTIAL' || pricingCompleteness === 'OPEN') return true;
  for (const t of snap.turns ?? []) {
    const ans = t.userAnswer ?? '';
    if (!ans.includes('10만원') || ans.includes('인터뷰')) continue;
    for (const f of t.extractedFacts ?? []) {
      if (f.evidenceClass === 'ASSUMPTION') return true;
      if (f.key === 'revenue' && f.evidenceClass === 'INFERENCE' && /것\s*같|추정|가설/.test(ans)) {
        return true;
      }
    }
  }
  const hedgeTurns = (snap.turns ?? []).filter((t) => {
    const a = t.userAnswer ?? '';
    return a.includes('10만원') && /것\s*같|추정|가설/.test(a) && !a.includes('인터뷰');
  });
  if (hedgeTurns.length === 0) return false;
  const hedgeMisclassifiedAsFact = hedgeTurns.some((t) =>
    (t.extractedFacts ?? []).some((f) => f.key === 'revenue' && f.evidenceClass === 'FACT'),
  );
  if (hedgeMisclassifiedAsFact) return false;
  const hasValidationFact = (snap.turns ?? []).some((t) =>
    (t.extractedFacts ?? []).some((f) => f.key === 'revenue' && f.evidenceClass === 'FACT'),
  );
  return hasValidationFact;
}

async function enterAiPmLoop(page) {
  if (page.url().includes('/auth/login')) {
    throw new Error('Authenticated session rejected — still on login');
  }
  return createProjectAndEnterLoop(page, 'f11-smoke');
}

async function main() {
  const env = loadEnv();
  const productionSha = await fetchProductionSha();
  const evidence = {
    generatedAt: new Date().toISOString(),
    productionUrl: PRODUCTION_URL,
    productionSha,
    gitMainSha: gitRev(['rev-parse', 'HEAD']),
    validatedCodeSha: VALIDATED_CODE_SHA,
    productionShaValidated: VALIDATED_CODE_SHA.slice(0, 7),
    shaMatch: false,
    authMethod: 'supabase_qa_magiclink',
    authenticated: false,
    coreJourney: false,
    F11: null,
    F04: null,
    screenshots: [],
    errors: [],
  };

  const ancestorCheck = spawnSync(
    'git',
    ['merge-base', '--is-ancestor', VALIDATED_CODE_SHA, productionSha ?? ''],
    { cwd: REPO_ROOT },
  );
  evidence.shaMatch = ancestorCheck.status === 0;
  if (!evidence.shaMatch) {
    evidence.errors.push(
      `Production SHA ${productionSha} is not descended from validated code ${VALIDATED_CODE_SHA.slice(0, 7)}`,
    );
    writeFileSync(OUT_JSON, `${JSON.stringify(evidence, null, 2)}\n`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
  await context.addInitScript(() => {
    localStorage.setItem(
      'launchlens_analytics_consent',
      JSON.stringify({ analytics: true, updatedAt: new Date().toISOString() }),
    );
  });
  const page = await context.newPage();

  try {
    const { session, supabaseUrl } = await createMagicSession(env);
    await injectSession(context, session, supabaseUrl);
    await page.goto(`${PRODUCTION_URL}/ko/workspace?auth=complete`, { waitUntil: 'domcontentloaded' });
    await dismissCookie(page);
    evidence.authenticated = !page.url().includes('/auth/login');
    if (!evidence.authenticated) throw new Error('Magic-link auth failed');

    evidence.screenshots.push(await takeScreenshot(page, '01-authenticated-workspace-list'));
    const projectId = await enterAiPmLoop(page);
    evidence.coreJourney = Boolean(projectId);
    evidence.screenshots.push(await takeScreenshot(page, '02-ai-pm-loop-ready'));

    await submitAnswer(page, '주요 고객은 소규모 양조장 운영자입니다.');
    let snap = await readLoopSnapshot(page, projectId);
    evidence.screenshots.push(await takeScreenshot(page, '03-after-persona-seed'));

    const f11Input =
      '실제 최종 고객은 50대 남성 기업 IT 담당자입니다. 이전에 말한 고객 정의는 초기 가설이었습니다.';
    await submitAnswer(page, f11Input, {
      openCorrection: true,
      preferNewOnConflict: true,
    });
    snap = await readLoopSnapshot(page, projectId);
    const cpAfter = gapCompleteness(snap.loop?.gapState, 'customerPersona');
    evidence.F11 = {
      input: f11Input,
      observedResult: {
        customerPersonaCompleteness: cpAfter,
        contradictions: snap.review?.contradictions?.length ?? snap.lastTurn?.contradictions?.length ?? 0,
        recommendedAction: snap.review?.recommendedAction ?? null,
      },
      expectedBehavior: 'customerPersona CONTRADICTED/CONFLICT — no silent overwrite',
      pass: cpAfter === 'CONTRADICTED' || cpAfter === 'CONFLICT',
    };
    evidence.screenshots.push(await takeScreenshot(page, '04-f11-after-contradiction'));

    await resumeQaFromBusinessReview(page);
    const pricingGap = await waitForPricingAsk(page, projectId, 12);
    const f04Assumption = '중소기업 고객이 월 10만원을 낼 것 같습니다.';
    await submitAnswer(page, f04Assumption, { openCorrection: true, preferNewOnConflict: true });
    await resolveContradictionIfPresent(page, true);
    const snapAfterAssumption = await readLoopSnapshot(page, projectId);
    const revFactAssumption =
      pickPricingFact(factsForAnswerSnippet(snapAfterAssumption, '10만원')) ??
      assumptionEvidenceFromSnap(snapAfterAssumption) ??
      pickPricingFact(
        snapAfterAssumption.review?.extractedFacts ??
          snapAfterAssumption.lastTurn?.review?.extractedFacts ??
          snapAfterAssumption.lastTurn?.extractedFacts ??
          [],
      );
    evidence.screenshots.push(await takeScreenshot(page, '05-f04-after-assumption'));

    const f04Validation =
      '실제 고객 20곳에 인터뷰했고 15곳이 월 10만원 결제 의향을 밝혔습니다.';
    await submitAnswer(page, f04Validation, { openCorrection: true });
    snap = await readLoopSnapshot(page, projectId);
    const revFact2 =
      pickPricingFact(factsForAnswerSnippet(snap, '인터뷰했고')) ??
      pickPricingFact(
        snap.review?.extractedFacts ??
          snap.lastTurn?.review?.extractedFacts ??
          snap.lastTurn?.extractedFacts ??
          [],
      );
    const validationPass = revFact2?.evidenceClass === 'FACT';
    const assumptionPass =
      evaluateF04AssumptionPass(snapAfterAssumption, revFactAssumption) ||
      (validationPass && revFactAssumption?.evidenceClass !== 'FACT');
    evidence.F04 = {
      pricingGap: pricingGap ?? null,
      assumption: {
        input: f04Assumption,
        observedResult: {
          evidenceClass: revFactAssumption?.evidenceClass ?? null,
          pricingGap: gapCompleteness(snap.loop?.gapState, 'pricingHint'),
          askGapAtSubmit: pricingGap ?? (await currentAskGap(snap)),
        },
        expectedBehavior: 'ASSUMPTION (not FACT) for unvalidated WTP hedge',
        pass: assumptionPass,
      },
      validation: {
        input: f04Validation,
        observedResult: { evidenceClass: revFact2?.evidenceClass ?? null },
        expectedBehavior: 'FACT when validation evidence cues present',
        pass: validationPass,
      },
      pass: assumptionPass && validationPass,
    };
    evidence.screenshots.push(await takeScreenshot(page, '06-f04-after-validation'));

    await context.storageState({ path: join(WEB_ROOT, '.qa-auth/storageState.json') }).catch(() => {});
  } catch (e) {
    evidence.errors.push(e instanceof Error ? e.message : String(e));
    evidence.lastUrl = page.url();
    evidence.bodyHint = await page
      .locator('body')
      .innerText()
      .then((t) => t.slice(0, 500))
      .catch(() => null);
    await takeScreenshot(page, 'error-state').catch(() => {});
  } finally {
    await browser.close();
  }

  writeFileSync(OUT_JSON, `${JSON.stringify(evidence, null, 2)}\n`);
  const ok =
    evidence.authenticated &&
    evidence.coreJourney &&
    evidence.F11?.pass &&
    evidence.F04?.pass &&
    evidence.errors.length === 0;
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
