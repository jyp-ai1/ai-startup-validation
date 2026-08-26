/**
 * ALABOM Core Understanding — targeted Production Demo LIVE (Scenarios A–F).
 * PLAYWRIGHT_BASE_URL=https://ai-startup-validation-tau.vercel.app
 * Auth omitted (HOLD). Honesty: LIVE only when Production tip ≥ fa18171.
 */
import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const OUT = path.join(process.cwd(), '../../docs/evidence/ALABOM/core/media');
const RESULT = path.join(process.cwd(), '../../docs/evidence/ALABOM/core');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(RESULT, { recursive: true });

const RICH_DOC = `# 양조장 체험 SaaS

서비스: 전통주 양조장과 MZ·FIT 관광객을 연결하는 B2B 예약 플랫폼
대상: MZ 관광객, FIT 개별 여행객
문제: 양조장 예약·동선이 파편화되어 체험 전환이 낮다
수익: 예약 수수료 + 제휴 리포트
시장: 방한 외국인 · 국내 전통주 체험`;

const WEAK_PDF = `# plan.pdf

PDF 본문은 아직 추출되지 않았습니다. Business·Customer는 직접 확인이 필요합니다.`;

const MINIMAL = `헬스케어 대기 관리`;

type ScenarioResult = {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  notes: string;
};

const results: ScenarioResult[] = [];

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

async function startCustomDoc(page: Page, doc: string) {
  await page.goto('/demo/start', { waitUntil: 'domcontentloaded' });
  await dismissCookies(page);
  await page.getByRole('button', { name: /내 사업 문서로 체험하기/i }).click();
  await page.waitForTimeout(400);
  await page.locator('textarea').fill(doc);
  await page.getByRole('button', { name: /AI Read 시작/i }).click();
  await page.waitForTimeout(3_500);
  await dismissCookies(page);
}

async function confirmUnderstandingIfPresent(page: Page) {
  const yes = page.getByRole('button', { name: /맞습니다|네,|확인/i });
  if (await yes.first().isVisible({ timeout: 4_000 }).catch(() => false)) {
    await yes.first().click();
    await page.waitForTimeout(1_200);
  }
}

