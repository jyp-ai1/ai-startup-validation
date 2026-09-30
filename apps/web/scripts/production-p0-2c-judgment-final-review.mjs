/**
 * P0-2C — Judgment / Final Review Production validation (no product code changes).
 *
 * Usage: cd apps/web && node scripts/production-p0-2c-judgment-final-review.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVIDENCE = path.join(__dirname, '..', '..', '..', 'docs', 'evidence', 'ALABOM', 'P0-2C-production');

const BASE = process.env.PRODUCTION_URL ?? 'https://ai-startup-validation-tau.vercel.app';
const MAX_ITER = 65;
const MAX_MEANINGFUL = 28;

const CEO_DOC = `# 영세 양조장 온라인 홍보 SaaS

사업: 영세 양조장을 위한 B2B SaaS

고객의 니즈는 많으나 그들에게 손쉬운 온라인 홍보플랫폼을 만들어 제공하려 함.

대상: 소규모 양조장`;

const QA_BANK = [
  '영세 양조장을 위한 온라인 홍보·마케팅 SaaS를 제공합니다.',
  '양조장은 온라인 홍보 방법과 인력이 부족해 홍보가 어렵습니다.',
  '양조장 대표가 월 구독료로 B2B SaaS를 사용합니다.',
  '일반 SNS·쇼핑몰 도구는 있으나 양조장 전용 홍보 SaaS는 약합니다.',
  '양조장 맞춤 템플릿과 간편 업로드로 차별화합니다.',
  '초기 시장은 국내 소규모 양조장이며, 규모 통계는 아직 확인하지 못했습니다.',
  '검증 계획은 양조장 5곳 인터뷰와 랜딩 CTA로 관심도를 측정합니다.',
  '리스크는 양조장의 디지털 역량 편차와 콘텐츠 제작 부담입니다.',
  'MVP는 홍보 페이지·SNS 연동·간단 예약 링크 3가지로 좁혀 파일럿합니다.',
  '수익은 월 구독 5~15만 원대 팀 플랜 가설입니다.',
];

const report = {
  gate: 'P0-2C',
  at: new Date().toISOString(),
  productionSha: '',
  initialDraft: {},
  headerSnapshots: [],
  qaTurns: [],
  checkpoints: {},
  excerpts: {},
  steps: {},
  observations: [],
};

let meaningfulAnswers = 0;
const usedAnswers = new Set();

async function dismissCookies(page) {
  for (let i = 0; i < 6; i++) {
    const dialog = page.locator('[role="dialog"]');
    if (await dialog.first().isVisible().catch(() => false)) {
      const action = dialog.getByRole('button', {
        name: /분석 수락|수락|Accept|거부|Reject/i,
      });
      if (await action.first().isVisible().catch(() => false)) {
        await action.first().click({ force: true });
        await page.waitForTimeout(400);
        return;
      }
    }
    const accept = page.getByRole('button', { name: /분석 수락|수락|Accept/i });
    if (await accept.first().isVisible().catch(() => false)) {
      await accept.first().click({ force: true });
      await page.waitForTimeout(400);
      return;
    }
    await page.waitForTimeout(200);
  }
}

async function readDraftField(page, label) {
  const card = page.getByTestId('document-first-card');
  if (!(await card.isVisible().catch(() => false))) return '';
  const dt = card.locator('dt').filter({ hasText: label }).first();
  return (await dt.locator('xpath=following-sibling::dd[1]').innerText().catch(() => '')).trim();
}

async function textOrEmpty(page, testId) {
  const el = page.getByTestId(testId);
  try {
    await el.first().waitFor({ state: 'attached', timeout: 3_000 });
    return (await el.first().innerText()).trim();
  } catch {
    return '';
  }
}

async function readSurfaceQuestion(page) {
  if (await page.getByTestId('ai-pm-simple-question').isVisible().catch(() => false)) {
    return textOrEmpty(page, 'simple-question-text');
  }
  if (await page.getByTestId('ai-pm-focused-surface').isVisible().catch(() => false)) {
    const prompt = page.getByTestId('focused-confirm-prompt');
    const line = prompt.locator('p.font-medium').last();
    if (await line.isVisible().catch(() => false)) return (await line.innerText()).trim();
    const raw = (await prompt.innerText()).trim();
    return raw.split('\n').pop()?.trim() ?? raw;
  }
  if (await page.getByTestId('ceo-surface-next-question').isVisible().catch(() => false)) {
    const raw = (await page.getByTestId('ceo-surface-next-question').innerText()).trim();
    return raw.replace(/^다음\s*질문\s*/i, '').trim();
  }
  const legacy = await textOrEmpty(page, 'surface-question');
  if (legacy) return legacy;
  const body = await page.locator('body').innerText();
  return (
    body.match(/지금 확인할 것[\s\S]{0,160}\n\n([^\n?]{10,260}\?)/)?.[1]?.trim() ||
    body.match(/(\d+번째 질문[\s\S]{0,100}\n\n[^\n?]{10,260}\?)/)?.[1]?.trim() ||
    ''
  );
}

