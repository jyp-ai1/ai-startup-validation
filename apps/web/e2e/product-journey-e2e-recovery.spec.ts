/**
 * P0 — PR #83 Browser Journey Closure.
 * Authenticated QA session only. Unit PASS does not count.
 */
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import {
  dismissCookies,
  dismissRecognition,
  readActiveTargetGap,
  readLoopFromSession,
  submitAnswer,
} from './_helpers/v3-p0-e2e-helpers';
import { loginWithQaMagicLink, qaAuthReady } from './_helpers/qa-magic-auth';

const ARTIFACT_DIR = process.env.UX_FLOW_ARTIFACT_DIR ?? '/opt/cursor/artifacts/screenshots';

const TITLE = '양조장 체험 관광 서비스';
const LONG_SOURCE =
  '다양한 관광객이 늘며 개인별 다양한 경험을 중요하게 생각한다. 전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광을 연결하고, 양조장의 온라인 마케팅을 지원하는 사업이다.';

const CUSTOMER_A = 'A 관광객만 대상입니다.';
const CUSTOMER_B = 'B 내국인 애호가입니다.';
const CUSTOMER_C = 'C 전통주와 양조장 체험을 좋아하는 내국인과 외국인입니다.';
const CUSTOMER_CONFLICT =
  '결제와 예약은 관광객이 직접 합니다. 앞서 말한 양조장 대표 결제와 다릅니다.';

const STAGE_A = ['businessOneLiner', 'customerPersona', 'payer', 'problemJtbd'] as const;
const STAGE_B = [
  'marketChannel',
  'alternativesCompetitors',
  'differentiationVsAlternatives',
  'validationTestability',
] as const;
const REQUIRED_GAPS = [...STAGE_A, ...STAGE_B];

const GAP_ANSWERS: Record<string, string> = {
  businessOneLiner:
    '양조장 체험과 주변 관광을 연결하고 양조장의 온라인 마케팅을 지원하는 사업입니다.',
  customerPersona: CUSTOMER_C,
  payer: '체험 예약은 관광객이 결제하고, 마케팅 지원은 양조장 대표가 결제합니다.',
  problemJtbd:
    '양조장은 온라인에 알릴 방법과 인력이 없고 관광객은 개인 맞춤 체험을 찾기 어렵습니다.',
  marketChannel: '인스타그램과 지역 관광 채널로 양조장과 관광객에게 접근합니다.',
  alternativesCompetitors: '기존 패키지 투어와 양조장 자체 SNS 홍보가 현재 대안입니다.',
  differentiationVsAlternatives:
    '체험과 주변 관광을 연결하고 양조장 온라인 마케팅까지 같이 지원하는 점이 다릅니다.',
  validationTestability: '한 개 양조장에서 주말 체험 10건 예약 전환으로 검증할 수 있습니다.',
};

function e2eBaseUrl(): string {
  if (process.env.PLAYWRIGHT_BASE_URL?.trim()) {
    return process.env.PLAYWRIGHT_BASE_URL.replace(/\/$/, '');
  }
  const host = process.env.PLAYWRIGHT_E2E_HOST ?? '127.0.0.1';
  const port = process.env.PLAYWRIGHT_E2E_PORT ?? '3199';
  return `http://${host}:${port}`;
}

async function shot(page: Page, name: string) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, `${name}.png`), fullPage: true });
}

async function clickThroughReading(page: Page) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await dismissCookies(page);
    if (await page.getByTestId('answer-input').isVisible().catch(() => false)) return;
    if (await page.getByTestId('document-first-card').isVisible().catch(() => false)) return;
    if (await page.getByTestId('stage-synthesis-panel').isVisible().catch(() => false)) return;
    if (await page.getByTestId('viability-result-view').isVisible().catch(() => false)) return;
    if (await page.getByTestId('understanding-edit-seeded').isVisible().catch(() => false)) return;
    const cont = page.getByRole('button', {
      name: /답변으로 같이 정리하기|같이 확인|계속하기|Continue/i,
    });
    if (await cont.first().isVisible().catch(() => false)) {
      await cont.first().click({ force: true });
      await page.waitForTimeout(800);
      continue;
    }
    await page.waitForTimeout(400);
  }
  await shot(page, 'journey-reading-stuck');
  const stuckUrl = page.url();
  const stuckBody = ((await page.locator('body').innerText().catch(() => '')) || '').slice(0, 400);
  throw new Error(
    `Reading sequence never reached AI PM understanding or answer UI url=${stuckUrl} body=${stuckBody}`,
  );
}

