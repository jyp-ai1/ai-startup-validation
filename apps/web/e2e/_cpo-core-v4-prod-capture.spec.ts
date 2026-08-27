/**
 * ALABOM Core v4 — Production Demo journey capture (evidence only).
 * Covers: new user, document seed, answer→understanding→next Q, prior edit,
 * why/objection, competition/diff, sufficiency→final.
 *
 * From apps/web:
 *   $env:CI='1'; $env:PLAYWRIGHT_BASE_URL='https://ai-startup-validation-tau.vercel.app'
 *   pnpm exec playwright test e2e/_cpo-core-v4-prod-capture.spec.ts --retries=0
 */
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/conversation-validation/core-v4',
);
const MEDIA = path.join(OUT, 'media');
const RAW_JSON = path.join(OUT, 'transcript-raw.json');
fs.mkdirSync(MEDIA, { recursive: true });

const FIX_SHA_PREFIXES = ['7da3ed9'] as const;

const SEED =
  '외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다.';

const BANK = {
  problem:
    '패키지 투어는 동선이 획일적이고, 혼자 계획하면 언어·시간 때문에 현지인 일상에 가까운 경험을 놓칩니다. 관심사와 체류일수에 맞춘 반나절 단위 맞춤 일정이 필요합니다.',
  payer: '관광객이 앱에서 일정·체험을 직접 예약·결제합니다.',
  revenue: '수익은 예약 건당 중개 수수료 10~15%와 현지 파트너 제휴 리포트 구독입니다.',
  customer:
    '초기 타깃은 서울을 3~7일 방문하는 FIT 외국인(밀레니얼·MZ)이고, 혼자 또는 2인 여행이 많습니다.',
  demand:
    '방한 외래객 회복과 맞춤 투어 문의가 늘고 있다는 제휴 가이드 피드백이 있습니다. 아직 공개 통계는 없습니다.',
  competitor:
    '클룩·트립닷컴·가이드 매칭 앱이 이미 있지만, 대부분 카탈로그형 상품 나열이라 관심사·동선 맞춤이 약합니다.',
  differentiation:
    '차별점은 관심사·동선·식사 제약까지 반영한 실시간 맞춤 일정과 현지인 동행을 한 번에 묶는 점입니다.',
  midSummaryAsk: '지금까지 이해한 사업 정리해줘',
  whyChallenge: '왜 그게 중요하죠?',
  editCorrection:
    '정정합니다. 초기 타깃은 방한 FIT 외국인만이 아니라, 국내 MZ 개별 여행객도 포함합니다.',
  fallback:
    '아직 MVP 전 아이디어 단계이고, 서울 한정으로 관심사 기반 맞춤 반나절 체험을 먼저 검증하려 합니다.',
};

type TurnSnap = {
  turn: number;
  label: string;
  aiQuestion: string;
  purpose: string;
  whyNow: string;
  judgmentBlock: string;
  understandingDelta: string;
  userAnswer: string;
  understanding: string;
  decision: string;
  coverageText: string;
  storedFactsGaps: string;
  gapChangeNote: string;
  nextQuestion: string;
  nextQuestionReason: string;
  bodyExcerpt: string;
  screenshot?: string;
  notes?: string[];
  templateLikeHints?: string[];
};

type CaptureState = {
  at: string;
  productionCommit: string;
  targetSha: string;
  shaMatch: boolean;
  entryUrl: string;
  seed: string;
  turns: TurnSnap[];
  observations: string[];
  finalReviewReachable: boolean | null;
  templateLikeTurns: number[];
  reAskSameQuestionCount: number;
  wrongSlotHints: string[];
};

const state: CaptureState = {
  at: new Date().toISOString(),
  productionCommit: '',
  targetSha: FIX_SHA_PREFIXES.join('|'),
  shaMatch: false,
  entryUrl: '/demo/start',
  seed: SEED,
  turns: [],
  observations: [],
  finalReviewReachable: null,
  templateLikeTurns: [],
  reAskSameQuestionCount: 0,
  wrongSlotHints: [],
};

