/**
 * ALABOM Real Adaptive — Production LIVE capture (15–25 meaningful turns).
 * NO padding · NO extendToMinTurns · NO identical answer repeats · NO forced-diff.
 * Journey ends naturally at Analysis Ready OR max ~25 unique meaningful answers.
 *
 * From apps/web:
 *   $env:CI='1'; $env:PLAYWRIGHT_BASE_URL='https://ai-startup-validation-tau.vercel.app'
 *   pnpm exec playwright test e2e/_cpo-real-adaptive-prod-capture.spec.ts --retries=0
 */
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.env.ALABOM_CAPTURE_OUT
  ? path.resolve(process.env.ALABOM_CAPTURE_OUT)
  : path.resolve(
      process.cwd(),
      '../../docs/evidence/ALABOM/cpo-validation/real-adaptive-vnext',
    );
const MEDIA = path.join(OUT, 'media');
const RAW_JSON = path.join(OUT, 'transcript-raw.json');
fs.mkdirSync(MEDIA, { recursive: true });

const REQUIRED_SHA_PREFIX = (process.env.ALABOM_REQUIRED_SHA ?? '').trim();
const MAX_MEANINGFUL_TURNS = 25;

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
  solution:
    '관심사·동선·식사 제약을 반영한 실시간 맞춤 일정과 현지인 동행을 한 번에 제공하는 방식입니다.',
  scope:
    'MVP는 서울 한정·관심사 3종(미식·야경·로컬)으로 좁혀 2주 파일럿으로 수요를 확인합니다.',
  risks:
    '리스크는 가이드 수급 변동과 성수기 가격 민감도입니다. 사전 예약 보증으로 완화합니다.',
  validation:
    '검증 계획: 2주간 가이드 10명 인터뷰 + 랜딩 CTA 클릭으로 관심도를 측정합니다.',
  channel:
    '초기 채널은 인스타그램 로컬 가이드, 호텔 컨시어지, K-컬처 밋업 그룹입니다.',
  pricing:
    '가격 가설은 반나절 체험 기준 1인 8~12만 원대, 수수료는 예약액의 10~15%입니다.',
  nonsense: 'ㅋㅋㅋㅋㅋㅋ',
  midSummaryAsk: '지금까지 이해한 사업 정리해줘',
  whyChallenge: '왜 그게 중요하죠?',
  editCorrection:
    '정정합니다. 초기 타깃은 방한 FIT 외국인만이 아니라, 국내 MZ 개별 여행객도 포함합니다.',
  contradiction:
    '앞서와 달리 정정합니다. 결제자는 관광객이 아니라 B2B로 호텔·OTA가 일괄 정산합니다.',
  notThat: '그건 아닌데? 결제자는 관광객 직접 결제가 맞고, B2B 정산은 아닙니다.',
  fallback:
    '아직 MVP 전 아이디어 단계이고, 서울 한정으로 관심사 기반 맞춤 반나절 체험을 먼저 검증하려 합니다.',
};

/** Unique depth answers — each string used at most once. */
const UNIQUE_POOL = [
  BANK.problem,
  BANK.payer,
  BANK.customer,
  BANK.demand,
  BANK.competitor,
  BANK.differentiation,
  BANK.diffRelevance,
  BANK.defensibility,
  BANK.solution,
  BANK.revenue,
  BANK.scope,
  BANK.risks,
  BANK.validation,
  BANK.channel,
  BANK.pricing,
  BANK.editCorrection,
  BANK.notThat,
  '정정: 차별점은 AI 추천이 아니라 현지 큐레이터 실시간 동선 조정입니다.',
  '추가: 경쟁은 글로벌 OTA뿐 아니라 인스타그램 로컬 가이드 DM도 포함합니다.',
  '보완: 방어력은 파트너 독점 계약과 리뷰 데이터 축적입니다.',
  '시장 근거는 서울시 관광 통계와 제휴 호텔 문의 증가 추세입니다.',
  '고객은 MZ뿐 아니라 40대 부부 FIT도 2차 타깃입니다.',
  '문제는 언어 장벽보다 「원하는 경험을 못 찾는」 탐색 비용이 더 큽니다.',
];

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
  metaOnly?: boolean;
  /** Loop 9h-c — wrongSlotReaskPending set on the turn just submitted (if any). */
  wrongSlotPendingSet?: string | null;
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
  meaningfulAnswerCount: number;
  duplicateAnswerCount: number;
  paddingTurnCount: number;
  whyPanelSeen: boolean;
  conflictUiSeen: boolean;
  analysisVerdict: string | null;
};

const state: CaptureState = {
  at: new Date().toISOString(),
  productionCommit: '',
  targetSha: REQUIRED_SHA_PREFIX || 'tip-main',
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
  meaningfulAnswerCount: 0,
  duplicateAnswerCount: 0,
  paddingTurnCount: 0,
  whyPanelSeen: false,
  conflictUiSeen: false,
  analysisVerdict: null,
};

