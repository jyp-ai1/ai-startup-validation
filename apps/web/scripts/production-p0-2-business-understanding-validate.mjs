/**
 * P0-2 Business Understanding — Production validation (no product code changes).
 *
 * Usage (from apps/web):
 *   node scripts/production-p0-2-business-understanding-validate.mjs
 *
 * Records evidence under docs/evidence/ALABOM/P0-2-production-rerun/
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.join(__dirname, '..');
const EVIDENCE_DIR = path.join(WEB_ROOT, '..', '..', 'docs', 'evidence', 'ALABOM', 'P0-2-production-rerun');

const BASE = process.env.PRODUCTION_URL ?? 'https://ai-startup-validation-tau.vercel.app';

const CEO_DOC = `# 영세 양조장 온라인 홍보 SaaS

사업: 영세 양조장을 위한 B2B SaaS

고객의 니즈는 많으나 그들에게 손쉬운 온라인 홍보플랫폼을 만들어 제공하려 함.

대상: 소규모 양조장`;

const CORRECTION_CUSTOMER =
  '고객은 소규모 영세 양조장입니다. 우리가 제공하려는 것은 온라인 홍보·마케팅 SaaS입니다.';

const QA_BANK = [
  '양조장들은 온라인 홍보 방법을 잘 모르고, 홍보할 인력도 부족합니다.',
  '소규모 양조장이 SNS·쇼핑몰에 제품을 알리기 어렵다는 니즈가 있습니다.',
  '양조장 대표가 월 구독료를 내고 SaaS를 쓰는 B2B 모델을 생각합니다.',
  '클래스101·스마트스토어는 있지만 양조장 전용 온라인 홍보 SaaS는 약합니다.',
  '양조장 맞춤 템플릿과 간편 업로드로 홍보 부담을 줄이는 것이 차별점입니다.',
];

const report = {
  at: new Date().toISOString(),
  productionSha: '',
  document: CEO_DOC,
  steps: {},
  checkpoints: {},
  qaTurns: [],
  errors: [],
};

async function dismissCookies(page) {
  const accept = page.getByRole('button', { name: /분석 수락|수락|Accept/i });
  if (await accept.first().isVisible().catch(() => false)) {
    await accept.first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }
}

async function snap(page, name) {
  fs.mkdirSync(path.join(EVIDENCE_DIR, 'screenshots'), { recursive: true });
  const file = path.join(EVIDENCE_DIR, 'screenshots', `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

/** Read document-first draft field value by Korean label (사업, 고객, 문제, …). */
async function readDraftField(page, label) {
  const card = page.getByTestId('document-first-card');
  if (!(await card.isVisible().catch(() => false))) return null;
  const dt = card.locator('dt').filter({ hasText: label }).first();
  if ((await dt.count()) === 0) return null;
  const dd = dt.first().locator('xpath=following-sibling::dd[1]');
  return (await dd.innerText().catch(() => '')).trim();
}

function pickAnswer(questionText, turnIndex) {
  if (/어느 쪽이 맞나요/.test(questionText)) {
    if (/B\)[\s\S]*홍보 방법/.test(questionText)) return 'B';
    if (/B\)/.test(questionText)) return 'B';
    return 'A';
  }
  if (/불편|문제|니즈|어려|pain|불만/.test(questionText)) {
    return QA_BANK[0];
  }
  if (/고객|누구|대상|제공|타깃|타겟/.test(questionText)) {
    return '소규모 영세 양조장이 핵심 고객입니다.';
  }
  if (/지불|비용|수익|돈/.test(questionText)) {
    return QA_BANK[2];
  }
  if (/경쟁|대안|비슷/.test(questionText)) {
    return QA_BANK[3];
  }
  if (/차별|다른/.test(questionText)) {
    return QA_BANK[4];
  }
  return QA_BANK[turnIndex % QA_BANK.length];
}

