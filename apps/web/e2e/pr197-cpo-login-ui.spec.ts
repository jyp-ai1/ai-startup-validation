/**
 * PR #197 CPO login-UI verify — authenticated workspace, not engine dump.
 * Engine PASS is not treated as UI PASS.
 *
 * Walks the live asked gap (confirm / MCQ / 기타+text). Does not assume
 * problem → customer → payer order. Session reads are project-scoped.
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

import {
  dismissCookies,
  dismissRecognition,
  readSurfaceQuestion,
  submitAnswer,
} from './_helpers/v3-p0-e2e-helpers';
import { loginWithQaMagicLink, qaAuthReady } from './_helpers/qa-magic-auth';

const OUT =
  '/workspace/docs/evidence/ALABOM/AI-PM/PR197-CPO-LOGIN-UI-DUMP.json';
const ARTIFACT_DIR = process.env.UX_FLOW_ARTIFACT_DIR ?? '/opt/cursor/artifacts/screenshots';

const DOCS = {
  S4: `서비스: 아이 간식을 매주 집 앞으로 보내는 구독 박스
대상: 맞벌이 부모
문제: 장을 볼 시간이 없고 과자 고르기가 피곤하다
수익: 월 구독`,
  S6: `서비스: 가사 도우미와 맞벌이 집을 연결하는 중개 앱
대상: 맞벌이 가정 / 도우미
문제: 믿을 사람을 찾기 어렵고, 도우미는 일감이 불안정하다
수익: 거래 수수료`,
  S2: `서비스: 소규모 양조장 전통주를 브랜드로 묶어 온라인·팝업으로 판매
대상: 전통주를 선물·취미로 찾는 30–40대
문제: 양조장마다 채널이 흩어져 소비자가 좋은 술을 발견하기 어렵다
수익: 제품 판매 + 양조장 입점 수수료`,
  S3: `서비스: 중소 제조사의 견적·발주 메일을 읽어 엑셀 발주서를 자동으로 채우는 툴
대상: 직원 20–80명 제조사 영업관리자
문제: 메일·엑셀·ERP에 같은 숫자를 세 번 옮기다 오타가 난다
수익: 좌석 월 구독`,
  S5: `서비스: 단백질 쿠키를 자사몰에서 팝니다
대상: 운동하는 20–30대
문제: 시중 단백질바는 맛없거나 비싸다
수익: 제품 판매`,
} as const;

type Verdict = 'PASS' | 'FAIL' | 'NOT VERIFIED';

type GapPatterns = {
  problem?: RegExp;
  customer?: RegExp;
  payer?: RegExp;
};

function e2eBaseUrl(): string {
  if (process.env.PLAYWRIGHT_BASE_URL?.trim()) {
    return process.env.PLAYWRIGHT_BASE_URL.replace(/\/$/, '');
  }
  const host = process.env.PLAYWRIGHT_E2E_HOST ?? '127.0.0.1';
  const port = process.env.PLAYWRIGHT_E2E_PORT ?? '3199';
  return `http://${host}:${port}`;
}

function gitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'UNKNOWN';
  }
}

async function shot(page: Page, name: string) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: `${ARTIFACT_DIR}/${name}.png`, fullPage: true });
}

async function waitThinking(page: Page) {
  const thinking = page.getByTestId('ai-pm-thinking-stages');
  if (await thinking.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await thinking.waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => null);
  }
  await dismissRecognition(page);
  await page.waitForTimeout(500);
}

async function clickThroughReading(page: Page) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await dismissCookies(page);
    if (await page.getByTestId('answer-input').isVisible().catch(() => false)) return;
    if (await page.getByTestId('ai-pm-simple-question').isVisible().catch(() => false)) return;
    if (await page.getByTestId('confirm-yes-cta').isVisible().catch(() => false)) return;
    if (await page.getByTestId('business-choice-options').isVisible().catch(() => false)) return;
    if (await page.getByTestId('document-first-card').isVisible().catch(() => false)) return;
    const cont = page.getByRole('button', {
      name: /답변으로 같이 정리하기|같이 확인|계속하기|Continue/i,
    });
    if (await cont.first().isVisible().catch(() => false)) {
      await cont.first().click({ force: true });
      await page.waitForTimeout(700);
      continue;
    }
    await page.waitForTimeout(400);
  }
}

async function createProject(page: Page, title: string, description: string) {
  await page.goto('/ko/workspace', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await dismissCookies(page);
  if (page.url().includes('/auth/login')) {
    throw new Error('login session lost — redirected to /auth/login');
  }
  const create = page.getByTestId('my-projects-create-form');
  if (!(await create.isVisible({ timeout: 8_000 }).catch(() => false))) {
    const newCta = page.getByRole('button', { name: /새 프로젝트|사업 검토|새 검토/ });
    if (await newCta.first().isVisible().catch(() => false)) {
      await newCta.first().click();
    }
  }
  await expect(page.getByTestId('my-projects-create-form')).toBeVisible({ timeout: 20_000 });
  await page.locator('#new-project-title').fill(title);
  const review = page.locator('input[name="reviewType"][value="startup-idea"]');
  if (await review.count()) await review.check();
  await page.locator('#project-description').fill(description);
  await page.getByRole('button', { name: /사업 검토 시작|Start business review/ }).click();
  await page.waitForURL(/\/workspace\?project=/, { timeout: 60_000 });
  await clickThroughReading(page);
  const yes = page.getByTestId('understanding-confirm-yes');
  if (await yes.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await yes.click({ force: true });
    await page.waitForTimeout(1_200);
  }
  await dismissRecognition(page);
  await page
    .getByTestId('ai-pm-simple-question')
    .or(page.getByTestId('answer-input'))
    .or(page.getByTestId('confirm-yes-cta'))
    .or(page.getByTestId('business-choice-options'))
    .first()
    .waitFor({ state: 'visible', timeout: 45_000 });
}

function currentProjectId(page: Page): string | null {
  try {
    return new URL(page.url()).searchParams.get('project');
  } catch {
    return null;
  }
}

async function projectSnap(page: Page) {
  const projectId = currentProjectId(page);
  return page.evaluate((pid) => {
    const loopRaw = pid
      ? sessionStorage.getItem(`launchlens.aiPmLoop.${pid}`)
      : null;
    const memRaw = pid
      ? sessionStorage.getItem(`launchlens.conversationMemory.${pid}`)
      : null;
    const loop = loopRaw ? (JSON.parse(loopRaw) as Record<string, unknown>) : null;
    const mem = memRaw ? (JSON.parse(memRaw) as { facts?: unknown[] }) : null;
    const gaps =
      (loop?.gapState as { gaps?: Record<string, { completeness?: string; evidence?: unknown }> } | undefined)
        ?.gaps ?? null;
    const lastDecision = (loop?.lastDecision ?? null) as {
      targetGap?: string;
      targetGapId?: string;
      questionText?: string;
    } | null;
    const turns = Array.isArray(loop?.turns) ? (loop.turns as Array<Record<string, unknown>>) : [];
    const lastTurn = turns.at(-1) ?? null;
    const judgment = (loop?.ceoJudgment ?? null) as {
      dimensions?: { customer?: { summary?: string; status?: string; knowledgeSource?: string } };
    } | null;
    return {
      projectId: pid,
      targetGap: lastDecision?.targetGapId ?? lastDecision?.targetGap ?? null,
      gapState: gaps,
      lastDecision,
      lastTurn,
      turnCount: turns.filter((t) => String(t.answer ?? '').trim() && !t.superseded).length,
      memoryFacts: Array.isArray(mem?.facts) ? mem.facts : [],
      judgmentCustomer: judgment?.dimensions?.customer ?? null,
      turns: turns.map((t) => ({
        asked: t.askedQuestionText ?? null,
        answer: t.answer ?? null,
        gap: t.targetGap ?? null,
        intent: t.intent ?? null,
      })),
    };
  }, projectId);
}

async function visibleBody(page: Page) {
  return ((await page.locator('body').innerText().catch(() => '')) || '').trim();
}

async function choiceLabels(page: Page) {
  const root = page.getByTestId('business-choice-options');
  if (!(await root.isVisible().catch(() => false))) return [];
  return root.locator('button').allInnerTexts();
}

async function clickChoiceMatching(page: Page, pattern: RegExp) {
  const root = page.getByTestId('business-choice-options');
  if (!(await root.isVisible().catch(() => false))) return false;
  const buttons = root.locator('button');
  const count = await buttons.count();
  for (let i = 0; i < count; i += 1) {
    const text = (await buttons.nth(i).innerText()).replace(/^○\s*/, '').trim();
    if (pattern.test(text)) {
      await buttons.nth(i).click({ force: true });
      await page.waitForTimeout(700);
      await waitThinking(page);
      return true;
    }
  }
  return false;
}