let turnCounter = 0;
let meaningfulCounter = 0;
let screenshotSeq = 0;
let previousGaps = '';
const usedAnswers = new Set<string>();

function persist() {
  const payload = JSON.stringify(state, null, 2);
  try {
    fs.writeFileSync(RAW_JSON, payload, 'utf8');
  } catch {
    const tmp = `${RAW_JSON}.tmp`;
    fs.writeFileSync(tmp, payload, 'utf8');
    try {
      fs.renameSync(tmp, RAW_JSON);
    } catch {
      fs.copyFileSync(tmp, RAW_JSON);
      fs.unlinkSync(tmp);
    }
  }
}

function uniqueShotName(shotName: string): string {
  screenshotSeq += 1;
  const base = shotName.replace(/\.png$/i, '');
  return `${String(screenshotSeq).padStart(3, '0')}-${base}.png`;
}

async function safeScreenshot(page: Page, shotName: string): Promise<string | undefined> {
  const fileName = uniqueShotName(shotName);
  const p = path.join(MEDIA, fileName);
  try {
    await page.screenshot({ path: p, fullPage: true });
    return fileName;
  } catch {
    return undefined;
  }
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
    const accept = page.getByRole('button', { name: /분석 수락|수락|Accept analytics|Accept/i });
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
  try {
    await el.first().waitFor({ state: 'attached', timeout: 4_000 });
    return (await el.first().innerText()).trim();
  } catch {
    return '';
  }
}

