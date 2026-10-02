import type { Phase2TurnTrace } from './map-real-business-turn-trace';

export type Phase2SessionTraceInput = {
  status: 'BLOCKED' | 'CAPTURED' | 'PARTIAL';
  phase?: number;
  sessionId: string | null;
  productionUrl: string;
  gitSha: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  turns: Phase2TurnTrace[];
  blockReason?: string;
};

export type Phase2CpoReviewPack = {
  generatedAt: string;
  purpose: 'CPO_REAL_BUSINESS_REVIEW_L1_L3';
  phase2Status: 'OPEN' | 'AWAITING_CPO';
  traceStatus: Phase2SessionTraceInput['status'];
  productionUrl: string;
  gitSha: string | null;
  sessionId: string | null;
  turnCount: number;
  rows: Array<Phase2TurnTrace & { cpoReviewPrompt: string }>;
};

function summarizeFacts(row: Phase2TurnTrace): string {
  const facts = row.answerUnderstanding.extractedFacts as Array<{
    key?: string;
    evidenceClass?: string;
    value?: string;
  }>;
  if (!facts?.length) return '(none)';
  return facts
    .map((f) => `${f.key ?? '?'}=${f.evidenceClass ?? '?'}:"${String(f.value ?? '').slice(0, 40)}"`)
    .join('; ');
}

function summarizeGap(row: Phase2TurnTrace): string {
  const g = row.gapSnapshot;
  if (!g || !Object.keys(g).length) return '(none)';
  return Object.entries(g)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');
}

const CPO_ROW_PROMPT = `L1 understanding · L2 gap/state preservation · L3 next Q + why · off-slot · contradiction (see CPO-PHASE2-RUBRIC.md)`;

export function buildPhase2CpoReviewPack(trace: Phase2SessionTraceInput): Phase2CpoReviewPack {
  return {
    generatedAt: new Date().toISOString(),
    purpose: 'CPO_REAL_BUSINESS_REVIEW_L1_L3',
    phase2Status: trace.turns.length > 0 ? 'AWAITING_CPO' : 'OPEN',
    traceStatus: trace.status,
    productionUrl: trace.productionUrl,
    gitSha: trace.gitSha,
    sessionId: trace.sessionId,
    turnCount: trace.turns.length,
    rows: trace.turns.map((row) => ({
      ...row,
      cpoReviewPrompt: CPO_ROW_PROMPT,
    })),
  };
}

export function renderPhase2CpoReviewSheet(
  pack: Phase2CpoReviewPack,
  trace: Phase2SessionTraceInput,
): string {
  const lines: string[] = [
    '# Phase ② — CPO Review Sheet (Real Business Review)',
    '',
    `**Generated:** ${pack.generatedAt}`,
    `**Trace status:** ${pack.traceStatus}`,
    `**Production:** ${pack.productionUrl}`,
    `**Git SHA:** \`${pack.gitSha ?? 'unknown'}\``,
    `**Session:** \`${pack.sessionId ?? 'n/a'}\``,
    `**Turns:** ${pack.turnCount}`,
    '',
    'CPO: independent Layer 1–3 verdict per row. Rubric: `CPO-PHASE2-RUBRIC.md`. Full JSON: `EVAL/phase2-cpo-review-pack.json`.',
    '',
  ];

  if (pack.traceStatus === 'BLOCKED' || pack.turnCount === 0) {
    lines.push(`**Blocked:** ${trace.blockReason ?? 'No turns captured.'}`);
    lines.push('');
    lines.push('Regenerate trace: `cd apps/web && pnpm evidence:real-business-review` (requires storageState).');
    return lines.join('\n');
  }

  lines.push(
    '| # | Asked gap | User answer (trim) | Facts | Gap snapshot | Next Q target | CPO Verdict |',
    '|---|-----------|-------------------|-------|--------------|---------------|-------------|',
  );

  pack.rows.forEach((row, i) => {
    const ans = row.userAnswer.replace(/\|/g, '/').slice(0, 60);
    const nextGap = row.nextQuestion.targetGap ?? '(none)';
    lines.push(
      `| ${i + 1} | ${row.askedGapId ?? '?'} | ${ans}${row.userAnswer.length > 60 ? '…' : ''} | ${summarizeFacts(row).replace(/\|/g, '/')} | ${summarizeGap(row)} | ${nextGap} | _PENDING_CPO_ |`,
    );
  });

  lines.push('');
  lines.push('## Per-turn detail (CPO fill Expected + Verdict)');
  lines.push('');

  for (const row of pack.rows) {
    lines.push(`### Turn ${row.turn}`);
    lines.push('');
    lines.push(`**Asked gap:** \`${row.askedGapId ?? '?'}\``);
    lines.push('');
    lines.push('**User answer:**');
    lines.push('```text');
    lines.push(row.userAnswer);
    lines.push('```');
    lines.push('');
    lines.push('**Actual (capture):**');
    lines.push('```json');
    lines.push(JSON.stringify(row, null, 2));
    lines.push('```');
    lines.push('');
    lines.push('**CPO Verdict:** `[ PASS | PARTIAL | FAIL ]`');
    lines.push('');
  }

  return lines.join('\n');
}