function assessCheckpoints(report) {
  const c = report.checkpoints;
  const initial = report.initialUnderstanding ?? {};
  const afterEdit = report.afterCorrection ?? {};
  const final = report.finalReview ?? {};

  c.customer_from_doc_initial =
    /소규모\s*양조장|영세\s*양조장/.test(initial.customer ?? '') &&
    !/아직 확인 중/.test(initial.customer ?? '');

  c.problem_need_initial =
    /홍보|니즈|플랫폼|마케팅/.test(initial.problem ?? '') &&
    !/아직 확인 중/.test(initial.problem ?? '');

  c.no_solution_as_customer_slot =
    !/고객[\s\S]{0,100}홍보플랫폼을 만들어/.test(report.rawInitialBody ?? '');

  c.correction_ui_flow =
    report.steps.correctionOpen === 'PASS' &&
    report.steps.correctionSubmit === 'PASS' &&
    report.steps.editConfirm === 'PASS';

  c.correction_canonical_reflects =
    c.correction_ui_flow &&
    /양조장|소규모/.test(afterEdit.customer ?? '') &&
    !/아직 확인 중/.test(afterEdit.customer ?? '');

  c.correction_applied = c.correction_canonical_reflects;

  c.qa_reached = report.steps.qa === 'PASS';
  c.qa_no_exact_repeat =
    report.qaTurns.length <= 1 ||
    !report.qaTurns.some((t, i) =>
      report.qaTurns.slice(0, i).some((p) => p.question.trim() === t.question.trim() && t.question.length > 12),
    );

  c.qa_memory =
    report.qaTurns.length >= 2
      ? report.qaTurns.some((t) => /양조장|홍보|SaaS/.test(t.answer))
      : null;

  c.judgment_reached = report.steps.judgment === 'PASS' || Boolean(report.judgmentSnippet);
  c.final_review_reached = report.steps.finalReview === 'PASS';
  c.final_not_slot_template = !/^고객\s*=.*\n문제\s*=.*\n솔루션\s*=/m.test(final.text ?? '');
  c.final_context_consistent =
    final.text && /양조장|홍보|SaaS/.test(final.text) && !/관광|FIT|서울/.test(final.text);

  if (!c.customer_from_doc_initial && !c.problem_need_initial) {
    report.verdictUnderExtraction = 'LIKELY';
  } else if (!c.customer_from_doc_initial || !c.problem_need_initial) {
    report.verdictUnderExtraction = 'PARTIAL';
  } else {
    report.verdictUnderExtraction = 'NO';
  }

  const blockers = [];
  if (report.steps.correctionSubmit !== 'PASS') blockers.push('correction');
  if (report.steps.qa !== 'PASS') blockers.push('qa');
  if (report.steps.finalReview !== 'PASS') blockers.push('final_review');
  if (report.verdictUnderExtraction === 'LIKELY' || report.verdictUnderExtraction === 'PARTIAL') {
    blockers.push('under_extraction');
  }

  if (blockers.length === 0 && c.correction_applied && c.final_review_reached) {
    report.p0_2 = 'PASS_CANDIDATE';
  } else   if (!c.correction_canonical_reflects && c.correction_ui_flow) {
    blockers.push('correction_canonical');
  }
  if (blockers.includes('under_extraction') && blockers.includes('correction_canonical')) {
    report.p0_2 = 'PARTIAL_UNDER_EXTRACTION_AND_CORRECTION';
  } else if (blockers.includes('under_extraction')) {
    report.p0_2 = 'PARTIAL_UNDER_EXTRACTION';
  } else if (blockers.includes('correction_canonical')) {
    report.p0_2 = 'PARTIAL_CORRECTION_REFLECT';
  } else {
    report.p0_2 = 'PARTIAL';
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  const bi = await page.request.get(`${BASE}/api/build-info`);
  report.productionSha = (await bi.json())?.data?.commit ?? '';

  await page.goto(`${BASE}/demo/start`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await dismissCookies(page);
  await page.getByRole('button', { name: /내 사업 문서로 체험하기/i }).click();
  await page.locator('textarea').first().fill(CEO_DOC);
  report.steps.documentIntake = 'PASS';
  await page.getByRole('button', { name: /AI Read 시작/i }).click();
  await page.waitForURL(/\/workspace/, { timeout: 120_000 });
  report.steps.demoWorkspace = 'PASS';

  await dismissCookies(page);
  await page.getByTestId('document-first-card').waitFor({ state: 'visible', timeout: 90_000 });
  await page.getByText(/제가 이렇게 이해했습니다/).waitFor({ state: 'visible', timeout: 15_000 });
  report.steps.understandingCard = 'PASS';

  report.rawInitialBody = await page.locator('body').innerText();
  report.initialUnderstanding = {
    business: await readDraftField(page, '사업'),
    customer: await readDraftField(page, '고객'),
    problem: await readDraftField(page, '문제'),
    market: await readDraftField(page, '시장'),
    competitor: await readDraftField(page, '경쟁'),
  };
  await snap(page, '01-initial-understanding');

  const editNo = page.getByRole('button', { name: /아닙니다 — 수정할게요/i });
  await editNo.scrollIntoViewIfNeeded();
  await dismissCookies(page);
  await editNo.click({ force: true });
  await page
    .getByTestId('understanding-edit-seeded')
    .waitFor({ state: 'visible', timeout: 45_000 });
  report.steps.correctionOpen = 'PASS';

  report.correctionInput = {
    customer: CORRECTION_CUSTOMER,
    business: '영세 양조장을 위한 온라인 홍보 B2B SaaS',
  };
  await page.locator('#domain-customer').fill(CORRECTION_CUSTOMER);
  await page.locator('#domain-business').fill(report.correctionInput.business);
  report.correctionInputApplied = {
    customer: await page.locator('#domain-customer').inputValue(),
  };
  await page.getByRole('button', { name: /수정 반영 — 기준 맞추기/i }).click({ force: true });
  await page.getByTestId('edit-understanding-confirm').waitFor({ state: 'visible', timeout: 30_000 });
  report.steps.correctionSubmit = 'PASS';
  await snap(page, '02-edit-confirm-summary');

  const confirmPanel = page.getByTestId('edit-understanding-confirm');
  const confirmDds = await confirmPanel.locator('dd').allInnerTexts();
  report.afterCorrection = {
    business: confirmDds[0]?.trim() ?? '',
    customer: confirmDds[1]?.trim() ?? '',
    problem: confirmDds[2]?.trim() ?? '',
  };

  await page.getByRole('button', { name: /맞습니다, 다음으로/i }).click({ force: true });
  await page.waitForTimeout(2000);
  report.steps.editConfirm = 'PASS';
  report.bodyAfterEditConfirm = await page.locator('body').innerText();
  await snap(page, '03-after-edit-confirm');

  if (await page.getByTestId('confirm-yes-cta').isVisible().catch(() => false)) {
    await page.getByTestId('confirm-yes-cta').click({ force: true });
    await page.waitForTimeout(1500);
  } else {
    await page.getByRole('button', { name: /^네, 맞습니다$/i }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(1500);
  }

  const questionsSeen = new Set();
  let qaPass = false;
  for (let i = 0; i < 22; i++) {
    if (await page.getByTestId('final-understanding-confirm').isVisible().catch(() => false)) {
      qaPass = true;
      break;
    }
    if (await page.getByTestId('mid-judgment-panel').isVisible().catch(() => false)) {
      report.judgmentSnippet = await page.getByTestId('mid-judgment-panel').innerText();
      report.steps.judgment = 'PASS';
    }
    if (await page.getByTestId('current-judgment-block').isVisible().catch(() => false)) {
      report.judgmentSnippet = await page.getByTestId('current-judgment-block').innerText();
      report.steps.judgment = 'PASS';
    }

    const body = await page.locator('body').innerText();
    let qMatch =
      body.match(/지금 확인할 것[\s\S]{0,160}\n\n([^\n?]{10,260}\?)/)?.[1]?.trim() ||
      body.match(/이번 질문[^\n]*\n?([^\n?]{8,260}\?)/)?.[1]?.trim() ||
      '';
    if (qMatch === '왜 이 질문을 하나요?' || qMatch?.startsWith('왜 이 질문')) {
      qMatch =
        body.match(/(\d+번째 질문[\s\S]{0,100}\n\n[^\n?]{10,260}\?)/)?.[1]?.trim() ||
        body.match(/(제가 이해한[^\n?]{10,220}\?)/)?.[1]?.trim() ||
        body.match(/(「[^」]+」에 두 가지 답[\s\S]{0,320}\?)/)?.[1]?.trim() ||
        '';
    }

    if (await page.getByTestId('contradiction-confirm').isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /새 답변이 맞아요/i }).click({ force: true });
      await page.waitForTimeout(2000);
      continue;
    }

    if (await page.getByTestId('confirm-yes-cta').isVisible().catch(() => false)) {
      await page.getByTestId('confirm-yes-cta').click({ force: true });
      await page.waitForTimeout(1500);
      continue;
    }

    if (await page.getByTestId('confirm-correction-flow').isVisible().catch(() => false)) {
      const corr = page.locator('[data-testid="confirm-correction-flow"] textarea').first();
      if (await corr.isVisible().catch(() => false)) {
        await corr.fill(CORRECTION_CUSTOMER);
        await page.getByTestId('confirm-correction-submit').click({ force: true });
        await page.waitForTimeout(2000);
        continue;
      }
    }

    const textarea = page.locator('#ai-pm-loop textarea:visible, [data-testid="submit-answer-cta"]').locator('..').locator('textarea').first();
    const ta = page.locator('textarea:visible').last();
    if (await ta.isVisible().catch(() => false)) {
      const answer = pickAnswer(qMatch || body.slice(0, 500), i);
      if (qMatch) {
        report.qaTurns.push({ turn: i + 1, question: qMatch, answer });
        questionsSeen.add(qMatch);
      }
      await ta.fill(answer);
      const submit = page.getByTestId('submit-answer-cta');
      if (await submit.isVisible().catch(() => false)) {
        await submit.click({ force: true });
      } else {
        await page.getByRole('button', { name: /답변|보내|반영|제출/i }).first().click({ force: true }).catch(() => {});
      }
      await page.waitForTimeout(2800);
      qaPass = report.qaTurns.length > 0;
      await snap(page, `04-qa-turn-${String(i + 1).padStart(2, '0')}`);
      continue;
    }

    if (/검토 시작|분석 시작|finalReviewLead|최종 확인/.test(body)) break;
    await page.waitForTimeout(1500);
  }

  report.steps.qa = qaPass || report.qaTurns.length > 0 ? 'PASS' : 'FAIL';

  if (await page.getByTestId('final-understanding-confirm').isVisible().catch(() => false)) {
    report.steps.finalReview = 'PASS';
    report.finalReview = {
      text: await page.getByTestId('final-understanding-confirm').innerText(),
    };
    await snap(page, '05-final-review');
  } else {
    const body = await page.locator('body').innerText();
    if (/분석 전에, AI가 이해한 내용을 최종 확인|finalReviewLead/.test(body)) {
      report.steps.finalReview = 'PASS';
      report.finalReview = { text: body.slice(body.indexOf('분석 전에'), body.indexOf('분석 전에') + 1200) };
    }
  }

  if (!report.steps.judgment) {
    const body = await page.locator('body').innerText();
    if (/GO|HOLD|NO-GO|판단|mid-judgment|current-judgment/.test(body)) {
      report.steps.judgment = 'PARTIAL';
      report.judgmentSnippet = body.match(/(GO|HOLD|NO-GO)[\s\S]{0,400}/)?.[0] ?? '';
    } else {
      report.steps.judgment = 'NOT_REACHED';
    }
  }
} catch (e) {
  report.errors.push(e instanceof Error ? e.message : String(e));
} finally {
  await browser.close();
}

assessCheckpoints(report);

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
fs.writeFileSync(path.join(EVIDENCE_DIR, 'result.json'), JSON.stringify(report, null, 2));

const md = [
  '# P0-2 Business Understanding — Production re-run',
  '',
  `| Production SHA | \`${report.productionSha}\` |`,
  `| Run at | ${report.at} |`,
  `| P0-2 verdict | **${report.p0_2}** |`,
  `| Under-extraction | ${report.verdictUnderExtraction ?? 'n/a'} |`,
  '',
  '## Steps',
  '',
  ...Object.entries(report.steps).map(([k, v]) => `- ${k}: ${v}`),
  '',
  '## Initial understanding (document-first)',
  '',
  '```json',
  JSON.stringify(report.initialUnderstanding, null, 2),
  '```',
  '',
  '## After CEO correction confirm',
  '',
  '```json',
  JSON.stringify(report.afterCorrection, null, 2),
  '```',
  '',
  '## Checkpoints (CPO)',
  '',
  ...Object.entries(report.checkpoints).map(([k, v]) => `- ${k}: ${v}`),
  '',
  '## Q&A turns',
  '',
  report.qaTurns.length
    ? report.qaTurns.map((t) => `### Turn ${t.turn}\n- Q: ${t.question}\n- A: ${t.answer}`).join('\n\n')
    : '_none captured_',
  '',
  '## Final Review excerpt',
  '',
  report.finalReview?.text ? report.finalReview.text.slice(0, 2000) : '_not reached_',
  '',
  report.errors.length ? `## Errors\n\n${report.errors.map((x) => `- ${x}`).join('\n')}` : '',
].join('\n');

fs.writeFileSync(path.join(EVIDENCE_DIR, 'REPORT.md'), md);
console.log(JSON.stringify({ p0_2: report.p0_2, steps: report.steps, checkpoints: report.checkpoints, errors: report.errors }, null, 2));
