/**
 * CEO Second Loop — CASE A (competitor) + CASE B (payer) Production re-verify @ 2c551a3.
 * Harness only — no engine changes.
 *
 * From apps/web:
 *   $env:CI='1'; $env:PLAYWRIGHT_BASE_URL='https://ai-startup-validation-tau.vercel.app'
 *   pnpm exec playwright test e2e/_cpo-ceo-second-loop-prod-capture.spec.ts --retries=0
 */
import { expect, test, type Page, type APIRequestContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE_OUT = process.env.ALABOM_CAPTURE_OUT
  ? path.resolve(process.env.ALABOM_CAPTURE_OUT)
  : path.resolve(process.cwd(), '../../docs/evidence/ALABOM/cpo-validation/ceo-second-loop');
fs.mkdirSync(BASE_OUT, { recursive: true });

const TARGET_SHA = '2c551a3';

const SEED =
  '외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다.';

const CASE_A_ANSWER = '여행관련, 전통주 관련 개별 서비스는 많다.';
const CASE_B_ANSWER = '고객이요';

/** Navigation-only BANK — used to reach target gap, NOT CEO test inputs. */
const NAV_BANK = {
  problem:
    '패키지 투어는 동선이 획일적이고, 혼자 계획하면 언어·시간 때문에 현지인 일상에 가까운 경험을 놓칩니다. 관심사와 체류일수에 맞춘 반나절 단위 맞춤 일정이 필요합니다.',
  payer: '관광객이 앱에서 일정·체험을 직접 예약·결제합니다.',
  customer:
    '초기 타깃은 서울을 3~7일 방문하는 FIT 외국인(밀레니얼·MZ)이고, 혼자 또는 2인 여행이 많습니다.',
  competitor:
    '클룩·트립닷컴·가이드 매칭 앱이 이미 있지만, 대부분 카탈로그형 상품 나열이라 관심사·동선 맞춤이 약합니다.',
  differentiation:
    '차별점은 관심사·동선·식사 제약까지 반영한 실시간 맞춤 일정과 현지인 동행을 한 번에 묶는 점입니다.',
  diffRelevance:
    '맞춤 일정이 없으면 첫날부터 동선 낭비가 커서, 고객은 예약 전에 차이를 체감합니다.',
  fallback:
    '아직 MVP 전 아이디어 단계이고, 서울 한정으로 관심사 기반 맞춤 반나절 체험을 먼저 검증하려 합니다.',
};

const COMPETITOR_Q_RE = /비슷한 역할|이미 (하고 있는|하는) 서비스|대체|대안|경쟁/i;
const PAYER_Q_RE = /지불|결제|누가\s*(내|지불)|비용을?\s*내|비용을 지불|payer/i;
const PERSONA_Q_RE = /필요로 하는|구체 고객|누구인가요|타깃|대상|절실히/i;

type TurnSnap = {
  turn: number;
  label: string;
  aiQuestion: string;
  userAnswer: string;
  targetGapHint: string;
  storedFactsGaps: string;
  nextQuestion: string;
  gapRepeat: boolean;
  screenshot?: string;
};

type CaseCaptureState = {
  at: string;
  productionCommit: string;
  seed: string;
  scenario: 'case-a-competitor' | 'case-b-payer';
  ceoAnswer: string;
  currentQuestionBefore: string;
  turns: TurnSnap[];
  lastTurnSemanticFactKey: string | null;
  lastTurnTargetGap: string | null;
  lastTurnClassification: string | null;
  gapClosed: boolean | null;
  nextGap: string | null;
  gapRepeatCount: number;
  sessionStorageDump: unknown;
  verdict: string | null;
};

function isCompetitorQuestion(q: string): boolean {
  return COMPETITOR_Q_RE.test(q) && !/차별|다른 점|왜 선택|우리만/i.test(q);
}

function isPayerQuestion(q: string): boolean {
  return PAYER_Q_RE.test(q) && !/차별|경쟁|비슷한 역할/i.test(q);
}

function isPersonaQuestion(q: string): boolean {
  return PERSONA_Q_RE.test(q) && !/차별|경쟁|비슷한 역할|대안/i.test(q);
}

async function dismissCookies(page: Page) {
  const accept = page.getByRole('button', { name: /분석 수락|수락|Accept/i });
  if (await accept.first().isVisible({ timeout: 1_500 }).catch(() => false)) {
    await accept.first().click({ force: true });
    await page.waitForTimeout(400);
  }
}

async function textOrEmpty(page: Page, testId: string) {
  try {
    const el = page.getByTestId(testId).first();
    await el.waitFor({ state: 'attached', timeout: 4_000 });
    return (await el.innerText()).trim();
  } catch {
    return '';
  }
}

async function dismissRecognition(page: Page) {
  for (let i = 0; i < 5; i++) {
    const cont = page.getByRole('button', {
      name: /같이 확인하기|계속하기|부족한 부분|Continue understanding|이해 계속|Let's check together|Check together|Continue|Keep refining/i,
    });
    if (await cont.first().isVisible({ timeout: 800 }).catch(() => false)) {
      await cont.first().click({ force: true });
      await page.waitForTimeout(900);
      continue;
    }
    break;
  }
}

async function startDemo(page: Page) {
  await page.goto('/demo/start?fresh=1', { waitUntil: 'domcontentloaded' });
  await dismissCookies(page);
  await page.getByRole('button', { name: /내 사업 문서로 체험하기/i }).click();
  await page.waitForTimeout(400);
  const area = page.locator('textarea').first();
  await area.fill(SEED);
  await area.dispatchEvent('input');
  const start = page.getByRole('button', { name: /AI Read 시작/i });
  await expect(start).toBeEnabled({ timeout: 15_000 });
  await start.click();
  await page.waitForTimeout(3_500);
  await dismissCookies(page);
}

async function confirmSeed(page: Page) {
  const confirm = page.getByRole('button', {
    name: /^(✓\s*)?(맞습니다|That'?s right|Yes[,.]?\s*correct|That is right)(?!\s*—\s*start analysis)/i,
  });
  await confirm.first().waitFor({ state: 'visible', timeout: 90_000 });
  await confirm.first().click({ force: true });
  await page.waitForTimeout(2_500);
  await page.getByTestId('s11-surface').waitFor({ state: 'visible', timeout: 60_000 });
  await dismissRecognition(page);
}

async function ensureAnswerBox(page: Page): Promise<boolean> {
  await dismissRecognition(page);
  let box = page.locator('textarea').last();
  if (!(await box.isVisible({ timeout: 2_000 }).catch(() => false))) {
    const aiPm = page.getByRole('button', { name: /^AI PM$/i });
    if (await aiPm.first().isVisible().catch(() => false)) {
      await aiPm.first().click();
      await page.waitForTimeout(700);
    }
    box = page.locator('textarea').last();
  }
  return box.isVisible({ timeout: 8_000 }).catch(() => false);
}

async function waitAsk(page: Page): Promise<boolean> {
  await dismissRecognition(page);
  await page.getByTestId('s11-surface').waitFor({ state: 'visible', timeout: 12_000 }).catch(() => null);
  return ensureAnswerBox(page);
}

async function resolveConflictIfShown(page: Page) {
  const acceptNew = page.getByRole('button', { name: /새 답변이 맞아/i });
  const keepPrior = page.getByRole('button', { name: /이전 내용이 맞아/i });
  if (await acceptNew.first().isVisible().catch(() => false)) {
    await acceptNew.first().click();
    await page.waitForTimeout(1_200);
  } else if (await keepPrior.first().isVisible().catch(() => false)) {
    await keepPrior.first().click();
    await page.waitForTimeout(1_200);
  }
}

async function submitAnswer(page: Page, answer: string): Promise<boolean> {
  await dismissRecognition(page);
  if (!(await ensureAnswerBox(page))) return false;
  const box = page.locator('textarea').last();
  await box.fill(answer);
  const submit = page
    .getByTestId('submit-answer-cta')
    .or(page.getByRole('button', { name: /답변 반영|반영하기|Apply answer|Apply|제출|Submit|보내기/i }));
  await expect(submit.first()).toBeEnabled({ timeout: 10_000 });
  await submit.first().click({ force: true });
  await page.waitForTimeout(600);
  const thinking = page.getByTestId('ai-pm-thinking-stages');
  if (await thinking.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await thinking.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => null);
  }
  await page.waitForTimeout(1_200);
  await resolveConflictIfShown(page);
  await dismissRecognition(page);
  return true;
}

async function readLastMeaningfulTurn(page: Page): Promise<{
  semanticFactKey: string | null;
  targetGap: string | null;
  answer: string | null;
  intent: string | null;
} | null> {
  return page.evaluate(() => {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (!k?.includes('aiPmLoop')) continue;
      const raw = sessionStorage.getItem(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as {
          turns?: Array<{
            answer?: string;
            semanticFactKey?: string | null;
            targetGap?: string | null;
            superseded?: boolean;
            intent?: string;
          }>;
        };
        const turns = parsed.turns ?? [];
        for (let j = turns.length - 1; j >= 0; j -= 1) {
          const t = turns[j]!;
          if (t.superseded) continue;
          if (t.intent === 'why_meta' || t.intent === 'mid_judgment' || t.intent === 'nonsense') continue;
          return {
            semanticFactKey: t.semanticFactKey ?? null,
            targetGap: t.targetGap ?? null,
            answer: t.answer ?? null,
            intent: t.intent ?? null,
          };
        }
      } catch {
        /* ignore */
      }
    }
    return null;
  });
}