let turnCounter = 0;
let previousGaps = '';

function persist() {
  fs.writeFileSync(RAW_JSON, JSON.stringify(state, null, 2), 'utf8');
}

async function dismissCookies(page: Page) {
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

async function textOrEmpty(page: Page, testId: string) {
  const el = page.getByTestId(testId);
  if (await el.isVisible().catch(() => false)) {
    return (await el.innerText()).trim();
  }
  return '';
}

async function dismissRecognition(page: Page) {
  for (let i = 0; i < 4; i++) {
    const cont = page.getByRole('button', {
      name: /Let's check together|같이 확인하기|계속하기|이어서|Answer the gaps|부족한 부분만/i,
    });
    if (await cont.first().isVisible({ timeout: 1_200 }).catch(() => false)) {
      await cont.first().click({ force: true });
      await page.waitForTimeout(900);
      continue;
    }
    break;
  }
}

async function isFinalReviewSurface(page: Page): Promise<boolean> {
  if (await page.getByTestId('conversational-final-output').isVisible().catch(() => false)) {
    return true;
  }
  const startAnalysis = page.getByRole('button', {
    name: /That's right — start analysis|맞습니다.*분석|start analysis/i,
  });
  if (await startAnalysis.first().isVisible().catch(() => false)) return true;
  const body = await page.locator('body').innerText();
  return /Understanding is sufficient|Core understanding is sufficient|Before analysis, confirm|이해가 충분|분석 전 확인/i.test(
    body,
  );
}

async function ensureAnswerBox(page: Page): Promise<boolean> {
  await dismissRecognition(page);
  if (await isFinalReviewSurface(page)) return false;

  let box = page.locator('textarea').last();
  if (!(await box.isVisible({ timeout: 2_000 }).catch(() => false))) {
    const aiPm = page.getByRole('button', { name: /^AI PM$/i });
    if (await aiPm.first().isVisible().catch(() => false)) {
      await aiPm.first().click();
      await page.waitForTimeout(700);
    }
    await dismissRecognition(page);
    if (await isFinalReviewSurface(page)) return false;
    box = page.locator('textarea').last();
  }
  if (!(await box.isVisible({ timeout: 2_000 }).catch(() => false))) {
    const summary = page.getByRole('button', { name: /With AI PM|AI PM dialogue/i });
    if (await summary.first().isVisible().catch(() => false)) {
      await summary.first().click();
      await page.waitForTimeout(500);
    }
    await dismissRecognition(page);
    if (await isFinalReviewSurface(page)) return false;
    box = page.locator('textarea').last();
  }
  return box.isVisible({ timeout: 8_000 }).catch(() => false);
}

async function waitAsk(page: Page): Promise<boolean> {
  await dismissRecognition(page);
  await page.getByTestId('s11-surface').waitFor({ state: 'visible', timeout: 12_000 }).catch(() => null);
  if (await isFinalReviewSurface(page)) return false;
  return ensureAnswerBox(page);
}

async function extractSpineFacts(page: Page): Promise<string> {
  const body = await page.locator('body').innerText();
  const lines: string[] = [];
  for (const key of [
    'BUSINESS',
    'CUSTOMER',
    'PROBLEM',
    'MARKET',
    'COMPETITION',
    'Business',
    'Customer',
    'Problem',
    'Market',
    'Competition',
  ]) {
    const re = new RegExp(`${key}[^\\n]{0,220}`, 'i');
    const m = body.match(re);
    if (m) lines.push(m[0].replace(/\s+/g, ' ').trim().slice(0, 200));
  }
  const gaps = body.match(
    /Needs confirmation|아직 확인|확인 필요|미확인|Not confirmed|Next to confirm[^\n]{0,100}|Core understanding is sufficient[^\n]{0,80}/gi,
  );
  if (gaps) lines.push('GAPS/STATUS: ' + [...new Set(gaps.map((g) => g.trim()))].slice(0, 10).join(' | '));
  const cov = body.match(/커버리지\s*\d+%|Business specificity\s*\d+%|구체화도\s*\d+%/i);
  if (cov) lines.push(cov[0]);
  return lines.slice(0, 14).join('\n');
}

function pickAnswer(question: string, body: string, forced?: string): string {
  if (forced) return forced;
  const q = `${question}\n${body}`;
  if (/비슷한 역할|경쟁|이미 하고 있는 서비스|대체|대안|클룩|트립/i.test(q)) return BANK.competitor;
  if (/차별|다른 점|왜 선택|우리만/i.test(q)) return BANK.differentiation;
  // Revenue before payer when question is about structure/fees
  if (/수익|수수료|구독|매출|구조로 발생/i.test(q) && !/누가\s*지불|비용은 누가/i.test(q)) {
    return BANK.revenue;
  }
  if (/지불|결제|누가\s*내|비용은 누가/i.test(q)) return BANK.payer;
  if (/불편|문제|풀려는|해결하려는|페인/i.test(q)) return BANK.problem;
  if (/필요로 하는 사람|고객|누구를 위한|타깃|대상/i.test(q)) return BANK.customer;
  if (/수요|근거|시장|규모|기회|채널/i.test(q)) return BANK.demand;
  return BANK.fallback;
}

function detectTemplateHints(
  question: string,
  purpose: string,
  previousQuestions: string[],
): string[] {
  const hints: string[] = [];
  const q = question.replace(/\s+/g, ' ').trim();
  if (!q) return hints;
  if (
    /지금 가장 크게 해결하려는 불편|서비스 비용은 누가 지불|이 시장에 수요가 있다는 근거|실제로 가장 필요로 하는 사람|비슷한 역할을 이미 하고 있는 서비스|수익은 어떤 구조로/i.test(
      q,
    )
  ) {
    hints.push('stock-template-phrasing');
  }
  if (previousQuestions.some((pq) => pq && pq === question)) {
    hints.push('re-ask-same-question-text');
  }
  if (/왜 묻나요 · 이것만 확인되면/.test(purpose) && purpose.length < 80) {
    hints.push('generic-why-now-template');
  }
  return hints;
}

async function snap(
  page: Page,
  label: string,
  userAnswer: string,
  shotName?: string,
  notes?: string[],
): Promise<TurnSnap> {
  await page.waitForTimeout(600);
  const understanding = await textOrEmpty(page, 'surface-understanding');
  const decision = await textOrEmpty(page, 'surface-decision');
  const questionBlock = await textOrEmpty(page, 'surface-question');
  const purpose = await textOrEmpty(page, 'surface-question-purpose');
  const judgmentBlock = await textOrEmpty(page, 'current-judgment-block');
  const understandingDelta = await textOrEmpty(page, 'understanding-delta');
  let whyNow = purpose;
  const whyDetails = page.getByTestId('why-now-details');
  if (await whyDetails.isVisible().catch(() => false)) {
    const whyText = (await whyDetails.innerText()).trim();
    if (whyText) whyNow = whyText;
  }
  const coverageEl = page.getByTestId('understanding-coverage-percent');
  let coverageText = '';
  if (await coverageEl.isVisible().catch(() => false)) {
    coverageText = (await coverageEl.innerText()).trim();
  } else {
    const bodyForCov = await page.locator('body').innerText();
    const m = bodyForCov.match(/커버리지\s*\d+%|구체화도\s*\d+%|Specificity\s*\d+%/i);
    coverageText = m?.[0] ?? '';
  }
  const body = await page.locator('body').innerText();
  const gaps = await extractSpineFacts(page);
  const gapChangeNote =
    previousGaps && previousGaps !== gaps
      ? `changed vs prior snap`
      : previousGaps
        ? 'unchanged vs prior snap'
        : 'initial';
  previousGaps = gaps;

  let screenshot: string | undefined;
  if (shotName) {
    const p = path.join(MEDIA, shotName);
    await page.screenshot({ path: p, fullPage: true });
    screenshot = `docs/evidence/ALABOM/conversation-validation/core-v4/media/${shotName}`;
  }

  const prevQs = state.turns.map((t) => t.aiQuestion);
  const templateLikeHints = detectTemplateHints(questionBlock, purpose, prevQs);
  if (templateLikeHints.includes('re-ask-same-question-text')) {
    state.reAskSameQuestionCount += 1;
  }

  turnCounter += 1;
  const snapRow: TurnSnap = {
    turn: turnCounter,
    label,
    aiQuestion: questionBlock,
    purpose,
    whyNow,
    judgmentBlock,
    understandingDelta,
    userAnswer,
    understanding,
    decision,
    coverageText,
    storedFactsGaps: gaps,
    gapChangeNote,
    nextQuestion: '',
    nextQuestionReason: purpose,
    bodyExcerpt: body.slice(0, 5000),
    screenshot,
    notes,
    templateLikeHints,
  };
  if (templateLikeHints.length) {
    state.templateLikeTurns.push(turnCounter);
  }
  state.turns.push(snapRow);
  persist();
  return snapRow;
}

async function submitAnswer(page: Page, answer: string): Promise<boolean> {
  const ok = await ensureAnswerBox(page);
  if (!ok) return false;
  const box = page.locator('textarea').last();
  await box.fill(answer);
  const submit = page.getByRole('button', {
    name: /답변 반영|반영하기|Apply answer|Apply|제출/i,
  });
  await expect(submit.first()).toBeEnabled({ timeout: 10_000 });
  await submit.first().click();
  await page.waitForTimeout(600);
  const thinking = page.getByTestId('ai-pm-thinking-stages');
  if (await thinking.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await thinking.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => null);
  }
  await page.waitForTimeout(1_200);
  await dismissRecognition(page);
  persist();
  return true;
}

