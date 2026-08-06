/**
 * S17 Internal QA — Shared Understanding Loop 2.0 (Production).
 * PLAYWRIGHT_BASE_URL=https://ai-startup-validation-tau.vercel.app
 */
import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const OUT = path.join(process.cwd(), '../../docs/evidence/S17/qa');
fs.mkdirSync(OUT, { recursive: true });

const RICH_DOC = `사업계획서 요약

서비스명: 병원 AI 스크리닝
형태: B2B SaaS
대상: 병원

핵심 가치: 재방문·대기 관리
문제: 병원 행정 업무가 수작업으로 느리다

아직 수익 모델은 미정입니다.`;

const PDF_PLACEHOLDER = `# plan.pdf

PDF 본문은 아직 추출되지 않았습니다. Business·Customer는 직접 확인이 필요합니다.`;

const MISSING_CUSTOMER_DOC = `# 헬스케어 SaaS

창업자: 이대표
사업: 병원 운영 자동화 B2B SaaS
문제: 병원 행정 업무가 수작업으로 느리다
`;

async function dismissCookies(page: Page) {
  for (let i = 0; i < 3; i++) {
    const accept = page.getByRole('button', { name: /분석 수락|수락|Accept/i });
    const reject = page.getByRole('button', { name: /^거부$|거부|Reject/i });
    if (await accept.first().isVisible().catch(() => false)) {
      await accept.first().click({ force: true });
      await page.waitForTimeout(400);
      return;
    }
    if (await reject.first().isVisible().catch(() => false)) {
      await reject.first().click({ force: true });
      await page.waitForTimeout(400);
      return;
    }
    await page.waitForTimeout(300);
  }
}

async function startGuided(page: Page, doc: string) {
  await page.goto('/ko/workspace?demo=guided&sample=custom&fresh=1', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(800);
  await dismissCookies(page);
  const paste = page.getByPlaceholder(/사업계획서|IR deck|Notion/i);
  await paste.waitFor({ state: 'visible', timeout: 30_000 });
  await paste.fill(doc);
  await page.getByRole('button', { name: /AI PM과 시작하기/i }).click({ force: true });
  await page.waitForTimeout(2_000);
  await dismissCookies(page);
}

async function startDemoPdf(page: Page, doc: string) {
  await page.goto('/demo/start', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await dismissCookies(page);
  await page.getByRole('button', { name: /내 사업 문서로 체험하기/i }).click();
  await page.waitForTimeout(400);
  await page.locator('textarea').fill(doc);
  await page.getByRole('button', { name: /AI Read 시작/i }).click();
  await page.waitForTimeout(3_000);
  await dismissCookies(page);
}

/** Wait until Document First card or Trust continue is actionable. */
async function reachDocumentFirst(page: Page) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await dismissCookies(page);

    const draft = page.getByTestId('document-first-card');
    if (await draft.isVisible().catch(() => false)) return 'document-first';

    const lead = page.getByText(/제가 이렇게 이해했습니다|문서 본문은 아직 충분히 읽지 못했습니다/);
    if (await lead.first().isVisible().catch(() => false)) {
      const confirm = page.getByRole('button', { name: /✓ 맞습니다(?! —)/ });
      if (await confirm.first().isVisible().catch(() => false)) return 'document-first';
    }

    // Unreadable Trust → continue into readingCompleted → Document First
    const trustContinue = page.getByRole('button', {
      name: /답변으로 같이 정리하기|같이 확인|계속하기|Continue/i,
    });
    if (await trustContinue.first().isVisible().catch(() => false)) {
      await trustContinue.first().click({ force: true });
      await page.waitForTimeout(1_500);
      continue;
    }

    // Skip lingering reading animation if present
    await page.waitForTimeout(800);
  }
  return 'timeout';
}

async function confirmUnderstanding(page: Page) {
  await dismissCookies(page);
  const confirm = page.getByRole('button', { name: /✓ 맞습니다(?! —)/ });
  await expect(confirm.first()).toBeVisible({ timeout: 15_000 });
  await confirm.first().click({ force: true });
  await page.waitForTimeout(1_500);
  await dismissCookies(page);
}

