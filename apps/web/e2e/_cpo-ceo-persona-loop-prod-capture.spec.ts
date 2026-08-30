/**
 * CEO Walkthrough — Customer persona infinite loop reproduction on Production.
 * Uses CEO free-form answers (NOT BANK.customer harness keywords).
 *
 * From apps/web:
 *   $env:CI='1'; $env:PLAYWRIGHT_BASE_URL='https://ai-startup-validation-tau.vercel.app'
 *   pnpm exec playwright test e2e/_cpo-ceo-persona-loop-prod-capture.spec.ts --retries=0
 */
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.env.ALABOM_CAPTURE_OUT
  ? path.resolve(process.env.ALABOM_CAPTURE_OUT)
  : path.resolve(
      process.cwd(),
      '../../docs/evidence/ALABOM/cpo-validation/ceo-walkthrough-loop',
    );
const MEDIA = path.join(OUT, 'media');
const RAW_JSON = path.join(OUT, 'transcript-raw.json');
fs.mkdirSync(MEDIA, { recursive: true });

const SEED =
  '외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다.';

/** CEO free-form persona answers — omit BANK keywords (FIT/MZ/초기 타깃). */
const CEO_PERSONA_ANSWERS = [
  '예약 전에 맞춤 일정을 원하는 방한 외국인',
  '동선 낭비 없이 여행하고 싶은 외국인',
  '차별점을 예약 전에 체감하고 싶은 사람',
];

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

type CaptureState = {
  at: string;
  productionCommit: string;
  seed: string;
  scenario: 'ceo-persona-loop';
  turns: TurnSnap[];
  personaQuestionRepeats: number;
  customerGapClosedAfterFirstCeoAnswer: boolean | null;
  nextGapAfterPersona: string | null;
  verdict: string | null;
};

const state: CaptureState = {
  at: new Date().toISOString(),
  productionCommit: '',
  seed: SEED,
  scenario: 'ceo-persona-loop',
  turns: [],
  personaQuestionRepeats: 0,
  customerGapClosedAfterFirstCeoAnswer: null,
  nextGapAfterPersona: null,
  verdict: null,
};

let turnCounter = 0;
let shotSeq = 0;

function persist() {
  fs.writeFileSync(RAW_JSON, JSON.stringify(state, null, 2), 'utf8');
}

function isPersonaQuestion(q: string): boolean {
  return PERSONA_Q_RE.test(q) && !/차별|경쟁|비슷한 역할|대안/i.test(q);
}

function isProblemQuestion(q: string): boolean {
  return PROBLEM_Q_RE.test(q);
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
  for (let i = 0; i < 3; i++) {
    const cont = page.getByRole('button', {
      name: /같이 확인하기|계속하기|부족한 부분|Continue understanding|이해 계속/i,
    });
    if (await cont.first().isVisible({ timeout: 800 }).catch(() => false)) {
      await cont.first().click({ force: true });
      await page.waitForTimeout(700);
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
    name: /맞습니다|That'?s right|Yes[,.]?\s*correct/i,
  });
  await confirm.first().waitFor({ state: 'visible', timeout: 90_000 });
  await confirm.first().click({ force: true });
  await page.waitForTimeout(2_000);
  await dismissRecognition(page);
}

async function submitAnswer(page: Page, answer: string): Promise<boolean> {
  await dismissRecognition(page);
  const box = page.locator('textarea').last();
  if (!(await box.isVisible({ timeout: 8_000 }).catch(() => false))) return false;
  await box.fill(answer);
  const send = page
    .getByTestId('submit-answer-cta')
    .or(page.getByRole('button', { name: /답변 반영|Apply answer|Apply|제출|Submit|보내기/i }));
  if (await send.first().isVisible().catch(() => false)) {
    await send.first().click({ force: true });
  } else {
    await box.press('Control+Enter');
  }
  await page.waitForTimeout(1_800);
  await dismissRecognition(page);
  return true;
}

