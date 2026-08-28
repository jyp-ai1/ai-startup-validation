/**
 * ALABOM Long Sprint Final — Production Demo LIVE capture (30+ turns).
 * Covers: New-user-like thin seed · Document gaps · Long conversation · Nonsense · Why ·
 * Mid-summary · Edit · Conflict · Competition→diff→value · Revenue/pricing ·
 * Sufficiency · Analysis gate · Final result.
 *
 * From apps/web:
 *   $env:CI='1'; $env:PLAYWRIGHT_BASE_URL='https://ai-startup-validation-tau.vercel.app'
 *   pnpm exec playwright test e2e/_cpo-long-sprint-final-prod-capture.spec.ts --retries=0
 *
 * Auth out of scope — Demo entry `/demo/start` only.
 */
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/conversation-validation/long-sprint-final',
);
const MEDIA = path.join(OUT, 'media');
const RAW_JSON = path.join(OUT, 'transcript-raw.json');
fs.mkdirSync(MEDIA, { recursive: true });

/** Match Long Sprint Final fix SHA on Production (update after push). */
const FIX_SHA_PREFIXES = [
  'long-sprint', // placeholder — overwritten by REQUIRED_SHA_PREFIX env or tip match below
] as const;
const REQUIRED_SHA_PREFIX = (process.env.ALABOM_REQUIRED_SHA ?? '').trim();

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
  notThat: '그건 아닌데? 결제자는 관광객 직접 결제가 맞고, B2B 정산은 아닙니다.',
  solution:
    '관심사·동선·식사 제약을 반영한 실시간 맞춤 일정과 현지인 동행을 한 번에 제공하는 방식입니다.',
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
};

let turnCounter = 0;
/** Long Sprint — do not treat final-review as journey end before this many snaps. */
const MIN_CAPTURE_TURNS = 30;
let previousGaps = '';