async function clickFirstSpecific(page: Page) {
  const root = page.getByTestId('business-choice-options');
  if (!(await root.isVisible().catch(() => false))) return false;
  const buttons = root.locator('button');
  const count = await buttons.count();
  for (let i = 0; i < count; i += 1) {
    const text = (await buttons.nth(i).innerText()).replace(/^○\s*/, '').trim();
    if (/^기타$|^모르는|^아직 모르겠/.test(text)) continue;
    await buttons.nth(i).click({ force: true });
    await page.waitForTimeout(700);
    await waitThinking(page);
    return true;
  }
  return false;
}

async function contradictionState(page: Page) {
  const visible = await page.getByTestId('contradiction-confirm').isVisible().catch(() => false);
  return {
    contradictionVisible: visible,
    contradictionText: visible
      ? (await page.getByTestId('contradiction-confirm').innerText()).trim()
      : null,
  };
}

async function captureTurn(page: Page, input: string, via: string, asked: string, labels: string[]) {
  await page.waitForTimeout(400);
  const contradiction = await contradictionState(page);
  const snap = await projectSnap(page);
  const nextQuestion = await readSurfaceQuestion(page).catch(() => '');
  return {
    askedQuestion: asked,
    optionLabels: labels,
    actualUserInput: input,
    via,
    ...contradiction,
    nextQuestion,
    targetGap: snap.targetGap,
    gapState: snap.gapState,
    lastDecision: snap.lastDecision,
    lastTurn: snap.lastTurn,
    turnCount: snap.turnCount,
    memoryFacts: snap.memoryFacts,
    judgmentCustomer: snap.judgmentCustomer,
    turns: snap.turns,
    visibleExcerpt: (await visibleBody(page)).slice(0, 1_200),
  };
}