async function dumpSessionStorage(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const out: Record<string, unknown> = {};
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (!k?.includes('aiPmLoop')) continue;
      const raw = sessionStorage.getItem(k);
      if (!raw) continue;
      try {
        out[k] = JSON.parse(raw);
      } catch {
        out[k] = raw;
      }
    }
    return out;
  });
}

function pickNavAnswer(question: string): string {
  const q = question;
  if (/불편|문제|풀려는|해결하려는|페인|JTBD/i.test(q)) return NAV_BANK.problem;
  if (/지불|결제|누가\s*내|비용은 누가|비용을 지불|payer/i.test(q)) return NAV_BANK.payer;
  if (isPersonaQuestion(q)) return NAV_BANK.customer;
  if (/차별점이\s*고객에게|고객에게\s*(어떤\s*)?차이|체감되는 순간|relevance/i.test(q)) {
    return NAV_BANK.diffRelevance;
  }
  if (/차별|다른 점|왜 선택|우리만/i.test(q) && !/비슷한 역할|이미 하고/i.test(q)) {
    return NAV_BANK.differentiation;
  }
  if (isCompetitorQuestion(q)) return NAV_BANK.competitor;
  return NAV_BANK.fallback;
}

async function answerUntilTarget(
  page: Page,
  snapTurn: (label: string, userAnswer: string, shot?: string) => Promise<TurnSnap>,
  target: 'competitor' | 'payer',
  maxTurns = 18,
): Promise<string> {
  const isTarget = target === 'competitor' ? isCompetitorQuestion : isPayerQuestion;
  const navFallbacks = [
    NAV_BANK.problem,
    NAV_BANK.customer,
    NAV_BANK.payer,
    NAV_BANK.competitor,
    NAV_BANK.differentiation,
    NAV_BANK.diffRelevance,
    NAV_BANK.fallback,
  ];
  let fallbackIdx = 0;
  let lastQ = '';

  for (let i = 0; i < maxTurns; i++) {
    await waitAsk(page);
    const q = await textOrEmpty(page, 'surface-question');
    if (isTarget(q)) return q;
    let filler = pickNavAnswer(q);
    if (q === lastQ && fallbackIdx < navFallbacks.length) {
      filler = navFallbacks[fallbackIdx]!;
      fallbackIdx += 1;
    }
    lastQ = q;
    if (!(await submitAnswer(page, filler))) break;
    await waitAsk(page);
    await snapTurn(`prefill-${i + 1}`, filler, `prefill-${i + 1}.png`);
  }
  return await textOrEmpty(page, 'surface-question');
}

