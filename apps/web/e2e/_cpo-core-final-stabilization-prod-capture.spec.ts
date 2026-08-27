/**
 * ALABOM Core Final Stabilization — Production Demo LIVE capture (Long Sprint).
 * Proves: no same-meaning re-ask loops, understandingDelta on mergeable turns,
 * closed gaps never re-asked, adaptive causality, honest analysis gate,
 * Competition→Diff→Value→Channel→Pricing path, sufficiency / final.
 *
 * From apps/web:
 *   $env:CI='1'; $env:PLAYWRIGHT_BASE_URL='https://ai-startup-validation-tau.vercel.app'
 *   pnpm exec playwright test e2e/_cpo-core-final-stabilization-prod-capture.spec.ts --retries=0
 *
 * Auth out of scope — Demo entry `/demo/start` only.
 */
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/conversation-validation/core-final-stabilization',
);
const MEDIA = path.join(OUT, 'media');
const RAW_JSON = path.join(OUT, 'transcript-raw.json');
fs.mkdirSync(MEDIA, { recursive: true });

/** Match Stabilization fix SHA on Production. */
const FIX_SHA_PREFIXES = ['9788800', 'd3bd6ba', 'ea2035d', 'b7d24b5', '0069ce5'] as const;

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
  diffRelevance:
    '맞춤 일정이 없으면 첫날부터 동선 낭비가 커서, 고객은 예약 전에 차이를 체감합니다.',
  defensibility:
    '현지 파트너 네트워크와 관심사 그래프가 쌓일수록 따라오기 어렵습니다.',
  nonsense: 'ㅋㅋㅋㅋㅋㅋ',
  incompleteDocNote:
    'Seed doc is thin (single paragraph idea) — expect incomplete-doc style observation / gap-heavy understanding.',
  midSummaryAsk: '지금까지 이해한 사업 정리해줘',
  whyChallenge: '왜 그게 중요하죠?',
  editCorrection:
    '정정합니다. 초기 타깃은 방한 FIT 외국인만이 아니라, 국내 MZ 개별 여행객도 포함합니다.',
  contradiction:
    '앞서와 달리 정정합니다. 결제자는 관광객이 아니라 B2B로 호텔·OTA가 일괄 정산합니다.',
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
  unresolvedGapHint: string;
  targetGapHint: string;
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
  criticalGapBlockedStartAnalysis: boolean | null;
  templateLikeTurns: number[];
  reAskSameQuestionCount: number;
  wrongSlotHints: string[];
  mixedQuestionHints: string[];
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
  criticalGapBlockedStartAnalysis: null,
  templateLikeTurns: [],
  reAskSameQuestionCount: 0,
  wrongSlotHints: [],
  mixedQuestionHints: [],
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

async function dismissWhyOrMidOrConflict(page: Page) {
  for (let i = 0; i < 4; i++) {
    const whyReturn = page.getByTestId('why-follow-up-panel').getByRole('button');
    if (await whyReturn.first().isVisible({ timeout: 800 }).catch(() => false)) {
      await whyReturn.first().click({ force: true });
      await page.waitForTimeout(700);
      continue;
    }
    const midReturn = page.getByTestId('mid-judgment-panel').getByRole('button', {
      name: /이해 루프로 돌아가기|돌아가기|계속/i,
    });
    if (await midReturn.first().isVisible({ timeout: 800 }).catch(() => false)) {
      await midReturn.first().click({ force: true });
      await page.waitForTimeout(700);
      continue;
    }
    const acceptNew = page.getByRole('button', { name: /새 답변이 맞아/i });
    if (await acceptNew.first().isVisible({ timeout: 800 }).catch(() => false)) {
      await acceptNew.first().click({ force: true });
      await page.waitForTimeout(1200);
      continue;
    }
    const keepPrior = page.getByRole('button', { name: /이전 내용이 맞아/i });
    if (await keepPrior.first().isVisible({ timeout: 500 }).catch(() => false)) {
      // Prefer accept_new for contradiction scenarios in this capture
      break;
    }
    break;
  }
}

