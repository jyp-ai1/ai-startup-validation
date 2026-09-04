/**
 * PR8.5 — Shared helpers for V3 P0 browser E2E.
 * Requires V3_REVIEW_PIPELINE / NEXT_PUBLIC_V3_REVIEW_PIPELINE at dev-server start.
 */
import { expect, type Page } from '@playwright/test';

export const PAYER_Q_RE =
  /서비스 비용은 누가 지불|지불|결제|누가\s*(내|지불)|비용을?\s*지불|payer/i;

export const CUSTOMER_Q_RE =
  /가장 필요로 하는 사람|누구를 위한|고객|customer/i;

export const DEMO_SAAS_NAV = [
  '10~50인 스타트업 CEO와 PM이 전략 검토를 회의마다 처음부터 다시 하는 문제입니다.',
  'CEO와 PM이 월 구독으로 사용합니다.',
  'Notion, Linear, Jira 같은 도구들이 있지만 AI PM 관점 전략 검토는 없습니다.',
  '전략 회의 맥락을 기억하고 다음 액션까지 연결하는 AI PM Copilot입니다.',
  '월 구독 SaaS 팀 플랜으로 수익을 냅니다.',
];

/** Same destination as DemoStartView.startDemoWorkspace('saas'). */
export const WORKSPACE_SAAS_DEMO_URL =
  '/workspace?demo=guided&sample=saas&fresh=1';

const GOTO_TIMEOUT_MS = 90_000;
const GOTO_RETRIES = 3;

async function gotoWithRetry(page: Page, url: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < GOTO_RETRIES; attempt += 1) {
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: GOTO_TIMEOUT_MS,
      });
      if (page.url().includes('/workspace') || page.url().includes('/demo/start')) {
        return;
      }
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(2_000 * (attempt + 1));
    }
  }
  throw lastError;
}

export async function dismissCookies(page: Page) {
  const accept = page.getByRole('button', { name: /분석 수락|수락|Accept/i });
  if (await accept.first().isVisible({ timeout: 1_500 }).catch(() => false)) {
    await accept.first().click({ force: true });
    await page.waitForTimeout(400);
  }
}

export async function textOrEmpty(page: Page, testId: string): Promise<string> {
  try {
    const el = page.getByTestId(testId).first();
    await el.waitFor({ state: 'attached', timeout: 4_000 });
    return (await el.innerText()).trim();
  } catch {
    return '';
  }
}

async function startDemoSaasViaUi(page: Page) {
  await gotoWithRetry(page, '/demo/start?fresh=1');
  await dismissCookies(page);

  const sampleEntry = page.getByTestId('demo-entry-sample');
  await sampleEntry.waitFor({ state: 'visible', timeout: 30_000 });
  await sampleEntry.click();

  const saas = page.getByTestId('demo-sample-saas');
  await saas.waitFor({ state: 'visible', timeout: 30_000 });
  await saas.click();

  const startRead = page.getByTestId('demo-start-sample-read');
  await startRead.waitFor({ state: 'visible', timeout: 15_000 });
  await startRead.click();

  await page.waitForURL(/\/workspace/, { timeout: 45_000 });
  await page.waitForTimeout(2_000);
  await dismissCookies(page);
}

export async function startDemoSaas(page: Page) {
  await gotoWithRetry(page, WORKSPACE_SAAS_DEMO_URL);
  await dismissCookies(page);

  if (page.url().includes('/workspace')) {
    await page
      .getByTestId('s11-surface-understanding')
      .or(page.getByTestId('s11-surface'))
      .or(page.getByRole('button', { name: /맞습니다|That'?s right/i }))
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 })
      .catch(() => null);
    return;
  }

  await startDemoSaasViaUi(page);
}

export async function confirmUnderstanding(page: Page) {
  const confirm = page.getByRole('button', {
    name: /^(✓\s*)?(맞습니다|That'?s right|Yes[,.]?\s*correct|That is right)/i,
  });
  await confirm.first().waitFor({ state: 'visible', timeout: 90_000 });
  await confirm.first().click({ force: true });
  await page.waitForTimeout(1_500);
  await page.getByTestId('s11-surface').waitFor({ state: 'visible', timeout: 60_000 });
}

export async function dismissRecognition(page: Page) {
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

export async function submitAnswer(page: Page, answer: string): Promise<boolean> {
  await dismissRecognition(page);
  await waitForAskSurface(page).catch(() => null);
  const box = page.locator('textarea').last();
  if (!(await box.isVisible({ timeout: 8_000 }).catch(() => false))) return false;
  await box.fill(answer);
  const submit = page.getByTestId('submit-answer-cta');
  if (!(await submit.isEnabled({ timeout: 8_000 }).catch(() => false))) return false;
  await submit.click({ force: true });
  await page.waitForTimeout(600);
  const thinking = page.getByTestId('ai-pm-thinking-stages');
  if (await thinking.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await thinking.waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => null);
  }
  await page.waitForTimeout(1_200);
  await dismissRecognition(page);
  return true;
}

export async function waitForAskSurface(page: Page) {
  await page.getByTestId('s11-surface').waitFor({ state: 'visible', timeout: 60_000 });
  await dismissRecognition(page);
}

export async function readSurfaceQuestion(page: Page): Promise<string> {
  try {
    const ceo = page.getByTestId('ceo-surface-next-question');
    if (await ceo.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const raw = (await ceo.innerText()).trim();
      return raw.replace(/^다음\s*질문\s*/i, '').trim();
    }
  } catch {
    /* fall through */
  }

  const fromLegacy = await textOrEmpty(page, 'surface-question');
  if (fromLegacy) return fromLegacy;

  const loop = await readLoopFromSession(page);
  return (
    loop?.lockedAskSurface?.questionText ??
    loop?.lastDecision?.questionText ??
    ''
  );
}

export async function readActiveTargetGap(page: Page): Promise<string | null> {
  const loop = await readLoopFromSession(page);
  return loop?.lastDecision?.targetGapId ?? loop?.lockedAskSurface?.targetGap ?? null;
}

export async function isV3PipelineActiveInBrowser(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (!k?.includes('aiPmLoop')) continue;
      const raw = sessionStorage.getItem(k);
      if (!raw) continue;
      try {
        const loop = JSON.parse(raw) as { turns?: Array<{ review?: unknown }> };
        if (loop.turns?.some((t) => t.review != null)) return true;
      } catch {
        /* ignore */
      }
    }
    return false;
  });
}

