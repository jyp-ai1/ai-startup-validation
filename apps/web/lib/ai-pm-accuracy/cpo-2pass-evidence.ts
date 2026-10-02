import type { AccuracyFailureType } from './failure-taxonomy';
import { runAllGoldenScenarios } from './accuracy-turn-harness';
import { GOLDEN_SCENARIOS } from './golden-scenarios';
import { CPO_INDEPENDENT_RUBRIC } from './cpo-independent-rubric';
import { CPO_REVERIFY_3_ROW_GUIDANCE, reverify3Key } from './cpo-reverify-3-guidance';

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
  /** Re-verify #3 — CPO should expect (CTO documents; CPO judges Actual). */
  cpoReverify3Expected: string | null;
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
  /** Must match code under test — CPO acceptance requires this SHA on GitHub. */
  gitSha: string;
  gitBranch: string;
  reverifyPhase: 'REVERIFY_3_AWAITING_CPO_VERDICT';
  fixCycle: '2';
  rows: Cpo2PassRow[];
};

export type BuildCpo2PassPackOptions = {
  gitSha: string;
  gitBranch: string;
};

function rubricFor(scenarioId: string, turn: number) {
  return CPO_INDEPENDENT_RUBRIC.filter((r) => r.scenarioId === scenarioId && r.turn === turn);
}

export function buildCpo2PassEvidencePack(options?: BuildCpo2PassPackOptions): Cpo2PassEvidencePack {
  const pkg = runAllGoldenScenarios();
  const gitSha = options?.gitSha ?? process.env.ACCURACY_GIT_SHA ?? 'unknown';
  const gitBranch = options?.gitBranch ?? process.env.ACCURACY_GIT_BRANCH ?? 'unknown';
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
          CPO_REVERIFY_3_ROW_GUIDANCE[reverify3Key(scenarioResult.scenarioId, turnRec.turn)] ??
          '[CPO independent — use rubric questions below; do not inherit CTO PASS automatically]',
        cpoReverify3Expected:
          CPO_REVERIFY_3_ROW_GUIDANCE[reverify3Key(scenarioResult.scenarioId, turnRec.turn)] ?? null,
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
    gitSha,
    gitBranch,
    reverifyPhase: 'REVERIFY_3_AWAITING_CPO_VERDICT',
    fixCycle: '2',
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
export function renderCpo2PassReviewSheet(pack: Cpo2PassEvidencePack): string {
  const lines: string[] = [
    '# CPO 2-pass — Review Sheet (Golden 8 turns)',
    '',
    `**Generated:** ${pack.generatedAt}`,
    `**Git SHA:** \`${pack.gitSha}\``,
    `**Branch:** \`${pack.gitBranch}\``,
    `**Re-verify:** ${pack.reverifyPhase} · Fix Cycle ${pack.fixCycle}`,
    `**Rows:** ${pack.rows.length} · CTO self-check ${pack.ctoGoldenPass} (not CPO acceptance)`,
    '',
    'CPO: fill **CPO Expected** and **Verdict** per row. Full Actual JSON: `EVAL/cpo-2pass-evidence-pack.json`.',
    '',
    '| # | Scenario | Turn | Actual facts | Gap state | CPO Re-verify #3 Expected | CPO Verdict |',
    '|---|----------|------|--------------|-----------|----------------------------|-------------|',
  ];

  pack.rows.forEach((row, i) => {
    const exp = (row.cpoReverify3Expected ?? row.cpoExpected).replace(/\|/g, '/').replace(/\n/g, ' ');
    lines.push(
      `| ${i + 1} | ${row.scenarioLetter} ${row.scenario} | ${row.turn} | ${summarizeFacts(row.actual).replace(/\|/g, '/')} | ${summarizeGap(row.actual)} | ${exp.slice(0, 120)}${exp.length > 120 ? '…' : ''} | _PENDING_CPO_ |`,
    );
  });

  lines.push('');
  lines.push('## Re-verify #3 focus — C / H (Fix Cycle 2)');
  lines.push('');
  for (const row of pack.rows.filter((r) => r.cpoReverify3Expected)) {
    lines.push(`### ${row.scenario} T${row.turn}`);
    lines.push('');
    lines.push('**CPO Expected (independent checklist):**');
    lines.push('');
    lines.push(row.cpoReverify3Expected ?? '');
    lines.push('');
    lines.push('**Actual @ SHA:**');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(row.actual, null, 2));
    lines.push('```');
    lines.push('');
    lines.push('**CPO Verdict:** `[ PASS | PARTIAL | FAIL ]`');
    lines.push('');
  }

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

export function renderCpoReverify3Submission(pack: Cpo2PassEvidencePack): string {
  const focus = pack.rows.filter((r) => r.cpoReverify3Expected);
  return [
    '# CPO 2-pass Re-verify #3 — evidence submission (CTO)',
    '',
    `**Git SHA:** \`${pack.gitSha}\``,
    `**Generated:** ${pack.generatedAt}`,
    `**CTO Golden self-check:** ${pack.ctoGoldenPass} (not CPO acceptance)`,
    '',
    'CPO: compare **Actual** below to **CPO Expected** and record Verdict. Phase ① CLOSE only after CPO signs all rows.',
    '',
    '## Regenerate command',
    '',
    '```bash',
    'cd apps/web && pnpm test:cpo-2pass-evidence',
    '```',
    '',
    '## C / H Actual snapshots',
    '',
    ...focus.flatMap((row) => [
      `### ${row.scenario} turn ${row.turn}`,
      '',
      '**CPO Expected:**',
      '',
      row.cpoReverify3Expected ?? '',
      '',
      '**Actual:**',
      '',
      '```json',
      JSON.stringify(row.actual, null, 2),
      '```',
      '',
      '**CPO Verdict:** _pending_',
      '',
    ]),
  ].join('\n');
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
    ['CPO-2PASS-REVERIFY-3-SUBMISSION.md', 'Re-verify #3 C/H submission for CPO'],
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