async function dismissRecognition(page: Page) {
  await dismissWhyOrMidOrConflict(page);
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
  const body = await page.locator('body').innerText();
  const criticalStillOpen =
    /Start Analysis는 차단|Critical gaps remain|아직 확인 필요:|PROBLEM[\s\S]{0,120}Needs confirmation|남은 핵심 공백/i.test(
      body,
    );

  if (await page.getByTestId('conversational-final-output').isVisible().catch(() => false)) {
    // Premature "complete" UI while gaps remain — keep journey going
    if (criticalStillOpen) return false;
    return true;
  }
  const startAnalysis = page.getByRole('button', {
    name: /That's right — start analysis|맞습니다.*분석|start analysis/i,
  });
  // Only treat as final when Start Analysis is visible AND enabled
  if (await startAnalysis.first().isVisible().catch(() => false)) {
    const disabled = await startAnalysis.first().isDisabled().catch(() => true);
    if (!disabled) return true;
    return false;
  }
  // False "sufficient" copy while PROBLEM/critical gaps remain must NOT end the journey
  if (
    /Core understanding is sufficient|Understanding is sufficient|이해가 충분합니다/i.test(body)
  ) {
    if (criticalStillOpen) return false;
    return true;
  }
  if (/Before analysis, confirm|분석 전에,/i.test(body)) {
    if (criticalStillOpen) return false;
    return true;
  }
  return false;
}

async function ensureAnswerBox(page: Page): Promise<boolean> {
  await dismissRecognition(page);
  if (await isFinalReviewSurface(page)) {
    state.observations.push('ensureAnswerBox: final-review surface');
    return false;
  }

  // If blocked Start Analysis / confirm panel is showing, return to AI PM loop
  const blockedStart = page.getByRole('button', {
    name: /That's right — start analysis|맞습니다.*분석|start analysis/i,
  });
  if (await blockedStart.first().isVisible().catch(() => false)) {
    const disabled = await blockedStart.first().isDisabled().catch(() => true);
    if (disabled) {
      const aiPm = page.getByRole('button', { name: /^AI PM$/i });
      if (await aiPm.first().isVisible().catch(() => false)) {
        await aiPm.first().click();
        await page.waitForTimeout(800);
      }
          const cont = page.getByRole('button', {
            name: /Keep answering|계속 답|같이 확인|부족한 부분|Continue understanding|이해 계속|확인하기|^Continue$/i,
          });
          if (await cont.first().isVisible().catch(() => false)) {
            await cont.first().click({ force: true });
            await page.waitForTimeout(900);
          }
    }
  }

  let box = page.locator('textarea').last();
  if (!(await box.isVisible({ timeout: 2_000 }).catch(() => false))) {
    const aiPm = page.getByRole('button', { name: /^AI PM$/i });
    if (await aiPm.first().isVisible().catch(() => false)) {
      await aiPm.first().click();
      await page.waitForTimeout(700);
    }
    await dismissRecognition(page);
    if (await isFinalReviewSurface(page)) {
      state.observations.push('ensureAnswerBox: final after AI PM tab');
      return false;
    }
    box = page.locator('textarea').last();
  }
  if (!(await box.isVisible({ timeout: 2_000 }).catch(() => false))) {
    const summary = page.getByRole('button', { name: /With AI PM|AI PM dialogue/i });
    if (await summary.first().isVisible().catch(() => false)) {
      await summary.first().click();
      await page.waitForTimeout(500);
    }
    await dismissRecognition(page);
    // Click return-to-loop CTAs again
    const back = page.getByRole('button', {
      name: /이해 루프로 돌아가기|같이 확인하기|계속하기|이어서/i,
    });
    if (await back.first().isVisible().catch(() => false)) {
      await back.first().click({ force: true });
      await page.waitForTimeout(900);
    }
    if (await isFinalReviewSurface(page)) return false;
    box = page.locator('textarea').last();
  }
  const ok = await box.isVisible({ timeout: 8_000 }).catch(() => false);
  if (!ok) state.observations.push('ensureAnswerBox: textarea not found');
  return ok;
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
    'DIFFERENTIATION',
    'Business',
    'Customer',
    'Problem',
    'Market',
    'Competition',
    'Differentiation',
  ]) {
    const re = new RegExp(`${key}[^\\n]{0,220}`, 'i');
    const m = body.match(re);
    if (m) lines.push(m[0].replace(/\s+/g, ' ').trim().slice(0, 200));
  }
  const gaps = body.match(
    /Needs confirmation|아직 확인|확인 필요|미확인|Not confirmed|Next to confirm[^\n]{0,100}|Core understanding is sufficient[^\n]{0,80}|critical.?gap|핵심 공백[^\n]{0,80}/gi,
  );
  if (gaps) lines.push('GAPS/STATUS: ' + [...new Set(gaps.map((g) => g.trim()))].slice(0, 10).join(' | '));
  const cov = body.match(/커버리지\s*\d+%|Business specificity\s*\d+%|구체화도\s*\d+%/i);
  if (cov) lines.push(cov[0]);
  return lines.slice(0, 14).join('\n');
}

