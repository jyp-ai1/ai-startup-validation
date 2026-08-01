/**
 * Single-file HTML evidence pack for CPO/CEO review (images embedded as base64).
 * Usage: node scripts/build-evidence-html-pack.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const EVIDENCE = join(ROOT, 'docs', 'evidence', 'P0-QA-46f5a81');
const FINAL = join(EVIDENCE, 'final');

const images = [
  {
    id: 'flow1-before',
    title: 'Flow1 — Before F5 (Insight)',
    file: join(FINAL, 'flow1-refresh', '01-insight-before-refresh.png'),
  },
  {
    id: 'flow1-after',
    title: 'Flow1 — After F5 (Insight must persist)',
    file: join(FINAL, 'flow1-refresh', '02-insight-after-refresh.png'),
  },
  {
    id: 'flow2-promote',
    title: 'Flow2 — After Promote (Project List)',
    file: join(FINAL, 'flow2-demo', '02-project-list-after-promote.png'),
  },
];

const report = JSON.parse(readFileSync(join(FINAL, 'p0-2-final-batch-report.json'), 'utf8'));
const handoff = readFileSync(join(EVIDENCE, 'CPO-HANDOFF.md'), 'utf8');

function imgTag(path, alt) {
  const b64 = readFileSync(path).toString('base64');
  return `<figure id="${alt}"><figcaption>${alt}</figcaption><img alt="${alt}" src="data:image/png;base64,${b64}" /></figure>`;
}

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>LaunchLens P0-2 Evidence — 46f5a81</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 24px; background: #0a0a0a; color: #eee; }
    h1 { color: #f59e0b; }
    .facts { background: #111; border: 1px solid #333; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .facts code { color: #93c5fd; }
    figure { margin: 32px 0; border: 1px solid #333; border-radius: 8px; overflow: hidden; }
    figcaption { background: #1a1a1a; padding: 12px 16px; font-weight: 600; color: #f59e0b; }
    img { width: 100%; display: block; }
    pre { background: #111; padding: 16px; overflow: auto; border-radius: 8px; font-size: 12px; }
    .cpo { background: #1a1200; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; margin-top: 32px; }
    a { color: #93c5fd; }
  </style>
</head>
<body>
  <h1>LaunchLens P0-2 Production Evidence</h1>
  <p>CPO/CEO: 이 HTML 파일 하나로 PNG 3장 + machine log를 <strong>오프라인에서 직접</strong> 확인할 수 있습니다. GPT에 검토 요청 시 이 파일을 첨부하거나, 아래 GitHub raw 링크를 사용하세요.</p>

  <div class="facts">
    <p><strong>Production:</strong> <a href="https://ai-startup-validation-tau.vercel.app">ai-startup-validation-tau.vercel.app</a></p>
    <p><strong>Commit:</strong> <code>46f5a8114fd6940be514313cba5be23ff387592f</code></p>
    <p><strong>Build-info:</strong> <a href="https://ai-startup-validation-tau.vercel.app/api/build-info">/api/build-info</a></p>
    <p><strong>Flow1 URL (before/after F5):</strong> <code>${report.flow1.urlBeforeRefresh}</code></p>
    <p><strong>welcome=1 in URL:</strong> none (log: welcomeStripped=${report.flow1.welcomeStripped})</p>
    <p><strong>Flow2 URL after promote:</strong> <code>${report.flow2.urlAfterPromote}</code></p>
  </div>

  <h2>Evidence images (embedded)</h2>
  ${images.map((i) => imgTag(i.file, i.title)).join('\n')}

  <h2>Machine log</h2>
  <pre>${JSON.stringify(report, null, 2)}</pre>

  <h2>CPO checklist</h2>
  <div class="cpo">
    <p><strong>Flow1:</strong> Before/After images show same Insight (검토 완료, 같이 보기, 74점) — NOT document intake 0%</p>
    <p><strong>Flow2:</strong> Promote image shows Project List (최근 프로젝트) — NOT auto-enter project</p>
    <p>CPO marks: Flow1 ☐ PASS ☐ FAIL | Flow2 ☐ PASS ☐ FAIL | CEO test ☐ start ☐ hold</p>
  </div>

  <h2>GitHub raw links (for ChatGPT browsing)</h2>
  <ul>
    <li><a href="https://raw.githubusercontent.com/jyp-ai1/ai-startup-validation/main/docs/evidence/P0-QA-46f5a81/final/flow1-refresh/01-insight-before-refresh.png">01-insight-before-refresh.png</a></li>
    <li><a href="https://raw.githubusercontent.com/jyp-ai1/ai-startup-validation/main/docs/evidence/P0-QA-46f5a81/final/flow1-refresh/02-insight-after-refresh.png">02-insight-after-refresh.png</a></li>
    <li><a href="https://raw.githubusercontent.com/jyp-ai1/ai-startup-validation/main/docs/evidence/P0-QA-46f5a81/final/flow2-demo/02-project-list-after-promote.png">02-project-list-after-promote.png</a></li>
  </ul>

  <details><summary>CPO-HANDOFF.md (text)</summary><pre>${handoff.replace(/</g, '&lt;')}</pre></details>
</body>
</html>`;

writeFileSync(join(EVIDENCE, 'EVIDENCE-PACKAGE.html'), html);
console.log('Wrote', join(EVIDENCE, 'EVIDENCE-PACKAGE.html'));
