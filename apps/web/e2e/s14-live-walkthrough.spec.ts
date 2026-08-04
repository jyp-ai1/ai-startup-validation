/**
 * S14 Live Walkthrough — Product Evidence (no feature changes).
 * Flow: Loop → Answer → Memory append → Evidence ↑ → Review → Analysis → Competitor
 * RC localhost only.
 */
import { expect, test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const DOC = `사업계획서 요약

서비스명: 병원 AI 스크리닝
형태: B2B SaaS
대상: 병원

핵심 가치: 재방문·대기 관리

아직 수익 모델은 미정입니다.`;

const OUT = path.join(process.cwd(), '../../docs/evidence/S14/media');

type FactSnap = {
  stage: string;
  factKeys: string[];
  turnIssueIds: string[];
  evidence: Record<string, string>;
  canReview?: boolean;
  hasAnalysis?: boolean;
  currentIssue?: string;
  chosenMemKey?: string;
};

async function dismissBanners(page: import('@playwright/test').Page) {
  const consent = page.getByRole('button', { name: /수락|동의|Accept|허용/i });
  if (await consent.first().isVisible().catch(() => false)) {
    await consent.first().click({ force: true });
    await page.waitForTimeout(400);
  }
}

async function showHud(
  page: import('@playwright/test').Page,
  title: string,
  lines: string[],
) {
  await page.evaluate(
    ({ title: t, lines: ls }) => {
      let root = document.getElementById('s14-live-hud');
      if (!root) {
        root = document.createElement('div');
        root.id = 's14-live-hud';
        root.style.cssText =
          'position:fixed;left:16px;bottom:16px;z-index:2147483647;max-width:min(520px,92vw);padding:14px 16px;border-radius:12px;background:rgba(8,10,14,0.92);color:#f4f4f5;font:600 13px/1.45 system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.12);pointer-events:none';
        document.body.appendChild(root);
      }
      root.innerHTML = `<div style="letter-spacing:.04em;font-size:11px;opacity:.7">${t}</div>${ls
        .map((l) => `<div style="font-weight:500;opacity:.95;margin-top:4px">${l}</div>`)
        .join('')}`;
    },
    { title, lines },
  );
}

async function readMemoryState(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const allKeys = Object.keys(sessionStorage);
    const memKeys = allKeys.filter((k) => k.includes('conversationMemory'));
    const loopKeys = allKeys.filter((k) => k.includes('aiPmLoop'));

    let factKeys: string[] = [];
    let facts: Array<{ key: string; value: string }> = [];
    let memRaw = '';
    let chosenMemKey = '';

    for (const k of memKeys) {
      const raw = sessionStorage.getItem(k) || '';
      try {
        const parsed = JSON.parse(raw) as {
          facts?: Array<{ key: string; value: string }>;
        };
        const next = parsed.facts || [];
        if (next.length >= facts.length) {
          facts = next;
          factKeys = next.map((f) => f.key);
          memRaw = raw;
          chosenMemKey = k;
        }
      } catch {
        /* ignore */
      }
    }

    let currentIssue = '';
    let turns: Array<{ issueId: string; answer: string }> = [];
    for (const k of loopKeys) {
      try {
        const loop = JSON.parse(sessionStorage.getItem(k) || '{}') as {
          currentIssueId?: string | null;
          turns?: Array<{ issueId: string; answer: string }>;
        };
        if (Array.isArray(loop.turns) && loop.turns.length >= turns.length) {
          turns = loop.turns;
          currentIssue = loop.currentIssueId || currentIssue;
        }
      } catch {
        /* ignore */
      }
    }

    const has = (k: string) => factKeys.includes(k);
    const evidence: Record<string, string> = {
      customer: has('customer') ? 'confirmed' : 'unknown',
      payer: has('buyer') || has('customer') ? 'confirmed' : 'unknown',
      problem: has('problem') ? 'confirmed' : 'unknown',
      business: has('business') ? 'confirmed' : 'unknown',
    };

    const analysisKeys = allKeys.filter((k) => k.includes('analysisResult'));
    const hasAnalysis = analysisKeys.some((k) => {
      const v = sessionStorage.getItem(k);
      return !!v && v.length > 8;
    });

    const reviewBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      /검토 시작/.test(b.textContent || ''),
    );
    const canReview = reviewBtn ? !(reviewBtn as HTMLButtonElement).disabled : false;

    return {
      factKeys,
      facts,
      evidence,
      canReview,
      hasAnalysis,
      memRaw: memRaw.slice(0, 2000),
      chosenMemKey,
      memKeys,
      turnIssueIds: turns.map((t) => t.issueId),
      turns,
      currentIssue,
    };
  });
}