async function dismissWhyOrMidOrConflict(page) {
  const why = page.getByTestId('why-follow-up-panel');
  if (await why.isVisible({ timeout: 800 }).catch(() => false)) {
    report.steps.whyPanel = 'SEEN';
    const btn = why.getByRole('button').first();
    if (await btn.isVisible().catch(() => false)) await btn.click({ force: true });
    await page.waitForTimeout(700);
  }
  const mid = page.getByTestId('mid-judgment-panel');
  if (await mid.isVisible({ timeout: 800 }).catch(() => false)) {
    report.steps.midJudgment = 'PASS';
    report.excerpts.judgment = await mid.innerText();
    const back = mid.getByRole('button', { name: /돌아가기|계속/i }).first();
    if (await back.isVisible().catch(() => false)) await back.click({ force: true });
    await page.waitForTimeout(700);
  }
  if (await page.getByTestId('contradiction-confirm').isVisible().catch(() => false)) {
    report.steps.contradiction = 'SEEN';
    await page.getByRole('button', { name: /새 답변이 맞아요/i }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(800);
  }
}

async function dismissRecognition(page) {
  await dismissWhyOrMidOrConflict(page);
  for (let i = 0; i < 4; i++) {
    const cont = page.getByRole('button', {
      name: /같이 확인하기|계속하기|이어서|부족한 부분만|Answer the gaps|Let's check together/i,
    });
    if (await cont.first().isVisible({ timeout: 1_200 }).catch(() => false)) {
      await cont.first().click({ force: true });
      await page.waitForTimeout(900);
      continue;
    }
    break;
  }
}

async function waitForThinking(page) {
  const thinking = page.getByTestId('ai-pm-thinking-stages');
  if (await thinking.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await thinking.waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => null);
  }
}

async function advanceToOpenAnswerSurface(page, maxConfirms = 5) {
  for (let i = 0; i < maxConfirms; i += 1) {
    await dismissRecognition(page);
    const textarea = page.locator('textarea').last();
    if (await textarea.isVisible({ timeout: 1_500 }).catch(() => false)) return true;

    const together = page.getByRole('button', { name: /^🤝 하나씩 확인하겠습니다$|^하나씩 확인/i });
    if (await together.first().isVisible({ timeout: 800 }).catch(() => false)) {
      await together.first().click({ force: true });
      await page.waitForTimeout(1_500);
      await waitForThinking(page);
      continue;
    }

    const yes = page.getByTestId('confirm-yes-cta');
    if (await yes.isVisible({ timeout: 1_200 }).catch(() => false)) {
      const beforeQ = await readSurfaceQuestion(page);
      await yes.click({ force: true });
      await page.waitForTimeout(900);
      await waitForThinking(page);
      const afterQ = await readSurfaceQuestion(page);
      if (afterQ !== beforeQ) continue;
      if (await textarea.isVisible({ timeout: 1_500 }).catch(() => false)) return true;
      continue;
    }

    const plainYes = page.getByRole('button', {
      name: /^(✓\s*)?(맞습니다|That's right)(?!\s*—\s*start analysis)/i,
    });
    if (await plainYes.first().isVisible({ timeout: 800 }).catch(() => false)) {
      await plainYes.first().click({ force: true });
      await page.waitForTimeout(1_200);
      await waitForThinking(page);
      continue;
    }
    break;
  }
  return page.locator('textarea').last().isVisible({ timeout: 2_000 }).catch(() => false);
}

function pickAnswer(q, i) {
  if (/맞나요|맞습니까/.test(q)) return '네, 맞습니다.';
  if (/어느 쪽이 맞나요/.test(q)) return /B\)/.test(q) ? 'B' : 'A';
  if (/불편|문제|니즈|어려|핵심\s*불편/.test(q)) return QA_BANK[1];
  if (/필요로 하는 사람|고객|누구|대상|사용하는지|타깃|타겟/.test(q)) {
    return '소규모 양조장(영세 양조장) 운영자입니다.';
  }
  if (/좋아지|달라지|변화|실수|불편\s*중/.test(q)) {
    return '홍보·SNS 관리 시간이 줄고, 온라인 노출 실수(누락)가 줄어듭니다.';
  }
  if (/수익|지불|비용|모델|결제/.test(q)) return QA_BANK[2];
  if (/경쟁|대안/.test(q)) return QA_BANK[3];
  if (/차별/.test(q)) return QA_BANK[4];
  if (/시장|규모/.test(q)) return QA_BANK[5];
  if (/검증|측정|확인 계획/.test(q)) return QA_BANK[6];
  if (/리스크/.test(q)) return QA_BANK[7];
  if (/MVP|범위|범위를/.test(q)) return QA_BANK[8];
  for (const a of QA_BANK) {
    if (!usedAnswers.has(a)) return a;
  }
  return QA_BANK[i % QA_BANK.length];
}

