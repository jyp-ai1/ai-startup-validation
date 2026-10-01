/**
 * Gate 1 — Production browser evidence (Sample A/B/C + My Business A/B + isolation).
 *
 * Usage (apps/web):
 *   node scripts/production-gate1-demo-browser.mjs
 *
 * Env:
 *   PRODUCTION_URL — default production app URL
 *   EXPECT_COMMIT — optional full or short SHA prefix to require before tests
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR =
  process.env.EVIDENCE_OUT_DIR ??
  join(__dirname, '../../../docs/evidence/ALABOM/GATE1-PRODUCTION');
const PRODUCTION_URL =
  process.env.PRODUCTION_URL ?? 'https://ai-startup-validation-tau.vercel.app';
const EXPECT_COMMIT_PREFIX =
  process.env.EXPECT_COMMIT ?? process.env.GATE1_COMMIT ?? 'e68e3cc';

const SMARTPM_MARKERS = ['스마트PM', '전략 검토가 회의마다 리셋'];

const MY_BUSINESS_A = `사업명: 동네장터알림 QA-A
직원 5명 이하 음식점 사장
SNS·네이버 플레이스 홍보 자동화
고객: 서울 소규모 F&B 사장
문제: 홍보 시간 부족, 이벤트 공지 누락
수익: 월 9.9만 원 구독`;

const MY_BUSINESS_B = `사업명: 핏브릿지 QA-B
D2C 의류 브랜드 PM
AI 사이즈·핏 추천 SaaS
고객: 연 매출 5~50억 D2C 브랜드
문제: 사이즈 반품 35%, 마진 악화
수익: SaaS 구독 + 성과 보너스`;

const SAMPLES = [
  {
    id: 'clinicflow',
    label: 'Sample A — 클리닉플로우',
    mustContain: ['클리닉', 'no-show', 'EMR'],
    mustNotContain: ['동네장터알림 QA', '핏브릿지 QA', ...SMARTPM_MARKERS],
    projectPrefix: 'demo-sample-clinicflow',
  },
  {
    id: 'local-sns',
    label: 'Sample B — 동네장터알림',
    mustContain: ['동네장터', 'F&B', 'SNS'],
    mustNotContain: ['클리닉플로우', '핏브릿지 QA', ...SMARTPM_MARKERS],
    projectPrefix: 'demo-sample-local-sns',
  },
  {
    id: 'fitbridge',
    label: 'Sample C — 핏브릿지',
    mustContain: ['핏브릿지', '반품', 'D2C'],
    mustNotContain: ['동네장터알림 QA', '클리닉플로우', ...SMARTPM_MARKERS],
    projectPrefix: 'demo-sample-fitbridge',
  },
];

const report = {
  productionUrl: PRODUCTION_URL,
  startedAt: new Date().toISOString(),
  health: null,
  shaEquality: { git: null, build: null, production: null, pass: false },
  samples: {},
  myBusiness: {},
  isolation: {},
  verdict: 'FAIL',
  notes: [],
};

async function fetchHealth() {
  const res = await fetch(`${PRODUCTION_URL}/api/health`);
  const json = await res.json();
  return json?.data ?? json;
}

function shaMatches(commit, prefix) {
  if (!commit || !prefix) return false;
  return commit.startsWith(prefix) || prefix.startsWith(commit.slice(0, 7));
}

async function waitForDeploy(maxMs = 600_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const health = await fetchHealth();
    report.health = health;
    if (shaMatches(health.commit, EXPECT_COMMIT_PREFIX)) {
      report.shaEquality.production = health.commit;
      return health;
    }
    console.log(`Waiting for deploy: production=${health.commit} want=${EXPECT_COMMIT_PREFIX}`);
    await new Promise((r) => setTimeout(r, 20_000));
  }
  throw new Error(`Deploy timeout: still on ${report.health?.commit}`);
}

async function storageDump(page) {
  return page.evaluate(() => {
    const session = {};
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (k) session[k] = sessionStorage.getItem(k)?.slice(0, 500) ?? '';
    }
    return session;
  });
}

function containsAny(text, needles) {
  const t = text ?? '';
  return needles.filter((n) => t.includes(n));
}

async function dismissCookieBanner(page) {
  const reject = page.getByRole('button', { name: /거부/i });
  if ((await reject.count()) > 0) {
    await reject.first().click({ timeout: 3000 }).catch(() => {});
  }
}

async function confirmUnderstandingIfVisible(page) {
  const btn = page.getByRole('button', { name: /맞습니다|맞아요|확인/i }).first();
  if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) {
    await btn.click({ timeout: 15_000 });
    await page.waitForTimeout(1500);
    return true;
  }
  return false;
}

async function readLoopQuestion(page, projectPrefix) {
  return page.evaluate((prefix) => {
    const key = Object.keys(sessionStorage).find((k) => k.includes(`aiPmLoop.${prefix}`));
    if (!key) return null;
    try {
      const loop = JSON.parse(sessionStorage.getItem(key) ?? '{}');
      return (
        loop?.lockedAskSurface?.questionText ??
        loop?.lastDecision?.questionText ??
        loop?.viewMode ??
        null
      );
    } catch {
      return null;
    }
  }, projectPrefix);
}

async function readFrameIndex(page, projectPrefix) {
  return page.evaluate((prefix) => {
    const key = `launchlens.demo.playback.${prefix}.frameIndex`;
    return sessionStorage.getItem(key);
  }, projectPrefix);
}

async function advancePlayback(page, projectPrefix, maxSteps = 14) {
  const frames = [];
  for (let i = 0; i < maxSteps; i += 1) {
    frames.push({
      frameIndex: await readFrameIndex(page, projectPrefix),
      surface: await readLoopQuestion(page, projectPrefix),
    });

    const nextBtn = page.getByTestId('demo-sample-playback-bar').getByRole('button', { name: /다음/i });
    if ((await nextBtn.count()) === 0) break;
    if (await nextBtn.isDisabled()) break;
    await nextBtn.click();
    await page.waitForTimeout(1500);
  }
  return frames;
}

async function runSample(browser, sample) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const result = { pass: false, errors: [], questions: [], storageKeys: [] };

  try {
    await page.goto(
      `${PRODUCTION_URL}/workspace?demo=guided&sample=${sample.id}&fresh=1`,
      { waitUntil: 'domcontentloaded', timeout: 90_000 },
    );

    await dismissCookieBanner(page);
    await page.waitForSelector('[data-testid="demo-sample-playback-bar"], textarea, [id="ai-pm-loop"]', {
      timeout: 180_000,
    });

    const storage = await storageDump(page);
    result.storageKeys = Object.keys(storage).filter((k) => k.includes('demo'));
    const blob = JSON.stringify(storage);
    const html = await page.content();
    const bad = containsAny(blob + html, sample.mustNotContain);
    if (bad.length) result.errors.push(`contamination: ${bad.join(', ')}`);
    const missing = sample.mustContain.filter((m) => !blob.includes(m) && !html.includes(m));
    if (missing.length) result.errors.push(`missing markers: ${missing.join(', ')}`);

    await confirmUnderstandingIfVisible(page);
    result.playbackFrames = await advancePlayback(page, sample.projectPrefix);

    const indices = result.playbackFrames
      .map((f) => Number.parseInt(String(f.frameIndex ?? '0'), 10))
      .filter((n) => Number.isFinite(n));
    const monotonic = indices.every((n, i) => i === 0 || n >= indices[i - 1]);
    if (!monotonic) result.errors.push(`frameIndex not monotonic: ${indices.join(',')}`);
    if (indices.length < 3) result.errors.push(`too few playback steps: ${indices.length}`);

    const finalText = await page.locator('body').innerText();
    if (!/판단|검토|Final|최종/i.test(finalText)) {
      result.errors.push('Judgment/Final Review surface not reached');
    }
    if (containsAny(finalText, SMARTPM_MARKERS).length) {
      result.errors.push('SmartPM visible in UI');
    }

    result.pass = result.errors.length === 0;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
  } finally {
    await context.close();
  }
  return result;
}

async function runMyBusiness(browser, label, doc, mustContain, mustNotContain) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const result = { pass: false, errors: [], previewSnippet: '' };

  try {
    await page.goto(`${PRODUCTION_URL}/demo/start`, { waitUntil: 'domcontentloaded' });
    await dismissCookieBanner(page);
    await page.getByRole('button', { name: /내 사업/i }).click();
    const docInput = page.getByTestId('demo-my-business-document');
    await docInput.waitFor({ state: 'visible', timeout: 45_000 });
    await docInput.fill(doc);
    await page.getByRole('button', { name: /AI Read/i }).click();
    await page.waitForURL(/sample=custom/, { timeout: 60_000 });
    await page.waitForTimeout(3000);

    const text = await page.locator('body').innerText();
    result.previewSnippet = text.slice(0, 1200);
    const storage = JSON.stringify(await storageDump(page));

    for (const m of mustContain) {
      if (!text.includes(m) && !storage.includes(m)) result.errors.push(`missing ${m}`);
    }
    for (const n of mustNotContain) {
      if (text.includes(n) || storage.includes(n)) result.errors.push(`forbidden ${n}`);
    }
    if (containsAny(text + storage, SMARTPM_MARKERS).length) {
      result.errors.push('SmartPM leak');
    }

    result.pass = result.errors.length === 0;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
  } finally {
    await context.close();
  }
  return result;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const health = await waitForDeploy();
  report.shaEquality.build = health.commit;
  report.shaEquality.git = EXPECT_COMMIT_PREFIX;

  const browser = await chromium.launch({ headless: true });

  for (const sample of SAMPLES) {
    console.log(`Running ${sample.label}...`);
    report.samples[sample.id] = await runSample(browser, sample);
  }

  report.myBusiness.a = await runMyBusiness(
    browser,
    'My Business A',
    MY_BUSINESS_A,
    ['동네장터', 'QA-A', 'F&B'],
    SMARTPM_MARKERS,
  );
  report.myBusiness.b = await runMyBusiness(
    browser,
    'My Business B',
    MY_BUSINESS_B,
    ['핏브릿지', 'QA-B', '반품'],
    SMARTPM_MARKERS,
  );

  if (report.myBusiness.a.previewSnippet && report.myBusiness.b.previewSnippet) {
    const overlap =
      report.myBusiness.a.previewSnippet.includes('QA-B') ||
      report.myBusiness.b.previewSnippet.includes('QA-A');
    report.isolation.myBusinessDistinct = !overlap;
    if (overlap) report.notes.push('My Business A/B preview text overlap');
  }

  const isoContext = await browser.newContext();
  const isoPage = await isoContext.newPage();
  try {
    await isoPage.goto(`${PRODUCTION_URL}/workspace?demo=guided&sample=clinicflow&fresh=1`, {
      waitUntil: 'domcontentloaded',
    });
    await isoPage.waitForTimeout(8000);
    const afterSample = await storageDump(isoPage);
    await isoPage.goto(`${PRODUCTION_URL}/demo/start`, { waitUntil: 'domcontentloaded' });
    await dismissCookieBanner(isoPage);
    await isoPage.getByRole('button', { name: /내 사업/i }).click();
    const isoDoc = isoPage.getByTestId('demo-my-business-document');
    await isoDoc.waitFor({ state: 'visible', timeout: 45_000 });
    await isoDoc.fill(MY_BUSINESS_A);
    await isoPage.getByRole('button', { name: /AI Read/i }).click();
    await isoPage.waitForURL(/sample=custom/, { timeout: 60_000 });
    await isoPage.waitForTimeout(5000);
    const afterMb = await storageDump(isoPage);
    const mbDocKey = Object.keys(afterMb).find(
      (k) => k.includes('document.') && k.includes('demo-my-'),
    );
    const mbDoc = mbDocKey ? afterMb[mbDocKey] : '';
    const mbLoopKey = Object.keys(afterMb).find(
      (k) => k.includes('aiPmLoop.demo-my-'),
    );
    const mbLoop = mbLoopKey ? afterMb[mbLoopKey] : '';
    report.isolation.sampleToMyBusiness = {
      mbDocContainsClinicSeed: /클리닉플로우|no-show 15/.test(mbDoc),
      mbDocContainsSmartPm: containsAny(mbDoc, SMARTPM_MARKERS).length > 0,
      mbLoopContainsClinicSeed: /클리닉플로우|demo-sample-clinicflow/.test(mbLoop),
      legacySampleKeysMayCoexist: Object.keys(afterMb).some((k) =>
        k.includes('demo-sample-clinicflow'),
      ),
      pass:
        !/클리닉플로우|no-show 15/.test(mbDoc) &&
        containsAny(mbDoc, SMARTPM_MARKERS).length === 0 &&
        !/클리닉플로우|demo-sample-clinicflow/.test(mbLoop),
    };
  } catch (e) {
    report.isolation.sampleToMyBusiness = {
      pass: false,
      error: e instanceof Error ? e.message : String(e),
    };
  } finally {
    await isoContext.close();
  }

  await browser.close();

  report.shaEquality.pass = shaMatches(report.shaEquality.production, report.shaEquality.git);
  const allSamples = SAMPLES.every((s) => report.samples[s.id]?.pass);
  const mb = report.myBusiness.a?.pass && report.myBusiness.b?.pass;
  const iso =
    report.isolation.myBusinessDistinct !== false &&
    report.isolation.sampleToMyBusiness?.pass !== false;
  report.verdict = allSamples && mb && iso && report.shaEquality.pass ? 'PASS' : 'FAIL';
  report.finishedAt = new Date().toISOString();

  writeFileSync(join(OUT_DIR, 'gate1-browser-result.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict, commit: report.shaEquality.production }, null, 2));
  process.exit(report.verdict === 'PASS' ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
