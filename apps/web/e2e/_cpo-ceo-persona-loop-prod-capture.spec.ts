/**
 * CEO Walkthrough — Customer persona infinite loop reproduction on Production.
 * Uses CEO free-form answers (NOT BANK.customer harness keywords).
 *
 * Runs 3 separate fresh sessions — one per canonical CEO input.
 *
 * From apps/web:
 *   $env:CI='1'; $env:PLAYWRIGHT_BASE_URL='https://ai-startup-validation-tau.vercel.app'
 *   pnpm exec playwright test e2e/_cpo-ceo-persona-loop-prod-capture.spec.ts --retries=0
 */
import { expect, test, type Page, type APIRequestContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE_OUT = process.env.ALABOM_CAPTURE_OUT
  ? path.resolve(process.env.ALABOM_CAPTURE_OUT)
  : path.resolve(
      process.cwd(),
      '../../docs/evidence/ALABOM/cpo-validation/ceo-walkthrough-loop',
    );
fs.mkdirSync(BASE_OUT, { recursive: true });

const SEED =
  '외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다.';

/** Navigation-only BANK strings — used only to reach customerPersona ask, NOT CEO test inputs. */
const NAV_BANK = {
  problem:
    '패키지 투어는 동선이 획일적이고, 혼자 계획하면 언어·시간 때문에 현지인 일상에 가까운 경험을 놓칩니다. 관심사와 체류일수에 맞춘 반나절 단위 맞춤 일정이 필요합니다.',
  payer: '관광객이 앱에서 일정·체험을 직접 예약·결제합니다.',
  competitor:
    '클룩·트립닷컴·가이드 매칭 앱이 이미 있지만, 대부분 카탈로그형 상품 나열이라 관심사·동선 맞춤이 약합니다.',
  differentiation:
    '차별점은 관심사·동선·식사 제약까지 반영한 실시간 맞춤 일정과 현지인 동행을 한 번에 묶는 점입니다.',
  diffRelevance:
    '맞춤 일정이 없으면 첫날부터 동선 낭비가 커서, 고객은 예약 전에 차이를 체감합니다.',
  fallback:
    '아직 MVP 전 아이디어 단계이고, 서울 한정으로 관심사 기반 맞춤 반나절 체험을 먼저 검증하려 합니다.',
};

/** Canonical CEO free-form persona answers — omit BANK keywords (FIT/MZ/초기 타깃). */
const CEO_PERSONA_INPUTS = [
  { id: 1, answer: '예약 전에 맞춤 일정을 원하는 방한 외국인' },
  { id: 2, answer: '동선 낭비 없이 여행하고 싶은 외국인' },
  { id: 3, answer: '차별점을 예약 전에 체감하고 싶은 사람' },
] as const;

const PERSONA_Q_RE = /필요로 하는|구체 고객|누구인가요|타깃|대상|절실히/i;
const PROBLEM_Q_RE = /불편|문제|풀려는|해결하려는|페인|JTBD/i;

type TurnSnap = {
  turn: number;
  label: string;
  aiQuestion: string;
  userAnswer: string;
  targetGapHint: string;
  storedFactsGaps: string;
  nextQuestion: string;
  personaRepeat: boolean;
  screenshot?: string;
};

type InputCaptureState = {
  at: string;
  productionCommit: string;
  seed: string;
  scenario: 'ceo-persona-loop';
  inputId: number;
  ceoAnswer: string;
  turns: TurnSnap[];
  personaQuestionRepeats: number;
  customerGapClosedAfterCeoAnswer: boolean | null;
  nextGapAfterPersona: string | null;
  lastTurnSemanticFactKey: string | null;
  lastTurnTargetGap: string | null;
  customerPersonaClosed: boolean | null;
  verdict: string | null;
};

type ThreeInputSummary = {
  at: string;
  productionCommit: string;
  inputs: Array<{
    inputId: number;
    ceoAnswer: string;
    semanticFactKey: string | null;
    customerPersonaClosed: boolean;
    nextGap: string | null;
    personaRepeat: number;
    verdict: string;
  }>;
  allPass: boolean;
};

const PERSONA_Q_RE_FN = PERSONA_Q_RE;
const PROBLEM_Q_RE_FN = PROBLEM_Q_RE;

function isPersonaQuestion(q: string): boolean {
  return PERSONA_Q_RE_FN.test(q) && !/차별|경쟁|비슷한 역할|대안/i.test(q);
}

function isProblemQuestion(q: string): boolean {
  return PROBLEM_Q_RE_FN.test(q);
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
          };
        }
      } catch {
        /* ignore */
      }
    }
    return null;
  });
}