async function runCaseJourney(
  page: Page,
  request: APIRequestContext,
  scenario: 'case-a-competitor' | 'case-b-payer',
  ceoAnswer: string,
): Promise<CaseCaptureState> {
  const caseDir = scenario === 'case-a-competitor' ? 'case-a' : 'case-b';
  const outDir = path.join(BASE_OUT, caseDir);
  const mediaDir = path.join(outDir, 'media');
  fs.mkdirSync(mediaDir, { recursive: true });
  const rawJson = path.join(outDir, 'transcript-raw.json');

  let turnCounter = 0;
  let shotSeq = 0;

  const state: CaseCaptureState = {
    at: new Date().toISOString(),
    productionCommit: '',
    seed: SEED,
    scenario,
    ceoAnswer,
    currentQuestionBefore: '',
    turns: [],
    lastTurnSemanticFactKey: null,
    lastTurnTargetGap: null,
    lastTurnClassification: null,
    gapClosed: null,
    nextGap: null,
    gapRepeatCount: 0,
    sessionStorageDump: null,
    verdict: null,
  };

  const persist = () => {
    fs.writeFileSync(rawJson, JSON.stringify(state, null, 2), 'utf8');
  };

  const snapTurn = async (label: string, userAnswer: string, shot?: string): Promise<TurnSnap> => {
    turnCounter += 1;
    shotSeq += 1;
    const fileName = shot ? `${String(shotSeq).padStart(2, '0')}-${shot}` : undefined;
    if (fileName) {
      await page.screenshot({ path: path.join(mediaDir, fileName), fullPage: true }).catch(() => null);
    }
    const aiQuestion = await textOrEmpty(page, 'surface-question');
    const row: TurnSnap = {
      turn: turnCounter,
      label,
      aiQuestion,
      userAnswer,
      targetGapHint: await textOrEmpty(page, 'target-gap-hint'),
      storedFactsGaps: await textOrEmpty(page, 'stored-facts-gaps'),
      nextQuestion: '',
      gapRepeat: false,
      screenshot: fileName,
    };
    state.turns.push(row);
    persist();
    return row;
  };

  const build = await request.get('/api/build-info');
  const buildJson = (await build.json()) as { data?: { commit?: string } };
  state.productionCommit = buildJson.data?.commit ?? '';
  expect(
    state.productionCommit.startsWith(TARGET_SHA),
    `Production must be @ ${TARGET_SHA}, got ${state.productionCommit.slice(0, 12)}`,
  ).toBe(true);

  await startDemo(page);
  await snapTurn('after-ai-read', '(seed)', 'after-ai-read.png');
  await confirmSeed(page);
  await snapTurn('after-confirm', '(confirm)', 'after-confirm.png');

  const target = scenario === 'case-a-competitor' ? 'competitor' : 'payer';
  const targetQ = await answerUntilTarget(page, snapTurn, target);
  state.currentQuestionBefore = targetQ;

  if (scenario === 'case-a-competitor') {
    expect(isCompetitorQuestion(targetQ), `CASE A: expected competitor Q, got: ${targetQ.slice(0, 100)}`).toBe(true);
  } else {
    expect(isPayerQuestion(targetQ), `CASE B: expected payer Q, got: ${targetQ.slice(0, 100)}`).toBe(true);
  }
  await snapTurn(`${caseDir}-ask-before`, '(awaiting CEO answer)', 'before-answer.png');

  expect(await submitAnswer(page, ceoAnswer)).toBe(true);
  await page.getByTestId('s11-surface').waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null);
  const nextQ = await textOrEmpty(page, 'surface-question');
  const row = await snapTurn(`${caseDir}-ceo-answer`, ceoAnswer, 'after-submit-next-question.png');
  row.nextQuestion = nextQ;

  const lastTurn = await readLastMeaningfulTurn(page);
  state.lastTurnSemanticFactKey = lastTurn?.semanticFactKey ?? null;
  state.lastTurnTargetGap = lastTurn?.targetGap ?? null;
  state.lastTurnClassification = lastTurn?.intent ?? null;
  state.sessionStorageDump = await dumpSessionStorage(page);

  const isRepeat =
    scenario === 'case-a-competitor' ? isCompetitorQuestion(nextQ) : isPayerQuestion(nextQ);
  row.gapRepeat = isRepeat;
  state.gapRepeatCount = isRepeat ? 1 : 0;
  state.gapClosed = !isRepeat;

  if (scenario === 'case-a-competitor') {
    state.nextGap = isRepeat
      ? 'alternativesCompetitors (still open)'
      : /차별|다른 점|왜 선택/i.test(nextQ)
        ? 'differentiationVsAlternatives'
        : isPayerQuestion(nextQ)
          ? 'payer'
          : isPersonaQuestion(nextQ)
            ? 'customerPersona'
            : 'other';
    if (state.gapClosed && state.lastTurnSemanticFactKey === 'competitor') {
      state.verdict = 'PASS — semanticFactKey=competitor; alternativesCompetitors closed; next gap not competitor repeat';
    } else if (isRepeat) {
      state.verdict = 'FAIL — competitor question repeated after CEO answer';
    } else if (state.lastTurnSemanticFactKey !== 'competitor') {
      state.verdict = `FAIL — semanticFactKey=${state.lastTurnSemanticFactKey ?? 'null'} (expected competitor)`;
    } else {
      state.verdict = 'FAIL — alternativesCompetitors gap did not close';
    }
  } else {
    state.nextGap = isRepeat
      ? 'payer (still open)'
      : /불편|문제|JTBD/i.test(nextQ)
        ? 'problemJtbd'
        : isCompetitorQuestion(nextQ)
          ? 'alternativesCompetitors'
          : 'other';
    if (state.gapClosed && state.lastTurnSemanticFactKey === 'buyer') {
      state.verdict = 'PASS — semanticFactKey=buyer; payer closed; next gap not payer repeat';
    } else if (isRepeat) {
      state.verdict = 'FAIL — payer question repeated after CEO answer';
    } else if (state.lastTurnSemanticFactKey !== 'buyer') {
      state.verdict = `FAIL — semanticFactKey=${state.lastTurnSemanticFactKey ?? 'null'} (expected buyer)`;
    } else {
      state.verdict = 'FAIL — payer gap did not close';
    }
  }
  persist();

  return state;
}