async function submitAnswer(page, answer) {
  await dismissRecognition(page);
  const box = page.locator('textarea').last();
  if (!(await box.isVisible({ timeout: 6_000 }).catch(() => false))) return false;
  await box.fill(answer);
  const submit = page.getByTestId('submit-answer-cta');
  if (await submit.isEnabled({ timeout: 4_000 }).catch(() => false)) {
    await submit.click({ force: true });
  } else {
    const alt = page.getByRole('button', { name: /답변 반영하기|답변 보내기/i }).first();
    if (!(await alt.isVisible().catch(() => false))) return false;
    await alt.click({ force: true });
  }
  await waitForThinking(page);
  await page.waitForTimeout(1_200);
  meaningfulAnswers += 1;
  usedAnswers.add(answer);
  return true;
}

function headerUnderstanding(body) {
  return body.match(/지금까지 AI가 이해한 내용—([^\n]+)/)?.[1]?.trim() ?? '';
}

function assess() {
  const c = report.checkpoints;
  const init = report.initialDraft;
  c.customerInDraft = /소규모\s*양조장/.test(init.customer ?? '');
  c.needInDraft = /니즈|홍보플랫폼/.test(init.problem ?? '');

  const headers = report.headerSnapshots.map((h) => h.text).join('\n');
  c.context_maintained_in_header =
    /소규모\s*양조장/.test(headers) && /영세 양조장|홍보 SaaS/.test(headers);

  const qs = report.qaTurns.map((t) => t.question.trim()).filter((q) => q.length > 16);
  c.qa_no_exact_repeat = qs.length <= 1 || new Set(qs).size === qs.length;
  c.qa_turns_recorded = report.qaTurns.filter((t) => t.answer).length;

  const body = report.excerpts.bodyTail ?? '';
  c.judgment_reached =
    report.steps.midJudgment === 'PASS' ||
    report.steps.currentJudgment === 'PASS' ||
    /AI의 현재 판단|current-judgment|mid-judgment/i.test(body) ||
    Boolean(report.excerpts.judgment?.trim());

  c.final_review_reached =
    report.steps.finalUnderstanding === 'PASS' || report.steps.conversationalFinal === 'PASS';

  const final = report.excerpts.finalReview ?? '';
  c.final_has_brewery_context = /양조장|홍보|SaaS/.test(final + body);
  c.final_no_fabricated_tourism = !/관광|FIT 외국인|서울\s*맞춤\s*투어/.test(final + headers + body);

  c.slot_corruption_customer_as_problem =
    /고객[\s\S]{0,120}온라인 홍보 방법과 인력이 부족/.test(body) &&
    !/문제[\s\S]{0,80}온라인 홍보 방법과 인력이 부족/.test(body);

  c.customer_preserved_in_judgment =
    /소규모\s*양조장/.test(body) &&
    !/고객[\s\S]{0,40}아직\s*모름[\s\S]{0,200}PRIMARY:/.test(body.replace(/\n/g, ' '));

  c.problem_pain_merged = /PRIMARY:.*(?:부족|어렵|홍보)/.test(body);

  const discomfortQs = qs.filter((q) => /불편/.test(q) && !/맞나요/.test(q));
  c.no_repeat_discomfort_gap =
    discomfortQs.length <= 1 || new Set(discomfortQs).size === discomfortQs.length;

  c.judgment_grounds_in_context = /양조장|홍보|SaaS|니즈/.test(report.excerpts.judgment ?? body);

  if (c.final_review_reached && c.final_has_brewery_context && c.context_maintained_in_header && !c.slot_corruption_customer_as_problem) {
    report.p0_2c = 'PASS_CANDIDATE';
  } else if (c.qa_turns_recorded >= 4 && c.context_maintained_in_header && !c.final_review_reached) {
    report.p0_2c = c.slot_corruption_customer_as_problem ? 'FAIL_SLOT_CORRUPTION' : 'PARTIAL_QA_NO_FINAL';
  } else if (c.slot_corruption_customer_as_problem) {
    report.p0_2c = 'FAIL_SLOT_CORRUPTION';
  } else {
    report.p0_2c = 'FAIL_INCOMPLETE';
  }
}