async function startSeedJourney(page: Page) {
  await page.goto('/demo/start', { waitUntil: 'domcontentloaded' });
  await dismissCookies(page);
  await page.getByRole('button', { name: /내 사업 문서로 체험하기/i }).click();
  await page.waitForTimeout(500);
  const area = page.locator('textarea').first();
  await area.fill(SEED);
  await area.dispatchEvent('input');
  const start = page.getByRole('button', { name: /AI Read 시작/i });
  await expect(start).toBeEnabled({ timeout: 15_000 });
  await start.click();
  await page.waitForTimeout(4_000);
  await dismissCookies(page);
}

async function confirmUnderstanding(page: Page) {
  await dismissCookies(page);
  const confirm = page.getByRole('button', {
    name: /맞습니다|That'?s right|That is right|Yes[,.]?\s*correct/i,
  });
  await confirm.first().waitFor({ state: 'visible', timeout: 90_000 });
  await dismissCookies(page);
  await confirm.first().click({ force: true });
  await page.waitForTimeout(2_500);
  await dismissCookies(page);
}

async function answerCurrent(
  page: Page,
  label: string,
  shot: string,
  forcedAnswer?: string,
  notes?: string[],
): Promise<TurnSnap | null> {
  const q = await textOrEmpty(page, 'surface-question');
  const body = await page.locator('body').innerText();
  const answer = pickAnswer(q, body, forcedAnswer);
  const submitted = await submitAnswer(page, answer);
  if (!submitted) {
    state.observations.push(`BLOCKED submit at ${label}`);
    await snap(page, `${label}-blocked`, answer, shot.replace('.png', '-blocked.png'), [
      ...(notes ?? []),
      'submit blocked',
    ]);
    return null;
  }
  await waitAsk(page);
  return snap(page, label, answer, shot, notes);
}

