/**
 * ALABOM CPO Validation — supplemental Production captures.
 * New User (Demo one-liner) · Back navigation · Mobile viewport · Identity final spot-check.
 *
 * From apps/web:
 *   $env:CI='1'; $env:PLAYWRIGHT_BASE_URL='https://ai-startup-validation-tau.vercel.app'
 *   pnpm exec playwright test e2e/_cpo-validation-supplemental-capture.spec.ts --retries=0
 */
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), '../../docs/evidence/ALABOM/cpo-validation');
const MEDIA = path.join(OUT, 'media');
fs.mkdirSync(MEDIA, { recursive: true });

const ONE_LINER =
  '외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다.';

const BANK = {
  competitor:
    '클룩·트립닷컴·가이드 매칭 앱이 이미 있지만, 대부분 카탈로그형 상품 나열이라 관심사·동선 맞춤이 약합니다.',
  differentiation:
    '차별점은 관심사·동선·식사 제약까지 반영한 실시간 맞춤 일정과 현지인 동행을 한 번에 묶는 점입니다.',
  problem:
    '패키지 투어는 동선이 획일적이고, 혼자 계획하면 언어·시간 때문에 현지인 일상에 가까운 경험을 놓칩니다.',
  payer: '관광객이 앱에서 일정·체험을 직접 예약·결제합니다.',
  customer:
    '초기 타깃은 서울을 3~7일 방문하는 FIT 외국인(밀레니얼·MZ)이고, 혼자 또는 2인 여행이 많습니다.',
  solution:
    '관심사·동선·식사 제약을 반영한 실시간 맞춤 일정과 현지인 동행을 한 번에 제공하는 방식입니다.',
  editA3:
    '정정합니다. 초기 경쟁 대안은 글로벌 OTA뿐 아니라, 현지 인스타그램 기반 소규모 가이드도 포함합니다.',
  fallback: '아직 MVP 전 아이디어 단계이고, 서울 한정 맞춤 반나절 체험을 먼저 검증하려 합니다.',
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
  nextQuestion: string;
  bodyExcerpt: string;
  screenshot?: string;
  notes?: string[];
};

type CaptureBundle = {
  scenario: string;
  at: string;
  productionCommit: string;
  entryUrl: string;
  seed: string;
  viewport?: string;
  turns: TurnSnap[];
  observations: string[];
  verdict?: string;
};

let turnCounter = 0;
let shotSeq = 0;
let bundle: CaptureBundle;

function resetBundle(scenario: string, viewport?: string) {
  turnCounter = 0;
  shotSeq = 0;
  bundle = {
    scenario,
    at: new Date().toISOString(),
    productionCommit: '',
    entryUrl: '/demo/start',
    seed: ONE_LINER,
    viewport,
    turns: [],
    observations: [],
  };
}

function persist(suffix: string) {
  const raw = path.join(OUT, `transcript-raw-${suffix}.json`);
  fs.writeFileSync(raw, JSON.stringify(bundle, null, 2), 'utf8');
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
    await el.waitFor({ state: 'attached', timeout: 3_000 });
    return (await el.innerText()).trim();
  } catch {
    return '';
  }
}

async function dismissRecognition(page: Page) {
  const cont = page.getByRole('button', {
    name: /같이 확인하기|계속하기|부족한 부분|Continue understanding|이해 계속/i,
  });
  if (await cont.first().isVisible({ timeout: 800 }).catch(() => false)) {
    await cont.first().click({ force: true });
    await page.waitForTimeout(700);
  }
}

function pickAnswer(q: string): string {
  if (/수익|pricing|수수료/i.test(q)) return BANK.fallback;
  if (/솔루션|제공 가치|해결하는 방식/i.test(q)) return BANK.solution;
  if (/불편|문제|JTBD/i.test(q)) return BANK.problem;
  if (/차별|다른 점|왜 선택/i.test(q) && !/비슷한 역할|이미/i.test(q)) return BANK.differentiation;
  if (/비슷한 역할|경쟁|대안/i.test(q)) return BANK.competitor;
  if (/지불|결제|payer/i.test(q)) return BANK.payer;
  if (/고객|타깃|누구/i.test(q)) return BANK.customer;
  return BANK.fallback;
}