function isPayerAsk(asked: string, targetGap: string | null) {
  return (
    targetGap === 'payer' ||
    /비용을 지불|도입을 결정|구독료는 누가|결재자|누가 내|누가 내나|누가 결제/.test(asked)
  );
}

function isOneLinerAsk(asked: string) {
  return /누구에게 무엇을 제공/.test(asked);
}

async function answerOnGap(page: Page, patterns: GapPatterns, fallbackText?: string) {
  const asked = await readSurfaceQuestion(page).catch(() => '');
  const labels = await choiceLabels(page);
  const snap = await projectSnap(page);
  const target = snap.targetGap;

  const confirm = page.getByTestId('confirm-yes-cta');
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click({ force: true });
    await page.waitForTimeout(700);
    await waitThinking(page);
    return captureTurn(page, '[confirm-yes]', 'confirm-yes', asked, labels);
  }

  let pattern: RegExp | undefined;
  if (target === 'customerPersona' || /누구|고객|필요로/.test(asked)) pattern = patterns.customer;
  else if (isPayerAsk(asked, target)) pattern = patterns.payer;
  else if (target === 'problemJtbd' || /불편|문제|실수/.test(asked)) pattern = patterns.problem;

  if (pattern && (await clickChoiceMatching(page, pattern))) {
    return captureTurn(page, `[choice ${pattern}]`, 'choice-click', asked, labels);
  }
  if (await clickFirstSpecific(page)) {
    return captureTurn(page, '[first-specific]', 'first-specific', asked, labels);
  }
  if (fallbackText) {
    const typed = await submitAnswer(page, fallbackText);
    return captureTurn(page, fallbackText, typed ? 'typed' : 'submit-failed', asked, labels);
  }
  return captureTurn(page, '', 'no-action', asked, labels);
}

async function typeFreeText(page: Page, text: string) {
  const asked = await readSurfaceQuestion(page).catch(() => '');
  const labels = await choiceLabels(page);
  const other = page.getByTestId('business-choice-other');
  if (await other.first().isVisible().catch(() => false)) {
    await other.first().click({ force: true });
    await page.waitForTimeout(400);
  } else if (labels.some((l) => /기타/.test(l))) {
    await clickChoiceMatching(page, /기타/);
  }
  const box = page.getByTestId('answer-input');
  await box.waitFor({ state: 'visible', timeout: 8_000 }).catch(() => null);
  const typed = await submitAnswer(page, text);
  return captureTurn(page, text, typed ? 'typed' : 'submit-failed', asked, labels);
}