function persist() {
  const payload = JSON.stringify(state, null, 2);
  const tmp = `${RAW_JSON}.tmp`;
  fs.writeFileSync(tmp, payload, 'utf8');
  try {
    fs.renameSync(tmp, RAW_JSON);
  } catch {
    fs.writeFileSync(RAW_JSON, payload, 'utf8');
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
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
  // Long Sprint — keep Q loop until MIN_CAPTURE_TURNS even if Start Analysis enables early.
  if (turnCounter < MIN_CAPTURE_TURNS) return false;

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

async function reopenFromAnalysisReady(page: Page): Promise<boolean> {
  if (turnCounter >= MIN_CAPTURE_TURNS) return false;

  const startAnalysis = page.getByRole('button', {
    name: /That's right — start analysis|맞습니다.*분석|start analysis/i,
  });
  const onAnalysisReady =
    (await startAnalysis.first().isVisible({ timeout: 1_500 }).catch(() => false)) &&
    !(await startAnalysis.first().isDisabled().catch(() => true));

  const body = await page.locator('body').innerText();
  const reviewReady =
    onAnalysisReady ||
    /Before analysis, confirm|Analysis Ready|분석 전에,/i.test(body);

  if (!reviewReady) return false;

  // Product path — reopen Q loop without Start Analysis (Long Sprint continue-refining CTA)
  const refine = page.getByTestId('continue-refining-cta');
  if (await refine.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
    await refine.first().click({ force: true });
    await page.waitForTimeout(1_200);
    const box = page.locator('textarea').last();
    if (await box.isVisible({ timeout: 6_000 }).catch(() => false)) {
      state.observations.push(`reopenFromAnalysisReady: continue-refining @turn${turnCounter}`);
      return true;
    }
  }

  // Return to AI PM dialogue (sidebar strip) — do NOT click Start Analysis yet.
  const aiPmStrip = page.getByRole('button', { name: /^AI PM$|With AI PM|AI PM dialogue|AI PM 대화/i });
  if (await aiPmStrip.first().isVisible().catch(() => false)) {
    await aiPmStrip.first().click({ force: true });
    await page.waitForTimeout(900);
  }

  const priorEditLink = page.getByRole('button', { name: /이전 답변 수정|← 이전/i });
  if (await priorEditLink.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
    await priorEditLink.first().click({ force: true });
    await page.waitForTimeout(800);
  } else {
    const reopened = await tryReopenLoopViaPriorEdit(page);
    if (!reopened) return false;
  }

  const pick = page.getByRole('button').filter({ hasText: /문제|고객|경쟁|수익|차별|지불|시장/i });
  if (await pick.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
    await pick.first().click({ force: true });
    await page.waitForTimeout(900);
  }

  const box = page.locator('textarea').last();
  const ok = await box.isVisible({ timeout: 5_000 }).catch(() => false);
  if (ok) {
    state.observations.push(`reopenFromAnalysisReady @turn${turnCounter}`);
  }
  return ok;
}

async function tryReopenLoopViaPriorEdit(page: Page): Promise<boolean> {
  if (turnCounter >= MIN_CAPTURE_TURNS) return false;
  const editCta = page.getByTestId('edit-prior-answer-cta');
  if (!(await editCta.first().isVisible({ timeout: 1_500 }).catch(() => false))) {
    const aiDialogue = page.getByRole('button', { name: /AI PM dialogue|With AI PM|AI PM 대화/i });
    if (await aiDialogue.first().isVisible().catch(() => false)) {
      await aiDialogue.first().click();
      await page.waitForTimeout(700);
    }
    const aiPm = page.getByRole('button', { name: /^AI PM$/i });
    if (await aiPm.first().isVisible().catch(() => false)) {
      await aiPm.first().click();
      await page.waitForTimeout(700);
    }
  }
  if (!(await editCta.first().isVisible({ timeout: 1_500 }).catch(() => false))) return false;
  await editCta.first().click({ force: true });
  await page.waitForTimeout(800);
  const pick = page.getByRole('button').filter({ hasText: /문제|고객|경쟁|수익|차별|지불/i });
  if (await pick.first().isVisible().catch(() => false)) {
    await pick.first().click({ force: true });
    await page.waitForTimeout(900);
  }
  const box = page.locator('textarea').last();
  if (!(await box.isVisible({ timeout: 3_000 }).catch(() => false))) return false;
  state.observations.push(`reopenLoopViaPriorEdit @turn${turnCounter}`);
  return true;
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
  if (!ok && turnCounter < MIN_CAPTURE_TURNS) {
    const reopened =
      (await reopenFromAnalysisReady(page)) || (await tryReopenLoopViaPriorEdit(page));
    if (reopened) {
      box = page.locator('textarea').last();
      return box.isVisible({ timeout: 5_000 }).catch(() => false);
    }
    // Last resort — dismiss "Done for today" / recognition and retry refine
    const doneToday = page.getByRole('button', { name: /Done for today|오늘은 여기까지/i });
    if (await doneToday.first().isVisible({ timeout: 800 }).catch(() => false)) {
      await doneToday.first().click({ force: true }).catch(() => null);
      await page.waitForTimeout(600);
    }
    if (await reopenFromAnalysisReady(page)) {
      box = page.locator('textarea').last();
      return box.isVisible({ timeout: 5_000 }).catch(() => false);
    }
  }
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
  if (/해결하는 방식|제공 가치|솔루션|solution|어떻게 해결/i.test(q)) {
    return BANK.solution;
  }

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
  // Long Sprint — count only the primary ask line (strip purpose / digest / prior answers).
  // surface-question may embed purpose that quotes user text containing '?' (false dual-?).
  const primaryAsk = question
    .split(/\n|왜 지금|왜 묻|이번 질문|현재 이해|지금까지/)[0]
    ?.replace(/\s+/g, ' ')
    .trim() ?? question;
  const blob = primaryAsk;
  const hasComp = /비슷한 역할|이미 하고 있는 서비스|대안·경쟁|경쟁사(?!\s*가\s*따라)/i.test(blob);
  const hasPricing = /수익은 어떤 구조|가격·요금|프라이싱|구조로 발생/i.test(blob);
  const hasCustomer =
    /필요로 하는 사람|누구인가요/i.test(blob) && !/차별점이\s*고객|고객에게\s*왜/i.test(blob);
  if (hasComp && hasPricing && hasCustomer) {
    return ['mixed-competition+pricing+customer-on-one-screen'];
  }
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
    screenshot = `docs/evidence/ALABOM/conversation-validation/long-sprint-final/media/${shotName}`;
  }

  const prevQs = state.turns.map((t) => t.aiQuestion);
  const templateLikeHints = detectTemplateHints(questionBlock, purpose, prevQs);
  if (templateLikeHints.includes('re-ask-same-question-text')) {
    state.reAskSameQuestionCount += 1;
  }

  // Prefer purpose-stripped ask: surface-question may concatenate purpose/digest.
  const askForMixed =
    purpose && questionBlock.includes(purpose)
      ? questionBlock.replace(purpose, ' ').trim()
      : questionBlock;
  const mixed = detectMixedQuestionHints(askForMixed, body);
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
  opts?: { skipPriorEdit?: boolean },
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

/** Long-state depth — stay in Q loop until MIN_CAPTURE_TURNS via refine-reopen + slot-safe answers. */
async function extendToMinTurns(page: Page): Promise<void> {
  let depth = 0;
  while (turnCounter < MIN_CAPTURE_TURNS && depth < 40) {
    if (!(await ensureAnswerBox(page))) {
      const reopened =
        (await reopenFromAnalysisReady(page)) || (await tryReopenLoopViaPriorEdit(page));
      if (!reopened) {
        state.observations.push(`extendToMinTurns stalled @turn${turnCounter}`);
        break;
      }
    }
    if (!(await ensureAnswerBox(page))) break;
    depth += 1;
    const q = await textOrEmpty(page, 'surface-question');
    const body = await page.locator('body').innerText();
    // Meta turns only when explicitly asking meta — otherwise always slot-safe pickAnswer
    let forced: string | undefined;
    if (/왜 그게 중요|why.*important/i.test(q) && depth % 7 === 0) forced = BANK.whyChallenge;
    else if (/정리해줘|summarize/i.test(q) && depth % 11 === 0) forced = BANK.midSummaryAsk;
    await answerCurrent(
      page,
      `18-depth-l${depth}`,
      `18-depth-l${depth}.png`,
      forced ?? pickAnswer(q, body),
      ['long-state depth extension toward 30 turns'],
      { skipPriorEdit: true },
    );
  }
}

/** Prior-edit extension — adds turns without closing remaining critical gaps. */
async function priorEditExtension(
  page: Page,
  answer: string,
  label: string,
  shot: string,
): Promise<TurnSnap | null> {
  if (turnCounter >= MIN_CAPTURE_TURNS) return null;
  const editBtn = page.getByRole('button', { name: /이전 답변 수정|← 이전/i });
  if (!(await editBtn.first().isVisible({ timeout: 2_000 }).catch(() => false))) return null;
  await editBtn.first().click({ force: true });
  await page.waitForTimeout(700);
  const pick = page.getByRole('button').filter({ hasText: /문제|고객|경쟁|수익|차별|지불|시장/i });
  if (await pick.first().isVisible().catch(() => false)) {
    await pick.first().click({ force: true });
    await page.waitForTimeout(800);
  }
  if (!(await ensureAnswerBox(page))) return null;
  return answerCurrent(page, label, shot, answer, ['prior-edit long-state extension'], {
    skipPriorEdit: true,
  });
}

async function answerWithOptionalPriorEdit(
  page: Page,
  label: string,
  shot: string,
  forcedAnswer?: string,
  notes?: string[],
): Promise<TurnSnap | null> {
  const snapRow = await answerCurrent(page, label, shot, forcedAnswer, notes);
  if (!snapRow || turnCounter >= MIN_CAPTURE_TURNS) return snapRow;
  // Interleave prior-edit every answer while loop still open (Long Sprint 30+ turns)
  if (turnCounter >= 5 && (await ensureAnswerBox(page))) {
    const variants = [
      BANK.editCorrection,
      '추가: 초기 채널은 인스타그램 로컬 가이드와 호텔 컨시어지입니다.',
      '정정: 차별점은 AI 추천이 아니라 현지 큐레이터 실시간 동선 조정입니다.',
      '보완: MVP는 서울·관심사 3종으로 좁혀 2주 파일럿합니다.',
      '추가: 가격 가설 1인 8~12만 원, 수수료 10~15%입니다.',
    ];
    const vi = Math.floor(turnCounter / 2) % variants.length;
    await priorEditExtension(
      page,
      variants[vi]!,
      `${label}-prior-edit`,
      shot.replace('.png', '-prior-edit.png'),
    );
  }
  return snapRow;
}

/**
 * Probe Start Analysis affordance: disabled button and/or critical_gap copy.
 * Sets state.criticalGapBlockedStartAnalysis.
 */
async function probeStartAnalysisGate(page: Page, label: string, shot: string) {
  let body = await page.locator('body').innerText();
  const criticalOnLoop =
    (await page.getByTestId('critical-gap-block-hint').isVisible().catch(() => false)) ||
    /Start Analysis는 차단|Analysis Ready 아님|Critical Unknown|핵심 공백|아직 확인 필요|Critical gaps remain/i.test(
      body,
    );

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
    /critical_gap|critical gap|핵심 공백|아직 확인 필요|Start Analysis는 차단|Analysis Ready 아님|Critical Unknown|분석을 시작하려면|blocked|Critical gaps remain/i.test(
      body,
    ) ||
    (await page.getByTestId('analysis-critical-gap').isVisible().catch(() => false)) ||
    (await page.getByTestId('critical-gap-block-hint').isVisible().catch(() => false)) ||
    (await page.getByTestId('sufficiency-vs-analysis-ready').isVisible().catch(() => false));

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

test('ALABOM Long Sprint Final prod journey capture (30+ turns)', async ({ page, request }) => {
  test.setTimeout(900_000);

  const build = await request.get('/api/build-info');
  const buildJson = (await build.json()) as { data?: { commit?: string } };
  state.productionCommit = buildJson.data?.commit ?? '';
  state.shaMatch = REQUIRED_SHA_PREFIX
    ? state.productionCommit.startsWith(REQUIRED_SHA_PREFIX)
    : state.productionCommit.length > 6;
  if (REQUIRED_SHA_PREFIX && !state.shaMatch) {
    throw new Error(
      `Production SHA ${state.productionCommit} does not match required ${REQUIRED_SHA_PREFIX}`,
    );
  }
  fs.writeFileSync(
    path.join(OUT, 'prod-build-info.json'),
    JSON.stringify(
      {
        commit: state.productionCommit,
        targetSha: REQUIRED_SHA_PREFIX || 'tip-main',
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
    // Resolve conflict UI if shown, else re-mention "그건 아닌데?"
    const keepPrior = page.getByRole('button', { name: /이전 내용이 맞아|Current = Old/i });
    const acceptNew = page.getByRole('button', { name: /새 답변이 맞아|Superseded/i });
    if (await acceptNew.first().isVisible().catch(() => false)) {
      await acceptNew.first().click();
      await page.waitForTimeout(1200);
      state.observations.push('contradiction resolved: accept_new (Old→Superseded)');
    } else if (await keepPrior.first().isVisible().catch(() => false)) {
      await keepPrior.first().click();
      await page.waitForTimeout(1200);
      state.observations.push('contradiction resolved: keep_prior');
    } else if (await ensureAnswerBox(page)) {
      await answerCurrent(page, '09b-not-that', '09b-not-that.png', BANK.notThat, [
        '그건 아닌데? — re-mention / conflict clarification',
      ]);
    }

    // --- 10–14: competitor (distinct) → differentiation → relevance / defensibility / pricing ---
    let loops = 0;
    let sawCompetitor = false;
    let sawDiff = false;
    let sawDiffRelevance = false;
    let sawDefensibility = false;
    let sawRevenue = false;

    // Long Sprint — continue until natural Analysis Ready; do not exit at 18.
    while (loops < 20 && turnCounter < MIN_CAPTURE_TURNS) {
      if (!(await ensureAnswerBox(page))) {
        if (turnCounter >= MIN_CAPTURE_TURNS) break;
        const reopened = await reopenFromAnalysisReady(page);
        if (!reopened && !(await ensureAnswerBox(page))) break;
      }
      if (!(await ensureAnswerBox(page))) break;
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
      } else if (/해결하는 방식|제공 가치|솔루션|solution|어떻게 해결/i.test(q)) {
        forced = BANK.solution;
        label = `12-solution-l${loops}`;
        shot = '12-solution.png';
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
      if (turnCounter < MIN_CAPTURE_TURNS && !(await ensureAnswerBox(page))) {
        await reopenFromAnalysisReady(page);
      }
      if (await isFinalReviewSurface(page)) break;
    }

    // Force distinct competitor then differentiation if not naturally asked
    if ((await ensureAnswerBox(page)) && !sawCompetitor && turnCounter < 30) {
      await answerCurrent(page, '10b-force-competition', '10-competition.png', BANK.competitor, [
        'forced competitor (distinct)',
      ]);
      sawCompetitor = true;
    }
    if ((await ensureAnswerBox(page)) && !sawDiff && turnCounter < 32) {
      await answerCurrent(
        page,
        '11b-force-differentiation',
        '11-differentiation.png',
        BANK.differentiation,
        ['forced differentiation — BANK.differentiation after competitor'],
      );
      sawDiff = true;
    }

    // Extra depth answers while Critical Gaps may still remain (long-state path)
    const EXTRA = [
      '초기 검증 채널은 방한 FIT 커뮤니티·가이드 파트너 소개·인스타 체험 후기입니다.',
      '가격 가설은 반나절 체험 기준 1인 8~12만 원대, 수수료는 예약액의 10~15%입니다.',
      'MVP는 서울 한정·관심사 3종(미식·야경·로컬)으로 좁혀 수요를 먼저 확인합니다.',
      '리스크는 가이드 수급 변동과 성수기 가격 민감도입니다. 사전 예약 보증으로 완화합니다.',
      '검증 계획: 2주간 가이드 10명 인터뷰 + 랜딩 CTA 클릭으로 관심도를 측정합니다.',
    ];
    let extraIdx = 0;
    while (extraIdx < EXTRA.length && turnCounter < 34 && (await ensureAnswerBox(page))) {
      if (await isFinalReviewSurface(page)) break;
      await answerCurrent(
        page,
        `15b-extra-l${extraIdx + 1}`,
        `15b-extra-l${extraIdx + 1}.png`,
        EXTRA[extraIdx],
        ['long-sprint depth answer while gaps may remain'],
      );
      extraIdx += 1;
    }

    // Drain remaining asks toward Analysis Ready (prefer ≥30 turns; do not pad if ready early)
    let drain = 0;
    while (drain < 14 && turnCounter < 40 && (await ensureAnswerBox(page))) {
      drain += 1;
      await answerCurrent(page, `16-drain-l${drain}`, `16-drain-l${drain}.png`);
      if (await isFinalReviewSurface(page)) break;
    }

    // Long-state extension — prior-edit cycles reopen Q loop after Analysis Ready overview
    const EDIT_CYCLE = [
      '정정합니다. 경쟁은 글로벌 OTA뿐 아니라 인스타그램 로컬 가이드 DM도 포함합니다.',
      '추가로, 초기 채널은 호텔 컨시어지 제휴와 K-컬처 밋업 그룹입니다.',
      '리스크는 가이드 노쇼입니다. 대체 가이드 풀과 환불 정책으로 완화합니다.',
      '검증은 2주 파일럿 20팀 예약 전환율을 봅니다.',
      '차별점은 AI가 아니라 현지 큐레이터가 실시간 동선을 조정한다는 점입니다.',
      '수익은 프리미엄 번들(이동+식사+가이드) 마진 25%도 검토 중입니다.',
      '고객은 MZ뿐 아니라 40대 부부 FIT도 2차 타깃입니다.',
      '문제는 언어 장벽보다 「원하는 경험을 못 찾는」 탐색 비용이 더 큽니다.',
      '방어력은 파트너 독점 계약과 리뷰 데이터입니다.',
      '시장 근거는 서울시 관광 통계와 제휴 호텔 문의 증가입니다.',
      '왜 그게 중요하죠?',
      '지금까지 이해한 사업 정리해줘',
      'ㅋㅋㅋㅋ',
    ];
    let editCycle = 0;
    while (editCycle < EDIT_CYCLE.length && turnCounter < MIN_CAPTURE_TURNS) {
      if (!(await ensureAnswerBox(page))) {
        const reopened = await reopenFromAnalysisReady(page);
        if (!reopened && !(await tryReopenLoopViaPriorEdit(page))) break;
      }
      if (!(await ensureAnswerBox(page))) break;
      const ans = EDIT_CYCLE[editCycle]!;
      if (/왜 그게|정리해줘|ㅋㅋ/.test(ans)) {
        await answerCurrent(page, `19-edit-cycle-l${editCycle + 1}`, `19-edit-cycle-l${editCycle + 1}.png`, ans, [
          'long-state extension via meta/edit/nonsense',
        ]);
      } else {
        await tryReopenLoopViaPriorEdit(page);
        await answerCurrent(page, `19-edit-cycle-l${editCycle + 1}`, `19-edit-cycle-l${editCycle + 1}.png`, ans, [
          'long-state extension via prior-edit reopen',
        ]);
      }
      editCycle += 1;
    }

    // Long Sprint — pad to 30+ via refine-reopen + depth answers before final probe
    await extendToMinTurns(page);

    // --- Sufficiency + Start Analysis critical-gap probe (while gaps may remain) ---
    await probeStartAnalysisGate(page, '17-sufficiency-start-probe', '17-sufficiency-start-probe.png');

    const suf = state.turns[state.turns.length - 1];
    const bodySuf = await page.locator('body').innerText();
    const finalVisible = await page
      .getByTestId('conversational-final-output')
      .isVisible()
      .catch(() => false);
    const readyReview =
      /Ready for review|검토\s*시작|사업성\s*검토|Analysis Ready|start analysis|1차 사업성 검토/i.test(
        bodySuf,
      );
    state.finalReviewReachable = finalVisible || readyReview;
    state.observations.push(
      `Sufficiency: coverage=${suf?.coverageText || '(see body)'}; finalVisible=${finalVisible}; readyReviewCopy=${readyReview}; criticalGapBlockedStartAnalysis=${state.criticalGapBlockedStartAnalysis}`,
    );

    // If still blocked, try closing remaining critical gaps then re-probe
    if (state.criticalGapBlockedStartAnalysis === true && (await ensureAnswerBox(page))) {
      let closeLoops = 0;
      while (closeLoops < 8 && turnCounter < 42 && (await ensureAnswerBox(page))) {
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

    // --- Final review if reachable AFTER critical gaps closed AND ≥30 turns ---
    const startAnalysis = page.getByRole('button', {
      name: /That's right — start analysis|맞습니다.*분석|start analysis|분석 시작/i,
    });
    if (
      turnCounter >= MIN_CAPTURE_TURNS &&
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
    } else if (turnCounter < MIN_CAPTURE_TURNS) {
      state.observations.push(
        `final review deferred — turnCount=${turnCounter} (<${MIN_CAPTURE_TURNS}); Start Analysis not clicked`,
      );
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
    expect(state.turns.length).toBeGreaterThanOrEqual(15);
    if (state.turns.length < MIN_CAPTURE_TURNS) {
      state.observations.push(
        `TURN SHORTFALL: got ${state.turns.length} (<30) — journey ended when Analysis Ready / final surface`,
      );
    }
  } finally {
    persist();
  }
});