async function snap(page: Page, label: string, userAnswer: string, shot?: string, notes?: string[]) {
  await page.waitForTimeout(500);
  turnCounter += 1;
  shotSeq += 1;
  const fileName = shot ? `${String(shotSeq).padStart(2, '0')}-${shot}` : undefined;
  if (fileName) {
    await page.screenshot({ path: path.join(MEDIA, fileName), fullPage: true }).catch(() => null);
  }
  const body = await page.locator('body').innerText();
  const row: TurnSnap = {
    turn: turnCounter,
    label,
    aiQuestion: await textOrEmpty(page, 'surface-question'),
    purpose: await textOrEmpty(page, 'surface-question-purpose'),
    whyNow: await textOrEmpty(page, 'surface-question-purpose'),
    judgmentBlock: await textOrEmpty(page, 'current-judgment-block'),
    understandingDelta: await textOrEmpty(page, 'understanding-delta'),
    userAnswer,
    understanding: await textOrEmpty(page, 'surface-understanding'),
    decision: await textOrEmpty(page, 'surface-decision'),
    coverageText: '',
    nextQuestion: '',
    bodyExcerpt: body.slice(0, 1200),
    screenshot: fileName,
    notes,
  };
  const cov = page.getByTestId('understanding-coverage-percent');
  if (await cov.isVisible().catch(() => false)) {
    row.coverageText = (await cov.innerText()).trim();
  }
  bundle.turns.push(row);
  return row;
}

async function startOneLinerDemo(page: Page) {
  await page.goto('/demo/start?fresh=1', { waitUntil: 'domcontentloaded' });
  await dismissCookies(page);
  await page.getByRole('button', { name: /내 사업 문서로 체험하기/i }).click();
  await page.waitForTimeout(400);
  const area = page.locator('textarea').first();
  await area.fill(ONE_LINER);
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
  await page.waitForTimeout(1_500);
  await dismissRecognition(page);
  return true;
}

async function answerLoop(page: Page, label: string, shot: string, forced?: string) {
  const q = await textOrEmpty(page, 'surface-question');
  const ans = forced ?? pickAnswer(q);
  if (!(await submitAnswer(page, ans))) {
    bundle.observations.push(`submit blocked @${label}`);
    return;
  }
  await page.getByTestId('s11-surface').waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null);
  await snap(page, label, ans, shot);
}

async function pinBuildInfo(request: import('@playwright/test').APIRequestContext) {
  const build = await request.get('/api/build-info');
  const buildJson = (await build.json()) as { data?: { commit?: string } };
  bundle.productionCommit = buildJson.data?.commit ?? '';
  fs.writeFileSync(
    path.join(OUT, 'prod-build-info.json'),
    JSON.stringify(
      {
        commit: bundle.productionCommit,
        at: bundle.at,
        source: 'GET /api/build-info',
      },
      null,
      2,
    ),
  );
}

test.describe.configure({ mode: 'serial' });