async function walkUntilPayer(page: Page, patterns: GapPatterns, maxTurns = 8) {
  const log: unknown[] = [];
  for (let i = 0; i < maxTurns; i += 1) {
    const asked = await readSurfaceQuestion(page).catch(() => '');
    const snap = await projectSnap(page);
    if (isPayerAsk(asked, snap.targetGap)) {
      return { reached: true, asked, snap, log, labels: await choiceLabels(page) };
    }
    const turn = await answerOnGap(page, patterns);
    log.push(turn);
    if (turn.via === 'no-action' || turn.via === 'submit-failed') break;
  }
  const asked = await readSurfaceQuestion(page).catch(() => '');
  return {
    reached: isPayerAsk(asked, (await projectSnap(page)).targetGap),
    asked,
    snap: await projectSnap(page),
    log,
    labels: await choiceLabels(page),
  };
}

async function walkS4ToT6Ready(page: Page) {
  const patterns: GapPatterns = {
    problem: /고르|선택|시간|장/,
    customer: /아이|부모/,
    payer: /부모/,
  };
  const log: unknown[] = [];
  for (let i = 0; i < 8; i += 1) {
    const asked = await readSurfaceQuestion(page).catch(() => '');
    const snap = await projectSnap(page);
    const customerClosed = snap.gapState?.customerPersona?.completeness === 'CLOSED';
    const validationLike =
      snap.targetGap === 'validationTestability' ||
      /구독료를 낸|이미 .*있|결제.*있/.test(asked);
    if (customerClosed && (validationLike || i >= 3)) {
      return { ready: true, asked, snap, log, labels: await choiceLabels(page) };
    }
    const turn = await answerOnGap(page, patterns);
    log.push(turn);
    if (turn.via === 'no-action' || turn.via === 'submit-failed') {
      return { ready: customerClosed, asked: turn.nextQuestion, snap: await projectSnap(page), log, labels: await choiceLabels(page) };
    }
  }
  const asked = await readSurfaceQuestion(page).catch(() => '');
  const snap = await projectSnap(page);
  return {
    ready: snap.gapState?.customerPersona?.completeness === 'CLOSED',
    asked,
    snap,
    log,
    labels: await choiceLabels(page),
  };
}

function customerFacts(facts: Array<{ key?: string; lifecycle?: string; value?: string }>) {
  return facts.filter((f) => f.key === 'customer');
}

function verdict(ok: boolean, reason: string): { status: Verdict; reason: string } {
  return { status: ok ? 'PASS' : 'FAIL', reason };
}

function notVerified(reason: string): { status: Verdict; reason: string } {
  return { status: 'NOT VERIFIED', reason };
}

