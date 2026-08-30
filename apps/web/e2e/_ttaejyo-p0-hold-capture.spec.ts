/**
 * TTAEJYO — CPO HOLD P0 re-investigation (CASE A + CASE B evidence capture).
 *
 * CASE A: Demo AI SaaS new workspace — differentiation Q without textarea
 * CASE B: Fresh demo payer path (resume needs auth — unit + storage analysis)
 *
 * From apps/web:
 *   $env:CI='1'; $env:PLAYWRIGHT_BASE_URL='https://ai-startup-validation-tau.vercel.app'
 *   pnpm exec playwright test e2e/_ttaejyo-p0-hold-capture.spec.ts --retries=0
 */
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(
  process.cwd(),
  process.cwd().includes('apps\\web') || process.cwd().includes('apps/web')
    ? '../../docs/evidence/ALABOM/cpo-validation/ttaejyo-p0-hold'
    : '../docs/evidence/ALABOM/cpo-validation/ttaejyo-p0-hold',
);
const MEDIA = path.join(OUT, 'media');
fs.mkdirSync(MEDIA, { recursive: true });

const TARGET_SHA = '2c551a3';
const DIFF_Q_RE = /경쟁 대비.*차별점|차별점은 무엇/i;
const PAYER_Q_RE = /지불|결제|누가\s*(내|지불)|비용을?\s*지불|비용을 지불|payer/i;

type SurfaceState = {
  at: string;
  label: string;
  surfaceQuestion: string;
  hasTextarea: boolean;
  hasRecognitionPanel: boolean;
  hasSubmitCta: boolean;
  continueCtaVisible: boolean;
  displayPhase: string | null;
  loopPhase: string | null;
  currentIssueId: string | null;
  lastTurnIssueId: string | null;
  lastTurnTargetGap: string | null;
  recognitionWouldShow: boolean;
  whyTargetGap: string | null;
  screenshot?: string;
};

type CaseAState = {
  productionCommit: string;
  path: 'demo-saas';
  observations: string[];
  surfaces: SurfaceState[];
  differentiationReached: boolean;
  blockedWithoutTextarea: boolean;
};

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

async function readLoopDiagnostics(page: Page) {
  return page.evaluate(() => {
    let loop: {
      phase?: string;
      currentIssueId?: string | null;
      turns?: Array<{ issueId?: string; targetGap?: string; superseded?: boolean }>;
    } | null = null;
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (!k?.includes('aiPmLoop')) continue;
      const raw = sessionStorage.getItem(k);
      if (!raw) continue;
      try {
        loop = JSON.parse(raw);
        break;
      } catch {
        /* ignore */
      }
    }
    const turns = loop?.turns ?? [];
    const last = [...turns].reverse().find((t) => !t.superseded) ?? null;
    const phase = loop?.phase ?? null;
    const currentIssueId = loop?.currentIssueId ?? null;
    const lastTurnIssueId = last?.issueId ?? null;
    const showContinuousThinking = Boolean(last && last.issueId !== currentIssueId);
    return {
      loopPhase: phase,
      currentIssueId,
      lastTurnIssueId,
      lastTurnTargetGap: last?.targetGap ?? null,
      recognitionWouldShow: phase === 'issue' && showContinuousThinking,
    };
  });
}

async function captureSurface(page: Page, label: string, shot?: string): Promise<SurfaceState> {
  const diag = await readLoopDiagnostics(page);
  const surfaceQuestion = await textOrEmpty(page, 'surface-question');
  const hasTextarea = await page.locator('textarea').last().isVisible().catch(() => false);
  const hasRecognitionPanel = await page
    .getByTestId('ai-pm-thinking-update')
    .isVisible()
    .catch(() => false);
  const continueCtaVisible = await page
    .getByRole('button', {
      name: /같이 확인하기|Let's check together|Check together|Continue understanding/i,
    })
    .first()
    .isVisible()
    .catch(() => false);
  const hasSubmitCta = await page
    .getByTestId('submit-answer-cta')
    .isVisible()
    .catch(() => false);

  let fileName: string | undefined;
  if (shot) {
    fileName = shot;
    await page.screenshot({ path: path.join(MEDIA, shot), fullPage: true }).catch(() => null);
  }

  return {
    at: new Date().toISOString(),
    label,
    surfaceQuestion,
    hasTextarea,
    hasRecognitionPanel,
    hasSubmitCta,
    continueCtaVisible,
    displayPhase: null,
    ...diag,
    whyTargetGap: null,
    screenshot: fileName,
  };
}