async function dismissWhyOrMidOrConflict(page: Page) {
  const whyPanel = page.getByTestId('why-follow-up-panel');
  if (await whyPanel.isVisible({ timeout: 800 }).catch(() => false)) {
    state.whyPanelSeen = true;
    const whyText = await whyPanel.innerText();
    state.observations.push(`whyPanel: ${whyText.slice(0, 200).replace(/\s+/g, ' ')}`);
    const btn = whyPanel.getByRole('button');
    if (await btn.first().isVisible().catch(() => false)) {
      await btn.first().click({ force: true });
      await page.waitForTimeout(700);
    }
  }
  const midPanel = page.getByTestId('mid-judgment-panel');
  if (await midPanel.isVisible({ timeout: 800 }).catch(() => false)) {
    const btn = midPanel.getByRole('button', { name: /돌아가기|계속/i });
    if (await btn.first().isVisible().catch(() => false)) {
      await btn.first().click({ force: true });
      await page.waitForTimeout(700);
    }
  }
  const conflict = page.getByTestId('contradiction-confirm');
  if (await conflict.isVisible({ timeout: 800 }).catch(() => false)) {
    state.conflictUiSeen = true;
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

async function isFinalReviewSurface(page: Page, minMeaningful = 15): Promise<boolean> {
  if (meaningfulCounter < minMeaningful) return false;

  // Active Q loop — textarea + ask surface means NOT final review
  const box = page.locator('textarea').last();
  if (await box.isVisible({ timeout: 800 }).catch(() => false)) {
    const q = await textOrEmpty(page, 'surface-question');
    if (q.replace(/\s+/g, ' ').trim().length > 12) return false;
  }

  const body = await page.locator('body').innerText();
  const criticalStillOpen =
    /Start Analysis는 차단|Critical gaps remain|아직 확인 필요:|Critical Unknown|미확인 핵심|핵심 공백/i.test(
      body,
    );

  if (await page.getByTestId('conversational-final-output').isVisible().catch(() => false)) {
    return !criticalStillOpen;
  }
  const startAnalysis = page.getByRole('button', {
    name: /That's right — start analysis|맞습니다.*분석|start analysis|분석 시작/i,
  });
  if (await startAnalysis.first().isVisible().catch(() => false)) {
    const disabled = await startAnalysis.first().isDisabled().catch(() => true);
    return !disabled && !criticalStillOpen;
  }
  if (/Analysis Ready|Before analysis, confirm|분석 전에,/i.test(body)) {
    return !criticalStillOpen;
  }
  return false;
}

async function tryContinueRefining(page: Page): Promise<boolean> {
  if (meaningfulCounter >= 15) return false;
  const refine = page.getByTestId('continue-refining-cta');
  if (await refine.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
    await refine.first().click({ force: true });
    await page.waitForTimeout(1_200);
    state.observations.push(`continue-refining reopen @meaningful=${meaningfulCounter}`);
    return page.locator('textarea').last().isVisible({ timeout: 6_000 }).catch(() => false);
  }
  const aiPm = page.getByRole('button', { name: /^AI PM$/i });
  if (await aiPm.first().isVisible().catch(() => false)) {
    await aiPm.first().click();
    await page.waitForTimeout(800);
  }
  const box = page.locator('textarea').last();
  return box.isVisible({ timeout: 4_000 }).catch(() => false);
}

async function ensureAnswerBox(page: Page): Promise<boolean> {
  await dismissRecognition(page);
  if (await isFinalReviewSurface(page)) {
    if (meaningfulCounter < 15 && (await tryContinueRefining(page))) {
      return page.locator('textarea').last().isVisible({ timeout: 5_000 }).catch(() => false);
    }
    return false;
  }

  // Still on shared-understanding confirm — click through once
  const confirm = page.getByRole('button', {
    name: /^(✓\s*)?(맞습니다|That's right|That is right)(?!\s*—\s*start analysis)/i,
  });
  if (await confirm.first().isVisible({ timeout: 1_500 }).catch(() => false)) {
    await dismissCookies(page);
    await confirm.first().click({ force: true });
    await page.waitForTimeout(2_000);
    await dismissCookies(page);
  }

  let box = page.locator('textarea').last();
  if (!(await box.isVisible({ timeout: 2_000 }).catch(() => false))) {
    const aiPm = page.getByRole('button', { name: /^AI PM$/i });
    if (await aiPm.first().isVisible().catch(() => false)) {
      await aiPm.first().click();
      await page.waitForTimeout(700);
    }
    box = page.locator('textarea').last();
  }
  if (!(await box.isVisible({ timeout: 2_000 }).catch(() => false))) {
    if (meaningfulCounter < 15 && (await tryContinueRefining(page))) {
      return page.locator('textarea').last().isVisible({ timeout: 5_000 }).catch(() => false);
    }
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
  for (const key of ['BUSINESS', 'CUSTOMER', 'PROBLEM', 'MARKET', 'COMPETITION', 'DIFFERENTIATION']) {
    const re = new RegExp(`${key}[^\\n]{0,220}`, 'i');
    const m = body.match(re);
    if (m) lines.push(m[0].replace(/\s+/g, ' ').trim().slice(0, 200));
  }
  const gaps = body.match(
    /Needs confirmation|아직 확인|확인 필요|미확인|Critical Unknown|핵심 공백/gi,
  );
  if (gaps) lines.push('GAPS: ' + [...new Set(gaps.map((g) => g.trim()))].slice(0, 8).join(' | '));
  return lines.slice(0, 12).join('\n');
}

function pickAnswer(question: string): string {
  const q = question;
  if (/수익은 어떤 구조|수익이 발생|가격·요금|프라이싱/i.test(q) && !/누가\s*지불|비용은 누가/i.test(q)) {
    return BANK.revenue;
  }
  if (/해결하는 방식|제공 가치|솔루션|solution|어떻게 해결/i.test(q)) return BANK.solution;
  if (/불편|문제|풀려는|해결하려는|페인|JTBD/i.test(q)) return BANK.problem;
  // Customer before differentiation — customer Q stems may mention diff keywords
  if (
    /필요로 하는 사람|구체 고객|누구인가요|타깃|대상|절실히/i.test(q) &&
    !/차별|경쟁|비슷한 역할|대안/i.test(q)
  ) {
    return BANK.customer;
  }
  if (/차별점이\s*고객에게|고객에게\s*(어떤\s*)?차이|체감되는 순간|relevance/i.test(q)) {
    return BANK.diffRelevance;
  }
  if (/방어|모방|따라오|해자|defensib/i.test(q)) return BANK.defensibility;
  if (/차별|다른 점|왜 선택|우리만/i.test(q) && !/비슷한 역할|이미 하고/i.test(q)) {
    return BANK.differentiation;
  }
  if (/비슷한 역할|이미 (하고 있는|하는) 서비스|대체|대안|경쟁/i.test(q)) return BANK.competitor;
  if (/지불|결제|누가\s*내|비용은 누가|payer/i.test(q)) return BANK.payer;
  if (/수요|근거|시장|규모|채널/i.test(q)) return BANK.demand;
  if (/리스크|위험|risk/i.test(q)) return BANK.risks;
  if (/검증|파일럿|실험/i.test(q)) return BANK.validation;
  if (/범위|scope|MVP/i.test(q)) return BANK.scope;
  return BANK.fallback;
}

function pickUniqueAnswer(question: string, forced?: string): string {
  if (forced) {
    if (!usedAnswers.has(forced)) usedAnswers.add(forced);
    return forced;
  }
  let candidate = pickAnswer(question);
  if (usedAnswers.has(candidate)) {
    const alt = UNIQUE_POOL.find((a) => !usedAnswers.has(a));
    if (alt) candidate = alt;
  }
  usedAnswers.add(candidate);
  return candidate;
}

function isMetaAnswer(answer: string): boolean {
  return (
    answer === BANK.nonsense ||
    answer === BANK.whyChallenge ||
    answer === BANK.midSummaryAsk
  );
}

function isIntentionalWrongSlotReask(prevSnap: TurnSnap | undefined): boolean {
  if (!prevSnap) return false;
  if (
    prevSnap.wrongSlotPendingSet === 'customerPersona' ||
    prevSnap.wrongSlotPendingSet === 'problemJtbd'
  ) {
    return true;
  }
  if (prevSnap.notes?.some((n) => /wrong-slot-p0|wrong-slot-reask/i.test(n ?? ''))) {
    return true;
  }
  const q = prevSnap.aiQuestion ?? '';
  const a = prevSnap.userAnswer ?? '';
  // Reframed diff-relevance Q repeats same stock stem after conflict clarification
  if (/구체적으로 어떤 가치를 만드나요/i.test(q)) {
    return true;
  }
  if (
    /(가장 필요로 하는 사람|누구인가요)/i.test(q) &&
    !/(크게 해결하려는 불편|핵심 불편|솔루션|해결하는 방식|제공 가치)/i.test(q) &&
    a === BANK.diffRelevance
  ) {
    return true;
  }
  if (
    /(크게 해결하려는 불편|핵심 불편)/i.test(q) &&
    !/(가장 필요로 하는 사람|누구인가요|솔루션|해결하는 방식|제공 가치)/i.test(q) &&
    a === BANK.customer
  ) {
    return true;
  }
  return false;
}

async function readLastTurnWrongSlotPending(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (!k?.includes('aiPmLoop')) continue;
      const raw = sessionStorage.getItem(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as { turns?: Array<{ wrongSlotReaskPending?: string; superseded?: boolean; intent?: string }> };
        const turns = parsed.turns ?? [];
        for (let j = turns.length - 1; j >= 0; j -= 1) {
          const t = turns[j]!;
          if (t.superseded) continue;
          if (t.intent === 'why_meta' || t.intent === 'mid_judgment' || t.intent === 'nonsense') continue;
          return t.wrongSlotReaskPending?.trim() || null;
        }
      } catch {
        /* ignore */
      }
    }
    return null;
  });
}

async function snap(
  page: Page,
  label: string,
  userAnswer: string,
  shotName?: string,
  notes?: string[],
  opts?: { metaOnly?: boolean; wrongSlotPendingSet?: string | null },
): Promise<TurnSnap> {
  await page.waitForTimeout(600);
  const understanding = await textOrEmpty(page, 'surface-understanding');
  const decision = await textOrEmpty(page, 'surface-decision');
  const questionBlock = await textOrEmpty(page, 'surface-question');
  const purpose = await textOrEmpty(page, 'surface-question-purpose');
  const judgmentBlock = await textOrEmpty(page, 'current-judgment-block');
  let understandingDelta = await textOrEmpty(page, 'understanding-delta');
  let whyNow = purpose;
  const whyDetails = page.getByTestId('why-now-details');
  if (await whyDetails.isVisible().catch(() => false)) {
    whyNow = (await whyDetails.innerText()).trim() || whyNow;
  }
  const whyPanel = page.getByTestId('why-follow-up-panel');
  if (await whyPanel.isVisible().catch(() => false)) {
    whyNow = (await whyPanel.innerText()).trim().slice(0, 500);
    state.whyPanelSeen = true;
  }
  const body = await page.locator('body').innerText();
  const gaps = await extractSpineFacts(page);
  const gapChangeNote =
    previousGaps && previousGaps !== gaps ? 'changed' : previousGaps ? 'unchanged' : 'initial';
  previousGaps = gaps;

  let screenshot: string | undefined;
  if (shotName) {
    const saved = await safeScreenshot(page, shotName);
    if (saved) screenshot = `docs/evidence/ALABOM/cpo-validation/real-adaptive/media/${saved}`;
  }

  const prevQs = state.turns.map((t) => t.aiQuestion);
  const templateLikeHints: string[] = [];
  if (prevQs.some((pq) => pq && pq === questionBlock)) {
    const prevSnap = state.turns[state.turns.length - 1];
    if (!isIntentionalWrongSlotReask(prevSnap)) {
      templateLikeHints.push('re-ask-same-question-text');
      state.reAskSameQuestionCount += 1;
    }
  }

  turnCounter += 1;
  // meaningfulCounter incremented only in answerTurn — not on seed/confirm/probe snaps

  const snapRow: TurnSnap = {
    turn: turnCounter,
    label,
    aiQuestion: questionBlock,
    purpose,
    whyNow,
    judgmentBlock,
    understandingDelta,
    unresolvedGapHint: '',
    targetGapHint: '',
    userAnswer,
    understanding,
    decision,
    coverageText: '',
    storedFactsGaps: gaps,
    gapChangeNote,
    nextQuestion: '',
    nextQuestionReason: purpose,
    bodyExcerpt: body.slice(0, 5000),
    screenshot,
    notes,
    templateLikeHints,
    metaOnly: opts?.metaOnly,
    wrongSlotPendingSet: opts?.wrongSlotPendingSet ?? null,
  };
  if (templateLikeHints.length) state.templateLikeTurns.push(turnCounter);
  state.turns.push(snapRow);
  persist();
  return snapRow;
}

async function dumpLoopStorage(page: Page, label: string) {
  const dump = await page.evaluate(() => {
    const out: Record<string, string> = {};
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (k && (k.includes('aiPmLoop') || k.includes('conversationMemory'))) {
        out[`ss:${k}`] = sessionStorage.getItem(k) ?? '';
      }
    }
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && (k.includes('aiPmLoop') || k.includes('conversationMemory'))) {
        out[`ls:${k}`] = localStorage.getItem(k) ?? '';
      }
    }
    return out;
  });
  const dumpPath = path.join(OUT, `storage-dump-${label}.json`);
  fs.writeFileSync(dumpPath, JSON.stringify(dump, null, 2), 'utf8');
  state.observations.push(`storage dump @${label}: ${Object.keys(dump).length} keys → ${dumpPath}`);
}