test.describe('PR #197 CPO login UI', () => {
  const evidence: Record<string, unknown> = {
    meta: {
      implSha: gitSha(),
      executedAt: new Date().toISOString(),
      path: 'QA magic-link → /ko/workspace create project → WorkspaceAiPmLoopPanel confirm/MCQ/기타+submitAnswer',
      login: 'qa-magic-link (authenticated workspace, not engine dump, not Google button)',
      production: 'NOT VERIFIED',
      note: 'T7 next-question policy: customer+problem CLOSED and payer OPEN → next=payer, not solution. Buyer-as-payer block kept. Do not merge.',
    },
  };

  test('S4 T6/T7 + S6 payer + S2/S3/S5 after-payer on login UI', async ({ page, context }) => {
    test.setTimeout(900_000);
    expect(qaAuthReady(), 'QA magic-link env must be present — do not skip').toBe(true);
    await loginWithQaMagicLink(page, context, e2eBaseUrl());
    await dismissCookies(page);
    evidence.login = {
      landed: page.url(),
      redirectedToLogin: page.url().includes('/auth/login'),
    };
    expect(page.url().includes('/auth/login')).toBe(false);

    // --- S4 ---
    await createProject(page, '아이 간식 구독 박스', DOCS.S4);
    await shot(page, 'pr197-login-s4-ask');
    const s4prep = await walkS4ToT6Ready(page);
    const s4t6 = await typeFreeText(page, '사실 아이가 아니라 혼자 사는 20대가 메인이에요');
    await shot(page, 'pr197-login-s4-t6');

    const customerGapT6 = s4t6.gapState?.customerPersona?.completeness ?? null;
    const memoryCustomerT6 = customerFacts(
      s4t6.memoryFacts as Array<{ key?: string; lifecycle?: string; value?: string }>,
    );
    const livingShowsCollision =
      /충돌/.test(s4t6.visibleExcerpt) ||
      /충돌/.test(s4t6.contradictionText ?? '') ||
      customerGapT6 === 'CONTRADICTED';
    const leftoverConfirmed = memoryCustomerT6.some(
      (f) => f.lifecycle === 'current' && /맞벌이|부모/.test(f.value ?? ''),
    );
    const promoted20s = memoryCustomerT6.some(
      (f) => f.lifecycle === 'current' && /20대/.test(f.value ?? ''),
    );
    const t6Landed =
      s4t6.via !== 'submit-failed' || s4t6.contradictionVisible === true;

    let s4t7: Awaited<ReturnType<typeof typeFreeText>> | Record<string, unknown>;
    if (s4t6.contradictionVisible) {
      s4t7 = {
        askedQuestion: s4t6.nextQuestion,
        optionLabels: s4t6.optionLabels,
        actualUserInput: '지금 메인 고객은 혼자 사는 20대예요',
        via: 'blocked-by-contradiction-dialog — not forceAccept (that would promote 20s immediately)',
        contradictionVisible: true,
        contradictionText: s4t6.contradictionText,
        nextQuestion: s4t6.nextQuestion,
        targetGap: s4t6.targetGap,
        gapState: s4t6.gapState,
        lastDecision: s4t6.lastDecision,
        lastTurn: s4t6.lastTurn,
        turnCount: s4t6.turnCount,
        memoryFacts: s4t6.memoryFacts,
        judgmentCustomer: s4t6.judgmentCustomer,
        turns: s4t6.turns,
        visibleExcerpt: s4t6.visibleExcerpt,
      };
    } else {
      s4t7 = await typeFreeText(page, '지금 메인 고객은 혼자 사는 20대예요');
    }
    await shot(page, 'pr197-login-s4-t7');
    const memoryCustomerT7 = customerFacts(
      (s4t7.memoryFacts as Array<{ key?: string; lifecycle?: string; value?: string }>) ?? [],
    );
    const t7Current20s = memoryCustomerT7.some(
      (f) => f.lifecycle === 'current' && /20대/.test(f.value ?? ''),
    );
    const t7Next = String(s4t7.nextQuestion ?? '');
    const t7NextIsPayer =
      /지불|도입을 결정|결제/.test(t7Next) || s4t7.targetGap === 'payer';
    const t7NextIsSolution =
      /제공 가치|해결하는 방식/.test(t7Next) || s4t7.targetGap === 'solution';

    const t6Facts = s4t6.memoryFacts as Array<{ key?: string; lifecycle?: string; value?: string }>;
    const t7Facts =
      (s4t7.memoryFacts as Array<{ key?: string; lifecycle?: string; value?: string }>) ?? [];
    const t6BuyerCurrent = t6Facts.filter((f) => f.key === 'buyer' && f.lifecycle === 'current');
    const t6CustomerCurrent = t6Facts.filter((f) => f.key === 'customer' && f.lifecycle === 'current');
    const t7BuyerCurrent = t7Facts.filter((f) => f.key === 'buyer' && f.lifecycle === 'current');
    const t6PayerClosed = s4t6.gapState?.payer?.completeness === 'CLOSED';
    const t6PayerEvidence = JSON.stringify(s4t6.gapState?.payer?.evidence ?? []);
    const t7Options = (s4t7.optionLabels ?? []) as string[];
    const t7HasOther = t7Options.some((l) => /기타/.test(l));
    const t7HasCustomerCandidate = t7Options.some((l) => /20대|맞벌이|부모/.test(l));
    const t6Surface = String(s4t6.nextQuestion ?? '');
    const t6Decision = String(
      (s4t6.lastDecision as { questionText?: string } | null)?.questionText ?? '',
    );
    const t7Asked = String(s4t7.askedQuestion ?? '');
    const buyerUsedAsCurrentPayer =
      t6BuyerCurrent.length > 0 &&
      (t6PayerClosed || /20대|메인|아니라/.test(t6PayerEvidence));
    const customerConfusedWithBuyer =
      t6CustomerCurrent.some((f) => /아니라/.test(f.value ?? '')) ||
      customerGapT6 === 'CLOSED' && leftoverConfirmed === false && promoted20s;

    evidence.S4 = {
      prep: s4prep,
      t6: s4t6,
      t7: s4t7,
      residual: {
        t6BuyerCurrent,
        t6CustomerCurrent,
        t7BuyerCurrent,
        t6PayerClosed,
        t6PayerEvidence,
        t7Options,
        t6Surface,
        t6Decision,
        t7Asked,
        buyerUsedAsCurrentPayer,
        customerConfusedWithBuyer,
      },
      verdicts: [
        t6Landed
          ? verdict(
              customerGapT6 === 'CONTRADICTED' || livingShowsCollision,
              `S4 T6 UI shows contradicted customer (gap=${customerGapT6}, dialog=${s4t6.contradictionVisible}, via=${s4t6.via})`,
            )
          : notVerified(`S4 T6 input did not land (via=${s4t6.via})`),
        t6Landed
          ? verdict(
              !leftoverConfirmed && !promoted20s,
              `S4 T6 parents current=${leftoverConfirmed} 20s current=${promoted20s}`,
            )
          : notVerified('S4 T6 pre-T7 Fact split — input did not land'),
        s4t6.contradictionVisible
          ? notVerified(
              'S4 T7 not executed — login UI contradiction dialog intercepted T6 (아니라) without persisting; forceAccept would promote 20s immediately and is not T7 reconfirm',
            )
          : verdict(
              t7Current20s && t7NextIsPayer && !t7NextIsSolution && !isOneLinerAsk(t7Next),
              `S4 T7 current20s=${t7Current20s} nextPayer=${t7NextIsPayer} nextSolution=${t7NextIsSolution} next=${t7Next.slice(0, 80)}`,
            ),
        t6Landed
          ? verdict(
              t6BuyerCurrent.length === 0 || !customerConfusedWithBuyer,
              `T6 buyer created=${t6BuyerCurrent.length > 0} customerConfused=${customerConfusedWithBuyer} customerCurrent=${JSON.stringify(t6CustomerCurrent)}`,
            )
          : notVerified('T6 buyer isolation — input did not land'),
        t6Landed
          ? verdict(
              !buyerUsedAsCurrentPayer,
              `T6 buyer used as current payer=${buyerUsedAsCurrentPayer} buyerCurrent=${JSON.stringify(t6BuyerCurrent)} payerClosed=${t6PayerClosed}`,
            )
          : notVerified('T6 buyer-as-payer — input did not land'),
        s4t6.contradictionVisible
          ? notVerified('T7 options — T7 not executed')
          : verdict(
              t7HasOther && (s4t7.via === 'typed') && t7Current20s,
              `T7 options fragments=${!t7HasCustomerCandidate} has기타=${t7HasOther} via=${s4t7.via} labels=${t7Options.join(' | ')}`,
            ),
        t6Landed
          ? verdict(
              /고객|누구/.test(t6Surface) && /고객|누구/.test(t6Decision || t7Asked),
              `T6 surface=${t6Surface.slice(0, 60)} lastDecision=${t6Decision.slice(0, 60)} t7Asked=${t7Asked.slice(0, 60)}`,
            )
          : notVerified('surface vs lastDecision — T6 did not land'),
      ],
    };

    // --- S6 ---
    await createProject(page, '가사 도우미 중개', DOCS.S6);
    const s6walk = await walkUntilPayer(page, {
      problem: /믿|사람|도우미/,
      customer: /맞벌이|집|가정/,
      payer: /집이 낸다|집/,
    });
    let s6payer: Awaited<ReturnType<typeof typeFreeText>> | Record<string, unknown>;
    if (s6walk.reached) {
      if (await clickChoiceMatching(page, /집이 낸다|집/)) {
        s6payer = await captureTurn(page, '집이 낸다', 'choice-click', s6walk.asked, s6walk.labels);
      } else {
        s6payer = await typeFreeText(page, '집이 낸다');
      }
    } else {
      s6payer = {
        askedQuestion: s6walk.asked,
        via: 'payer-not-reached',
        actualUserInput: '집이 낸다',
        nextQuestion: s6walk.asked,
        gapState: s6walk.snap.gapState,
        lastDecision: s6walk.snap.lastDecision,
        turnCount: s6walk.snap.turnCount,
        memoryFacts: s6walk.snap.memoryFacts,
      };
    }
    await shot(page, 'pr197-login-s6-payer');
    const s6next = String((s6payer as { nextQuestion?: string }).nextQuestion ?? '');
    const s6payerClosed =
      (s6payer as { gapState?: { payer?: { completeness?: string } } }).gapState?.payer
        ?.completeness === 'CLOSED';
    evidence.S6 = {
      walk: s6walk,
      afterPayer: s6payer,
      verdicts: [
        s6walk.reached
          ? verdict(
              s6payerClosed &&
                !/비용을 지불하거나 도입을 결정/.test(s6next) &&
                s6next !== s6walk.asked &&
                !isOneLinerAsk(s6next),
              `S6 집이 낸다 payerClosed=${s6payerClosed} next=${s6next.slice(0, 80)}`,
            )
          : notVerified(`S6 payer question not reached; last asked=${s6walk.asked}`),
      ],
    };

    async function runAfterPayer(
      id: 'S2' | 'S3' | 'S5',
      title: string,
      doc: string,
      patterns: GapPatterns,
      payerInput: string,
      shotName: string,
    ) {
      await createProject(page, title, doc);
      const walk = await walkUntilPayer(page, patterns);
      let after: Awaited<ReturnType<typeof typeFreeText>> | Record<string, unknown>;
      if (walk.reached) {
        if (patterns.payer && (await clickChoiceMatching(page, patterns.payer))) {
          after = await captureTurn(page, payerInput, 'choice-click', walk.asked, walk.labels);
        } else {
          after = await typeFreeText(page, payerInput);
        }
      } else {
        after = {
          askedQuestion: walk.asked,
          via: 'payer-not-reached',
          actualUserInput: payerInput,
          nextQuestion: walk.asked,
          gapState: walk.snap.gapState,
          lastDecision: walk.snap.lastDecision,
        };
      }
      await shot(page, shotName);
      const next = String((after as { nextQuestion?: string }).nextQuestion ?? '');
      evidence[id] = {
        walk,
        afterPayer: after,
        verdicts: [
          walk.reached
            ? verdict(
                !isOneLinerAsk(next),
                `${id} after payer next is not document one-liner (next=${next.slice(0, 80)})`,
              )
            : notVerified(`${id} payer question not reached; last asked=${walk.asked}`),
        ],
      };
    }

    await runAfterPayer(
      'S2',
      '전통주 브랜드',
      DOCS.S2,
      {
        problem: /발견|흩어|전통주/,
        customer: /선물|30|40|애호/,
        payer: /직접|쓰는 사람|본인/,
      },
      '쓰는 사람이 직접 낸다',
      'pr197-login-s2-after-payer',
    );
    await runAfterPayer(
      'S3',
      '견적 자동화',
      DOCS.S3,
      {
        problem: /메일|오타|엑셀/,
        customer: /영업|관리자|제조/,
        payer: /대표|관리|영업팀/,
      },
      '대표가 결재한다',
      'pr197-login-s3-after-payer',
    );
    await runAfterPayer(
      'S5',
      '단백질 쿠키',
      DOCS.S5,
      {
        problem: /맛|비싸|단백질/,
        customer: /20|30|헬스|운동/,
        payer: /직접|본인|쓰는 사람/,
      },
      '쓰는 사람이 직접 낸다',
      'pr197-login-s5-after-payer',
    );

    evidence.notVerified = {
      googleOauthClick: 'NOT VERIFIED — QA magic-link injection, not Google button click',
      production: 'NOT VERIFIED',
      frozenT1T8Wording: 'NOT VERIFIED — this run checks state transitions, not frozen T1–T8 copy',
    };

    mkdirSync('/workspace/docs/evidence/ALABOM/AI-PM', { recursive: true });
    writeFileSync(OUT, JSON.stringify(evidence, null, 2));
    expect(s4prep.asked.length + String((s6payer as { askedQuestion?: string }).askedQuestion ?? '').length).toBeGreaterThan(
      0,
    );
  });
});