async function readUnderstandingPhase(page: Page): Promise<string> {
  return page.evaluate(() => {
    const keys = Object.keys(sessionStorage).filter((key) =>
      key.includes('businessUnderstanding.phase'),
    );
    return keys.map((key) => sessionStorage.getItem(key) ?? '').find(Boolean) ?? 'missing';
  });
}

async function readClosedGaps(page: Page): Promise<string[]> {
  const loop = await readLoopFromSession(page);
  return Object.entries(loop?.gapState?.gaps ?? {})
    .filter(([, record]) => record?.completeness === 'CLOSED')
    .map(([gapId]) => gapId);
}

async function journeyReached(page: Page): Promise<'synthesis' | 'result' | 'loop' | 'none'> {
  if (await page.getByTestId('viability-result-view').isVisible().catch(() => false)) return 'result';
  if (await page.getByTestId('stage-synthesis-panel').isVisible().catch(() => false)) {
    return 'synthesis';
  }
  if (await page.getByTestId('answer-input').or(page.getByTestId('confirm-yes-cta')).isVisible().catch(() => false)) {
    return 'loop';
  }
  return 'none';
}

async function resolveContradiction(page: Page) {
  const conflict = page.getByTestId('contradiction-confirm');
  if (!(await conflict.isVisible().catch(() => false))) return false;
  await page.getByRole('button', { name: /새 답변이 맞아요/ }).click();
  await page.waitForTimeout(1_200);
  return true;
}

async function submitGapAnswer(page: Page): Promise<boolean> {
  await dismissRecognition(page);
  if (await resolveContradiction(page)) return true;
  if ((await journeyReached(page)) !== 'loop') return false;

  const confirmYes = page.getByTestId('confirm-yes-cta');
  if (await confirmYes.isVisible().catch(() => false)) {
    await confirmYes.click();
    await page.waitForTimeout(1_200);
    return true;
  }

  const gap = (await readActiveTargetGap(page)) ?? '';
  const text = GAP_ANSWERS[gap] ?? GAP_ANSWERS.businessOneLiner!;
  const input = page.getByTestId('answer-input');
  if (!(await input.isVisible().catch(() => false))) return false;
  await input.fill(text);
  await expect(page.getByTestId('submit-answer-cta')).toBeEnabled();
  const submitted = await submitAnswer(page, text);
  await resolveContradiction(page);
  return submitted;
}

async function closeCanonicalGaps(page: Page) {
  for (let i = 0; i < 28; i += 1) {
    const reached = await journeyReached(page);
    if (reached === 'synthesis' || reached === 'result') return reached;
    const closed = await readClosedGaps(page);
    if (REQUIRED_GAPS.every((gap) => closed.includes(gap))) {
      if (await page.getByTestId('stage-synthesis-panel').isVisible().catch(() => false)) {
        return 'synthesis';
      }
    }
    const advanced = await submitGapAnswer(page);
    if (!advanced) await page.waitForTimeout(800);
  }
  const closed = await readClosedGaps(page);
  throw new Error(`Canonical gaps did not close. closed=${closed.join(',')}`);
}

test.describe('Demo clinicflow — harness vs product', () => {
  test('health-ready clinicflow is not a product 500', async ({ page, request }) => {
    test.setTimeout(90_000);
    const base = e2eBaseUrl();
    const health = await request.get(`${base}/health`);
    expect(health.ok(), `health ${health.status()}`).toBe(true);

    const first = await request.get(`${base}/ko/workspace?demo=guided&sample=clinicflow&fresh=1`);
    const second = await request.get(`${base}/ko/workspace?demo=guided&sample=clinicflow&fresh=1`);
    test.info().attach('demo-harness-diagnosis', {
      body: JSON.stringify(
        {
          health: health.status(),
          first: first.status(),
          second: second.status(),
          classification:
            first.ok() || second.ok()
              ? 'harness-or-sso-not-product-500'
              : 'needs-product-investigation',
        },
        null,
        2,
      ),
    });
    expect(first.ok() || second.ok(), `clinicflow ${first.status()}/${second.status()}`).toBe(true);

    await page.goto('/workspace?demo=guided&sample=clinicflow&fresh=1', {
      waitUntil: 'domcontentloaded',
    });
    await dismissCookies(page);
    const body = ((await page.locator('body').innerText().catch(() => '')) || '').trim();
    expect(body).not.toMatch(/Internal Server Error/i);
  });
});