test.describe.configure({ mode: 'serial' });

test('CPO Core v4 prod journey capture', async ({ page, request }) => {
  test.setTimeout(540_000);

  const build = await request.get('/api/build-info');
  const buildJson = (await build.json()) as { data?: { commit?: string } };
  state.productionCommit = buildJson.data?.commit ?? '';
  state.shaMatch = FIX_SHA_PREFIXES.some((p) => state.productionCommit.startsWith(p));
  fs.writeFileSync(
    path.join(OUT, 'prod-build-info.json'),
    JSON.stringify(
      {
        commit: state.productionCommit,
        targetSha: FIX_SHA_PREFIXES.join('|'),
        shaMatch: state.shaMatch,
        at: state.at,
        source: 'GET /api/build-info',
      },
      null,
      2,
    ),
  );
  persist();

  try {
    await startSeedJourney(page);
    await snap(page, '01-after-ai-read', '(seed document)', '01-after-ai-read.png', [
      'New user Demo entry + document-based seed',
    ]);

    await confirmUnderstanding(page);
    await waitAsk(page);
    await snap(page, '02-q1-after-confirm', '(confirm ✓ 맞습니다)', '02-q1-ask.png');

    await answerCurrent(page, '03-after-problem', '03-after-problem.png', undefined, [
      'answer → understanding → next Q',
    ]);
    await answerCurrent(page, '04-after-payer-or-next', '04-after-payer.png', undefined, [
      'second substantive answer',
    ]);

    // Why / objection
    if (await ensureAnswerBox(page)) {
      await answerCurrent(page, '05-why-challenge', '05-why.png', BANK.whyChallenge, [
        'explicit why challenge',
      ]);
    }

    // Mid review (display-only)
    if (await ensureAnswerBox(page)) {
      await answerCurrent(page, '06-mid-review', '06-mid-review.png', BANK.midSummaryAsk, [
        'mid-summary display-only',
      ]);
    }

    // Prior answer edit
    const editBtn = page.getByRole('button', { name: /이전 답변 수정/i });
    if (await editBtn.first().isVisible().catch(() => false)) {
      await editBtn.first().click();
      await page.waitForTimeout(800);
      const pickFirst = page.getByRole('button').filter({ hasText: /문제|고객|지불|수익|경쟁/i });
      if (await pickFirst.first().isVisible().catch(() => false)) {
        await pickFirst.first().click();
        await page.waitForTimeout(1000);
      }
      if (await ensureAnswerBox(page)) {
        await answerCurrent(page, '07-prior-edit', '07-prior-edit.png', BANK.editCorrection, [
          'prior answer edit supersedes judgment',
        ]);
      }
    } else {
      state.observations.push('prior-edit affordance not visible');
    }

    // Continue with distinct answers — competition / differentiation
    let loops = 0;
    let sawCompetitor = false;
    let sawDiff = false;
    let sawRevenue = false;
    while (loops < 8 && (await ensureAnswerBox(page))) {
      loops += 1;
      const q = await textOrEmpty(page, 'surface-question');
      const body = await page.locator('body').innerText();
      let forced: string | undefined;
      if (/수익|수수료|구조로 발생/i.test(q) && !sawRevenue) {
        forced = BANK.revenue;
        sawRevenue = true;
      } else if (/비슷한 역할|경쟁|이미 하고 있는|대체|대안/i.test(q + body) && !sawCompetitor) {
        forced = BANK.competitor;
        sawCompetitor = true;
      } else if (/차별|다른 점|왜 선택/i.test(q + body) && !sawDiff) {
        forced = BANK.differentiation;
        sawDiff = true;
      }
      const label =
        forced === BANK.competitor
          ? `08-competition-l${loops}`
          : forced === BANK.differentiation
            ? `09-differentiation-l${loops}`
            : forced === BANK.revenue
              ? `08-revenue-l${loops}`
              : `08-continue-l${loops}`;
      const shot =
        forced === BANK.competitor
          ? '08-competition.png'
          : forced === BANK.differentiation
            ? '09-differentiation.png'
            : forced === BANK.revenue
              ? '08-revenue.png'
              : `08-continue-l${loops}.png`;
      await answerCurrent(page, label, shot, forced);
      if (await isFinalReviewSurface(page)) break;
    }

    if ((await ensureAnswerBox(page)) && !sawCompetitor) {
      await answerCurrent(page, '08b-force-competition', '08-competition.png', BANK.competitor);
      sawCompetitor = true;
    }
    if ((await ensureAnswerBox(page)) && !sawDiff) {
      await answerCurrent(page, '09b-force-differentiation', '09-differentiation.png', BANK.differentiation);
      sawDiff = true;
    }

    let drain = 0;
    while (drain < 4 && (await ensureAnswerBox(page))) {
      drain += 1;
      await answerCurrent(page, `10-drain-l${drain}`, `10-drain-l${drain}.png`);
      if (await isFinalReviewSurface(page)) break;
    }

    const overview = page.getByRole('button', { name: /개요|Overview/i });
    if (await overview.first().isVisible().catch(() => false)) {
      await overview.first().click();
      await page.waitForTimeout(900);
    }
    const suf = await snap(page, '11-sufficiency', '(overview / sufficiency)', '11-sufficiency.png');
    const bodySuf = await page.locator('body').innerText();
    const finalVisible = await page
      .getByTestId('conversational-final-output')
      .isVisible()
      .catch(() => false);
    const readyReview =
      /Ready for review|검토\s*시작|사업성\s*검토|충분|Core understanding is sufficient|Understanding is sufficient|start analysis|1차 사업성 검토/i.test(
        bodySuf,
      );
    state.finalReviewReachable = finalVisible || readyReview;
    state.observations.push(
      `Sufficiency: coverage=${suf.coverageText || '(see body)'}; finalVisible=${finalVisible}; readyReviewCopy=${readyReview}`,
    );

    const startAnalysis = page.getByRole('button', {
      name: /That's right — start analysis|맞습니다.*분석|start analysis/i,
    });
    if (await startAnalysis.first().isVisible().catch(() => false)) {
      await startAnalysis.first().click();
      await page.waitForTimeout(5_000);
      await snap(page, '12-final-viability', '(clicked start analysis)', '12-final-review.png');
      const bodyAfter = await page.locator('body').innerText();
      state.finalReviewReachable =
        state.finalReviewReachable ||
        /GO|HOLD|판단|분석|Workflow|검토|decision|사업성|1차 사업성/i.test(bodyAfter);
      state.observations.push(
        `After start-analysis: review-like=${/GO|HOLD|판단|Workflow|검토|사업성/i.test(bodyAfter)}`,
      );
    }

    for (let i = 0; i < state.turns.length - 1; i++) {
      if (!state.turns[i]!.nextQuestion) {
        state.turns[i]!.nextQuestion = state.turns[i + 1]!.aiQuestion;
        if (!state.turns[i]!.nextQuestionReason) {
          state.turns[i]!.nextQuestionReason =
            state.turns[i + 1]!.purpose || state.turns[i + 1]!.whyNow;
        }
      }
    }

    for (const t of state.turns) {
      if (
        /차별점|경쟁|클룩|트립/.test(t.userAnswer) &&
        /CUSTOMER[^\n]{0,160}(차별|클룩|트립|경쟁)/i.test(t.bodyExcerpt + '\n' + t.storedFactsGaps)
      ) {
        t.templateLikeHints = [...(t.templateLikeHints ?? []), 'wrong-slot-comp-into-customer'];
        t.notes = [...(t.notes ?? []), 'competitor/diff text observed under CUSTOMER spine'];
        state.wrongSlotHints.push(`turn ${t.turn}: competitor/diff → CUSTOMER`);
        if (!state.templateLikeTurns.includes(t.turn)) state.templateLikeTurns.push(t.turn);
      }
      if (/정의\]/.test(t.storedFactsGaps + t.bodyExcerpt)) {
        t.templateLikeHints = [...(t.templateLikeHints ?? []), 'customer-slot-corruption-정의'];
        state.wrongSlotHints.push(`turn ${t.turn}: CUSTOMER shows 정의]`);
      }
    }

    state.observations.push(`reAskSameQuestionCount=${state.reAskSameQuestionCount}`);
    state.observations.push(`wrongSlotHints=${state.wrongSlotHints.length}`);
    persist();
    expect(state.productionCommit.length).toBeGreaterThan(6);
    if (!state.shaMatch) {
      state.observations.push(
        `DEPLOY LAG: prod=${state.productionCommit} expected one of ${FIX_SHA_PREFIXES.join(', ')}`,
      );
    }
    expect(state.turns.length).toBeGreaterThan(4);
  } finally {
    persist();
  }
});