async function snapTurn(
  page: Page,
  label: string,
  userAnswer: string,
  shot?: string,
): Promise<TurnSnap> {
  turnCounter += 1;
  shotSeq += 1;
  const fileName = shot ? `${String(shotSeq).padStart(2, '0')}-${shot}` : undefined;
  if (fileName) {
    await page.screenshot({ path: path.join(MEDIA, fileName), fullPage: true }).catch(() => null);
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
}

async function answerUntilPersonaOrLimit(page: Page, maxTurns = 8): Promise<string> {
  for (let i = 0; i < maxTurns; i++) {
    await page.getByTestId('s11-surface').waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null);
    const q = await textOrEmpty(page, 'surface-question');
    if (isPersonaQuestion(q)) return q;
    const filler =
      i === 0
        ? '패키지 투어는 동선이 획일적이고, 혼자 계획하면 언어·시간 때문에 현지인 일상에 가까운 경험을 놓칩니다.'
        : '관광객이 앱에서 일정·체험을 직접 예약·결제합니다.';
    await submitAnswer(page, filler);
    await snapTurn(page, `prefill-${i + 1}`, filler, `prefill-${i + 1}.png`);
  }
  return await textOrEmpty(page, 'surface-question');
}

test.describe.configure({ mode: 'serial' });

test('CEO persona loop — Production path with free-form answers', async ({ page, request }) => {
  test.setTimeout(360_000);

  const build = await request.get('/api/build-info');
  const buildJson = (await build.json()) as { data?: { commit?: string } };
  state.productionCommit = buildJson.data?.commit ?? '';
  fs.writeFileSync(
    path.join(OUT, 'prod-build-info.json'),
    JSON.stringify({ commit: state.productionCommit, at: state.at }, null, 2),
  );

  await startDemo(page);
  await snapTurn(page, 'after-ai-read', '(seed)', 'after-ai-read.png');
  await confirmSeed(page);
  await snapTurn(page, 'after-confirm', '(confirm)', 'after-confirm.png');

  const personaQ = await answerUntilPersonaOrLimit(page);
  expect(isPersonaQuestion(personaQ), `Expected persona Q, got: ${personaQ.slice(0, 80)}`).toBe(true);
  await snapTurn(page, 'persona-ask', '(awaiting CEO answer)', 'persona-ask.png');

  let lastPersonaQ = personaQ;
  let personaRepeats = 0;

  for (let i = 0; i < CEO_PERSONA_ANSWERS.length; i++) {
    const answer = CEO_PERSONA_ANSWERS[i]!;
    expect(await submitAnswer(page, answer)).toBe(true);
    await page.getByTestId('s11-surface').waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null);
    const nextQ = await textOrEmpty(page, 'surface-question');
    const row = await snapTurn(page, `ceo-persona-${i + 1}`, answer, `ceo-persona-${i + 1}.png`);
    row.nextQuestion = nextQ;

    if (i === 0) {
      state.customerGapClosedAfterFirstCeoAnswer = !isPersonaQuestion(nextQ);
      state.nextGapAfterPersona = isProblemQuestion(nextQ)
        ? 'problemJtbd'
        : isPersonaQuestion(nextQ)
          ? 'customerPersona (still open)'
          : 'other';
    }

    if (isPersonaQuestion(nextQ)) {
      personaRepeats += 1;
      row.personaRepeat = true;
      lastPersonaQ = nextQ;
    } else {
      break;
    }
  }

  state.personaQuestionRepeats = personaRepeats;

  if (state.customerGapClosedAfterFirstCeoAnswer) {
    state.verdict = 'PASS — CEO persona answer closed gap; next question is not persona repeat';
  } else if (personaRepeats >= 2) {
    state.verdict = `FAIL — persona question repeated ${personaRepeats + 1} times (infinite loop)`;
  } else {
    state.verdict = 'FAIL — customerPersona gap did not close after CEO answer';
  }
  persist();

  expect(
    state.customerGapClosedAfterFirstCeoAnswer,
    `Persona loop on prod @ ${state.productionCommit.slice(0, 7)} — repeats=${personaRepeats}, lastQ=${lastPersonaQ.slice(0, 60)}`,
  ).toBe(true);
  expect(isProblemQuestion(await textOrEmpty(page, 'surface-question')) || !isPersonaQuestion(lastPersonaQ)).toBe(
    true,
  );
});