export async function readLoopFromSession(page: Page) {
  return page.evaluate(() => {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (!k?.includes('aiPmLoop')) continue;
      const raw = sessionStorage.getItem(k);
      if (!raw) continue;
      try {
        return JSON.parse(raw) as {
          gapState?: { gaps?: Record<string, { completeness?: string }> };
          lastDecision?: { questionText?: string; targetGapId?: string };
          lockedAskSurface?: { questionText?: string; targetGap?: string };
          turns?: Array<{ review?: unknown; targetGap?: string }>;
        };
      } catch {
        /* ignore */
      }
    }
    return null;
  });
}

/** Full demo bootstrap: workspace entry → confirm → first answer → V3 probe. */
export async function bootstrapV3DemoSession(page: Page) {
  await startDemoSaas(page);
  await confirmUnderstanding(page);
  const submitted = await submitAnswer(page, DEMO_SAAS_NAV[0]!);
  expect(submitted).toBe(true);
  const v3 = await isV3PipelineActiveInBrowser(page);
  expect(v3).toBe(true);
}

export async function assertCeoSurfacesOrder(page: Page) {
  const ceo = page.getByTestId('ceo-six-surfaces');
  await expect(ceo).toBeVisible({ timeout: 15_000 });

  const ai = page.getByTestId('ceo-surface-ai-understanding');
  await expect(ai).toBeVisible();

  const order = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="ceo-six-surfaces"]');
    if (!root) return [] as string[];
    const ids = [
      'ceo-surface-ai-understanding',
      'ceo-surface-confirmed',
      'ceo-surface-unconfirmed',
      'ceo-surface-why-ask',
      'ceo-surface-next-question',
    ];
    const positions = ids
      .map((id) => {
        const el = root.querySelector(`[data-testid="${id}"]`);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { id, top: rect.top };
      })
      .filter(Boolean) as Array<{ id: string; top: number }>;
    positions.sort((a, b) => a.top - b.top);
    return positions.map((p) => p.id);
  });

  expect(order.length).toBeGreaterThanOrEqual(3);
  expect(order[0]).toBe('ceo-surface-ai-understanding');

  const idx = (id: string) => order.indexOf(id);
  if (idx('ceo-surface-confirmed') >= 0 && idx('ceo-surface-unconfirmed') >= 0) {
    expect(idx('ceo-surface-confirmed')).toBeLessThan(idx('ceo-surface-unconfirmed'));
  }
  if (idx('ceo-surface-why-ask') >= 0 && idx('ceo-surface-next-question') >= 0) {
    expect(idx('ceo-surface-why-ask')).toBeLessThan(idx('ceo-surface-next-question'));
  }
  if (idx('ceo-surface-unconfirmed') >= 0 && idx('ceo-surface-why-ask') >= 0) {
    expect(idx('ceo-surface-unconfirmed')).toBeLessThan(idx('ceo-surface-why-ask'));
  }
}

export async function skipIfV3Off(page: Page, testInfo: { skip: (condition: boolean, description?: string) => void }) {
  await bootstrapV3DemoSession(page);
  const v3 = await isV3PipelineActiveInBrowser(page);
  testInfo.skip(!v3, 'V3_REVIEW_PIPELINE not active in browser bundle — set NEXT_PUBLIC_V3_REVIEW_PIPELINE=true at dev start');
}