test.describe('Authenticated Golden J1–J6', () => {
  test('one QA session closes J1 through Stage ④', async ({ page, context }) => {
    test.setTimeout(600_000);
    expect(qaAuthReady(), 'QA magic-link env must be present — do not skip').toBe(true);
    await loginWithQaMagicLink(page, context, e2eBaseUrl());
    await dismissCookies(page);

    await expect(page.getByTestId('my-projects-create-form')).toBeVisible({ timeout: 20_000 });
    await page.locator('#new-project-title').fill(TITLE);
    await page.locator('input[name="reviewType"][value="startup-idea"]').check();
    await page.locator('#project-description').fill(LONG_SOURCE);
    await page.getByRole('button', { name: /사업 검토 시작|Start business review/ }).click();
    await page.waitForURL(/\/workspace\?project=/, { timeout: 60_000 });
    const projectUrl = page.url();
    await clickThroughReading(page);

    await expect(page.getByTestId('project-display-title')).toHaveText(TITLE);
    await expect(page.getByTestId('document-first-card')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('current-understanding-block')).toHaveCount(0);
    await expect(page.getByTestId('understanding-confirm-edit')).toHaveText(/아니요\.?\s*수정할게요/);
    const firstCard = await page.getByTestId('document-first-card').innerText();
    expect(firstCard).toContain('AI가 이해한 내용');
    expect(firstCard).not.toBe(LONG_SOURCE);
    expect(firstCard).not.toMatch(/방한 외국인/);
    expect(firstCard).toMatch(/내국인|외국인|전통주|양조장/);
    const sourceToggle = page.getByTestId('source-document-text-toggle');
    if (await sourceToggle.isVisible().catch(() => false)) {
      await sourceToggle.click();
      await expect(page.getByTestId('source-document-text')).toContainText('온라인 마케팅');
      await expect(page.getByTestId('source-document-text')).not.toHaveText(TITLE);
    }
    await shot(page, 'journey-j1-first-understanding');

    await page.getByTestId('understanding-confirm-edit').click();
    await expect(page.getByTestId('understanding-edit-seeded')).toBeVisible({ timeout: 20_000 });
    const customerField = page.getByRole('textbox', { name: /고객/ });
    await customerField.fill('전통주와 양조장 체험을 좋아하는 내국인과 외국인');
    await page.getByRole('button', { name: /수정 반영/ }).click();
    await expect(page.getByTestId('edit-understanding-confirm')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('edit-understanding-confirm')).toContainText(/내국인/);
    await expect(page.getByTestId('edit-understanding-confirm')).not.toContainText('방한 외국인');
    await page.getByRole('button', { name: /맞습니다/ }).click();
    await page.waitForTimeout(1_200);
    await expect(page.getByTestId('document-first-card')).toHaveCount(0);
    expect(await readUnderstandingPhase(page)).toMatch(/accepted|review-ready|aligning/);
    await shot(page, 'journey-j2-correction-confirmed');

    await expect(
      page.getByTestId('answer-input').or(page.getByTestId('confirm-yes-cta')),
    ).toBeVisible({ timeout: 30_000 });
    if (await page.getByTestId('confirm-yes-cta').isVisible().catch(() => false)) {
      await page.getByTestId('confirm-yes-cta').click();
      await page.waitForTimeout(1_000);
    }
    const answer = page.getByTestId('answer-input');
    await expect(answer).toBeVisible({ timeout: 30_000 });
    await answer.fill(CUSTOMER_A);
    await expect(page.getByTestId('submit-answer-cta')).toBeEnabled();
    expect(await submitAnswer(page, CUSTOMER_A)).toBe(true);
    await page.getByTestId('edit-prior-answer-cta').click();
    await expect(page.getByTestId('answer-input')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('answer-input').fill(CUSTOMER_B);
    expect(await submitAnswer(page, CUSTOMER_B)).toBe(true);
    await page.getByTestId('edit-prior-answer-cta').click();
    await expect(page.getByTestId('answer-input')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('answer-input').fill(CUSTOMER_C);
    expect(await submitAnswer(page, CUSTOMER_C)).toBe(true);
    await expect(page.getByTestId('my-last-answer')).toContainText(/전통주|내국인|외국인|C /);
    await expect(page.getByTestId('my-last-answer')).not.toContainText(CUSTOMER_A);
    await shot(page, 'journey-j3-final-c');

    await expect(page.getByTestId('answer-input')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('answer-input').fill(CUSTOMER_CONFLICT);
    expect(await submitAnswer(page, CUSTOMER_CONFLICT)).toBe(true);
    const conflict = page.getByTestId('contradiction-confirm');
    if (await conflict.isVisible().catch(() => false)) {
      await expect(conflict).toContainText('이전 확인');
      await page.getByRole('button', { name: /새 답변이 맞아요/ }).click();
      await page.waitForTimeout(1_200);
    }
    const afterConflict = await page.locator('body').innerText();
    expect(afterConflict).toMatch(/직접|관광객|결제|내국인|외국인|양조장/);
    expect(afterConflict).not.toMatch(/방한 외국인/);
    await shot(page, 'journey-j4-conflict-kept');

    const phaseBeforeRefresh = await readUnderstandingPhase(page);
    const lastBeforeRefresh = (
      await page.getByTestId('my-last-answer').innerText().catch(() => '')
    ).trim();
    const gapBeforeRefresh = await readActiveTargetGap(page);
    expect(phaseBeforeRefresh).not.toBe('pending');
    expect(phaseBeforeRefresh).toMatch(/accepted|review-ready|aligning/);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await dismissCookies(page);
    await clickThroughReading(page);
    await expect(page.getByTestId('document-first-card')).toHaveCount(0);
    await expect(page.getByTestId('understanding-confirm-yes')).toHaveCount(0);
    await expect(page.getByTestId('understanding-confirm-edit')).toHaveCount(0);
    const phaseAfterReload = await readUnderstandingPhase(page);
    expect(phaseAfterReload).not.toBe('pending');
    expect(phaseAfterReload).toMatch(/accepted|review-ready|aligning/);
    const afterReload = await page.locator('body').innerText();
    expect(afterReload).not.toMatch(/방한 외국인/);
    expect(afterReload).not.toMatch(/아니요\.?\s*수정할게요/);
    if (lastBeforeRefresh) {
      expect(afterReload).toContain(lastBeforeRefresh.slice(0, 12));
    }
    await expect(
      page
        .getByTestId('answer-input')
        .or(page.getByTestId('confirm-yes-cta'))
        .or(page.getByTestId('stage-synthesis-panel')),
    ).toBeVisible({ timeout: 30_000 });
    await shot(page, 'journey-j5-refresh');

    await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
    await dismissCookies(page);
    await clickThroughReading(page);
    await expect(page.getByTestId('document-first-card')).toHaveCount(0);
    await expect(page.getByTestId('understanding-confirm-yes')).toHaveCount(0);
    const phaseAfterReentry = await readUnderstandingPhase(page);
    expect(phaseAfterReentry).not.toBe('pending');
    const afterReentry = await page.locator('body').innerText();
    expect(afterReentry).not.toMatch(/방한 외국인/);
    expect(afterReentry).not.toMatch(/아니요\.?\s*수정할게요/);
    if (lastBeforeRefresh) {
      expect(afterReentry).toContain(lastBeforeRefresh.slice(0, 12));
    }
    test.info().attach('j5-refresh-reentry', {
      body: JSON.stringify(
        {
          projectUrl,
          urlAfterReentry: page.url(),
          phaseBeforeRefresh,
          phaseAfterReload,
          phaseAfterReentry,
          lastBeforeRefresh,
          gapBeforeRefresh,
          gapAfterReentry: await readActiveTargetGap(page),
        },
        null,
        2,
      ),
    });
    await shot(page, 'journey-j5-reentry');

    const closedAfter = await closeCanonicalGaps(page);
    if (closedAfter === 'loop' || closedAfter === 'none') {
      throw new Error('Stage ③ did not appear after closing canonical gaps');
    }
    if (closedAfter === 'synthesis') {
      await expect(page.getByTestId('stage-synthesis-panel')).toBeVisible();
      await expect(page.getByTestId('synthesis-facts')).toBeVisible();
      test.info().attach('stage-3-dom', {
        body: JSON.stringify(
          {
            url: page.url(),
            synthesisVisible: true,
            openResultCta: await page.getByTestId('open-result-cta').isVisible(),
          },
          null,
          2,
        ),
      });
      await shot(page, 'journey-j6-stage-3');
      await page.getByTestId('open-result-cta').click();
    }
    await expect(page.getByTestId('viability-result-view')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('viability-verdict')).toHaveText(/HOLD|GO|조건부/);
    await expect(page.url()).toMatch(/workspace/);
    await shot(page, 'journey-j6-stage-4');
    test.info().attach('journey-url', { body: `${projectUrl} → ${page.url()}` });
    test.info().attach('stage-4-dom', {
      body: JSON.stringify(
        {
          url: page.url(),
          resultView: true,
          verdict: (await page.getByTestId('viability-verdict').innerText()).trim(),
        },
        null,
        2,
      ),
    });
    test.info().attach('closed-gaps', {
      body: (await readClosedGaps(page)).join(','),
    });
  });
});
