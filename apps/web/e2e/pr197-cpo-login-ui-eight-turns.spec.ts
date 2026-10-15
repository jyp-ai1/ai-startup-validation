/**
 * PR #197 — login UI 8-turn walk. Engine PASS is not UI PASS.
 * QA magic-link is authenticated workspace, not Google OAuth.
 * Writes dump after every scenario so a later timeout still leaves evidence.
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

import {
  dismissCookies,
  dismissRecognition,
  readSurfaceQuestion,
  submitAnswer,
} from './_helpers/v3-p0-e2e-helpers';
import { loginWithQaMagicLink, qaAuthReady } from './_helpers/qa-magic-auth';

const OUT = '/workspace/docs/evidence/ALABOM/AI-PM/PR197-CPO-LOGIN-UI-EIGHT-TURNS-DUMP.json';

const DOCS: Record<string, { title: string; doc: string; customer: RegExp; problem: RegExp; payer: RegExp }> = {
  S1: {
    title: '반찬가게 배송 SaaS',
    doc: `서비스: 주문부터 배송까지 관리하는 B2B SaaS
대상: 반찬가게·꽃집 등 직접 배송 소상공인
문제: 주문과 배송을 따로 관리해야 함
수익: 월 구독`,
    customer: /반찬|꽃|소상공/,
    problem: /주문|배송/,
    payer: /사장|본인|관리/,
  },
  S2: {
    title: '전통주 브랜드',
    doc: `서비스: 소규모 양조장 전통주를 브랜드로 묶어 온라인·팝업으로 판매
대상: 전통주를 선물·취미로 찾는 30–40대
문제: 양조장마다 채널이 흩어져 소비자가 좋은 술을 발견하기 어렵다
수익: 제품 판매 + 양조장 입점 수수료`,
    customer: /선물|30|40|애호/,
    problem: /발견|흩어|전통주/,
    payer: /직접|쓰는 사람|본인|선물/,
  },
  S3: {
    title: '견적 자동화',
    doc: `서비스: 중소 제조사의 견적·발주 메일을 읽어 엑셀 발주서를 자동으로 채우는 툴
대상: 직원 20–80명 제조사 영업관리자
문제: 메일·엑셀·ERP에 같은 숫자를 세 번 옮기다 오타가 난다
수익: 좌석 월 구독`,
    customer: /영업|관리자|제조/,
    problem: /메일|오타|엑셀/,
    payer: /대표|관리|영업팀/,
  },
  S4: {
    title: '아이 간식 구독 박스',
    doc: `서비스: 아이 간식을 매주 집 앞으로 보내는 구독 박스
대상: 맞벌이 부모
문제: 장을 볼 시간이 없고 과자 고르기가 피곤하다
수익: 월 구독`,
    customer: /아이|부모/,
    problem: /고르|선택|시간|장/,
    payer: /부모/,
  },
  S5: {
    title: '단백질 쿠키',
    doc: `서비스: 단백질 쿠키를 자사몰에서 팝니다
대상: 운동하는 20–30대
문제: 시중 단백질바는 맛없거나 비싸다
수익: 제품 판매`,
    customer: /20|30|헬스|운동/,
    problem: /맛|비싸|단백질/,
    payer: /직접|본인|쓰는 사람/,
  },
  S6: {
    title: '가사 도우미 중개',
    doc: `서비스: 가사 도우미와 맞벌이 집을 연결하는 중개 앱
대상: 맞벌이 가정 / 도우미
문제: 믿을 사람을 찾기 어렵고, 도우미는 일감이 불안정하다
수익: 거래 수수료`,
    customer: /맞벌이|집|가정/,
    problem: /믿|사람|도우미/,
    payer: /집이 낸다|집/,
  },
};

function e2eBaseUrl(): string {
  return (process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3210').replace(/\/$/, '');
}

function gitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'UNKNOWN';
  }
}

function normQ(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*조금 더 구체적으로 알려 주세요\.?/g, '')
    .replace(/[?？]/g, '?');
}

function emptyDump(): Record<string, unknown> {
  return {
    meta: {
      implSha: gitSha(),
      executedAt: new Date().toISOString(),
      path: 'QA magic-link → /ko/workspace create → 8 typed/MCQ turns',
      login: 'qa-magic-link (not Google OAuth)',
      enginePassIsNotUiPass: true,
      googleOauth: 'NOT VERIFIED',
      production: 'NOT VERIFIED',
      mergeRequest: 'none',
    },
    scenarios: {},
    summary: {
      loginUi: 'NOT VERIFIED',
      googleOauth: 'NOT VERIFIED',
      production: 'NOT VERIFIED',
    },
  };
}

function readDump(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(OUT, 'utf8')) as Record<string, unknown>;
  } catch {
    return emptyDump();
  }
}

function writeDump(patch: Record<string, unknown>) {
  mkdirSync('/workspace/docs/evidence/ALABOM/AI-PM', { recursive: true });
  const current = readDump();
  const scenarios = {
    ...((current.scenarios as Record<string, unknown> | undefined) ?? {}),
    ...((patch.scenarios as Record<string, unknown> | undefined) ?? {}),
  };
  const next = {
    ...current,
    ...patch,
    scenarios,
    meta: { ...((current.meta as object) ?? {}), ...((patch.meta as object) ?? {}), implSha: gitSha() },
  };
  const values = Object.values(scenarios) as Array<{ uiStatus?: string }>;
  const allRecorded = Object.keys(DOCS).every((id) => id in scenarios);
  const allPass = allRecorded && values.every((s) => s.uiStatus === 'PASS');
  next.summary = {
    loginUi: allRecorded
      ? allPass
        ? 'PASS'
        : 'NEEDS FIX or FAIL — see per-scenario uiStatus. Not engine PASS.'
      : 'NOT VERIFIED — incomplete (dump written per scenario)',
    googleOauth: 'NOT VERIFIED',
    production: 'NOT VERIFIED',
    recorded: Object.keys(scenarios),
  };
  writeFileSync(OUT, `${JSON.stringify(next, null, 2)}\n`);
}

async function waitThinking(page: Page) {
  if (page.isClosed()) return;
  const thinking = page.getByTestId('ai-pm-thinking-stages');
  if (await thinking.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await thinking.waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => null);
  }
  await dismissRecognition(page);
}

async function clickThroughReading(page: Page) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline && !page.isClosed()) {
    await dismissCookies(page);
    if (await page.getByTestId('answer-input').isVisible().catch(() => false)) return;
    if (await page.getByTestId('ai-pm-simple-question').isVisible().catch(() => false)) return;
    if (await page.getByTestId('confirm-yes-cta').isVisible().catch(() => false)) return;
    if (await page.getByTestId('business-choice-options').isVisible().catch(() => false)) return;
    const cont = page.getByRole('button', {
      name: /답변으로 같이 정리하기|같이 확인|계속하기|Continue/i,
    });
    if (await cont.first().isVisible().catch(() => false)) {
      await cont.first().click({ force: true });
      await page.waitForTimeout(400);
      continue;
    }
    await page.waitForTimeout(250);
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
  if (await yes.isVisible({ timeout: 6_000 }).catch(() => false)) {
    await yes.click({ force: true });
    await page.waitForTimeout(600);
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
    if (page.isClosed()) return null;
    return new URL(page.url()).searchParams.get('project');
  } catch {
    return null;
  }
}

async function projectSnap(page: Page) {
  const empty = {
    targetGap: null as string | null,
    questionText: null as string | null,
    spine: { customerPersona: 'OPEN', problemJtbd: 'OPEN', payer: 'OPEN' },
  };
  if (page.isClosed()) return empty;
  const projectId = currentProjectId(page);
  try {
    return await page.evaluate((pid) => {
      const loopRaw = pid ? sessionStorage.getItem(`launchlens.aiPmLoop.${pid}`) : null;
      const loop = loopRaw ? (JSON.parse(loopRaw) as Record<string, unknown>) : null;
      const gaps =
        (loop?.gapState as { gaps?: Record<string, { completeness?: string }> } | undefined)?.gaps ??
        null;
      const lastDecision = (loop?.lastDecision ?? null) as {
        targetGap?: string;
        targetGapId?: string;
        questionText?: string;
      } | null;
      return {
        targetGap: lastDecision?.targetGapId ?? lastDecision?.targetGap ?? null,
        questionText: lastDecision?.questionText ?? null,
        spine: {
          customerPersona: gaps?.customerPersona?.completeness ?? 'OPEN',
          problemJtbd: gaps?.problemJtbd?.completeness ?? 'OPEN',
          payer: gaps?.payer?.completeness ?? 'OPEN',
        },
      };
    }, projectId);
  } catch {
    return empty;
  }
}

async function choiceLabels(page: Page) {
  if (page.isClosed()) return [];
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
      await page.waitForTimeout(400);
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
    await page.waitForTimeout(400);
    await waitThinking(page);
    return true;
  }
  return false;
}

async function answerOne(page: Page, spec: (typeof DOCS)[string]) {
  const asked = await readSurfaceQuestion(page).catch(() => '');
  const snap = await projectSnap(page);
  const labels = await choiceLabels(page);
  const confirm = page.getByTestId('confirm-yes-cta');
  let via = 'no-action';
  let input = '';
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click({ force: true });
    await page.waitForTimeout(400);
    await waitThinking(page);
    via = 'confirm-yes';
    input = '[confirm-yes]';
  } else {
    const target = snap.targetGap;
    let pattern: RegExp | undefined;
    if (target === 'customerPersona' || /누구|고객|필요로/.test(asked)) pattern = spec.customer;
    else if (target === 'payer' || /지불|도입을 결정|구독료|결재|누가 내/.test(asked))
      pattern = spec.payer;
    else if (target === 'problemJtbd' || /불편|문제|실수/.test(asked)) pattern = spec.problem;
    if (pattern && (await clickChoiceMatching(page, pattern))) {
      via = 'choice-click';
      input = `[choice ${pattern}]`;
    } else if (await clickFirstSpecific(page)) {
      via = 'first-specific';
      input = '[first-specific]';
    } else {
      const typed = await submitAnswer(page, '창업자 확인');
      via = typed ? 'typed' : 'submit-failed';
      input = '창업자 확인';
    }
  }
  const after = await projectSnap(page);
  const nextQuestion = await readSurfaceQuestion(page).catch(() => '');
  return {
    askedQuestion: asked,
    askedGap: snap.targetGap,
    founderAnswer: input,
    via,
    optionLabels: labels,
    nextQuestion,
    nextTargetGap: after.targetGap,
    spineAfter: after.spine,
  };
}

function scoreTurns(turns: Array<{ askedGap: string | null; askedQuestion: string }>) {
  let consecutiveSameGapCount = 0;
  let maxPayerStreak = 0;
  let payerStreak = 0;
  const seen: string[] = [];
  const gapRevisits: string[] = [];
  const norms: string[] = [];
  let questionRepeat = 0;
  for (let i = 0; i < turns.length; i += 1) {
    const gap = turns[i]?.askedGap ?? '';
    const q = normQ(turns[i]?.askedQuestion ?? '');
    if (i > 0 && gap && gap === turns[i - 1]?.askedGap) consecutiveSameGapCount += 1;
    if (gap === 'payer') {
      payerStreak += 1;
      maxPayerStreak = Math.max(maxPayerStreak, payerStreak);
    } else payerStreak = 0;
    if (gap && seen.includes(gap) && seen.at(-1) !== gap) gapRevisits.push(`${gap}@T${i + 1}`);
    if (gap) seen.push(gap);
    if (q && norms.includes(q)) questionRepeat += 1;
    if (q) norms.push(q);
  }
  const last = turns.at(-1);
  const unresolvedGapEarlyStop = turns.length < 8;
  const problems: string[] = [];
  if (consecutiveSameGapCount >= 2) problems.push(`consecutiveSameGap=${consecutiveSameGapCount}`);
  if (maxPayerStreak >= 3) problems.push(`payerStreak=${maxPayerStreak}`);
  if (questionRepeat > 0) problems.push(`questionRepeat=${questionRepeat}`);
  if (gapRevisits.length) problems.push(`gapRevisit=${gapRevisits.join(',')}`);
  if (unresolvedGapEarlyStop) problems.push('unresolvedGapEarlyStop');
  return {
    reachedEight: turns.length >= 8,
    consecutiveSameGapCount,
    maxPayerStreak,
    questionRepeat,
    gapRevisits,
    unresolvedGapEarlyStop,
    lastAskedGap: last?.askedGap ?? null,
    qualityStatus: problems.length ? 'NEEDS FIX' : 'PASS',
    qualityReason: problems.length ? problems.join('; ') : 'no streak/revisit/early-stop',
  };
}

test.describe.configure({ mode: 'serial' });

test.describe('PR #197 CPO login UI 8-turn', () => {
  test.beforeAll(() => {
    writeDump(emptyDump());
  });

  for (const id of Object.keys(DOCS)) {
    test(`walks ${id} eight turns on authenticated workspace`, async ({ page, context }) => {
      test.setTimeout(300_000);
      const spec = DOCS[id]!;
      if (!qaAuthReady()) {
        writeDump({
          scenarios: {
            [id]: {
              uiStatus: 'NOT VERIFIED',
              reason: 'QA magic-link env missing — did not skip silently',
            },
          },
        });
        throw new Error('QA magic-link env must be present');
      }

      const turns: Array<Record<string, unknown>> = [];
      let error: string | null = null;
      try {
        await loginWithQaMagicLink(page, context, e2eBaseUrl());
        await dismissCookies(page);
        expect(page.url().includes('/auth/login')).toBe(false);
        console.log(`[pr197-ui] ${id} login ok url=${page.url()}`);
        await createProject(page, spec.title, spec.doc);
        console.log(`[pr197-ui] ${id} project=${currentProjectId(page)}`);
        for (let i = 0; i < 8; i += 1) {
          if (page.isClosed()) {
            error = 'page closed before 8 turns';
            break;
          }
          const asked = await readSurfaceQuestion(page).catch(() => '');
          if (!asked) {
            console.log(`[pr197-ui] ${id} T${i + 1} no surface question — stop`);
            break;
          }
          const turn = await answerOne(page, spec);
          turns.push({ turn: i + 1, ...turn });
          console.log(
            `[pr197-ui] ${id} T${i + 1} gap=${turn.askedGap} via=${turn.via} next=${turn.nextTargetGap}`,
          );
          if (turn.via === 'submit-failed' || turn.via === 'no-action') break;
          if (!turn.nextQuestion) break;
        }
      } catch (caught) {
        error = caught instanceof Error ? caught.message : String(caught);
        console.log(`[pr197-ui] ${id} error ${error}`);
      }

      const quality = scoreTurns(
        turns.map((t) => ({
          askedGap: (t.askedGap as string | null) ?? null,
          askedQuestion: String(t.askedQuestion ?? ''),
        })),
      );
      const uiStatus = error
        ? 'NOT VERIFIED'
        : quality.reachedEight
          ? quality.qualityStatus === 'PASS'
            ? 'PASS'
            : 'NEEDS FIX'
          : 'FAIL';
      writeDump({
        scenarios: {
          [id]: {
            turnCount: turns.length,
            askedGaps: turns.map((t) => t.askedGap),
            reachedEight: quality.reachedEight,
            quality,
            uiStatus,
            error,
            login: 'qa-magic-link (not Google OAuth)',
            turns,
          },
        },
      });
      expect(error, `${id} login-UI walk error`).toBeNull();
      expect(turns.length, `${id} collected at least one turn`).toBeGreaterThan(0);
    });
  }
});