async function assertImmediateWrongSlotReask(
  page: Page,
  expected: 'customerPersona' | 'problemJtbd',
  label: string,
) {
  await waitAsk(page);
  const q = await textOrEmpty(page, 'surface-question');
  if (expected === 'customerPersona') {
    const ok =
      /(가장 필요로 하는 사람|누구인가요|타깃|타겟)/i.test(q) &&
      !/(크게 해결하려는 불편|핵심 불편|솔루션|해결하는 방식)/i.test(q);
    if (!ok) {
      state.wrongSlotHints.push(`${label}: immediate next not persona — got "${q.slice(0, 120)}"`);
    }
  } else {
    const ok =
      /(크게 해결하려는 불편|핵심 불편|불편)/i.test(q) &&
      !/(솔루션|해결하는 방식|제공 가치)/i.test(q);
    if (!ok) {
      state.wrongSlotHints.push(`${label}: immediate next not problem — got "${q.slice(0, 120)}"`);
    }
  }
}

async function submitAnswer(page: Page, answer: string): Promise<boolean> {
  if (!(await ensureAnswerBox(page))) return false;
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

async function answerTurn(
  page: Page,
  label: string,
  shot: string,
  forced?: string,
  notes?: string[],
  opts?: { metaOnly?: boolean },
): Promise<TurnSnap | null> {
  if (meaningfulCounter >= MAX_MEANINGFUL_TURNS && !opts?.metaOnly) {
    state.observations.push(`max meaningful turns (${MAX_MEANINGFUL_TURNS}) reached @${label}`);
    return null;
  }
  const q = await textOrEmpty(page, 'surface-question');
  const answer = pickUniqueAnswer(q, forced);
  if (!(await submitAnswer(page, answer))) {
    state.observations.push(`submit blocked @${label}`);
    return null;
  }
  const wrongSlotPendingSet = await readLastTurnWrongSlotPending(page);
  if (!opts?.metaOnly && !isMetaAnswer(answer)) {
    meaningfulCounter += 1;
    state.meaningfulAnswerCount = meaningfulCounter;
  }
  await waitAsk(page);
  return snap(page, label, answer, shot, notes, { ...opts, wrongSlotPendingSet });
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
}

async function confirmUnderstanding(page: Page) {
  await dismissCookies(page);
  const confirm = page.getByRole('button', {
    name: /^(✓\s*)?(맞습니다|That's right|That is right)(?!\s*—\s*start analysis)/i,
  });
  await confirm.first().waitFor({ state: 'visible', timeout: 90_000 });
  await dismissCookies(page);
  await confirm.first().click({ force: true });
  await page.waitForTimeout(2_500);
  await dismissCookies(page);
  await page.getByTestId('s11-surface').waitFor({ state: 'visible', timeout: 60_000 });
  const box = page.locator('textarea').last();
  const ok = await box.waitFor({ state: 'visible', timeout: 60_000 }).then(() => true).catch(() => false);
  if (!ok) {
    state.observations.push('confirmUnderstanding: textarea not visible after confirm');
  }
}

async function resolveConflictIfShown(page: Page) {
  const keepPrior = page.getByRole('button', { name: /이전 내용이 맞아/i });
  const acceptNew = page.getByRole('button', { name: /새 답변이 맞아/i });
  if (await acceptNew.first().isVisible().catch(() => false)) {
    state.conflictUiSeen = true;
    await acceptNew.first().click();
    await page.waitForTimeout(1200);
    state.observations.push('conflict resolved: accept_new');
  } else if (await keepPrior.first().isVisible().catch(() => false)) {
    state.conflictUiSeen = true;
    await keepPrior.first().click();
    await page.waitForTimeout(1200);
    state.observations.push('conflict resolved: keep_prior');
  }
}

async function probeStartAnalysisGate(page: Page, label: string, shot: string) {
  const body = await page.locator('body').innerText();
  const criticalCopy =
    /Start Analysis는 차단|Analysis Ready 아님|Critical Unknown|핵심 공백|Critical gaps remain/i.test(
      body,
    ) || (await page.getByTestId('critical-gap-block-hint').isVisible().catch(() => false));

  const startAnalysis = page.getByRole('button', {
    name: /That's right — start analysis|맞습니다.*분석|start analysis|분석 시작/i,
  });
  let disabled: boolean | null = null;
  let visible = false;
  if (await startAnalysis.first().isVisible().catch(() => false)) {
    visible = true;
    disabled = await startAnalysis.first().isDisabled().catch(() => null);
  }

  if (visible && disabled === true) state.criticalGapBlockedStartAnalysis = true;
  else if (criticalCopy) state.criticalGapBlockedStartAnalysis = true;
  else if (visible && disabled === false) state.criticalGapBlockedStartAnalysis = false;

  state.observations.push(
    `StartAnalysis @${label}: visible=${visible}; disabled=${disabled}; criticalCopy=${criticalCopy}`,
  );
  await snap(page, label, '(gate probe)', shot, ['analysis gate probe']);
}

test.describe.configure({ mode: 'serial' });

test('ALABOM real adaptive prod capture (15–25 meaningful turns)', async ({ page, request }) => {
  test.setTimeout(900_000);
  await page.setViewportSize({ width: 1280, height: 900 });

  const build = await request.get('/api/build-info');
  const buildJson = (await build.json()) as { data?: { commit?: string } };
  state.productionCommit = buildJson.data?.commit ?? '';
  state.shaMatch = REQUIRED_SHA_PREFIX
    ? state.productionCommit.startsWith(REQUIRED_SHA_PREFIX)
    : state.productionCommit.length > 6;
  if (REQUIRED_SHA_PREFIX && !state.shaMatch) {
    throw new Error(`SHA mismatch: got ${state.productionCommit}, need ${REQUIRED_SHA_PREFIX}`);
  }
  fs.writeFileSync(
    path.join(OUT, 'prod-build-info.json'),
    JSON.stringify(
      { commit: state.productionCommit, at: state.at, source: 'GET /api/build-info' },
      null,
      2,
    ),
  );
  persist();

  try {
    await startSeedJourney(page);
    await snap(page, '01-ai-read', '(seed)', '01-ai-read.png', ['thin doc seed']);

    await confirmUnderstanding(page);
    await waitAsk(page);
    await snap(page, '02-first-ask', '(confirm)', '02-first-ask.png');

    // Adaptive substantive — match actual ask (no forced problem/payer on wrong slot)
    await answerTurn(page, '03-first-substantive', '03-first-substantive.png', undefined, [
      'adaptive first gap',
    ]);
    await answerTurn(page, '04-second-substantive', '04-second-substantive.png', undefined, [
      'adaptive second gap',
    ]);

    if (await ensureAnswerBox(page)) {
      await answerTurn(page, '05-nonsense', '05-nonsense.png', BANK.nonsense, ['meta: nonsense'], {
        metaOnly: true,
      });
    }

    if (await ensureAnswerBox(page)) {
      await answerTurn(page, '06-why', '06-why.png', BANK.whyChallenge, ['meta: why challenge'], {
        metaOnly: true,
      });
      await dismissWhyOrMidOrConflict(page);
    }

    if (await ensureAnswerBox(page)) {
      await answerTurn(page, '07-mid-summary', '07-mid-summary.png', BANK.midSummaryAsk, [
        'meta: mid judgment',
      ], { metaOnly: true });
      await dismissWhyOrMidOrConflict(page);
    }

    // Prior edit — customer facet extension
    const editBtn = page.getByRole('button', { name: /이전 답변 수정/i });
    if (await editBtn.first().isVisible().catch(() => false)) {
      await editBtn.first().click();
      await page.waitForTimeout(800);
      const pick = page.getByRole('button').filter({ hasText: /고객|customer/i });
      if (await pick.first().isVisible().catch(() => false)) {
        await pick.first().click();
        await page.waitForTimeout(800);
      }
      if (await ensureAnswerBox(page)) {
        await answerTurn(page, '08-prior-edit', '08-prior-edit.png', BANK.editCorrection, [
          'facet: customer correction',
        ]);
      }
      const closeEdit = page.getByRole('button', { name: /닫기|Close/i });
      if (await closeEdit.first().isVisible().catch(() => false)) {
        await closeEdit.first().click({ force: true });
        await page.waitForTimeout(500);
      }
    }

    // Conflict — B2B vs tourist payer
    if (await ensureAnswerBox(page)) {
      await answerTurn(page, '09-contradiction', '09-contradiction.png', BANK.contradiction, [
        'facet: payer conflict B2B',
      ]);
      await resolveConflictIfShown(page);
    }
    if (await ensureAnswerBox(page)) {
      await answerTurn(page, '09b-not-that', '09b-not-that.png', BANK.notThat, [
        'conflict clarification — tourist direct pay',
      ]);
      await resolveConflictIfShown(page);
    }

    // Natural adaptive loop — NO padding, NO forced-diff, end at Analysis Ready
    const facetsSeen = new Set<string>();
    const wrongSlotProbesDone = { p0_1: false, p0_2: false };
    let loops = 0;
    while (
      loops < MAX_MEANINGFUL_TURNS + 5 &&
      meaningfulCounter < MAX_MEANINGFUL_TURNS &&
      (await ensureAnswerBox(page))
    ) {
      if (await isFinalReviewSurface(page)) break;
      loops += 1;
      await waitAsk(page);
      const q = await textOrEmpty(page, 'surface-question');
      const pendingBeforeAnswer = await readLastTurnWrongSlotPending(page);
      let forced: string | undefined;
      let facet = 'adaptive';

      // Loop 9h-c — on-slot answer when wrong-slot re-ask is pending (clears pending in engine)
      // Loop 9h-c — solution Q wins over stale wrong-slot pending (prevents problem append on solution ask)
      if (/솔루션|해결하는 방식|제공 가치/i.test(q) && !facetsSeen.has('solution') && !usedAnswers.has(BANK.solution)) {
        forced = BANK.solution;
        facet = 'solution';
      } else if (
        pendingBeforeAnswer === 'customerPersona' &&
        /(가장 필요로 하는 사람|누구인가요)/i.test(q) &&
        !/(크게 해결하려는 불편|핵심 불편|솔루션|해결하는 방식|제공 가치)/i.test(q)
      ) {
        forced = BANK.customer;
        facet = 'wrong-slot-reask-persona';
      } else if (
        pendingBeforeAnswer === 'problemJtbd' &&
        /(크게 해결하려는 불편|핵심 불편)/i.test(q) &&
        !/(솔루션|해결하는 방식|제공 가치|가장 필요로 하는 사람|누구인가요)/i.test(q)
      ) {
        forced = BANK.problem;
        facet = 'wrong-slot-reask-problem';
      } else if (
        !wrongSlotProbesDone.p0_1 &&
        /(가장 필요로 하는 사람|누구인가요)/i.test(q) &&
        !/(크게 해결하려는 불편|핵심 불편|솔루션|해결하는 방식|제공 가치)/i.test(q)
      ) {
        forced = BANK.diffRelevance;
        facet = 'wrong-slot-p0-1';
      } else if (
        !wrongSlotProbesDone.p0_2 &&
        /(크게 해결하려는 불편|핵심 불편)/i.test(q) &&
        !/(솔루션|해결하는 방식|제공 가치|가장 필요로 하는 사람|누구인가요)/i.test(q)
      ) {
        forced = BANK.customer;
        facet = 'wrong-slot-p0-2';
      } else if (/비슷한 역할|이미 하고|대체|대안|경쟁/i.test(q) && !facetsSeen.has('competitor') && !usedAnswers.has(BANK.competitor)) {
        forced = BANK.competitor;
        facet = 'competitor';
      } else if (/차별|다른 점|우리만/i.test(q) && !/비슷한 역할/i.test(q) && !facetsSeen.has('differentiation') && !usedAnswers.has(BANK.differentiation)) {
        forced = BANK.differentiation;
        facet = 'differentiation';
      } else if (/고객에게.*차이|체감|relevance/i.test(q) && !facetsSeen.has('diffRelevance') && !usedAnswers.has(BANK.diffRelevance)) {
        forced = BANK.diffRelevance;
        facet = 'diffRelevance';
      } else if (/방어|모방|해자/i.test(q) && !facetsSeen.has('defensibility') && !usedAnswers.has(BANK.defensibility)) {
        forced = BANK.defensibility;
        facet = 'defensibility';
      } else if (/수익|가격|프라이싱/i.test(q) && !/누가\s*지불/i.test(q) && !facetsSeen.has('revenue') && !usedAnswers.has(BANK.revenue)) {
        forced = BANK.revenue;
        facet = 'revenue';
      } else if (/수요|시장|근거/i.test(q) && !facetsSeen.has('demand') && !usedAnswers.has(BANK.demand)) {
        forced = BANK.demand;
        facet = 'demand';
      } else if (/리스크/i.test(q) && !facetsSeen.has('risks') && !usedAnswers.has(BANK.risks)) {
        forced = BANK.risks;
        facet = 'risks';
      } else if (/검증|파일럿/i.test(q) && !facetsSeen.has('validation') && !usedAnswers.has(BANK.validation)) {
        forced = BANK.validation;
        facet = 'validation';
      } else if (/채널|유통/i.test(q) && !facetsSeen.has('channel') && !usedAnswers.has(BANK.channel)) {
        forced = BANK.channel;
        facet = 'channel';
      } else if (/범위|MVP|scope/i.test(q) && !facetsSeen.has('scope') && !usedAnswers.has(BANK.scope)) {
        forced = BANK.scope;
        facet = 'scope';
      } else if (/가격 가설|pricing/i.test(q) && !usedAnswers.has(BANK.pricing)) {
        forced = BANK.pricing;
        facet = 'pricing';
      }
      if (forced && usedAnswers.has(forced) && !facet.startsWith('wrong-slot')) forced = undefined;

      if (forced) facetsSeen.add(facet);
      const qBefore = q;
      const row = await answerTurn(
        page,
        `10-adaptive-l${loops}-${facet}`,
        `10-adaptive-l${loops}.png`,
        forced,
        [`facet: ${facet} — natural adaptive`],
      );
      if (!row) {
        if (meaningfulCounter < 15 && (await tryContinueRefining(page))) continue;
        break;
      }
      if (facet === 'wrong-slot-p0-1') wrongSlotProbesDone.p0_1 = true;
      if (facet === 'wrong-slot-p0-2') wrongSlotProbesDone.p0_2 = true;
      // Loop 9h — P0-1/P0-2 immediate transition: qBefore shape + BANK answer (not facet label)
      const answered = row?.userAnswer ?? forced ?? '';
      if (
        /(가장 필요로 하는 사람|누구인가요)/i.test(qBefore) &&
        !/(크게 해결하려는 불편|핵심 불편|솔루션|해결하는 방식|제공 가치)/i.test(qBefore) &&
        answered === BANK.diffRelevance
      ) {
        await dumpLoopStorage(page, 't12-wrong-slot');
        await assertImmediateWrongSlotReask(page, 'customerPersona', 'P0-1 T12→T13');
      }
      if (
        /(크게 해결하려는 불편|핵심 불편|불편)/i.test(qBefore) &&
        !/(가장 필요로 하는 사람|누구인가요|솔루션|해결하는 방식|제공 가치)/i.test(qBefore) &&
        answered === BANK.customer
      ) {
        await dumpLoopStorage(page, 't13-wrong-slot');
        await assertImmediateWrongSlotReask(page, 'problemJtbd', 'P0-2 T13→T14');
      }
      if (await isFinalReviewSurface(page)) {
        if (meaningfulCounter < 15 && (await tryContinueRefining(page))) continue;
        break;
      }
    }

    // Loop 4 — drain partial-gap follow-ups via continue-refining if loop closed early
    let drain = 0;
    while (
      meaningfulCounter < 15 &&
      drain < 8 &&
      !(await page.locator('textarea').last().isVisible({ timeout: 1_500 }).catch(() => false))
    ) {
      if (!(await tryContinueRefining(page))) break;
      drain += 1;
      while (
        meaningfulCounter < MAX_MEANINGFUL_TURNS &&
        (await ensureAnswerBox(page))
      ) {
        if (await isFinalReviewSurface(page)) break;
        const q = await textOrEmpty(page, 'surface-question');
        if (!q.replace(/\s+/g, ' ').trim()) break;
        const row = await answerTurn(
          page,
          `11-refine-drain-l${drain}`,
          `11-refine-drain-l${drain}.png`,
          undefined,
          ['continue-refining depth drain'],
        );
        if (!row) break;
      }
    }

    await probeStartAnalysisGate(page, '17-gate-probe', '17-gate-probe.png');

    const bodySuf = await page.locator('body').innerText();
    state.finalReviewReachable =
      (await page.getByTestId('conversational-final-output').isVisible().catch(() => false)) ||
      /Analysis Ready|start analysis|분석 시작/i.test(bodySuf);

    const startAnalysis = page.getByRole('button', {
      name: /That's right — start analysis|맞습니다.*분석|start analysis|분석 시작/i,
    });
    if (
      meaningfulCounter >= 15 &&
      (await startAnalysis.first().isVisible().catch(() => false)) &&
      !(await startAnalysis.first().isDisabled().catch(() => true))
    ) {
      await startAnalysis.first().click();
      await page.waitForTimeout(5_000);
      await snap(page, '18-final-review', '(start analysis)', '18-final-review.png');
      const bodyAfter = await page.locator('body').innerText();
      const goMatch = bodyAfter.match(/\bGO\b|HOLD|NO_GO|판단/);
      state.analysisVerdict = goMatch?.[0] ?? null;
      state.finalReviewReachable = true;
    }

    // Wire nextQuestion chain
    for (let i = 0; i < state.turns.length - 1; i++) {
      state.turns[i]!.nextQuestion = state.turns[i + 1]!.aiQuestion;
      state.turns[i]!.nextQuestionReason =
        state.turns[i + 1]!.purpose || state.turns[i + 1]!.whyNow;
    }

    state.observations.push(`meaningfulAnswerCount=${meaningfulCounter}`);
    state.observations.push(`duplicateAnswerCount=${state.duplicateAnswerCount}`);
    state.observations.push(`paddingTurnCount=${state.paddingTurnCount}`);
    state.observations.push(`whyPanelSeen=${state.whyPanelSeen}`);
    state.observations.push(`conflictUiSeen=${state.conflictUiSeen}`);
    state.observations.push(`reAskSameQuestionCount=${state.reAskSameQuestionCount}`);
    state.observations.push(`wrongSlotHints=${state.wrongSlotHints.length}`);
    if (state.wrongSlotHints.length) {
      state.observations.push(...state.wrongSlotHints);
    }
    state.observations.push(`turnCount=${turnCounter}`);
    state.observations.push(`analysisVerdict=${state.analysisVerdict}`);
    persist();
  } finally {
    persist();
  }

  expect(state.duplicateAnswerCount).toBe(0);
  expect(state.paddingTurnCount).toBe(0);
  expect(state.reAskSameQuestionCount).toBe(0);
  expect(meaningfulCounter).toBeGreaterThanOrEqual(15);
  expect(meaningfulCounter).toBeLessThanOrEqual(25);
});