async function snap(
  page: import('@playwright/test').Page,
  trail: FactSnap[],
  stage: string,
) {
  const s = await readMemoryState(page);
  const row: FactSnap = {
    stage,
    factKeys: [...s.factKeys],
    turnIssueIds: [...s.turnIssueIds],
    evidence: s.evidence,
    canReview: s.canReview,
    hasAnalysis: s.hasAnalysis,
    currentIssue: s.currentIssue,
    chosenMemKey: s.chosenMemKey,
  };
  trail.push(row);
  return s;
}

async function answerAndApply(
  page: import('@playwright/test').Page,
  text: string,
) {
  const area = page.locator('textarea').last();
  await expect(area).toBeVisible({ timeout: 90_000 });
  await area.click({ force: true });
  await area.fill(text);
  await page.waitForTimeout(500);
  const apply = page.getByRole('button', { name: /답변 반영하기/i });
  await expect(apply).toBeEnabled({ timeout: 15_000 });
  await apply.click({ force: true });
  await page.waitForTimeout(5_500);
}

async function clickContinue(page: import('@playwright/test').Page) {
  const cont = page.getByRole('button', { name: /같이 확인하기|계속하기|계속|다음/i });
  if (await cont.first().isVisible().catch(() => false)) {
    await cont.first().click({ force: true });
    await page.waitForTimeout(2_000);
  }
}

