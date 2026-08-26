/**
 * Production Demo capture — P0 FIX batch verification.
 * Output: docs/evidence/ALABOM/conversation-validation/cpo-prod-journey-fix/
 *
 * From apps/web:
 *   $env:CI='1'; $env:PLAYWRIGHT_BASE_URL='https://ai-startup-validation-tau.vercel.app'
 *   pnpm exec playwright test e2e/_cpo-prod-journey-fix-capture.spec.ts --retries=0
 */
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/conversation-validation/cpo-prod-journey-fix',
);
const MEDIA = path.join(OUT, 'media');
const RAW_JSON = path.join(OUT, 'transcript-raw.json');
fs.mkdirSync(MEDIA, { recursive: true });

const SEED =
  '외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다.';

const BANK = {
  problem:
    '패키지 투어는 동선이 획일적이고, 혼자 계획하면 언어·시간 때문에 현지인 일상에 가까운 경험을 놓칩니다.',
  payer: '관광객이 앱에서 일정·체험을 결제합니다. 현지 가이드·소상공에게는 예약 수수료를 받습니다.',
  customer: '초기 타깃은 서울을 3~7일 방문하는 FIT 외국인(밀레니얼·MZ)입니다.',
  demand: '방한 외래객 회복과 맞춤 투어 문의가 늘고 있다는 제휴 가이드 피드백이 있습니다.',
  competitor: '클룩·트립닷컴·가이드 매칭 앱이 있지만 카탈로그형 상품 나열이라 맞춤이 약합니다.',
  differentiation: '관심사·동선·식사 제약까지 반영한 실시간 맞춤 일정과 현지인 동행을 한 번에 묶습니다.',
  midSummaryAsk: '지금까지 이해한 사업 정리해줘',
  whyChallenge: '왜 그게 중요하죠?',
  fallback: '서울 한정 관심사 기반 맞춤 반나절 체험을 먼저 검증하려 합니다.',
};

type TurnSnap = {
  turn: number;
  understanding: string;
  answerChange: string;
  gapChange: string;
  whyNow: string;
  question: string;
  targetGapNote: string;
};

const turns: TurnSnap[] = [];
let prevGaps = '';

function pickAnswer(q: string): string {
  if (/불편|문제/.test(q)) return BANK.problem;
  if (/지불|비용/.test(q)) return BANK.payer;
  if (/필요로 하는 사람|고객|누구/.test(q)) return BANK.customer;
  if (/수요|근거/.test(q)) return BANK.demand;
  if (/비슷한|경쟁|대안/.test(q)) return BANK.competitor;
  if (/차별/.test(q)) return BANK.differentiation;
  return BANK.fallback;
}

async function snap(page: Page, label: string) {
  const body = await page.locator('body').innerText();
  const qMatch = body.match(/이번 질문[\s\S]{0,200}/);
  const whyMatch = body.match(/왜 묻나요[\s\S]{0,120}/);
  const understanding = body.match(/지금까지 이해[\s\S]{0,300}/)?.[0]?.slice(0, 200) ?? '';
  const gaps = body.match(/GAPS|pending|확인되지/g)?.join('|') ?? '';
  const gapChange = gaps !== prevGaps ? `${prevGaps} → ${gaps}` : '(same)';
  prevGaps = gaps;
  turns.push({
    turn: turns.length + 1,
    understanding,
    answerChange: label,
    gapChange,
    whyNow: whyMatch?.[0]?.slice(0, 120) ?? '',
    question: qMatch?.[0]?.slice(0, 120) ?? '',
    targetGapNote: /지불|GO\/HOLD/.test(whyMatch?.[0] ?? '') && /고객|필요/.test(qMatch?.[0] ?? '')
      ? 'MISMATCH'
      : 'ok',
  });
  await page.screenshot({ path: path.join(MEDIA, `${String(turns.length).padStart(2, '0')}-${label}.png`), fullPage: true });
}

test('CPO prod journey fix capture', async ({ page }) => {
  test.setTimeout(600_000);
  await page.goto('/demo/start');
  await page.getByRole('button', { name: /내 사업 문서로 체험/i }).click();
  await page.locator('textarea').first().fill(SEED);
  await page.getByRole('button', { name: /시작|분석|다음/i }).first().click();
  await page.waitForTimeout(4000);
  await snap(page, 'after-seed');

  for (let i = 0; i < 12; i++) {
    const body = await page.locator('body').innerText();
    const qBlock = body.match(/이번 질문[\s\S]{0,300}/)?.[0] ?? '';
    if (!qBlock.trim()) break;
    const answer = pickAnswer(qBlock);
    const input = page.locator('textarea').last();
    if (!(await input.isVisible())) break;
    await input.fill(answer);
    await page.getByRole('button', { name: /보내|답|submit|전송/i }).first().click();
    await page.waitForTimeout(3500);
    await snap(page, `turn-${i + 1}`);
  }

  let prodSha = '';
  try {
    const res = await page.request.get('/api/build-info');
    const json = (await res.json()) as { commit?: string };
    prodSha = json.commit ?? '';
  } catch {
    prodSha = 'unknown';
  }

  fs.writeFileSync(
    RAW_JSON,
    JSON.stringify({ at: new Date().toISOString(), seed: SEED, productionCommit: prodSha, turns }, null, 2),
  );
  fs.writeFileSync(
    path.join(OUT, 'TRANSCRIPT.md'),
    [
      '# ALABOM cpo-prod-journey-fix TRANSCRIPT',
      '',
      `| Production commit | \`${prodSha}\` |`,
      `| Seed | ${SEED} |`,
      '',
      '| Turn | Understanding | Answer change | Gap change | Why-now | Question | Alignment |',
      '|------|---------------|---------------|------------|---------|----------|-----------|',
      ...turns.map(
        (t) =>
          `| ${t.turn} | ${t.understanding.slice(0, 40)} | ${t.answerChange} | ${t.gapChange.slice(0, 30)} | ${t.whyNow.slice(0, 40)} | ${t.question.slice(0, 40)} | ${t.targetGapNote} |`,
      ),
      '',
      '## CPO checkpoints',
      '',
      '- [ ] New business seed',
      '- [ ] Q order not fixed template',
      '- [ ] Customer/payer split',
      '- [ ] Competition',
      '- [ ] Nonsense (manual)',
      '- [ ] Edit (manual)',
      '- [ ] Conflict (manual)',
      '- [ ] Why (manual)',
      '- [ ] Mid judgment (manual)',
      '- [ ] Sufficiency',
      '- [ ] Final review',
      '- [ ] Identity same as seed',
    ].join('\n'),
  );

  expect(turns.length).toBeGreaterThan(3);
});
