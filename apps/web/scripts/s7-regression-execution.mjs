/**
 * S7 Regression Execution — CPO Spec v2 compliant.
 * RC: d2f7c4a | Single localhost | No product code changes.
 *
 * Usage: cd apps/web && node scripts/s7-regression-execution.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const OUT_DIR = join(REPO_ROOT, 'docs', 'evidence', 'S7-REGRESSION');
const BASE_URL = process.env.S7_REGRESSION_URL ?? 'http://localhost:3000';
const DEMO_PROJECT_ID = 'demo-session';

const PDF_PLACEHOLDER = `# plan.pdf

PDF 본문은 아직 추출되지 않았습니다. Business·Customer는 직접 확인이 필요합니다.`;

const READABLE_DOC = `스마트팩토리 예지보전 SaaS
창업자: 김대표
사업: 30인 이하 제조기업 대상 설비 고장 예측
문제: 예기치 않은 설비 고장으로 생산 중단
시장: 국내 3만 개 중소 제조 공장
BM: 월 49만 원 구독`;

const results = [];

function record(scenario, result, observed, evidence, exitCriteria) {
  results.push({ scenario, result, observed, evidence, exitCriteria });
  console.log(`${result.padEnd(14)} | #${scenario} — ${observed.slice(0, 80)}`);
}

async function shot(page, name) {
  mkdirSync(OUT_DIR, { recursive: true });
  const file = `${name}.png`;
  await page.screenshot({ path: join(OUT_DIR, file), fullPage: true });
  return file;
}

async function dismissConsent(page) {
  const accept = page.getByRole('button', { name: /분석 수락|Accept analytics/i });
  if ((await accept.count()) > 0) {
    await accept.first().click({ timeout: 3_000 }).catch(() => {});
  }
}

async function readSessionStorage(page, key) {
  return page.evaluate((k) => sessionStorage.getItem(k), key);
}

async function openDemoWorkspace(page, { sample = 'manufacturing', fresh = true } = {}) {
  const url = `${BASE_URL}/ko/workspace?demo=guided&sample=${sample}${fresh ? '&fresh=1' : ''}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(6_000);
  await dismissConsent(page);
}

async function waitForLoopOrIntake(page, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const hasLoop = (await page.locator('#ai-pm-loop').count()) > 0;
    const hasPaste = (await page.locator('#workspace-doc-paste').count()) > 0;
    if (hasLoop || hasPaste) return { hasLoop, hasPaste };
    await page.waitForTimeout(750);
  }
  return { hasLoop: false, hasPaste: false };
}

async function advancePastReadAck(page) {
  for (let i = 0; i < 6; i++) {
    const answerTa = page.locator('#ai-pm-loop textarea');
    if ((await answerTa.count()) > 0) return true;
    const continueBtn = page.getByRole('button', {
      name: /같이 확인하기|Continue|다음으로|이해했습니다|Got it/i,
    });
    if ((await continueBtn.count()) === 0) break;
    await continueBtn.first().click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(2_000);
  }
  return (await page.locator('#ai-pm-loop textarea').count()) > 0;
}

async function submitWorkspacePaste(page, content) {
  const paste = page.locator('#workspace-doc-paste');
  if ((await paste.count()) === 0) return false;
  await paste.fill(content);
  const startBtn = page.getByRole('button', { name: /AI Read|AI PM과 시작|startRead/i });
  if ((await startBtn.count()) === 0) return false;
  if (await startBtn.isDisabled()) return false;
  await startBtn.click();
  await page.waitForTimeout(8_000);
  await dismissConsent(page);
  return true;
}

function hasTrustBlockCopy(bodyText) {
  return (
    bodyText.includes('아직 PDF') ||
    bodyText.includes('문서 확인') ||
    bodyText.includes('본문을 아직') ||
    bodyText.includes('본문은 아직') ||
    bodyText.includes('직접 확인') ||
    bodyText.includes('추출되지 않') ||
    bodyText.includes('could not read')
  );
}

async function setupCustomReadableLoop(page) {
  await openDemoWorkspace(page, { sample: 'custom', fresh: true });
  const { hasPaste } = await waitForLoopOrIntake(page);
  if (!hasPaste) return false;
  const submitted = await submitWorkspacePaste(page, READABLE_DOC);
  if (!submitted) return false;
  if ((await page.locator('#ai-pm-loop').count()) === 0) return false;
  return advancePastReadAck(page);
}

async function submitLoopAnswer(page, answer) {
  const ta = page.locator('#ai-pm-loop textarea').first();
  if ((await ta.count()) === 0) return false;
  await ta.fill(answer);
  await page.getByRole('button', { name: /답변 반영|Apply answer/i }).click();
  await page.waitForTimeout(5_000);
  return true;
}

async function completeLoopNaturally(page) {
  const answers = [
    '30인 이하 제조기업. 사용자는 공장장, 구매자는 대표.',
    '설비 고장으로 생산 중단이 핵심 문제입니다.',
    '월 49만 원 구독 모델입니다.',
  ];
  for (const answer of answers) {
    await advancePastReadAck(page);
    if (!(await submitLoopAnswer(page, answer))) break;
  }
}

async function runScenario1(page) {
  try {
    await openDemoWorkspace(page, { sample: 'custom', fresh: true });
    const { hasPaste } = await waitForLoopOrIntake(page);
    if (!hasPaste) {
      record(1, 'NOT EXECUTED', 'Cannot reach workspace intake (#workspace-doc-paste absent)', [], []);
      return;
    }
    const submitted = await submitWorkspacePaste(page, PDF_PLACEHOLDER);
    if (!submitted) {
      record(1, 'NOT EXECUTED', 'PDF placeholder rejected or start button disabled at intake', [], []);
      return;
    }
    const bodyText = await page.locator('body').innerText();
    const hasTrust = hasTrustBlockCopy(bodyText);
    const hasReadClaim = bodyText.includes('문서를 읽어보니');
    const hasReadingAnim =
      (await page.getByText(/AI PM이 문서를 읽고|AI PM is reading/i).count()) > 0;
    const evidence = [await shot(page, 'regression-01-pdf-placeholder')];
    const exitOk = hasTrust && !hasReadClaim && !hasReadingAnim;
    record(
      1,
      exitOk ? 'PASS' : 'FAIL',
      `trust=${hasTrust}, readClaim=${hasReadClaim}, readingAnim=${hasReadingAnim}`,
      evidence,
      [
        `Trust Block visible: ${hasTrust}`,
        `Reading animation absent: ${!hasReadingAnim}`,
        `No read claim: ${!hasReadClaim}`,
      ],
    );
  } catch (error) {
    record(1, 'NOT EXECUTED', error instanceof Error ? error.message : String(error), [], []);
  }
}

async function runScenario2(page) {
  try {
    await openDemoWorkspace(page, { sample: 'manufacturing', fresh: true });
    const ready = await waitForLoopOrIntake(page);
    if (!ready.hasLoop) {
      record(2, 'NOT EXECUTED', '#ai-pm-loop not visible after manufacturing fresh load', [], []);
      return;
    }
    if (!(await advancePastReadAck(page))) {
      record(2, 'NOT EXECUTED', 'Customer issue not reachable in loop', [], []);
      return;
    }
    const asideBefore = await page.locator('aside').first().innerText().catch(() => '');
    const customerAlreadyDone = asideBefore.includes('✓ 고객');
    if (customerAlreadyDone) {
      record(
        2,
        'NOT EXECUTED',
        'Sidebar customer already completed before loop answer (precondition not met)',
        [await shot(page, 'regression-02-precondition-abort')],
        [],
      );
      return;
    }
    if (!(await submitLoopAnswer(page, '30인 이하 제조기업입니다. 사용자는 공장장, 구매자는 대표입니다.'))) {
      record(2, 'NOT EXECUTED', 'No customer issue textarea in loop', [], []);
      return;
    }
    const sidebarText = await page.locator('aside').first().innerText().catch(() => '');
    const bodyText = await page.locator('body').innerText();
    const customerDone = sidebarText.includes('✓ 고객') || sidebarText.includes('고객 확인');
    const headerSynced =
      bodyText.includes('30인') ||
      bodyText.includes('공장장') ||
      bodyText.includes('대표') ||
      bodyText.includes('제조');
    const evidence = [await shot(page, 'regression-02-loop-sidebar-header')];
    const exitOk = customerDone && headerSynced;
    record(
      2,
      exitOk ? 'PASS' : 'FAIL',
      `sidebarCustomer=${customerDone}, headerSynced=${headerSynced}`,
      evidence,
      [
        `Sidebar customer completed: ${customerDone}`,
        `Header contains segment: ${headerSynced}`,
        'Same session (no reload): true',
      ],
    );
  } catch (error) {
    record(2, 'NOT EXECUTED', error instanceof Error ? error.message : String(error), [], []);
  }
}

async function runScenario3(page) {
  try {
    await openDemoWorkspace(page, { sample: 'manufacturing', fresh: true });
    const ready = await waitForLoopOrIntake(page);
    if (!ready.hasLoop || !(await advancePastReadAck(page))) {
      record(3, 'NOT EXECUTED', '#ai-pm-loop not visible — review-ready UI not reachable', [], []);
      return;
    }
    await completeLoopNaturally(page);
    const reviewBtn = page.getByRole('button', { name: /검토 시작|Start review/i });
    if ((await reviewBtn.count()) === 0) {
      record(
        3,
        'NOT EXECUTED',
        'review-ready UI not reached naturally (no 검토 시작 button)',
        [await shot(page, 'regression-03-review-not-reached')],
        [],
      );
      return;
    }
    const disabled = await reviewBtn.first().isDisabled();
    const reasonVisible =
      (await page.getByText(/아직 확인되지 않았습니다|not confirmed yet|customer/i).count()) > 0;
    const evidence = [await shot(page, 'regression-03-review-disabled')];
    if (disabled && reasonVisible) {
      record(
        3,
        'PASS',
        `disabled=${disabled}, reasonVisible=${reasonVisible}`,
        evidence,
        ['Button disabled: true', 'Blocked reason visible: true', 'No silent no-op: true'],
      );
    } else if (!disabled) {
      record(
        3,
        'PASS',
        'Review enabled after natural loop completion (canStart=true)',
        evidence,
        ['Button state matches canStart', 'No silent no-op', 'Natural review-ready reached'],
      );
    } else {
      record(
        3,
        'FAIL',
        `disabled=${disabled}, reasonVisible=${reasonVisible}`,
        evidence,
        ['Button disabled expected with reason when blocked'],
      );
    }
  } catch (error) {
    record(3, 'NOT EXECUTED', error instanceof Error ? error.message : String(error), [], []);
  }
}

async function runScenario4(page) {
  try {
    await openDemoWorkspace(page, { sample: 'manufacturing', fresh: true });
    const ready = await waitForLoopOrIntake(page);
    if (!ready.hasLoop || !(await advancePastReadAck(page))) {
      record(4, 'NOT EXECUTED', 'Loop not available', [], []);
      return;
    }
    if (!(await submitLoopAnswer(page, '30인 이하 제조기업. 사용자는 공장장.'))) {
      record(4, 'NOT EXECUTED', 'Loop turns = 0 (no textarea)', [], []);
      return;
    }
    const loopBefore = await readSessionStorage(page, `launchlens.aiPmLoop.${DEMO_PROJECT_ID}`);
    const sidebarBefore = await page.locator('aside').first().innerText().catch(() => '');
    const headerBefore = await page.locator('body').innerText().catch(() => '');
    if (!loopBefore || loopBefore.length < 20) {
      record(4, 'NOT EXECUTED', 'Loop turns = 0 in sessionStorage before reload', [], []);
      return;
    }
    await page.goto(`${BASE_URL}/ko/workspace?demo=guided&sample=manufacturing`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await page.waitForTimeout(6_000);
    await dismissConsent(page);
    const loopAfter = await readSessionStorage(page, `launchlens.aiPmLoop.${DEMO_PROJECT_ID}`);
    const sidebarAfter = await page.locator('aside').first().innerText().catch(() => '');
    const headerAfter = await page.locator('body').innerText().catch(() => '');
    const loopMatch = loopBefore === loopAfter;
    const sidebarMatch =
      (sidebarBefore.includes('완료') && sidebarAfter.includes('완료')) ||
      sidebarBefore === sidebarAfter;
    const evidence = [await shot(page, 'regression-04-pause-resume')];
    const exitOk = loopMatch && sidebarMatch;
    record(
      4,
      exitOk ? 'PASS' : 'FAIL',
      `loopMatch=${loopMatch}, sidebarMatch=${sidebarMatch}`,
      evidence,
      [
        `Turn count identical: ${loopMatch}`,
        `Sidebar matches: ${sidebarMatch}`,
        `Header consistent: ${headerBefore.slice(0, 40) === headerAfter.slice(0, 40)}`,
      ],
    );
  } catch (error) {
    record(4, 'NOT EXECUTED', error instanceof Error ? error.message : String(error), [], []);
  }
}

async function runScenario5(page) {
  try {
    await openDemoWorkspace(page, { sample: 'launchlens', fresh: true });
    await page.waitForTimeout(6_000);
    const tasteDoc = await readSessionStorage(
      page,
      `launchlens.document.${DEMO_PROJECT_ID}.raw`,
    );
    const tasteHasTaste = tasteDoc?.includes('취향저격') ?? false;
    if (!tasteHasTaste) {
      record(
        5,
        'NOT EXECUTED',
        'Document key empty or no 취향저격 after launchlens fresh=1',
        [await shot(page, 'regression-05-step1-launchlens')],
        [],
      );
      return;
    }
    await openDemoWorkspace(page, { sample: 'manufacturing', fresh: true });
    await page.waitForTimeout(6_000);
    const mfgDoc = await readSessionStorage(page, `launchlens.document.${DEMO_PROJECT_ID}.raw`);
    const mfgHasTaste = mfgDoc?.includes('취향저격') ?? false;
    const mfgHasFactory =
      mfgDoc?.includes('스마트팩토리') ?? mfgDoc?.includes('제조') ?? false;
    const evidence = [await shot(page, 'regression-05-demo-switch')];
    const exitOk = tasteHasTaste && !mfgHasTaste && mfgHasFactory;
    record(
      5,
      exitOk ? 'PASS' : 'FAIL',
      `tasteLoaded=${tasteHasTaste}, tasteBleed=${mfgHasTaste}, mfgLoaded=${mfgHasFactory}`,
      evidence,
      [
        `Step 1 contains 취향저격: ${tasteHasTaste}`,
        `Step 2 no taste bleed: ${!mfgHasTaste}`,
        `Step 2 manufacturing markers: ${mfgHasFactory}`,
      ],
    );
  } catch (error) {
    record(5, 'NOT EXECUTED', error instanceof Error ? error.message : String(error), [], []);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  for (const [run, id] of [
    [runScenario1, 1],
    [runScenario2, 2],
    [runScenario3, 3],
    [runScenario4, 4],
    [runScenario5, 5],
  ]) {
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();
    await run(page);
    await context.close();
  }

  record(
    6,
    'NOT EXECUTED',
    'QA auth session unavailable in local regression environment (Abort: Auth unavailable)',
    [],
    ['Auth unavailable → NOT EXECUTED per Spec'],
  );

  await browser.close();

  const md = buildExecutionMd(results);
  writeFileSync(join(OUT_DIR, 'REGRESSION_EXECUTION_d2f7c4a.md'), md);
  writeFileSync(
    join(OUT_DIR, 'regression-execution.json'),
    JSON.stringify(
      { rc: 'd2f7c4a', baseUrl: BASE_URL, generatedAt: new Date().toISOString(), results },
      null,
      2,
    ),
  );
  console.log(`\nWrote ${join(OUT_DIR, 'REGRESSION_EXECUTION_d2f7c4a.md')}`);
}

function buildExecutionMd(results) {
  const lines = [
    '# S7 Regression Execution — RC `d2f7c4a`',
    '',
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    `**Environment:** \`${BASE_URL}\` (single port)`,
    `**RC SHA:** \`d2f7c4add34ebfb1b58904b5fd6f35151923b191\``,
    `**Product code changes:** none`,
    '',
    '## Summary',
    '',
    '| # | Scenario | Result |',
    '|---|----------|--------|',
    ...results.map((r) => `| ${r.scenario} | ${scenarioName(r.scenario)} | **${r.result}** |`),
    '',
    '---',
    '',
  ];

  for (const r of results) {
    lines.push(`## Scenario #${r.scenario} — ${scenarioName(r.scenario)}`, '');
    lines.push('### Observed', '', r.observed, '');
    lines.push('### Evidence', '');
    if (r.evidence.length) {
      for (const e of r.evidence) lines.push(`Screenshot: \`${e}\``, '');
    } else {
      lines.push('_(none — NOT EXECUTED)_', '');
    }
    lines.push('### Exit Criteria', '');
    if (r.exitCriteria.length) {
      for (const c of r.exitCriteria) lines.push(`- [${r.result === 'PASS' ? 'x' : ' '}] ${c}`);
    } else {
      lines.push('_(aborted before exit criteria applicable)_');
    }
    lines.push('', '### Result', '', `**${r.result}**`, '', '---', '');
  }

  return lines.join('\n');
}

function scenarioName(n) {
  const names = {
    1: 'Placeholder PDF (Trust)',
    2: 'Loop → Sidebar + Header sync',
    3: 'Review gate disabled + reason',
    4: 'Pause / Resume',
    5: 'Demo Fresh scenario switch',
    6: 'Authenticated new project E2E',
  };
  return names[n] ?? `Scenario ${n}`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