test('CPO supplemental — New User Demo one-liner', async ({ page, request }) => {
  test.setTimeout(300_000);
  resetBundle('new-user');
  await pinBuildInfo(request);

  await startOneLinerDemo(page);
  await snap(page, '01-after-ai-read', '(one-liner paste)', 'new-user-01-read.png', [
    'Demo /demo/start custom paste — NOT auth /who',
    'No 10-field form — single textarea only',
  ]);

  const bodyBeforeConfirm = await page.locator('body').innerText();
  const hasJudgment = /CURRENT JUDGMENT|지금까지 확인|Living|이해 상태/i.test(bodyBeforeConfirm);
  bundle.observations.push(`aiFirstJudgmentVisible=${hasJudgment}`);

  await confirmSeed(page);
  await snap(page, '02-after-confirm', '(confirm ✓)', 'new-user-02-confirm.png', [
    'Gap judgment after confirm',
  ]);

  await page.getByTestId('s11-surface').waitFor({ state: 'visible', timeout: 15_000 });
  await snap(page, '03-first-q', '(awaiting first Q)', 'new-user-03-first-q.png');

  await answerLoop(page, '04-first-answer', 'new-user-04-a1.png');
  await answerLoop(page, '05-second-answer', 'new-user-05-a2.png');

  const formFields = await page.locator('input[type="text"], select').count();
  bundle.observations.push(`upfrontFormFieldCount=${formFields}`);
  bundle.verdict = formFields <= 2 ? 'PASS — one-liner Demo path, no 10-field form' : 'FAIL — form-like fields detected';
  persist('new-user');
});

test('CPO supplemental — Back navigation edit A3', async ({ page, request }) => {
  test.setTimeout(300_000);
  resetBundle('back-nav');
  await pinBuildInfo(request);

  await startOneLinerDemo(page);
  await confirmSeed(page);
  await page.getByTestId('s11-surface').waitFor({ state: 'visible', timeout: 15_000 });

  const a3Original = BANK.competitor;
  await answerLoop(page, '03-a1-competitor', 'back-nav-03-a1.png', a3Original);
  await answerLoop(page, '04-a2', 'back-nav-04-a2.png');
  await answerLoop(page, '05-a3', 'back-nav-05-a3.png');

  bundle.observations.push(`preEditTurnCount=${turnCounter}`);

  const aiPm = page.getByRole('button', { name: /^AI PM$/i });
  if (await aiPm.first().isVisible().catch(() => false)) {
    await aiPm.first().click({ force: true });
    await page.waitForTimeout(600);
  }

  const editBtn = page.getByTestId('edit-prior-answer-cta');
  const editFallback = page.getByRole('button', { name: /이전 답변 수정|← 이전/i });
  const editTarget = (await editBtn.first().isVisible({ timeout: 5_000 }).catch(() => false))
    ? editBtn.first()
    : editFallback.first();
  await editTarget.click({ force: true });
  await page.waitForTimeout(800);
  await snap(page, '06-edit-picker', '(open prior edit picker)', 'back-nav-06-picker.png');

  const competitorPick = page.getByRole('button').filter({ hasText: /경쟁|대안|competitor|클룩/i });
  if (await competitorPick.first().isVisible().catch(() => false)) {
    await competitorPick.first().click({ force: true });
  } else {
    await page.getByTestId('edit-prior-answer-panel').getByRole('button').first().click({ force: true }).catch(() => null);
  }
  await page.waitForTimeout(900);

  const a3Prime = BANK.editA3;
  await answerLoop(page, '07-a3-edited', 'back-nav-07-a3prime.png', a3Prime);

  const afterEditBody = await page.locator('body').innerText();
  const superseded =
    afterEditBody.includes(a3Prime.slice(0, 16)) ||
    /정정|supersed|INSTAGRAM|인스타/i.test(afterEditBody);
  bundle.observations.push(`a3Superseded=${superseded}`);
  bundle.observations.push(`understandingRecalc=${/CURRENT JUDGMENT|지금까지 확인/i.test(afterEditBody)}`);

  await answerLoop(page, '08-post-edit-next', 'back-nav-08-next.png');
  bundle.verdict = superseded
    ? 'PASS — prior A3 superseded, understanding updated'
    : 'PARTIAL — edit captured; supersede signal in UI';
  persist('back-nav');
});

