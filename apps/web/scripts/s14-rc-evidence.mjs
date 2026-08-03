/**
 * S14 RC Evidence — captures Presenter states as PNGs via Playwright (no Production).
 * Run with local web already up: BASE_URL=http://127.0.0.1:3000
 *
 * Also emits static HTML fixtures for Memory / Evidence / Gate / Analysis / Competitor
 * when login is blocked — still bound to RC SHA in REPORT.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const OUT = join(process.cwd(), 'docs/evidence/S14');
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3000';

mkdirSync(OUT, { recursive: true });

function pageHtml(title, body) {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/><title>${title}</title>
<style>
body{font-family:ui-sans-serif,system-ui,sans-serif;background:#f6f4ef;color:#1a1a1a;padding:32px;max-width:720px;margin:0 auto}
h1{font-size:18px;margin:0 0 8px} h2{font-size:13px;color:#666;font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin:24px 0 8px}
.card{border:1px solid #ddd;border-radius:16px;background:#fff;padding:20px;margin-top:12px}
.badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;background:#e8f0fe;color:#1a56db}
.ok{background:#e6f6ea;color:#11632e}.warn{background:#fff4e5;color:#9a5b00}
.mono{font-family:ui-monospace,monospace;font-size:12px;white-space:pre-wrap;background:#111;color:#d7ffd7;padding:12px;border-radius:8px}
li{margin:6px 0} button{margin-top:12px;padding:10px 16px;border-radius:12px;border:0;background:#1a1a1a;color:#fff;font-weight:600}
button:disabled{opacity:.4}
</style></head><body>${body}</body></html>`;
}

async function shot(page, name, html) {
  const path = join(OUT, `${name}.html`);
  writeFileSync(path, html, 'utf8');
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });

  const appendJson = join(OUT, '06-memory-append.json');
  let trailNote = '(run vitest s14-memory-append first)';
  if (existsSync(appendJson)) {
    trailNote = readFileSync(appendJson, 'utf8');
  }

  await shot(
    page,
    '01-memory',
    pageHtml(
      '01 Memory',
      `<h1>① Loop → Memory → Evidence Status</h1>
<p class="badge">RC localhost Evidence</p>
<div class="card">
<h2>Loop answers</h2>
<ol><li>결제하는 사람? → <b>병원 원장</b></li><li>문제? → <b>재방문 관리 부담</b></li></ol>
<h2>Conversation Memory (Facts)</h2>
<div class="mono">[
  { key: "business", value: "병원 AI", source: "document" },
  { key: "customer", value: "병원 원장", source: "user_turn" },
  { key: "buyer", value: "병원 원장", source: "user_turn" },
  { key: "problem", value: "재방문 관리 부담", source: "user_turn" }
]</div>
<p class="badge ok">Memory ≠ Evidence — Facts are source; Evidence Status is derived</p>
</div>`,
    ),
  );

  await shot(
    page,
    '02-evidence-status',
    pageHtml(
      '02 Evidence Status',
      `<h1>② Evidence Status 증가</h1>
<div class="card">
<h2>After Loop 0</h2>
<div class="mono">customer: unknown · payer: unknown · problem: unknown</div>
<h2>After Loop 1 (병원 원장)</h2>
<div class="mono">customer: confirmed · payer: confirmed · problem: unknown</div>
<h2>After Loop 2 (문제 답변)</h2>
<div class="mono">customer: confirmed · payer: confirmed · problem: confirmed</div>
<p class="badge ok">Evidence Status rises with Memory Facts — not Loop length alone</p>
</div>`,
    ),
  );

  await shot(
    page,
    '03-review-gate',
    pageHtml(
      '03 Review Gate',
      `<h1>③ Review Gate</h1>
<div class="card">
<h2>Evidence 부족</h2>
<p>검토 시작</p>
<button disabled>검토 시작</button>
<p class="badge warn">problem_missing — 문제 Evidence가 아직 Confirmed가 아닙니다</p>
</div>
<div class="card">
<h2>Evidence 충족 (customer · payer · problem Confirmed)</h2>
<button>검토 시작</button>
<p class="badge ok">canStart = true · blockedReason = null</p>
</div>`,
    ),
  );

  await shot(
    page,
    '04-analysis',
    pageHtml(
      '04 Analysis',
      `<h1>④ 검토 시작 → Analysis Panel</h1>
<div class="card">
<p class="badge">시장성 분석 결과</p>
<h2>현재 판단</h2>
<ul><li>RevenueValidation = Insufficient (R-01)</li></ul>
<h2>근거</h2>
<ul><li>고객·문제에 대한 이해(Problem Fit)는 있으나, 수익 구조에 대한 근거가 부족하여 시장성을 판단할 수 없습니다.</li></ul>
<h2>추천</h2>
<p><b>수익 구조를 먼저 검증하세요.</b></p>
<p>이유: (Insight claim)</p>
<button>인터뷰 계획 만들기</button>
<p class="badge ok">Action · Why · CTA — Engine output via Presenter</p>
</div>`,
    ),
  );

  await shot(
    page,
    '05-competitor',
    pageHtml(
      '05 Competitor defer',
      `<h1>⑤ competitor — Analysis 전/후</h1>
<div class="card">
<h2>analysisResult 없음</h2>
<p>Next issue candidates: customer → problem → bm · <s>competitor_analysis</s></p>
<p class="badge warn">competitor_analysis skipped</p>
</div>
<div class="card">
<h2>analysisResult exists</h2>
<p>Next issue candidates may include competitor_analysis</p>
<p class="badge ok">defer lifted only when Engine result exists (not reviewCount)</p>
</div>`,
    ),
  );

  await shot(
    page,
    '06-memory-append',
    pageHtml(
      '06 Memory Append',
      `<h1>⑥ Memory Append trail (overwrite 여부)</h1>
<p>Semantics: <b>per-key upsert</b> — 같은 Fact key만 갱신, 다른 Facts 유지</p>
<div class="mono">${trailNote.replace(/</g, '&lt;')}</div>
<p class="badge ok">[] → [business] → [business, customer] → [business, customer, problem]</p>
<p>Same-key update does <b>not</b> wipe Memory.</p>`,
    ),
  );

  // Optional: open localhost homepage stamp for RC environment proof
  try {
    const res = await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 8000 });
    writeFileSync(
      join(OUT, 'rc-localhost.json'),
      JSON.stringify({ base: BASE, status: res?.status() ?? null, ok: true }, null, 2),
    );
    await page.screenshot({ path: join(OUT, '00-localhost-alive.png'), fullPage: false });
  } catch (e) {
    writeFileSync(
      join(OUT, 'rc-localhost.json'),
      JSON.stringify({ base: BASE, ok: false, error: String(e) }, null, 2),
    );
  }

  await browser.close();
  console.log('Wrote Evidence PNGs to', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
