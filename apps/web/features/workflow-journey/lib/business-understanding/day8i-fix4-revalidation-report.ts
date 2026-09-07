/**
 * DAY 8-I P0 FIX-4 REVALIDATION — CPO evidence with semantic chain (P0-5).
 */

import type { Day8iConversationResult } from './day8i-conversation-harness';
import {
  evaluateFix3Revalidation,
  formatFix3RevalidationReport,
  type Fix3RevalidationMeta,
  type Fix3RevalidationResult,
} from './day8i-fix3-revalidation-report';
import {
  evaluateAllSemanticChains,
  formatSemanticChainBlock,
} from './day8i-fix4-semantic-chain';
import type { TurnAcceptanceFailure } from './day8i-fix3-turn-acceptance';
import { formatReviewModeDisplay } from './ai-pm-review-mode-prompt';

export type Fix4RevalidationResult = Fix3RevalidationResult & {
  semanticChainFailures: TurnAcceptanceFailure[];
  fix4OverallPass: boolean;
};

export function evaluateFix4Revalidation(
  result: Day8iConversationResult,
): Fix4RevalidationResult {
  const base = evaluateFix3Revalidation(result);
  const semanticChainFailures = evaluateAllSemanticChains(result.turns);
  const fix4OverallPass =
    base.overallPass && semanticChainFailures.length === 0;

  return {
    ...base,
    semanticChainFailures,
    fix4OverallPass,
  };
}

function buildReviewModeSection(result: Day8iConversationResult): string {
  const lines: string[] = [];
  lines.push('## Section K — Review Mode UX (FIX-4 P0-3)');
  lines.push('');
  lines.push('After no-gap termination, AI must show judgment + supplement paths (not silent stop).');
  lines.push('');
  const reviewTurns = result.turns.filter((t) =>
    t.question.includes('[현재 AI 판단]') || t.question.includes('이 부분 보완하기'),
  );
  lines.push(`Review-mode turns: ${reviewTurns.length}`);
  lines.push('');
  if (reviewTurns.length > 0) {
    const sample = reviewTurns[4] ?? reviewTurns[0]!;
    lines.push('Sample display (Turn ' + String(sample.turnIndex).padStart(2, '0') + '):');
    lines.push('```text');
    lines.push(sample.question.slice(0, 600));
    lines.push('```');
  }
  if (result.finalJudgmentSnapshot) {
    lines.push('');
    lines.push('Canonical review prompt template:');
    lines.push('```text');
    lines.push(formatReviewModeDisplay(result.finalJudgmentSnapshot));
    lines.push('```');
  }
  return lines.join('\n');
}

function buildResearchAckSection(result: Day8iConversationResult): string {
  const lines: string[] = [];
  lines.push('## Section L — Research Acknowledgement (FIX-4 P0-4)');
  lines.push('');
  for (const idx of [12, 24]) {
    const t = result.turns[idx - 1];
    if (!t) continue;
    lines.push(`### Turn ${String(idx).padStart(2, '0')}`);
    lines.push(`CEO: ${t.ceoAnswer}`);
    lines.push(`AI: ${t.question}`);
    lines.push('');
  }
  return lines.join('\n');
}

function buildSemanticChainSection(result: Day8iConversationResult): string {
  const lines: string[] = [];
  lines.push('## Section M — Semantic Chain (FIX-4 P0-5)');
  lines.push('');
  lines.push(
    'Each critical turn: CEO Answer → Meaning → Evidence Span → Dimension → State. Semantic mismatch = FAIL.',
  );
  lines.push('');
  for (const t of result.turns) {
    const block = formatSemanticChainBlock(t);
    if (block) lines.push(block);
  }
  return lines.join('\n');
}

export function formatFix4RevalidationReport(
  result: Day8iConversationResult,
  meta: Fix3RevalidationMeta & { meaningModel: boolean },
  reval: Fix4RevalidationResult,
): string {
  const baseMeta: Fix3RevalidationMeta = meta;
  let report = formatFix3RevalidationReport(result, baseMeta, reval);

  report = report.replace(
    '# ALABOM — DAY 8-I P0 FIX-3 REVALIDATION Report',
    '# ALABOM — DAY 8-I P0 FIX-4 REVALIDATION Report',
  );
  report = report.replace(
    '> **CPO 4차 독립 검증용.**',
    '> **CPO FIX-4 독립 검증용.** FIX-3 semantic SoT + meaning model + review UX.',
  );
  report = report.replace(
    '| Answer Semantic SoT | ON |',
    `| Answer Semantic SoT | ${meta.flags.answerSemanticSot ? 'ON' : 'OFF'} |\n| Judgment Meaning Model | ${meta.meaningModel ? 'ON' : 'OFF'} |`,
  );
  report = report.replace(
    `| **Overall CPO Revalidation** | **${reval.overallPass ? 'PASS' : 'FAIL'}** |`,
    `| **Overall CPO Revalidation** | **${reval.fix4OverallPass ? 'PASS' : 'FAIL'}** |`,
  );
  report = report.replace(
    `| Critical turn failures | ${reval.criticalFailures.length} |`,
    `| Critical turn failures | ${reval.criticalFailures.length} |\n| Semantic chain failures | ${reval.semanticChainFailures.length} |`,
  );
  report = report.replace(
    `CPO Revalidation Gate: **${reval.overallPass ? 'PASS' : 'FAIL — CEO TEST HOLD / Production HOLD'}**`,
    `CPO Revalidation Gate: **${reval.fix4OverallPass ? 'PASS' : 'FAIL — CEO TEST HOLD / Production HOLD'}**`,
  );

  const extra = [
    '',
    '---',
    '',
    buildReviewModeSection(result),
    '',
    '---',
    '',
    buildResearchAckSection(result),
    '',
    '---',
    '',
    buildSemanticChainSection(result),
    '',
    '---',
    '',
    '## Section N — FIX-4 CPO Gate Summary',
    '',
    '| P0 | Requirement | Verdict |',
    '|----|-------------|---------|',
    `| P0-1 | Distinct meaning-unit evidence spans | ${reval.semanticChainFailures.filter((f) => f.field.includes('Overlap') || f.field.includes('Fragment')).length === 0 ? 'PASS' : 'FAIL'} |`,
    `| P0-2 | Accumulative solution/problem merge | ${reval.finalFailures.filter((f) => f.field === 'solution').length === 0 ? 'PASS' : 'FAIL'} |`,
    `| P0-3 | Review mode judgment + supplement paths | ${result.turns.some((t) => t.question.includes('[현재 AI 판단]')) ? 'PASS' : 'FAIL'} |`,
    `| P0-4 | Research intent acknowledgement | ${result.turns.some((t) => t.question.includes('알겠습니다') && t.question.includes('경쟁사')) ? 'PASS' : 'FAIL'} |`,
    `| P0-5 | Semantic chain validation | ${reval.semanticChainFailures.length === 0 ? 'PASS' : 'FAIL'} |`,
    '',
  ].join('\n');

  return report + extra;
}