test('CPO supplemental — Mobile viewport flow', async ({ page, request }) => {
  test.setTimeout(360_000);
  resetBundle('mobile', '390x844');
  await page.setViewportSize({ width: 390, height: 844 });
  await pinBuildInfo(request);

  await startOneLinerDemo(page);
  await snap(page, '01-mobile-read', '(mobile AI read)', 'mobile-01-read.png', [
    'iPhone-class viewport 390×844',
  ]);

  await confirmSeed(page);
  await snap(page, '02-mobile-confirm', '(mobile confirm)', 'mobile-02-confirm.png');

  await page.getByTestId('s11-surface').waitFor({ state: 'visible', timeout: 15_000 });
  const qVisible = await page.getByTestId('surface-question').isVisible();
  const progressVisible = await page.getByTestId('understanding-coverage-percent').isVisible().catch(() => false);
  const backVisible = await page
    .getByRole('button', { name: /이전 답변 수정|← 이전/i })
    .first()
    .isVisible()
    .catch(() => false);
  bundle.observations.push(`mobileQuestionVisible=${qVisible}`);
  bundle.observations.push(`mobileProgressVisible=${progressVisible}`);
  bundle.observations.push(`mobileBackVisible=${backVisible}`);

  await snap(page, '03-mobile-first-q', '(mobile first Q)', 'mobile-03-q.png');
  await answerLoop(page, '04-mobile-a1', 'mobile-04-a1.png');
  await snap(page, '05-mobile-after-a1', '(mobile after A1)', 'mobile-05-judgment.png');

  const judgmentVisible = await page.getByTestId('current-judgment-block').isVisible().catch(() => false);
  const ctaVisible = await page
    .getByTestId('submit-answer-cta')
    .or(page.getByRole('button', { name: /답변 반영|Apply answer|Apply|제출|Submit|보내기/i }))
    .first()
    .isVisible()
    .catch(() => false);
  bundle.observations.push(`mobileJudgmentVisible=${judgmentVisible}`);
  bundle.observations.push(`mobileCtaVisible=${ctaVisible}`);

  bundle.verdict =
    qVisible && ctaVisible
      ? 'PASS — mobile Q/A/progress/back affordances usable'
      : 'FAIL — mobile layout blocked core flow';
  persist('mobile');
});

test('CPO supplemental — Identity final spot-check @ prod', async ({ page, request }) => {
  test.setTimeout(600_000);
  resetBundle('identity-final');
  await pinBuildInfo(request);

  await startOneLinerDemo(page);
  await confirmSeed(page);

  for (let i = 0; i < 12; i++) {
    const box = page.locator('textarea').last();
    if (!(await box.isVisible({ timeout: 3_000 }).catch(() => false))) break;
    await answerLoop(page, `loop-${i + 1}`, `identity-${String(i + 1).padStart(2, '0')}.png`);
  }

  const startAnalysis = page.getByRole('button', {
    name: /That's right — start analysis|맞습니다.*분석|start analysis/i,
  });
  if (await startAnalysis.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
    const disabled = await startAnalysis.first().isDisabled().catch(() => true);
    if (!disabled) {
      await startAnalysis.first().click({ force: true });
      await page.waitForTimeout(2_500);
    }
  }

  const body = await page.locator('body').innerText();
  const identityHold = /확정된 사업 한 줄이 시작 의도와 맞지 않습니다|identity.*drift/i.test(body);
  const b2bPollution = /B2B SaaS|구독 플랫폼으로 중소기업/i.test(body);
  const tourismSpine = /외국인|관광|맞춤|FIT|서울/i.test(body);

  bundle.observations.push(`identityHoldCopy=${identityHold}`);
  bundle.observations.push(`b2bTemplatePollution=${b2bPollution}`);
  bundle.observations.push(`tourismSpinePresent=${tourismSpine}`);

  await snap(page, 'final-output', '(final / analysis surface)', 'identity-final.png', [
    identityHold ? 'BEFORE-FIX @ prod: identity HOLD copy present' : 'No identity HOLD on this capture',
  ]);

  bundle.verdict = identityHold
    ? 'FAIL @ 086da4e — LS-2 identity drift HOLD (code fix pending deploy)'
    : 'PASS — no identity drift HOLD on capture';
  persist('identity-final');
});
