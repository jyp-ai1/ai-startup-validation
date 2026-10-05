#!/usr/bin/env node
/**
 * Production Founder Journey capture — observation only.
 * No pass/fail gates. No UI or engine changes.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(
  __dirname,
  '../../../docs/evidence/ALABOM/founder-journey-strategy-revalidation',
);
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://ai-startup-validation-tau.vercel.app';
const TITLE = '양조장 체험 관광 서비스';
const LONG_SOURCE =
  '다양한 관광객이 늘며 개인별 다양한 경험을 중요하게 생각한다. 전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광을 연결하고, 양조장의 온라인 마케팅을 지원하는 사업이다.';

function env(name) {
  return (process.env[name] ?? '').trim();
}

const steps = [];

async function createSession() {
  const supabaseUrl = env('SUPABASE_URL') || env('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = env('SUPABASE_ANON_KEY') || env('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const email = env('QA_EMAIL') || 'cto-qa@launchlens.dev';
  const gen = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  const genBody = await gen.json();
  const hashedToken = genBody.hashed_token ?? genBody.properties?.hashed_token;
  const verify = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', token_hash: hashedToken }),
  });
  const session = await verify.json();
  if (!session.access_token) throw new Error(`magic-link failed: ${JSON.stringify(session).slice(0, 180)}`);
  return { session, supabaseUrl, email };
}

async function visibleBits(page) {
  return page.evaluate(() => {
    const testds = [...document.querySelectorAll('[data-testid]')].map((el) => ({
      id: el.getAttribute('data-testid'),
      text: (el.innerText || '').trim().slice(0, 180),
      visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
    }));
    const buttons = [...document.querySelectorAll('button')]
      .filter((el) => !!(el.offsetWidth || el.offsetHeight))
      .map((el) => (el.innerText || el.getAttribute('aria-label') || '').trim())
      .filter(Boolean)
      .slice(0, 24);
    const headings = [...document.querySelectorAll('h1,h2,h3,[role="heading"]')]
      .map((el) => (el.innerText || '').trim())
      .filter(Boolean)
      .slice(0, 16);
    const loopKey = [...Array(sessionStorage.length).keys()]
      .map((i) => sessionStorage.key(i))
      .find((k) => k?.includes('aiPmLoop'));
    let loop = null;
    if (loopKey) {
      try {
        const raw = JSON.parse(sessionStorage.getItem(loopKey) || 'null');
        loop = {
          lastDecision: raw?.lastDecision ?? null,
          lockedAsk: raw?.lockedAskSurface ?? null,
          closed: Object.fromEntries(
            Object.entries(raw?.gapState?.gaps ?? {}).map(([id, gap]) => [id, gap?.completeness]),
          ),
          turnCount: raw?.turns?.length ?? 0,
        };
      } catch {
        loop = null;
      }
    }
    return {
      url: location.href,
      title: document.title,
      headings,
      buttons,
      testds: testds.filter((t) => t.visible).slice(0, 40),
      loop,
    };
  });
}

async function record(page, id, founderAction) {
  await page.waitForTimeout(600);
  const shot = join(OUT, `${String(steps.length + 1).padStart(2, '0')}-${id}.png`);
  await page.screenshot({ path: shot, fullPage: true });
  const bits = await visibleBits(page);
  const step = { id, founderAction, shot, ...bits };
  steps.push(step);
  console.log(`[capture] ${id} ${bits.url}`);
  return step;
}

async function dismiss(page) {
  const cookie = page.getByRole('button', { name: /분석 수락|수락|Accept/i });
  if (await cookie.first().isVisible().catch(() => false)) {
    await cookie.first().click({ force: true });
  }
}

async function clickThroughReading(page) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await dismiss(page);
    if (await page.getByTestId('answer-input').isVisible().catch(() => false)) return 'answer-input';
    if (await page.getByTestId('confirm-yes-cta').isVisible().catch(() => false)) return 'confirm-yes';
    if (await page.getByTestId('understanding-confirm-yes').isVisible().catch(() => false)) {
      return 'understanding-confirm';
    }
    if (await page.getByTestId('document-first-card').isVisible().catch(() => false)) return 'document-first';
    const cont = page.getByRole('button', {
      name: /답변으로 같이 정리하기|같이 확인|계속하기|Continue|다음/i,
    });
    if (await cont.first().isVisible().catch(() => false)) {
      await cont.first().click({ force: true });
      await page.waitForTimeout(800);
      continue;
    }
    await page.waitForTimeout(400);
  }
  return 'timeout';
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const build = await (await fetch(`${BASE}/api/build-info`)).json();
  const { session, supabaseUrl, email } = await createSession();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'ko-KR', viewport: { width: 1440, height: 1100 } });
  const host = new URL(BASE).hostname;
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  await context.addCookies([
    {
      name: `sb-${projectRef}-auth-token`,
      value: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type ?? 'bearer',
        user: session.user,
      }),
      domain: host,
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'Lax',
    },
  ]);
  const page = await context.newPage();
  await page.goto(`${BASE}/ko/workspace`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await dismiss(page);
  await record(page, 'workspace-entry', '로그인 후 워크스페이스 진입');

  await page.locator('#new-project-title').fill(TITLE);
  await page.locator('input[name="reviewType"][value="startup-idea"]').check();
  await page.locator('#project-description').fill(LONG_SOURCE);
  await record(page, 'create-form-filled', '사업 제목·원문 입력');
  await page.getByRole('button', { name: /사업 검토 시작|Start business review/ }).click();
  await page.waitForURL(/\/workspace\?project=/, { timeout: 60_000 });
  const landed = await clickThroughReading(page);
  await record(page, `after-create-${landed}`, '검토 시작 후 첫 화면');

  if (await page.getByTestId('understanding-confirm-yes').isVisible().catch(() => false)) {
    await record(page, 'understanding-confirm', 'AI 이해 확인 화면을 봄');
    await page.getByTestId('understanding-confirm-yes').click();
    await page.waitForTimeout(1_200);
    await clickThroughReading(page);
    await record(page, 'after-understanding-yes', '[네]로 AI 이해 확인');
  }

  const confirmYes = page.getByTestId('confirm-yes-cta');
  const confirmNo = page.getByTestId('confirm-no-cta');
  if (await confirmYes.isVisible().catch(() => false)) {
    await record(page, 'loop-confirm-yes-visible', '루프 확인(맞나요?) 화면');
    await confirmYes.click();
    await page.waitForTimeout(1_800);
    await clickThroughReading(page);
    await record(page, 'after-loop-confirm-yes', '[네, 맞습니다] 클릭');
  }

  await record(page, 'current-ask', '현재 질문/입력 상태 관찰');

  if (await page.getByTestId('answer-input').isVisible().catch(() => false)) {
    await page.getByTestId('answer-input').fill('방한 외국인');
    await record(page, 'typed-customer', '고객 답변 입력');
    const send = page.getByTestId('answer-submit');
    if (await send.isVisible().catch(() => false)) {
      await send.click();
    } else {
      await page.getByTestId('answer-input').press('Enter');
    }
    await page.waitForTimeout(2_000);
    await clickThroughReading(page);
    await record(page, 'after-customer-answer', '고객 답변 제출 후');
  }

  const edit = page.getByTestId('edit-prior-answer-cta');
  if (await edit.isVisible().catch(() => false)) {
    await record(page, 'edit-prior-visible', '이전 답변 수정 CTA 관찰');
  }

  if (await confirmNo.isVisible().catch(() => false)) {
    await record(page, 'confirm-no-still-visible', '아니요 수정 CTA가 남아 있음');
  }

  const report = {
    capturedAt: new Date().toISOString(),
    email,
    base: BASE,
    build: build?.data ?? build,
    steps,
  };
  writeFileSync(join(OUT, 'capture.json'), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(`[capture] wrote ${steps.length} steps to ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