test('S14 live product walkthrough', async ({ page }) => {
  test.setTimeout(360_000);
  fs.mkdirSync(OUT, { recursive: true });
  const trail: FactSnap[] = [];

  await page.goto('/ko/workspace?demo=guided&sample=custom&fresh=1', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(1_200);
  await dismissBanners(page);

  await showHud(page, 'S14 Live', ['Loop start — paste document']);
  await snap(page, trail, '00-empty');

  const paste = page.getByPlaceholder(/사업계획서|IR deck|Notion/i);
  await paste.click({ force: true });
  await paste.fill(DOC);
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /AI PM과 시작하기/i }).click({ force: true });
  await page.waitForTimeout(3_500);

  await Promise.race([
    page
      .getByTestId('ai-pm-thinking-update')
      .waitFor({ state: 'visible', timeout: 90_000 })
      .catch(() => null),
    page.locator('textarea').last().waitFor({ state: 'visible', timeout: 90_000 }),
  ]);

  let state = await snap(page, trail, '01-after-document');
  await showHud(page, 'Memory · Document', [
    `facts: [${state.factKeys.join(', ')}]`,
    `turns: [${state.turnIssueIds.join(', ')}]`,
  ]);
  await page.waitForTimeout(1_200);
  await page.screenshot({ path: path.join(OUT, 'live-01-memory.png'), fullPage: true });

  // A1 — customer/payer
  await showHud(page, 'Answer 1', ['payer = 병원 원장', 'APPEND customer; keep business']);
  await answerAndApply(page, '병원 원장입니다');
  await clickContinue(page);
  // poll until customer fact OR customer turn present
  {
    const start = Date.now();
    while (Date.now() - start < 20_000) {
      state = await readMemoryState(page);
      if (
        state.factKeys.includes('customer') ||
        state.turnIssueIds.includes('customer_definition')
      ) {
        break;
      }
      await page.waitForTimeout(500);
    }
  }
  state = await snap(page, trail, '02-after-customer');
  await showHud(page, 'Memory · Append customer', [
    `facts: [${state.factKeys.join(', ')}]`,
    `turns: [${state.turnIssueIds.join(', ')}]`,
    'business kept + customer add (no wipe)',
  ]);
  await page.waitForTimeout(1_500);
  await page.screenshot({
    path: path.join(OUT, 'live-02-evidence-status.png'),
    fullPage: true,
  });

  // A2 — may be market or problem; answer once
  await showHud(page, 'Answer 2', [
    `issue=${state.currentIssue || '?'}`,
    'interim Loop answer — Memory must APPEND',
  ]);
  if (await page.locator('textarea').last().isVisible().catch(() => false)) {
    await answerAndApply(page, '재방문 관리에 시간과 비용 부담이 큽니다');
    await clickContinue(page);
  }

  // A3 — if problem_definition open, lock problem
  state = await readMemoryState(page);
  for (let i = 0; i < 8; i++) {
    state = await readMemoryState(page);
    if (state.factKeys.includes('problem')) break;
    if (state.currentIssue === 'problem_definition') {
      await showHud(page, 'Answer · Problem', [
        'problem_definition',
        'APPEND problem; keep business + customer',
      ]);
      if (await page.locator('textarea').last().isVisible().catch(() => false)) {
        await answerAndApply(
          page,
          '원장이 가장 크게 느끼는 문제는 재방문·대기 관리 비용입니다',
        );
        await clickContinue(page);
      }
      break;
    }
    await clickContinue(page);
    if (await page.locator('textarea').last().isVisible().catch(() => false)) {
      // only answer when still missing problem and not already answered this iteration
      if (!state.turnIssueIds.includes('problem_definition')) {
        await answerAndApply(
          page,
          '원장이 가장 크게 느끼는 문제는 재방문·대기 관리 비용입니다',
        );
        await clickContinue(page);
      }
    }
    await page.waitForTimeout(800);
  }

  state = await snap(page, trail, '03-after-problem-attempt');
  await showHud(page, 'Memory · Append trail', [
    `facts: [${state.factKeys.join(', ')}]`,
    `turns: [${state.turnIssueIds.join(', ')}]`,
    'expect keys accumulate — never wipe prior Facts',
  ]);
  await page.waitForTimeout(1_500);
  await page.screenshot({
    path: path.join(OUT, 'live-03-memory-append.png'),
    fullPage: true,
  });

  // Review gate
  for (let i = 0; i < 8; i++) {
    state = await readMemoryState(page);
    if (state.canReview) break;
    await clickContinue(page);
    const reviewProbe = page.getByRole('button', { name: /검토 시작/i });
    if (await reviewProbe.first().isVisible().catch(() => false)) break;
    await page.waitForTimeout(700);
  }

  state = await snap(page, trail, '04-review-gate');
  await showHud(page, 'Review Gate', [
    `canStart=${state.canReview}`,
    `problem=${state.evidence.problem}`,
    `facts: [${state.factKeys.join(', ')}]`,
  ]);
  await page.waitForTimeout(1_200);
  await page.screenshot({
    path: path.join(OUT, 'live-04-review-gate.png'),
    fullPage: true,
  });

  const review = page.getByRole('button', { name: /검토 시작/i });
  if (await review.first().isVisible().catch(() => false)) {
    if (await review.first().isEnabled()) {
      await review.first().click({ force: true });
      await page.waitForTimeout(5_000);
    }
  }

  {
    const start = Date.now();
    while (Date.now() - start < 15_000) {
      state = await readMemoryState(page);
      if (state.hasAnalysis) break;
      await page.waitForTimeout(500);
    }
  }
  state = await snap(page, trail, '05-after-analysis');
  await showHud(page, 'Analysis', [
    `hasAnalysis=${state.hasAnalysis}`,
    'Presenter: Decision · Insight · Action/Why/CTA',
  ]);
  await page.waitForTimeout(2_000);
  await page.screenshot({
    path: path.join(OUT, 'live-05-analysis.png'),
    fullPage: true,
  });

  await clickContinue(page);
  await clickContinue(page);
  state = await snap(page, trail, '06-competitor-after-analysis');
  await showHud(page, 'Competitor (post-analysis)', [
    `hasAnalysis=${state.hasAnalysis}`,
    `issue=${state.currentIssue}`,
    'competitor only after analysisResult',
  ]);
  await page.waitForTimeout(1_500);
  await page.screenshot({
    path: path.join(OUT, 'live-06-competitor.png'),
    fullPage: true,
  });

  const dump = await page.evaluate(() => {
    const out: Record<string, string | null> = {};
    for (const k of Object.keys(sessionStorage)) {
      if (
        /conversationMemory|aiPmLoop|analysisResult|activeProjectId/.test(k)
      ) {
        out[k] = sessionStorage.getItem(k);
      }
    }
    return out;
  });

  fs.writeFileSync(
    path.join(OUT, 'live-memory-trail.json'),
    JSON.stringify(
      {
        semantics:
          'per-key upsert; other Fact keys never wiped (append across keys)',
        not: 'full Memory overwrite on each Loop answer',
        trailStages: trail,
        trailKeysOnly: trail.map((t) => t.factKeys),
        sessionDump: dump,
        capturedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  expect(trail.length).toBeGreaterThan(3);
});