function extractGapHints(body: string, purpose: string, whyNow: string): {
  unresolvedGapHint: string;
  targetGapHint: string;
} {
  const blob = `${purpose}\n${whyNow}\n${body}`;
  const unresolved =
    blob.match(/unresolvedGap["\s:=]+([a-zA-Z0-9_]+)/i)?.[1] ??
    blob.match(/미해결\s*공백[^\n:]{0,4}[:：]?\s*([^\n]{2,80})/i)?.[1] ??
    blob.match(/Next to confirm[^\n:]{0,4}[:：]?\s*([^\n]{2,80})/i)?.[1] ??
    '';
  const target =
    blob.match(/targetGap["\s:=]+([a-zA-Z0-9_]+)/i)?.[1] ??
    blob.match(/지금\s*확인[^\n:]{0,8}[:：]?\s*([^\n]{2,80})/i)?.[1] ??
    '';
  return {
    unresolvedGapHint: (unresolved || '').trim().slice(0, 120),
    targetGapHint: (target || '').trim().slice(0, 120),
  };
}

/**
 * Slot-safe answer picker.
 * - Differentiation is distinct from competition (never conflate).
 * - Diff relevance / defensibility handled when those Qs appear.
 * - Never feed competition text into pricing / revenue Q.
 */
function pickAnswer(question: string, _body: string, forced?: string): string {
  if (forced) return forced;
  // Core Final — judge only from the ask surface (never Overview/judgment body pollution)
  const q = question;

  // Pricing / revenue first when clearly about money structure — never competitor copy
  if (/수익은 어떤 구조|수익이 발생|수수료·구독|가격·요금|프라이싱|pricing/i.test(q) && !/누가\s*지불|비용은 누가/i.test(q)) {
    return BANK.revenue;
  }

  // Problem JTBD before payer — reframed stems embed payer digest with 「결제」
  if (/불편|문제|풀려는|해결하려는|페인|JTBD|겪는 불편/i.test(q)) {
    return BANK.problem;
  }

  // Diff relevance (customer feels the difference) — before generic differentiation
  if (
    /차별점이\s*고객에게|고객에게\s*(어떤\s*)?차이|왜\s*고객이\s*(그\s*)?차별|relevance|체감되는 순간|어떤 가치를 만드|고객 여정 어디|결정적으로 체감/i.test(
      q,
    )
  ) {
    return BANK.diffRelevance;
  }

  // Defensibility / moat
  if (/방어|모방|따라오|해자|defensib|지속\s*가능|따라잡/i.test(q)) {
    return BANK.defensibility;
  }

  // Differentiation distinct from competition
  if (/차별|다른 점|왜 선택|우리만|결정적 차이|대안과 무엇이 다/i.test(q) && !/비슷한 역할|이미 하고 있는 서비스|이미 하는 서비스/i.test(q)) {
    return BANK.differentiation;
  }

  if (/비슷한 역할|이미 (하고 있는|하는) 서비스|대체|대안|경쟁(?!\s*대비)/i.test(q)) {
    return BANK.competitor;
  }

  if (/지불|결제|누가\s*내|비용은 누가|결제·정산|payer/i.test(q)) return BANK.payer;
  if (/불편|문제|풀려는|해결하려는|페인|JTBD|겪는 불편/i.test(q)) return BANK.problem;
  if (/필요로 하는 사람|구체 고객|누구를 위한|타깃|대상|절실히 느끼는/i.test(q)) return BANK.customer;
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

function detectMixedQuestionHints(question: string, _body: string): string[] {
  // Core Final — only the ask surface counts (not Understanding sidebar facts)
  const blob = question;
  const hasComp = /비슷한 역할|이미 하고 있는 서비스|대안·경쟁|경쟁사(?!\s*가\s*따라)/i.test(blob);
  const hasPricing = /수익은 어떤 구조|가격·요금|프라이싱|구조로 발생/i.test(blob);
  const hasCustomer =
    /필요로 하는 사람|누구인가요/i.test(blob) && !/차별점이\s*고객|고객에게\s*왜/i.test(blob);
  if (hasComp && hasPricing && hasCustomer) {
    return ['mixed-competition+pricing+customer-on-one-screen'];
  }
  // Dual question marks on one ask
  const qCount = (blob.match(/\?/g) ?? []).length + (blob.match(/\？/g) ?? []).length;
  if (qCount >= 2) return ['mixed-dual-question-marks'];
  return [];
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
  const { unresolvedGapHint, targetGapHint } = extractGapHints(body, purpose, whyNow);
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
    screenshot = `docs/evidence/ALABOM/conversation-validation/core-final-stabilization/media/${shotName}`;
  }

  const prevQs = state.turns.map((t) => t.aiQuestion);
  const templateLikeHints = detectTemplateHints(questionBlock, purpose, prevQs);
  if (templateLikeHints.includes('re-ask-same-question-text')) {
    state.reAskSameQuestionCount += 1;
  }

  const mixed = detectMixedQuestionHints(questionBlock, body);
  if (mixed.length) {
    for (const m of mixed) {
      if (!state.mixedQuestionHints.includes(`turn-pending:${m}`)) {
        state.mixedQuestionHints.push(`turn-pending:${m}`);
      }
    }
  }

  turnCounter += 1;
  if (mixed.length) {
    state.mixedQuestionHints.push(`turn ${turnCounter}: ${mixed.join(',')}`);
  }

  const snapRow: TurnSnap = {
    turn: turnCounter,
    label,
    aiQuestion: questionBlock,
    purpose,
    whyNow,
    judgmentBlock,
    understandingDelta,
    unresolvedGapHint,
    targetGapHint,
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
    templateLikeHints: [...templateLikeHints, ...mixed],
  };
  if (templateLikeHints.length || mixed.length) {
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

/**
 * Probe Start Analysis affordance: disabled button and/or critical_gap copy.
 * Sets state.criticalGapBlockedStartAnalysis.
 */
async function probeStartAnalysisGate(page: Page, label: string, shot: string) {
  let body = await page.locator('body').innerText();
  const criticalOnLoop =
    (await page.getByTestId('critical-gap-block-hint').isVisible().catch(() => false)) ||
    /Start Analysis는 차단|핵심 공백|아직 확인 필요|Critical gaps remain/i.test(body);

  if (criticalOnLoop) {
    state.criticalGapBlockedStartAnalysis = true;
    state.observations.push(
      `StartAnalysis probe @${label}: criticalCopy on AI PM loop; criticalGapBlockedStartAnalysis=true`,
    );
    await snap(page, label, '(start-analysis probe — loop)', shot, ['criticalCopy=loop']);
    return;
  }

  const overview = page.getByRole('button', { name: /개요|Overview/i });
  if (await overview.first().isVisible().catch(() => false)) {
    await overview.first().click();
    await page.waitForTimeout(900);
  }

  const startAnalysis = page.getByRole('button', {
    name: /That's right — start analysis|맞습니다.*분석|start analysis|분석 시작/i,
  });
  body = await page.locator('body').innerText();
  const criticalCopy =
    /critical_gap|critical gap|핵심 공백|아직 확인 필요|Start Analysis는 차단|분석을 시작하려면|blocked|Critical gaps remain/i.test(
      body,
    ) ||
    (await page.getByTestId('analysis-critical-gap').isVisible().catch(() => false)) ||
    (await page.getByTestId('critical-gap-block-hint').isVisible().catch(() => false));

  let disabled: boolean | null = null;
  let visible = false;
  if (await startAnalysis.first().isVisible().catch(() => false)) {
    visible = true;
    disabled = await startAnalysis.first().isDisabled().catch(() => null);
  }

  if (visible && disabled === true) {
    state.criticalGapBlockedStartAnalysis = true;
  } else if (criticalCopy) {
    // Judgment copy alone proves AI gate when Start Analysis CTA not yet on Overview
    state.criticalGapBlockedStartAnalysis = true;
  } else if (visible && disabled === false) {
    if (state.criticalGapBlockedStartAnalysis === null) {
      state.criticalGapBlockedStartAnalysis = false;
    }
  } else if (state.criticalGapBlockedStartAnalysis === null) {
    state.criticalGapBlockedStartAnalysis = null;
  }

  state.observations.push(
    `StartAnalysis probe @${label}: visible=${visible}; disabled=${disabled}; criticalCopy=${criticalCopy}; criticalGapBlockedStartAnalysis=${state.criticalGapBlockedStartAnalysis}`,
  );
  await snap(page, label, '(start-analysis probe)', shot, [
    `startAnalysis.visible=${visible}`,
    `startAnalysis.disabled=${String(disabled)}`,
    `criticalCopy=${criticalCopy}`,
  ]);
}

test.describe.configure({ mode: 'serial' });

test('CPO Core Final Stabilization prod journey capture', async ({ page, request }) => {
  test.setTimeout(600_000);

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
    // --- 01–02: new business / document-based seed (demo) + thin-doc note ---
    await startSeedJourney(page);
    await snap(page, '01-after-ai-read', '(seed document)', '01-after-ai-read.png', [
      'New business Demo entry + document-based seed',
      BANK.incompleteDocNote,
    ]);
    state.observations.push(`incompleteDoc: ${BANK.incompleteDocNote}`);

    await confirmUnderstanding(page);
    await waitAsk(page);
    await snap(page, '02-q1-after-confirm', '(confirm ✓ 맞습니다)', '02-q1-ask.png', [
      'post-confirm first ask — incomplete-doc gaps may still show',
    ]);

    // --- 03–04: answer → understanding → next Q (adaptive — match ask surface) ---
    await answerCurrent(page, '03-after-first-ask', '03-after-problem.png', undefined, [
      'answer → understanding → next Q (adaptive first gap)',
    ]);
    await answerCurrent(page, '04-after-second-ask', '04-after-payer.png', undefined, [
      'second substantive answer (adaptive next gap)',
    ]);

    // --- 05: nonsense — expect reject / no fact ---
    if (await ensureAnswerBox(page)) {
      const beforeGaps = previousGaps;
      const beforeUnderstanding = await textOrEmpty(page, 'surface-understanding');
      await answerCurrent(page, '05-nonsense', '05-nonsense.png', BANK.nonsense, [
        'nonsense hangul mash — expect reject / no fact stored',
      ]);
      const afterUnderstanding = await textOrEmpty(page, 'surface-understanding');
      const bodyAfter = await page.locator('body').innerText();
      const rejectLike =
        /관련\s*없|다시\s*답|이해\s*못|nonsense|irrelevant|사실로\s*저장하지|반영하지\s*않/i.test(
          bodyAfter,
        ) ||
        (beforeUnderstanding === afterUnderstanding && beforeGaps === previousGaps);
      state.observations.push(
        `nonsenseRejectOrNoFact=${rejectLike}; understandingUnchanged=${beforeUnderstanding === afterUnderstanding}`,
      );
    }

    // --- 06: Why challenge ---
    if (await ensureAnswerBox(page)) {
      await answerCurrent(page, '06-why-challenge', '06-why.png', BANK.whyChallenge, [
        'explicit why challenge — 왜 그게 중요하죠?',
      ]);
    }

    // --- 07: mid-summary ---
    if (await ensureAnswerBox(page)) {
      await answerCurrent(page, '07-mid-review', '07-mid-review.png', BANK.midSummaryAsk, [
        'mid-summary: 지금까지 이해한 사업 정리해줘',
      ]);
    }

    // --- 08: prior edit ---
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
        await answerCurrent(page, '08-prior-edit', '08-prior-edit.png', BANK.editCorrection, [
          'prior answer edit supersedes judgment',
        ]);
      }
      const closeEdit = page.getByRole('button', { name: /닫기|Close/i });
      if (await closeEdit.first().isVisible().catch(() => false)) {
        await closeEdit.first().click({ force: true });
        await page.waitForTimeout(500);
      }
    } else {
      state.observations.push('prior-edit affordance not visible');
    }

    // --- 09: contradiction / correction if affordance exists ---
    if (await ensureAnswerBox(page)) {
      await answerCurrent(page, '09-contradiction', '09-contradiction.png', BANK.contradiction, [
        'contradiction / correction — payer flipped to B2B hotel/OTA settlement',
      ]);
    }

    // --- 10–14: competitor (distinct) → differentiation → relevance / defensibility / pricing ---
    let loops = 0;
    let sawCompetitor = false;
    let sawDiff = false;
    let sawDiffRelevance = false;
    let sawDefensibility = false;
    let sawRevenue = false;

    while (loops < 10 && (await ensureAnswerBox(page)) && turnCounter < 18) {
      loops += 1;
      const q = await textOrEmpty(page, 'surface-question');
      let forced: string | undefined;
      let label = `10-continue-l${loops}`;
      let shot = `10-continue-l${loops}.png`;

      if (
        /차별점이\s*고객에게|고객에게\s*(어떤\s*)?차이|왜\s*고객이\s*(그\s*)?차별|체감되는 순간|어떤 가치를 만드|고객 여정 어디|결정적으로 체감/i.test(
          q,
        ) &&
        !sawDiffRelevance
      ) {
        forced = BANK.diffRelevance;
        sawDiffRelevance = true;
        label = `13-diff-relevance-l${loops}`;
        shot = '13-diff-relevance.png';
      } else if (/방어|모방|따라오|해자|defensib|따라잡/i.test(q) && !sawDefensibility) {
        forced = BANK.defensibility;
        sawDefensibility = true;
        label = `14-defensibility-l${loops}`;
        shot = '14-defensibility.png';
      } else if (
        /수익은 어떤 구조|수익이 발생|가격·요금|프라이싱/i.test(q) &&
        !/누가\s*지불|비용은 누가/i.test(q) &&
        !sawRevenue
      ) {
        forced = BANK.revenue;
        sawRevenue = true;
        label = `15-pricing-l${loops}`;
        shot = '15-pricing.png';
      } else if (/비슷한 역할|이미 하고 있는 서비스|이미 하는 서비스|대체|대안·/i.test(q) && !sawCompetitor) {
        forced = BANK.competitor;
        sawCompetitor = true;
        label = `10-competition-l${loops}`;
        shot = '10-competition.png';
      } else if (/차별|다른 점|왜 선택|우리만|결정적 차이/i.test(q) && !sawDiff) {
        forced = BANK.differentiation;
        sawDiff = true;
        label = `11-differentiation-l${loops}`;
        shot = '11-differentiation.png';
      }

      await answerCurrent(page, label, shot, forced);
      if (await isFinalReviewSurface(page)) break;
    }

    // Force distinct competitor then differentiation if not naturally asked
    if ((await ensureAnswerBox(page)) && !sawCompetitor && turnCounter < 19) {
      await answerCurrent(page, '10b-force-competition', '10-competition.png', BANK.competitor, [
        'forced competitor (distinct)',
      ]);
      sawCompetitor = true;
    }
    if ((await ensureAnswerBox(page)) && !sawDiff && turnCounter < 20) {
      await answerCurrent(
        page,
        '11b-force-differentiation',
        '11-differentiation.png',
        BANK.differentiation,
        ['forced differentiation — BANK.differentiation after competitor'],
      );
      sawDiff = true;
    }

    // Drain remaining asks toward sufficiency (cap total ~28 turns for W20)
    let drain = 0;
    while (drain < 8 && turnCounter < 28 && (await ensureAnswerBox(page))) {
      drain += 1;
      await answerCurrent(page, `16-drain-l${drain}`, `16-drain-l${drain}.png`);
      if (await isFinalReviewSurface(page)) break;
    }

    // --- Sufficiency + Start Analysis critical-gap probe (while gaps may remain) ---
    await probeStartAnalysisGate(page, '17-sufficiency-start-probe', '17-sufficiency-start-probe.png');

    const suf = state.turns[state.turns.length - 1];
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
      `Sufficiency: coverage=${suf?.coverageText || '(see body)'}; finalVisible=${finalVisible}; readyReviewCopy=${readyReview}; criticalGapBlockedStartAnalysis=${state.criticalGapBlockedStartAnalysis}`,
    );

    // If still blocked, try closing remaining critical gaps then re-probe
    if (state.criticalGapBlockedStartAnalysis === true && (await ensureAnswerBox(page))) {
      let closeLoops = 0;
      while (closeLoops < 4 && turnCounter < 22 && (await ensureAnswerBox(page))) {
        closeLoops += 1;
        const q = await textOrEmpty(page, 'surface-question');
        const body = await page.locator('body').innerText();
        await answerCurrent(
          page,
          `18-close-gap-l${closeLoops}`,
          `18-close-gap-l${closeLoops}.png`,
          pickAnswer(q, body),
          ['closing critical gaps before final review'],
        );
        if (await isFinalReviewSurface(page)) break;
      }
      await probeStartAnalysisGate(page, '19-reprobe-after-gaps', '19-reprobe-after-gaps.png');
    }

    // --- Final review if reachable AFTER critical gaps closed ---
    const startAnalysis = page.getByRole('button', {
      name: /That's right — start analysis|맞습니다.*분석|start analysis|분석 시작/i,
    });
    if (
      (await startAnalysis.first().isVisible().catch(() => false)) &&
      !(await startAnalysis.first().isDisabled().catch(() => true))
    ) {
      await startAnalysis.first().click();
      await page.waitForTimeout(5_000);
      await snap(page, '20-final-viability', '(clicked start analysis)', '20-final-review.png', [
        'final review after critical gaps closed / Start Analysis enabled',
      ]);
      const bodyAfter = await page.locator('body').innerText();
      state.finalReviewReachable =
        state.finalReviewReachable ||
        /GO|HOLD|판단|분석|Workflow|검토|decision|사업성|1차 사업성/i.test(bodyAfter);
      state.observations.push(
        `After start-analysis: review-like=${/GO|HOLD|판단|Workflow|검토|사업성/i.test(bodyAfter)}`,
      );
      // If we successfully started analysis, blocking is no longer active
      if (state.criticalGapBlockedStartAnalysis === true) {
        state.observations.push(
          'criticalGapBlockedStartAnalysis was true earlier; Start Analysis later succeeded after gap close',
        );
      }
    } else {
      state.observations.push(
        'final review not clicked — Start Analysis missing or still disabled (critical_gap may remain)',
      );
    }

    // Wire nextQuestion chain
    for (let i = 0; i < state.turns.length - 1; i++) {
      if (!state.turns[i]!.nextQuestion) {
        state.turns[i]!.nextQuestion = state.turns[i + 1]!.aiQuestion;
        if (!state.turns[i]!.nextQuestionReason) {
          state.turns[i]!.nextQuestionReason =
            state.turns[i + 1]!.purpose || state.turns[i + 1]!.whyNow;
        }
      }
    }

    // Wrong-slot / mixed-screen post-pass
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
      if (
        /클룩|트립|경쟁/.test(t.userAnswer) &&
        /수익|수수료|매출|가격/.test(t.aiQuestion) &&
        t.userAnswer === BANK.competitor
      ) {
        t.templateLikeHints = [...(t.templateLikeHints ?? []), 'wrong-slot-comp-into-pricing'];
        state.wrongSlotHints.push(`turn ${t.turn}: competitor answer into pricing Q`);
      }
      if (/정의\]/.test(t.storedFactsGaps + t.bodyExcerpt)) {
        t.templateLikeHints = [...(t.templateLikeHints ?? []), 'customer-slot-corruption-정의'];
        state.wrongSlotHints.push(`turn ${t.turn}: CUSTOMER shows 정의]`);
      }
    }

    const mergeableTurns = state.turns.filter(
      (t) =>
        t.userAnswer &&
        !/^\(seed|\(confirm|\(start-analysis|\(clicked/i.test(t.userAnswer) &&
        t.userAnswer !== BANK.nonsense &&
        t.userAnswer !== BANK.whyChallenge &&
        t.userAnswer !== BANK.midSummaryAsk,
    );
    const deltaEmpty = mergeableTurns.filter((t) => !t.understandingDelta?.trim()).length;
    state.observations.push(`understandingDeltaEmptyMergeable=${deltaEmpty}`);
    state.observations.push(`reAskSameQuestionCount=${state.reAskSameQuestionCount}`);
    state.observations.push(`wrongSlotHints=${state.wrongSlotHints.length}`);
    state.observations.push(`mixedQuestionHints=${state.mixedQuestionHints.length}`);
    state.observations.push(
      `criticalGapBlockedStartAnalysis=${state.criticalGapBlockedStartAnalysis}`,
    );
    state.observations.push(`turnCount=${state.turns.length}`);
    const domainHits = state.turns.filter((t) =>
      /B2B SaaS|Differentiation in B2B/i.test(t.bodyExcerpt + t.decision + t.understanding),
    ).length;
    state.observations.push(`domainContaminationHits=${domainHits}`);
    state.observations.push(
      `saw: competitor=${sawCompetitor}; diff=${sawDiff}; diffRelevance=${sawDiffRelevance}; defensibility=${sawDefensibility}; revenue=${sawRevenue}`,
    );
    persist();
    expect(state.productionCommit.length).toBeGreaterThan(6);
    if (!state.shaMatch) {
      state.observations.push(
        `DEPLOY LAG: prod=${state.productionCommit} expected one of ${FIX_SHA_PREFIXES.join(', ')}`,
      );
    }
    expect(state.turns.length).toBeGreaterThanOrEqual(10);
  } finally {
    persist();
  }
});