test.describe('S17 Internal QA (Production)', () => {
  test('P0-1 PDF placeholder → Trust + Document First draft (no empty form)', async ({ page }) => {
    test.setTimeout(240_000);
    await startDemoPdf(page, PDF_PLACEHOLDER);
    await page.screenshot({ path: path.join(OUT, 'p0-1-pdf-trust.png'), fullPage: true });

    const reached = await reachDocumentFirst(page);
    await page.screenshot({ path: path.join(OUT, 'p0-1-pdf-document-first.png'), fullPage: true });
    const body = await page.locator('body').innerText();

    const honestTrust = /PDF 본문|아직 추출|읽지 못|충분히 이해|Confidence/i.test(body);
    const documentFirst =
      /제가 이렇게 이해했습니다|문서 본문은 아직 충분히 읽지 못했습니다|AI 초안/.test(body);
    const confidence = /Confidence\s*\d+%/.test(body);
    const emptyFormPrimary =
      (await page.locator('input[name="business"]').isVisible().catch(() => false)) &&
      !(await page.getByTestId('document-first-card').isVisible().catch(() => false));
    const filenameAsBusiness = /사업[:\s]*plan\.pdf|현재 사업[^\n]*plan\.pdf/i.test(body);

    fs.writeFileSync(
      path.join(OUT, 'p0-1-result.json'),
      JSON.stringify(
        {
          reached,
          honestTrust,
          documentFirst,
          confidence,
          emptyFormPrimary,
          filenameAsBusiness,
          bodySnippet: body.slice(0, 1500),
        },
        null,
        2,
      ),
    );

    expect(filenameAsBusiness).toBe(false);
    expect(emptyFormPrimary).toBe(false);
    expect(reached).toBe('document-first');
    expect(documentFirst || confidence).toBe(true);
    expect(honestTrust).toBe(true);
  });

  test('P0-1b Rich doc → 「제가 이렇게 이해했습니다」 + Confidence', async ({ page }) => {
    test.setTimeout(240_000);
    await startGuided(page, RICH_DOC);
    const reached = await reachDocumentFirst(page);
    await page.screenshot({ path: path.join(OUT, 'p0-1-rich-document-first.png'), fullPage: true });
    const body = await page.locator('body').innerText();

    const lead = /제가 이렇게 이해했습니다/.test(body);
    const draft = /AI 초안/.test(body);
    const confidence = /Confidence\s*\d+%/.test(body);
    const noEmptyForm = /빈 양식을 채울 필요는 없습니다/.test(body);

    fs.writeFileSync(
      path.join(OUT, 'p0-1b-result.json'),
      JSON.stringify({ reached, lead, draft, confidence, noEmptyForm, bodySnippet: body.slice(0, 1200) }, null, 2),
    );

    expect(reached).toBe('document-first');
    expect(lead).toBe(true);
    expect(draft && confidence).toBe(true);
    expect(noEmptyForm).toBe(true);
  });

  test('P0-2/3/4 Confirm → Answer → Thinking → SU reflect', async ({ page }) => {
    test.setTimeout(300_000);
    await startGuided(page, RICH_DOC);
    expect(await reachDocumentFirst(page)).toBe('document-first');
    await page.screenshot({ path: path.join(OUT, 'p0-2-document-first.png'), fullPage: true });
    await confirmUnderstanding(page);

    await page.locator('textarea').last().waitFor({ state: 'visible', timeout: 60_000 });
    await page.screenshot({ path: path.join(OUT, 'p0-2-ask.png'), fullPage: true });

    await page.locator('textarea').last().fill('병원 원장과 행정 담당자가 주요 고객입니다');
    await page.getByRole('button', { name: /답변 반영하기/i }).click({ force: true });

    let thinkingSeen = false;
    const thinkDeadline = Date.now() + 6_000;
    while (Date.now() < thinkDeadline) {
      if (await page.getByTestId('ai-pm-thinking-stages').isVisible().catch(() => false)) {
        thinkingSeen = true;
        await page.screenshot({ path: path.join(OUT, 'p0-3-thinking-stages.png'), fullPage: true });
        break;
      }
      await page.waitForTimeout(150);
    }

    await page.waitForTimeout(2_800);
    await page.screenshot({ path: path.join(OUT, 'p0-4-su-reflect.png'), fullPage: true });
    const after = await page.locator('body').innerText();
    const reflectSeen = /이렇게 이해를 수정했습니다|✓ AI 이해 업데이트 완료/.test(after);
    const customerUpdated = /병원 원장|행정 담당|고객/.test(after);

    fs.writeFileSync(
      path.join(OUT, 'p0-234-result.json'),
      JSON.stringify({ thinkingSeen, reflectSeen, customerUpdated, bodySnippet: after.slice(0, 1500) }, null, 2),
    );

    expect(thinkingSeen, 'staged Thinking UI').toBe(true);
    expect(reflectSeen || customerUpdated, 'SU reflect after answer').toBe(true);
  });

  test('P0-5 After confirm, next Q targets missing customer', async ({ page }) => {
    test.setTimeout(240_000);
    await startGuided(page, MISSING_CUSTOMER_DOC);
    expect(await reachDocumentFirst(page)).toBe('document-first');
    await confirmUnderstanding(page);

    await page.locator('textarea').last().waitFor({ state: 'visible', timeout: 60_000 });
    await page.screenshot({ path: path.join(OUT, 'p0-5-next-question.png'), fullPage: true });
    const body = await page.locator('body').innerText();

    // Ask surface (not still Document First)
    const stillOnConfirm = /제가 이해한 내용이 맞습니까\?/.test(body);
    const customerAsk = /고객|누구|대상 사용자|누가 쓰|병원.*(고객|원장)/i.test(body);
    const notMarketFirst = !/시장 규모부터|경쟁사부터 알려/i.test(body);

    fs.writeFileSync(
      path.join(OUT, 'p0-5-result.json'),
      JSON.stringify({ stillOnConfirm, customerAsk, notMarketFirst, bodySnippet: body.slice(0, 1500) }, null, 2),
    );

    expect(stillOnConfirm).toBe(false);
    expect(customerAsk && notMarketFirst).toBe(true);
  });

  test('P1-3 Final Review before Analysis', async ({ page }) => {
    test.setTimeout(360_000);
    await startGuided(page, RICH_DOC);
    expect(await reachDocumentFirst(page)).toBe('document-first');
    await confirmUnderstanding(page);

    // Stay on AI PM — do not click sidebar progress nodes (they leave the loop).
    const answers = [
      '주요 고객은 병원 원장과 행정 담당자입니다',
      '가장 큰 문제는 재방문과 대기 관리 비용입니다',
      '시장은 국내 중소병원 SaaS이며 경쟁은 EMR·대기관리 툴입니다',
    ];

    for (let i = 0; i < answers.length + 2; i++) {
      if (await page.getByTestId('final-understanding-confirm').isVisible().catch(() => false)) break;
      if (
        await page
          .getByRole('button', { name: /✓ 맞습니다 — 분석 시작/i })
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        break;
      }

      // Keep AI PM tab focused if chrome offers it
      const aiPmTab = page.getByRole('button', { name: /^AI PM$/i });
      if (await aiPmTab.first().isVisible().catch(() => false)) {
        await aiPmTab.first().click({ force: true }).catch(() => null);
      }

      const together = page.getByRole('button', { name: /^같이 확인하기$/i });
      if (await together.first().isVisible().catch(() => false)) {
        await together.first().click({ force: true });
        await page.waitForTimeout(1_200);
      }

      const area = page.locator('#ai-pm-loop textarea, [data-testid="ai-pm-thinking-stages"] ~ textarea, textarea').last();
      if (await page.locator('textarea').last().isVisible().catch(() => false)) {
        await page.locator('textarea').last().fill(answers[Math.min(i, answers.length - 1)]!);
        const submit = page.getByRole('button', { name: /답변 반영하기/i });
        if (await submit.first().isVisible().catch(() => false)) {
          await submit.first().click({ force: true });
          await page.waitForTimeout(4_500);
        }
      } else {
        await page.waitForTimeout(1_000);
      }
    }

    // Ensure we are on AI PM surface for Final Review
    const aiPmTab = page.getByRole('button', { name: /^AI PM$/i });
    if (await aiPmTab.first().isVisible().catch(() => false)) {
      await aiPmTab.first().click({ force: true }).catch(() => null);
      await page.waitForTimeout(800);
    }

    await page.screenshot({ path: path.join(OUT, 'p1-3-final-review.png'), fullPage: true });
    const body = await page.locator('body').innerText();
    const finalPanel = await page.getByTestId('final-understanding-confirm').isVisible().catch(() => false);
    const finalCopy = /분석 전에, AI가 이해한 내용을 최종 확인합니다|✓ 맞습니다 — 분석 시작/.test(body);
    const stuckOnOverview = /AI PM 요약/.test(body) && !finalCopy;

    fs.writeFileSync(
      path.join(OUT, 'p1-3-result.json'),
      JSON.stringify({ finalPanel, finalCopy, stuckOnOverview, bodySnippet: body.slice(0, 1800) }, null, 2),
    );

    expect(finalPanel || finalCopy).toBe(true);
  });
});