async function startDemoSaas(page: Page) {
  await page.goto('/demo/start?fresh=1', { waitUntil: 'domcontentloaded' });
  await dismissCookies(page);
  await page.getByRole('button', { name: /ALABOM Sample 체험하기|Sample/i }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /^AI SaaS$/i }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /샘플 문서로 AI Read 시작/i }).click();
  await page.waitForURL(/\/workspace/, { timeout: 30_000 });
  await page.waitForTimeout(4_000);
  await dismissCookies(page);
}

async function confirmUnderstanding(page: Page) {
  const confirm = page.getByRole('button', {
    name: /^(✓\s*)?(맞습니다|That'?s right|Yes[,.]?\s*correct|That is right)/i,
  });
  await confirm.first().waitFor({ state: 'visible', timeout: 90_000 });
  await confirm.first().click({ force: true });
  await page.waitForTimeout(2_500);
  await page.getByTestId('s11-surface').waitFor({ state: 'visible', timeout: 60_000 });
}

async function dismissRecognition(page: Page) {
  for (let i = 0; i < 4; i++) {
    const cont = page.getByRole('button', {
      name: /같이 확인하기|계속하기|Let's check together|Check together|Continue/i,
    });
    if (await cont.first().isVisible({ timeout: 800 }).catch(() => false)) {
      await cont.first().click({ force: true });
      await page.waitForTimeout(900);
      continue;
    }
    break;
  }
}

async function submitIfPossible(page: Page, answer: string): Promise<boolean> {
  await dismissRecognition(page);
  const box = page.locator('textarea').last();
  if (!(await box.isVisible({ timeout: 3_000 }).catch(() => false))) return false;
  await box.fill(answer);
  const submit = page.getByTestId('submit-answer-cta');
  if (!(await submit.isEnabled({ timeout: 5_000 }).catch(() => false))) return false;
  await submit.click({ force: true });
  await page.waitForTimeout(600);
  const thinking = page.getByTestId('ai-pm-thinking-stages');
  if (await thinking.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await thinking.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => null);
  }
  await page.waitForTimeout(1_200);
  return true;
}

const NAV = [
  '10~50인 스타트업 CEO와 PM이 전략 검토를 회의마다 처음부터 다시 하는 문제입니다.',
  'CEO와 PM이 월 구독으로 사용합니다.',
  'Notion, Linear, Jira 같은 도구들이 있지만 AI PM 관점 전략 검토는 없습니다.',
  '전략 회의 맥락을 기억하고 다음 액션까지 연결하는 AI PM Copilot입니다.',
  '월 구독 SaaS 팀 플랜으로 수익을 냅니다.',
];