function pickNavAnswer(question: string): string {
  const q = question;
  if (/불편|문제|풀려는|해결하려는|페인|JTBD/i.test(q)) return NAV_BANK.problem;
  if (/지불|결제|누가\s*내|비용은 누가|payer/i.test(q)) return NAV_BANK.payer;
  if (/차별점이\s*고객에게|고객에게\s*(어떤\s*)?차이|체감되는 순간|relevance/i.test(q)) {
    return NAV_BANK.diffRelevance;
  }
  if (/차별|다른 점|왜 선택|우리만/i.test(q) && !/비슷한 역할|이미 하고/i.test(q)) {
    return NAV_BANK.differentiation;
  }
  if (/비슷한 역할|이미 (하고 있는|하는) 서비스|대체|대안|경쟁/i.test(q)) return NAV_BANK.competitor;
  return NAV_BANK.fallback;
}

async function answerUntilPersonaOrLimit(
  page: Page,
  state: InputCaptureState,
  outDir: string,
  persist: () => void,
  snapTurn: (label: string, userAnswer: string, shot?: string) => Promise<TurnSnap>,
  maxTurns = 16,
): Promise<string> {
  const navFallbacks = [
    NAV_BANK.competitor,
    NAV_BANK.differentiation,
    NAV_BANK.diffRelevance,
    NAV_BANK.problem,
    NAV_BANK.payer,
    NAV_BANK.fallback,
  ];
  let fallbackIdx = 0;
  let lastQ = '';

  for (let i = 0; i < maxTurns; i++) {
    await waitAsk(page);
    const q = await textOrEmpty(page, 'surface-question');
    if (isPersonaQuestion(q)) return q;
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

async function runCeoInputJourney(
  page: Page,
  request: APIRequestContext,
  input: (typeof CEO_PERSONA_INPUTS)[number],
): Promise<InputCaptureState> {
  const outDir = path.join(BASE_OUT, `input-${input.id}`);
  const mediaDir = path.join(outDir, 'media');
  fs.mkdirSync(mediaDir, { recursive: true });
  const rawJson = path.join(outDir, 'transcript-raw.json');

  let turnCounter = 0;
  let shotSeq = 0;

  const state: InputCaptureState = {
    at: new Date().toISOString(),
    productionCommit: '',
    seed: SEED,
    scenario: 'ceo-persona-loop',
    inputId: input.id,
    ceoAnswer: input.answer,
    turns: [],
    personaQuestionRepeats: 0,
    customerGapClosedAfterCeoAnswer: null,
    nextGapAfterPersona: null,
    lastTurnSemanticFactKey: null,
    lastTurnTargetGap: null,
    customerPersonaClosed: null,
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
      personaRepeat: false,
      screenshot: fileName,
    };
    state.turns.push(row);
    persist();
    return row;
  };

  const build = await request.get('/api/build-info');
  const buildJson = (await build.json()) as { data?: { commit?: string } };
  state.productionCommit = buildJson.data?.commit ?? '';
  fs.writeFileSync(
    path.join(outDir, 'prod-build-info.json'),
    JSON.stringify({ commit: state.productionCommit, at: state.at, inputId: input.id }, null, 2),
  );

  await startDemo(page);
  await snapTurn('after-ai-read', '(seed)', 'after-ai-read.png');
  await confirmSeed(page);
  await snapTurn('after-confirm', '(confirm)', 'after-confirm.png');

  const personaQ = await answerUntilPersonaOrLimit(page, state, outDir, persist, snapTurn);
  expect(isPersonaQuestion(personaQ), `[input-${input.id}] Expected persona Q, got: ${personaQ.slice(0, 80)}`).toBe(
    true,
  );
  await snapTurn('persona-ask', '(awaiting CEO answer)', 'persona-ask.png');

  expect(await submitAnswer(page, input.answer)).toBe(true);
  await page.getByTestId('s11-surface').waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null);
  const nextQ = await textOrEmpty(page, 'surface-question');
  const row = await snapTurn('ceo-persona-answer', input.answer, 'ceo-persona-answer.png');
  row.nextQuestion = nextQ;

  const lastTurn = await readLastMeaningfulTurn(page);
  state.lastTurnSemanticFactKey = lastTurn?.semanticFactKey ?? null;
  state.lastTurnTargetGap = lastTurn?.targetGap ?? null;

  const personaRepeat = isPersonaQuestion(nextQ);
  row.personaRepeat = personaRepeat;
  state.personaQuestionRepeats = personaRepeat ? 1 : 0;
  state.customerGapClosedAfterCeoAnswer = !personaRepeat;
  state.customerPersonaClosed = state.lastTurnSemanticFactKey === 'customer' && !personaRepeat;
  state.nextGapAfterPersona = isProblemQuestion(nextQ)
    ? 'problemJtbd'
    : personaRepeat
      ? 'customerPersona (still open)'
      : 'other';

  if (state.customerGapClosedAfterCeoAnswer && state.lastTurnSemanticFactKey === 'customer') {
    state.verdict = 'PASS — semanticFactKey=customer; customerPersona closed; next gap not persona repeat';
  } else if (personaRepeat) {
    state.verdict = 'FAIL — persona question repeated after CEO answer';
  } else if (state.lastTurnSemanticFactKey !== 'customer') {
    state.verdict = `FAIL — semanticFactKey=${state.lastTurnSemanticFactKey ?? 'null'} (expected customer)`;
  } else {
    state.verdict = 'FAIL — customerPersona gap did not close after CEO answer';
  }
  persist();

  expect(
    state.customerGapClosedAfterCeoAnswer,
    `[input-${input.id}] Persona loop on prod @ ${state.productionCommit.slice(0, 7)} — semanticFactKey=${state.lastTurnSemanticFactKey}`,
  ).toBe(true);
  expect(state.lastTurnSemanticFactKey, `[input-${input.id}] semanticFactKey must be customer`).toBe('customer');
  expect(isProblemQuestion(nextQ), `[input-${input.id}] next gap must be problemJtbd`).toBe(true);
  expect(state.personaQuestionRepeats, `[input-${input.id}] persona repeat must be 0`).toBe(0);

  return state;
}

