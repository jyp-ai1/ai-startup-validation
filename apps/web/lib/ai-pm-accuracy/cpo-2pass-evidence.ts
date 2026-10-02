import type { AccuracyFailureType } from './failure-taxonomy';
import { runAllGoldenScenarios } from './accuracy-turn-harness';
import { GOLDEN_SCENARIOS } from './golden-scenarios';
import { CPO_INDEPENDENT_RUBRIC } from './cpo-independent-rubric';

export type Cpo2PassRow = {
  scenario: string;
  scenarioLetter: string;
  turn: number;
  userAnswer: string;
  askedGapId: string;
  ctoExpected: Record<string, unknown>;
  cpoExpected: string;
  actual: Record<string, unknown>;
  ctoPass: boolean;
  cpoVerdict: 'PENDING_CPO_2PASS';
  failureType: AccuracyFailureType[];
  cpoLayers: string[];
  cpoReviewQuestions: string[];
  divergenceNote?: string;
};

export type Cpo2PassEvidencePack = {
  generatedAt: string;
  purpose: 'CPO_GOLDEN_8_INDEPENDENT_2PASS';
  slice1Status: 'PASS_CONDITIONAL';
  sprint1Status: 'OPEN';
  ctoGoldenPass: string;
  rows: Cpo2PassRow[];
};

function rubricFor(scenarioId: string, turn: number) {
  return CPO_INDEPENDENT_RUBRIC.filter((r) => r.scenarioId === scenarioId && r.turn === turn);
}