test('CASE A — Demo AI SaaS differentiation surface @ Production', async ({ page, request }) => {
  test.setTimeout(360_000);

  const build = await request.get('/api/build-info');
  const buildJson = (await build.json()) as { data?: { commit?: string } };
  const productionCommit = buildJson.data?.commit ?? '';
  const state: CaseAState = {
    productionCommit,
    path: 'demo-saas',
    observations: [],
    surfaces: [],
    differentiationReached: false,
    blockedWithoutTextarea: false,
  };

  const persist = () => {
    fs.writeFileSync(path.join(OUT, 'case-a-transcript-raw.json'), JSON.stringify(state, null, 2), 'utf8');
  };

  await startDemoSaas(page);
  state.surfaces.push(await captureSurface(page, 'after-ai-read', 'case-a-01-after-read.png'));
  await confirmUnderstanding(page);
  state.surfaces.push(await captureSurface(page, 'after-confirm', 'case-a-02-after-confirm.png'));
  persist();

  for (let i = 0; i < NAV.length + 3; i++) {
    const snap = await captureSurface(page, `turn-${i}-before`, `case-a-turn-${i}-before.png`);
    state.surfaces.push(snap);

    if (DIFF_Q_RE.test(snap.surfaceQuestion)) {
      state.differentiationReached = true;
      state.blockedWithoutTextarea = !snap.hasTextarea && snap.continueCtaVisible;
      state.observations.push(
        `Differentiation Q visible. textarea=${snap.hasTextarea} recognition=${snap.hasRecognitionPanel} continueCta=${snap.continueCtaVisible} recognitionWouldShow=${snap.recognitionWouldShow} lastIssue=${snap.lastTurnIssueId} currentIssue=${snap.currentIssueId}`,
      );

      if (!snap.hasTextarea && snap.continueCtaVisible) {
        await dismissRecognition(page);
        const afterDismiss = await captureSurface(
          page,
          'differentiation-after-dismiss',
          'case-a-diff-after-dismiss.png',
        );
        state.surfaces.push(afterDismiss);
        state.observations.push(
          `After dismissRecognition: textarea=${afterDismiss.hasTextarea} phase=${afterDismiss.loopPhase}`,
        );

        if (!afterDismiss.hasTextarea) {
          state.observations.push('BLOCK: dismissRecognition did not reveal textarea');
        }
      }
      persist();
      break;
    }

    const answer = NAV[i] ?? NAV[NAV.length - 1]!;
    if (!(await submitIfPossible(page, answer))) {
      state.observations.push(`Could not submit at turn ${i}: Q="${snap.surfaceQuestion.slice(0, 80)}"`);
      persist();
      break;
    }
    persist();
  }

  if (!state.differentiationReached) {
    state.observations.push('Did not reach differentiation question within nav budget');
  }

  persist();
  fs.writeFileSync(
    path.join(OUT, 'prod-build-info.json'),
    JSON.stringify({ commit: productionCommit, targetSha: TARGET_SHA, at: new Date().toISOString() }, null, 2),
    'utf8',
  );
});

test('CASE B smoke — fresh demo payer answer @ Production', async ({ page, request }) => {
  test.setTimeout(360_000);

  const build = await request.get('/api/build-info');
  const buildJson = (await build.json()) as { data?: { commit?: string } };
  const productionCommit = buildJson.data?.commit ?? '';
  const SEED =
    '외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다.';

  await page.goto('/demo/start?fresh=1', { waitUntil: 'domcontentloaded' });
  await dismissCookies(page);
  await page.getByRole('button', { name: /내 사업 문서로 체험하기/i }).click();
  await page.waitForTimeout(400);
  const area = page.locator('textarea').first();
  await area.fill(SEED);
  await area.dispatchEvent('input');
  await page.getByRole('button', { name: /AI Read 시작/i }).click();
  await page.waitForTimeout(3_500);
  await confirmUnderstanding(page);

  const caseB: {
    productionCommit: string;
    scenario: 'fresh-demo-payer';
    payerQuestion: string;
    answer: string;
    nextQuestion: string;
    payerRepeat: boolean;
    lastTurn: unknown;
    sessionDump: unknown;
  } = {
    productionCommit,
    scenario: 'fresh-demo-payer',
    payerQuestion: '',
    answer: '고객이요',
    nextQuestion: '',
    payerRepeat: false,
    lastTurn: null,
    sessionDump: null,
  };

  for (let i = 0; i < 12; i++) {
    await dismissRecognition(page);
    const q = await textOrEmpty(page, 'surface-question');
    if (PAYER_Q_RE.test(q)) {
      caseB.payerQuestion = q;
      await submitIfPossible(page, caseB.answer);
      await page.waitForTimeout(1_500);
      caseB.nextQuestion = await textOrEmpty(page, 'surface-question');
      caseB.payerRepeat = PAYER_Q_RE.test(caseB.nextQuestion);
      break;
    }
    await submitIfPossible(page, '관광객이 앱에서 직접 결제합니다.');
  }

  caseB.lastTurn = await page.evaluate(() => {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (!k?.includes('aiPmLoop')) continue;
      const raw = sessionStorage.getItem(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as { turns?: unknown[] };
        const turns = parsed.turns ?? [];
        for (let j = turns.length - 1; j >= 0; j -= 1) {
          const t = turns[j] as { superseded?: boolean };
          if (!t.superseded) return t;
        }
      } catch {
        /* ignore */
      }
    }
    return null;
  });

  caseB.sessionDump = await page.evaluate(() => {
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

  fs.writeFileSync(path.join(OUT, 'case-b-fresh-transcript-raw.json'), JSON.stringify(caseB, null, 2), 'utf8');
});