function writeSummary(results: { caseA: CaseCaptureState; caseB: CaseCaptureState }) {
  const buildInfo = {
    commit: results.caseA.productionCommit,
    targetSha: TARGET_SHA,
    at: new Date().toISOString(),
    deployTime: results.caseA.at,
  };
  fs.writeFileSync(path.join(BASE_OUT, 'prod-build-info.json'), JSON.stringify(buildInfo, null, 2), 'utf8');

  const summary = {
    at: new Date().toISOString(),
    productionCommit: results.caseA.productionCommit,
    targetSha: TARGET_SHA,
    caseA: {
      currentQuestion: results.caseA.currentQuestionBefore,
      answer: CASE_A_ANSWER,
      semanticFactKey: results.caseA.lastTurnSemanticFactKey,
      targetGap: results.caseA.lastTurnTargetGap,
      gapClosed: results.caseA.gapClosed,
      nextGap: results.caseA.nextGap,
      repeat: results.caseA.gapRepeatCount > 0,
      verdict: results.caseA.verdict,
    },
    caseB: {
      currentQuestion: results.caseB.currentQuestionBefore,
      answer: CASE_B_ANSWER,
      semanticFactKey: results.caseB.lastTurnSemanticFactKey,
      targetGap: results.caseB.lastTurnTargetGap,
      gapClosed: results.caseB.gapClosed,
      nextGap: results.caseB.nextGap,
      repeat: results.caseB.gapRepeatCount > 0,
      verdict: results.caseB.verdict,
    },
    allPass:
      results.caseA.gapClosed === true &&
      results.caseA.lastTurnSemanticFactKey === 'competitor' &&
      results.caseA.gapRepeatCount === 0 &&
      results.caseB.gapClosed === true &&
      results.caseB.lastTurnSemanticFactKey === 'buyer' &&
      results.caseB.gapRepeatCount === 0,
  };
  fs.writeFileSync(path.join(BASE_OUT, 'case-ab-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
}

test.describe.configure({ mode: 'serial' });

let caseAResult: CaseCaptureState | null = null;
let caseBResult: CaseCaptureState | null = null;

test('CASE A — competitor CEO free-form @ Production', async ({ page, request }) => {
  test.setTimeout(360_000);
  caseAResult = await runCaseJourney(page, request, 'case-a-competitor', CASE_A_ANSWER);
  expect(caseAResult.gapClosed, caseAResult.verdict ?? 'CASE A failed').toBe(true);
  expect(caseAResult.lastTurnSemanticFactKey).toBe('competitor');
  expect(caseAResult.gapRepeatCount).toBe(0);
});

test('CASE B — payer CEO free-form @ Production', async ({ page, request }) => {
  test.setTimeout(360_000);
  caseBResult = await runCaseJourney(page, request, 'case-b-payer', CASE_B_ANSWER);
  expect(caseBResult.gapClosed, caseBResult.verdict ?? 'CASE B failed').toBe(true);
  expect(caseBResult.lastTurnSemanticFactKey).toBe('buyer');
  expect(caseBResult.gapRepeatCount).toBe(0);
  if (caseAResult && caseBResult) {
    writeSummary({ caseA: caseAResult, caseB: caseBResult });
  }
});