export function buildCpo2PassEvidencePack(): Cpo2PassEvidencePack {
  const pkg = runAllGoldenScenarios();
  const rows: Cpo2PassRow[] = [];

  for (const scenarioResult of pkg.scenarios) {
    const def = GOLDEN_SCENARIOS.find((s) => s.id === scenarioResult.scenarioId);
    for (const turnRec of scenarioResult.turns) {
      const turnDef = def?.turns[turnRec.turn - 1];
      const rubrics = rubricFor(scenarioResult.scenarioId, turnRec.turn);
      rows.push({
        scenario: scenarioResult.scenarioId,
        scenarioLetter: def?.letter ?? '?',
        turn: turnRec.turn,
        userAnswer: turnRec.userInput,
        askedGapId: turnDef?.askedGapId ?? '',
        ctoExpected: {
          interpretation: turnRec.expectedInterpretation,
          state: turnRec.expectedState,
          gap: turnRec.expectedGap,
          nextQuestion: turnRec.expectedNextQuestion,
          reason: turnRec.expectedReason,
        },
        cpoExpected:
          '[CPO independent — use rubric questions below; do not inherit CTO PASS automatically]',
        actual: {
          interpretation: turnRec.actualInterpretation,
          state: turnRec.actualState,
          gap: turnRec.actualGap,
          nextQuestion: turnRec.actualNextQuestion,
          reason: turnRec.actualReason,
        },
        ctoPass: turnRec.pass,
        cpoVerdict: 'PENDING_CPO_2PASS',
        failureType: turnRec.failureTypes,
        cpoLayers: rubrics.flatMap((r) => r.layers),
        cpoReviewQuestions: rubrics.flatMap((r) => r.cpoReviewQuestions),
        divergenceNote: rubrics.find((r) => r.ctoCpoDivergenceNote)?.ctoCpoDivergenceNote,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    purpose: 'CPO_GOLDEN_8_INDEPENDENT_2PASS',
    slice1Status: 'PASS_CONDITIONAL',
    sprint1Status: 'OPEN',
    ctoGoldenPass: `${pkg.passCount}/${pkg.scenarioCount}`,
    rows,
  };
}

export function renderCpo2PassMarkdown(pack: Cpo2PassEvidencePack): string {
  const lines: string[] = [
    '# CPO Accuracy — Golden 8 Independent 2-pass',
    '',
    `**Generated:** ${pack.generatedAt}`,
    `**Slice 1:** ${pack.slice1Status} · **Sprint 1:** ${pack.sprint1Status}`,
    `**CTO Golden (self-check):** ${pack.ctoGoldenPass} — *not CPO acceptance*`,
    '',
    'CPO fills **CPO Expected** and **CPO Verdict** per row. Divergence from CTO Expected is a valid finding.',
    '',
    '---',
    '',
  ];

  for (const row of pack.rows) {
    lines.push(`## ${row.scenario} · Turn ${row.turn} (${row.scenarioLetter})`);
    lines.push('');
    lines.push(`**Asked gap:** \`${row.askedGapId}\``);
    lines.push('');
    lines.push('**User answer:**');
    lines.push('```text');
    lines.push(row.userAnswer);
    lines.push('```');
    lines.push('');
    lines.push('**CTO Expected:**');
    lines.push('```json');
    lines.push(JSON.stringify(row.ctoExpected, null, 2));
    lines.push('```');
    lines.push('');
    lines.push('**CPO Expected (independent):**');
    lines.push(row.cpoExpected);
    if (row.cpoReviewQuestions.length) {
      lines.push('');
      lines.push('CPO review questions:');
      for (const q of row.cpoReviewQuestions) {
        lines.push(`- ${q}`);
      }
    }
    if (row.divergenceNote) {
      lines.push('');
      lines.push(`*Divergence note:* ${row.divergenceNote}`);
    }
    lines.push('');
    lines.push('**Actual:**');
    lines.push('```json');
    lines.push(JSON.stringify(row.actual, null, 2));
    lines.push('```');
    lines.push('');
    lines.push(`**CTO self-check:** ${row.ctoPass ? 'PASS' : 'FAIL'} ${row.failureType.length ? `(${row.failureType.join(', ')})` : ''}`);
    lines.push('');
    lines.push('**CPO Verdict:** `[PENDING — PASS | PARTIAL | FAIL]`');
    lines.push('');
    lines.push('**Failure type (CPO):** `[F1–F10 if FAIL]`');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

function summarizeFacts(actual: Record<string, unknown>): string {
  const facts = (actual.interpretation as { extractedFacts?: Array<{ key: string; value: string; evidenceClass: string }> })
    ?.extractedFacts;
  if (!facts?.length) return '(none)';
  return facts.map((f) => `${f.key}=${f.evidenceClass}:"${f.value.slice(0, 48)}${f.value.length > 48 ? '…' : ''}"`).join('; ');
}

function summarizeGap(actual: Record<string, unknown>): string {
  const gap = actual.gap as Record<string, string> | undefined;
  if (!gap || !Object.keys(gap).length) return '(none)';
  return Object.entries(gap)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');
}

function summarizeNext(actual: Record<string, unknown>): string {
  const n = actual.nextQuestion as { targetGapId?: string; action?: string; questionText?: string } | null;
  if (!n) return '(none)';
  return `${n.targetGapId}/${n.action} — ${(n.questionText ?? '').slice(0, 60)}`;
}

/** Compact sheet for CPO independent review (full JSON in sibling files). */
export function renderCpo2PassReviewSheet(pack: Cpo2PassEvidencePack, gitSha?: string): string {
  const lines: string[] = [
    '# CPO 2-pass — Review Sheet (Golden 8 turns)',
    '',
    `**Generated:** ${pack.generatedAt}`,
    gitSha ? `**Git SHA:** \`${gitSha}\`` : '',
    `**Rows:** ${pack.rows.length} · CTO self-check ${pack.ctoGoldenPass} (not CPO acceptance)`,
    '',
    'CPO: fill **CPO Expected** and **Verdict** per row. Full Actual JSON: `EVAL/cpo-2pass-evidence-pack.json`.',
    '',
    '| # | Scenario | Turn | Asked gap | User answer (trim) | Actual facts | Gap state | Next Q | CTO self | CPO Expected | CPO Verdict |',
    '|---|----------|------|-----------|-------------------|--------------|-----------|--------|----------|--------------|-------------|',
  ].filter(Boolean);

  pack.rows.forEach((row, i) => {
    const user = row.userAnswer.replace(/\|/g, '/').slice(0, 40);
    lines.push(
      `| ${i + 1} | ${row.scenarioLetter}-${row.scenario.slice(-12)} | ${row.turn} | ${row.askedGapId} | ${user}… | ${summarizeFacts(row.actual).replace(/\|/g, '/')} | ${summarizeGap(row.actual)} | ${summarizeNext(row.actual).replace(/\|/g, '/')} | ${row.ctoPass ? 'PASS' : 'FAIL'} | _CPO fill_ | _PENDING_ |`,
    );
  });

  lines.push('');
  lines.push('## Per-turn rubric (CPO independent questions)');
  lines.push('');
  for (const row of pack.rows) {
    if (!row.cpoReviewQuestions.length) continue;
    lines.push(`### ${row.scenario} T${row.turn}`);
    for (const q of row.cpoReviewQuestions) lines.push(`- ${q}`);
    if (row.divergenceNote) lines.push(`- *CTO/CPO divergence risk:* ${row.divergenceNote}`);
    lines.push('');
  }
  return lines.join('\n');
}

export function renderCpo2PassAccessManifest(opts: {
  gitSha: string;
  branch: string;
  repo: string;
}): string {
  const base = `https://github.com/${opts.repo}/blob/${opts.branch}`;
  const root = 'docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1';
  const files = [
    ['CPO-ACCURACY-2PASS.md', 'Full turn narrative + JSON blocks'],
    ['CPO-2PASS-REVIEW-SHEET.md', 'Compact table for CPO fill'],
    ['EVAL/cpo-2pass-evidence-pack.json', 'Machine-readable rows'],
    ['EVAL/golden-scenarios-turn-evidence.json', 'CTO turn evidence'],
    ['CPO-2PASS-FILL-TEMPLATE.md', 'CPO verdict copy-paste template'],
  ];
  const lines = [
    '# Phase ① — CPO 2-pass evidence access manifest',
    '',
    `**Branch:** \`${opts.branch}\` · **Commit:** \`${opts.gitSha}\``,
    '',
    '## Repository paths (workspace)',
    '',
    ...files.map(([f]) => `- \`${root}/${f}\``),
    '',
    '## GitHub (browse on branch)',
    '',
    ...files.map(([f, desc]) => `- [${f}](${base}/${root}/${f}) — ${desc}`),
    '',
    '## Regenerate locally',
    '',
    '```bash',
    'cd apps/web && pnpm test:cpo-2pass-evidence',
    '```',
    '',
    '## Phase ① close criteria',
    '',
    'CPO completes independent Expected + Verdict on all rows → Layer 1–3 failure tally → FAIL/PARTIAL fixes → re-run → CPO re-verify.',
    '',
  ];
  return lines.join('\n');
}