function writeThreeInputSummary(results: InputCaptureState[]) {
  const summary: ThreeInputSummary = {
    at: new Date().toISOString(),
    productionCommit: results[0]?.productionCommit ?? '',
    inputs: results.map((r) => ({
      inputId: r.inputId,
      ceoAnswer: r.ceoAnswer,
      semanticFactKey: r.lastTurnSemanticFactKey,
      customerPersonaClosed: r.customerGapClosedAfterCeoAnswer === true && r.lastTurnSemanticFactKey === 'customer',
      nextGap: r.nextGapAfterPersona,
      personaRepeat: r.personaQuestionRepeats,
      verdict: r.verdict ?? 'UNKNOWN',
    })),
    allPass: results.every(
      (r) =>
        r.customerGapClosedAfterCeoAnswer === true &&
        r.lastTurnSemanticFactKey === 'customer' &&
        r.nextGapAfterPersona === 'problemJtbd' &&
        r.personaQuestionRepeats === 0,
    ),
  };
  fs.writeFileSync(path.join(BASE_OUT, 'ceo-three-input-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  // Legacy single-file transcript for input-1 (backward compat)
  if (results[0]) {
    fs.writeFileSync(
      path.join(BASE_OUT, 'transcript-raw.json'),
      JSON.stringify({ ...results[0], note: 'input-1 canonical; see input-2/ input-3/ and ceo-three-input-summary.json' }, null, 2),
      'utf8',
    );
    fs.writeFileSync(
      path.join(BASE_OUT, 'prod-build-info.json'),
      JSON.stringify({ commit: results[0].productionCommit, at: results[0].at }, null, 2),
    );
  }
}

test.describe.configure({ mode: 'serial' });

const collectedResults: InputCaptureState[] = [];

for (const input of CEO_PERSONA_INPUTS) {
  test(`CEO persona input #${input.id} — fresh Production session`, async ({ page, request }) => {
    test.setTimeout(360_000);
    const result = await runCeoInputJourney(page, request, input);
    collectedResults.push(result);
    if (collectedResults.length === CEO_PERSONA_INPUTS.length) {
      writeThreeInputSummary(collectedResults);
    }
  });
}