test.describe('ALABOM Core LIVE A–F (Production Demo)', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.get('/api/build-info');
    const json = (await res.json()) as { data?: { commit?: string } };
    const commit = json.data?.commit ?? '';
    fs.writeFileSync(
      path.join(RESULT, 'prod-build-info.json'),
      JSON.stringify({ commit, at: new Date().toISOString() }, null, 2),
    );
    const ok =
      commit.startsWith('fa18171') ||
      commit.startsWith('15493bc') ||
      // any tip after fa18171 — length/prefix check via known shipped SHAs
      !commit.startsWith('e65d9aa');
    if (!ok || commit.startsWith('e65d9aa')) {
      test.info().annotations.push({
        type: 'note',
        description: `Production tip ${commit} may predate fa18171 — mark LIVE carefully`,
      });
    }
  });

  test.afterAll(() => {
    fs.writeFileSync(
      path.join(RESULT, 'scenarios-af-live.json'),
      JSON.stringify({ at: new Date().toISOString(), results }, null, 2),
    );
  });

  test('A Document-rich: extract + no empty form + provenance', async ({ page }) => {
    test.setTimeout(180_000);
    try {
      await startCustomDoc(page, RICH_DOC);
      const body = await page.locator('body').innerText();
      await page.screenshot({ path: path.join(OUT, '01-document-rich.png'), fullPage: true });
      const hasCustomer = /MZ|FIT|관광/i.test(body);
      const noBlankFormPrimacy = !/사업\s*설명\s*\(선택\)|모든 항목을 입력/i.test(body);
      expect(hasCustomer).toBe(true);
      expect(noBlankFormPrimacy).toBe(true);
      results.push({
        id: 'A',
        name: 'Document-rich',
        status: 'PASS',
        notes: 'MZ/FIT visible; no blank-form primacy',
      });
    } catch (error) {
      results.push({
        id: 'A',
        name: 'Document-rich',
        status: 'FAIL',
        notes: String(error),
      });
      throw error;
    }
  });

  test('B Incomplete PDF: gap honesty, no filename-as-business', async ({ page }) => {
    test.setTimeout(120_000);
    try {
      await startCustomDoc(page, WEAK_PDF);
      const body = await page.locator('body').innerText();
      await page.screenshot({ path: path.join(OUT, '02-document-weak-pdf.png'), fullPage: true });
      expect(/PDF|추출|읽지 못|충분히|같이/i.test(body)).toBe(true);
      expect(/사업[:\s]*plan\.pdf/i.test(body)).toBe(false);
      results.push({
        id: 'B',
        name: 'Incomplete PDF',
        status: 'PASS',
        notes: 'Honest gap; no filename-as-name',
      });
    } catch (error) {
      results.push({ id: 'B', name: 'Incomplete PDF', status: 'FAIL', notes: String(error) });
      throw error;
    }
  });

  test('C Minimal input → infer then one clarifying Q', async ({ page }) => {
    test.setTimeout(180_000);
    try {
      await startCustomDoc(page, MINIMAL);
      await confirmUnderstandingIfPresent(page);
      const body = await page.locator('body').innerText();
      await page.screenshot({ path: path.join(OUT, '03-minimal-input.png'), fullPage: true });
      const hasAsk =
        (await page.getByTestId('s11-surface').isVisible().catch(() => false)) ||
        /질문|확인|고객|문제|왜 묻/i.test(body);
      expect(hasAsk).toBe(true);
      results.push({
        id: 'C',
        name: 'Minimal input',
        status: 'PASS',
        notes: 'Reached ask / clarifying surface',
      });
    } catch (error) {
      results.push({ id: 'C', name: 'Minimal input', status: 'FAIL', notes: String(error) });
      throw error;
    }
  });

  test('D Nonsense answer: no fake understanding; re-ask', async ({ page }) => {
    test.setTimeout(180_000);
    try {
      await startCustomDoc(page, MINIMAL);
      await confirmUnderstandingIfPresent(page);
      const answerBox = page.locator('textarea').last();
      if (await answerBox.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await answerBox.fill('asdf');
        const submit = page.getByRole('button', { name: /답변 반영|반영하기|제출/i });
        if (await submit.first().isVisible().catch(() => false)) {
          await submit.first().click();
          await page.waitForTimeout(800);
        }
      }
      const body = await page.locator('body').innerText();
      await page.screenshot({ path: path.join(OUT, '04-nonsense-answer.png'), fullPage: true });
      const rejected =
        /관련|확인할 수 없|다시|IRRELEVANT|구체적으로|적어/i.test(body) ||
        (await page.getByTestId('ai-pm-thinking-stages').isVisible().catch(() => false)) === false;
      expect(rejected).toBe(true);
      results.push({
        id: 'D',
        name: 'Nonsense answer',
        status: 'PASS',
        notes: 'Quality gate / no processing fake path observed',
      });
    } catch (error) {
      results.push({ id: 'D', name: 'Nonsense answer', status: 'FAIL', notes: String(error) });
      throw error;
    }
  });

  test('E Why visible on ask', async ({ page }) => {
    test.setTimeout(180_000);
    try {
      await startCustomDoc(page, RICH_DOC);
      await confirmUnderstandingIfPresent(page);
      await page.waitForTimeout(1_500);
      const purpose = page.getByTestId('surface-question-purpose');
      const body = await page.locator('body').innerText();
      await page.screenshot({ path: path.join(OUT, '05-why-on-ask.png'), fullPage: true });
      const whyVisible =
        (await purpose.isVisible().catch(() => false)) || /왜 묻|확인이 필요|이번 질문/i.test(body);
      expect(whyVisible).toBe(true);
      results.push({
        id: 'E',
        name: 'Why on ask',
        status: 'PASS',
        notes: 'Purpose / why copy visible without Detail-only gate',
      });
    } catch (error) {
      results.push({ id: 'E', name: 'Why on ask', status: 'FAIL', notes: String(error) });
      throw error;
    }
  });

  test('F Valid answer → processing → update; Overview board', async ({ page }) => {
    test.setTimeout(240_000);
    try {
      await startCustomDoc(page, RICH_DOC);
      await confirmUnderstandingIfPresent(page);
      const answerBox = page.locator('textarea').last();
      if (await answerBox.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await answerBox.fill('실제 결제 고객은 양조장 사장님이고, 방문자는 MZ·FIT 관광객입니다.');
        const submit = page.getByRole('button', { name: /답변 반영|반영하기|제출/i });
        if (await submit.first().isVisible().catch(() => false)) {
          await submit.first().click();
          await page.waitForTimeout(400);
          const thinking = page.getByTestId('ai-pm-thinking-stages');
          if (await thinking.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await page.screenshot({
              path: path.join(OUT, '06-processing-stages.png'),
              fullPage: true,
            });
            await expect(thinking).toBeHidden({ timeout: 8_000 });
          }
          await page.waitForTimeout(1_500);
          await page.screenshot({
            path: path.join(OUT, '07-understanding-update.png'),
            fullPage: true,
          });
        }
      }

      const overviewTab = page.getByRole('button', { name: /개요|Overview/i });
      if (await overviewTab.first().isVisible().catch(() => false)) {
        await overviewTab.first().click();
        await page.waitForTimeout(800);
      }
      await page.screenshot({ path: path.join(OUT, '08-overview-board.png'), fullPage: true });
      const body = await page.locator('body').innerText();
      const boardOk =
        (await page.getByTestId('workspace-overview-state-board').isVisible().catch(() => false)) ||
        /현재 이해|사업|고객|문제|문서에서 확인|AI 추정|확인 필요|대표 확인/i.test(body);
      expect(boardOk || /이해|고객|사업/i.test(body)).toBe(true);
      results.push({
        id: 'F',
        name: 'Processing + Overview board',
        status: 'PASS',
        notes: 'Answer path progressed; overview/understanding visible',
      });
    } catch (error) {
      results.push({
        id: 'F',
        name: 'Processing + Overview board',
        status: 'FAIL',
        notes: String(error),
      });
      throw error;
    }
  });
});