fs.mkdirSync(path.join(EVIDENCE, 'screenshots'), { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript(() => {
  localStorage.setItem(
    'launchlens_analytics_consent',
    JSON.stringify({ analytics: true, updatedAt: new Date().toISOString() }),
  );
});
const page = await context.newPage();

try {
  report.productionSha = (await (await page.request.get(`${BASE}/api/build-info`)).json())?.data?.commit ?? '';

  await page.goto(`${BASE}/demo/start?fresh=1`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await dismissCookies(page);
  await page.getByRole('button', { name: /내 사업 문서로 체험하기/i }).click();
  await page.locator('textarea').first().fill(CEO_DOC);
  await page.getByRole('button', { name: /AI Read 시작/i }).click();
  await page.waitForURL(/\/workspace/, { timeout: 120_000 });
  if (!page.url().includes('fresh=1')) {
    await page.goto(`${page.url().split('?')[0]}?${page.url().includes('?') ? `${page.url().split('?')[1]}&` : ''}fresh=1`, {
      waitUntil: 'domcontentloaded',
    }).catch(() => {});
  }
  await dismissCookies(page);

  await page.getByTestId('document-first-card').waitFor({ state: 'visible', timeout: 90_000 });
  report.initialDraft = {
    business: await readDraftField(page, '사업'),
    customer: await readDraftField(page, '고객'),
    problem: await readDraftField(page, '문제'),
  };
  await page.screenshot({ path: path.join(EVIDENCE, 'screenshots', '01-document-first.png'), fullPage: true });

  const docYes = page.getByTestId('document-first-card').getByRole('button', { name: /^✓ 맞습니다$/i });
  await docYes.scrollIntoViewIfNeeded();
  await docYes.click({ force: true });
  await page.getByTestId('document-first-card').waitFor({ state: 'hidden', timeout: 45_000 });
  report.steps.documentConfirm = 'PASS';
  await waitForThinking(page);

  await advanceToOpenAnswerSurface(page, 6);
  report.steps.openAnswerSurface = await page.locator('textarea').last().isVisible().catch(() => false);

  for (let i = 0; i < MAX_ITER && meaningfulAnswers < MAX_MEANINGFUL; i++) {
    await dismissRecognition(page);

    if (await page.getByTestId('final-understanding-confirm').isVisible().catch(() => false)) {
      report.steps.finalUnderstanding = 'PASS';
      report.excerpts.finalReview = await page.getByTestId('final-understanding-confirm').innerText();
      break;
    }
    if (await page.getByTestId('conversational-final-output').isVisible().catch(() => false)) {
      report.steps.conversationalFinal = 'PASS';
      report.excerpts.finalReview = await page.getByTestId('conversational-final-output').innerText();
      break;
    }

    if (await page.getByTestId('current-judgment-block').isVisible().catch(() => false)) {
      report.steps.currentJudgment = 'PASS';
      report.excerpts.judgment = await page.getByTestId('current-judgment-block').innerText();
    }

    const body = await page.locator('body').innerText();
    if (i % 3 === 0) report.headerSnapshots.push({ iter: i, text: headerUnderstanding(body) });

    const q = await readSurfaceQuestion(page);
    if (q && q.length > 12) {
      const last = report.qaTurns[report.qaTurns.length - 1];
      if (!last || last.question !== q) {
        report.qaTurns.push({ turn: report.qaTurns.length + 1, question: q });
      }
    }

    const supplement = page.getByRole('button', { name: /이 부분 보완하기/i }).first();
    if (!(await page.locator('textarea').last().isVisible().catch(() => false))) {
      if (await supplement.isVisible().catch(() => false)) {
        await supplement.click({ force: true });
        await page.waitForTimeout(1_500);
        report.observations.push(`supplement click iter ${i}`);
      }
    }

    if (/맞나요|맞습니까/.test(q || '')) {
      let confirmed = false;
      for (const yes of [
        page.getByTestId('confirm-yes-cta'),
        page.getByRole('button', { name: /^✓?\s*맞습니다$/i }),
        page.getByRole('button', { name: /^네,?\s*맞습니다/i }),
      ]) {
        if (await yes.first().isVisible().catch(() => false)) {
          await yes.first().click({ force: true });
          await waitForThinking(page);
          await page.waitForTimeout(2_000);
          report.steps.confirmMicroTurn = 'PASS';
          confirmed = true;
          break;
        }
      }
      if (confirmed) continue;
    }

    const boxVisible = await page.locator('textarea').last().isVisible().catch(() => false);
    if (boxVisible && /맞나요|맞습니까/.test(q || '')) {
      await page.locator('textarea').last().fill('네, 맞습니다.');
      const submit = page.getByTestId('submit-answer-cta');
      if (await submit.isEnabled().catch(() => false)) {
        await submit.click({ force: true });
        await waitForThinking(page);
        continue;
      }
    }
    if (boxVisible) {
      const answer = pickAnswer(q || body.slice(0, 600), i);
      const turn = report.qaTurns[report.qaTurns.length - 1];
      if (turn && !turn.answer) turn.answer = answer;
      const ok = await submitAnswer(page, answer);
      if (!ok) report.observations.push(`submit failed iter ${i}`);
      if (i % 4 === 3) {
        await page.screenshot({
          path: path.join(EVIDENCE, 'screenshots', `02-qa-${String(i + 1).padStart(2, '0')}.png`),
          fullPage: true,
        });
      }
      continue;
    }

    const advanced = await advanceToOpenAnswerSurface(page, 2);
    if (!advanced) {
      const aiPm = page.getByRole('button', { name: /^AI PM$/i }).first();
      if (await aiPm.isVisible().catch(() => false)) {
        await aiPm.click({ force: true }).catch(() => {});
        await page.waitForTimeout(800);
      }
    }

    const startAnalysis = page.getByRole('button', {
      name: /✓ 맞습니다 — 분석 시작|That's right — start analysis/i,
    });
    if (await startAnalysis.first().isVisible().catch(() => false)) {
      const disabled = await startAnalysis.first().isDisabled().catch(() => true);
      if (!disabled) {
        report.steps.analysisStartCta = 'ENABLED';
        report.excerpts.finalReview = body;
        break;
      }
    }

    await page.waitForTimeout(1_200);
  }

  if (report.steps.finalUnderstanding === 'PASS' || report.steps.conversationalFinal === 'PASS') {
    await page.screenshot({ path: path.join(EVIDENCE, 'screenshots', '03-final-review.png'), fullPage: true });
  } else {
    await page.screenshot({ path: path.join(EVIDENCE, 'screenshots', '03-loop-end.png'), fullPage: true });
  }

  report.excerpts.bodyTail = (await page.locator('body').innerText()).slice(-5000);
  report.steps.demo500 = /500|Something went wrong/i.test(await page.locator('body').innerText());
  report.steps.meaningfulAnswers = meaningfulAnswers;
} catch (e) {
  report.error = e instanceof Error ? e.message : String(e);
} finally {
  await browser.close();
}

assess();

fs.writeFileSync(path.join(EVIDENCE, 'result.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(
  path.join(EVIDENCE, 'REPORT.md'),
  [
    '# P0-2C Judgment / Final Review — Production',
    '',
    `| Production SHA | \`${report.productionSha}\` |`,
    `| Verdict | **${report.p0_2c}** |`,
    `| Meaningful Q&A answers | ${report.steps.meaningfulAnswers ?? 0} |`,
    '',
    '## Initial draft (CEO doc)',
    '',
    '```json',
    JSON.stringify(report.initialDraft, null, 2),
    '```',
    '',
    '## Checkpoints',
    '',
    ...Object.entries(report.checkpoints).map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Steps',
    '',
    ...Object.entries(report.steps).map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Header understanding (sample)',
    '',
    report.headerSnapshots.map((h) => `- iter ${h.iter}: ${h.text}`).join('\n') || '_none_',
    '',
    '## Q&A',
    '',
    report.qaTurns
      .map((t) => `- Q${t.turn}: ${t.question?.slice(0, 120)} → ${t.answer?.slice(0, 100) ?? '(no answer)'}`)
      .join('\n') || '_none_',
    '',
    '## Judgment excerpt',
    '',
    report.excerpts.judgment?.slice(0, 1500) ?? '_not reached_',
    '',
    '## Final Review excerpt',
    '',
    report.excerpts.finalReview?.slice(0, 3000) ?? '_not reached_',
    '',
    '## Observations',
    '',
    report.observations.join('\n') || '_none_',
  ].join('\n'),
);

console.log(
  JSON.stringify(
    {
      p0_2c: report.p0_2c,
      productionSha: report.productionSha,
      steps: report.steps,
      checkpoints: report.checkpoints,
      qaTurns: report.qaTurns.length,
    },
    null,
    2,
  ),
);
