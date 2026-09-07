/**
 * DAY 8-I P0 FIX-3 REVALIDATION — CPO 4차 evidence report (Sections A–J).
 * Same Full Pipeline as production harness; connects unit expectations to live results.
 */

import type { CeoJudgmentDimensionId, CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import { CEO_JUDGMENT_DIMENSION_LABELS, statusEmoji } from './ai-pm-ceo-judgment-dimensions';
import { extractAnswerSemanticEvidences } from './ai-pm-answer-semantic-sot';
import type { Day8iConversationResult, Day8iConversationTurnRecord } from './day8i-conversation-harness';
import {
  FIX3_CRITICAL_TURN_EXPECTATIONS,
  detectCrossDimensionCopy,
  evaluateFinalReviewDimensions,
  evaluateTurnExpectation,
  type TurnAcceptanceFailure,
} from './day8i-fix3-turn-acceptance';
import { runCpoR13ToR25Checks } from './day8i-cpo-r-extended-checks';
import { runCpoRSelfChecks } from './day8i-cpo-r-self-check';
import { formatTurnBlock } from './day8i-cpo-evidence-report';
import { isAiPmJudgmentFix6V1Active } from './ai-pm-judgment-fix6-v1';
import { buildEvidenceSourceMap } from './ai-pm-judgment-evidence-review';

export type Fix3RevalidationMeta = {
  commitSha: string;
  branch: string;
  executedAt: string;
  pipeline: string;
  flags: {
    v3ReviewPipeline: boolean;
    judgmentAggregation: boolean;
    answerSemanticSot: boolean;
  };
};

export type Fix3RevalidationResult = {
  conversation: Day8iConversationResult;
  criticalFailures: TurnAcceptanceFailure[];
  finalFailures: TurnAcceptanceFailure[];
  crossCopyFailures: TurnAcceptanceFailure[];
  overallPass: boolean;
};

const MULTI_FACT_TURNS = [6, 16, 26] as const;

function traceDimensions(turn: Day8iConversationTurnRecord): CeoJudgmentDimensionId[] {
  return turn.trace?.dimensionEntries.map((e) => e.affectedDimension) ?? [];
}

function traceEvidence(turn: Day8iConversationTurnRecord, dim: CeoJudgmentDimensionId): string {
  const entry = turn.trace?.dimensionEntries.find((e) => e.affectedDimension === dim);
  return entry?.evidence ?? '(none)';
}

function formatCriticalTurnVerdict(
  spec: (typeof FIX3_CRITICAL_TURN_EXPECTATIONS)[number],
  turn: Day8iConversationTurnRecord,
  failures: TurnAcceptanceFailure[],
): string {
  const lines: string[] = [];
  const turnFails = failures.filter((f) => f.turnIndex === spec.turnIndex);
  const dims = traceDimensions(turn);
  const semantic = extractAnswerSemanticEvidences(turn.ceoAnswer);

  lines.push(`### Turn ${String(spec.turnIndex).padStart(2, '0')} — ${spec.label}`);
  lines.push('');
  lines.push('CEO Answer:');
  lines.push(turn.ceoAnswer);
  lines.push('');
  lines.push('AI Question:');
  lines.push(turn.question || '(none)');
  lines.push('');
  lines.push(`Question Target: ${turn.targetGap || '(none)'}`);
  lines.push('');
  lines.push('Answer Meaning (Semantic SoT):');
  if (semantic.frozen) {
    lines.push('- frozen (inference risk / unknown — no judgment update)');
  } else if (semantic.nonJudgmentSlot) {
    lines.push(`- non-judgment slot: ${semantic.nonJudgmentSlot}`);
  } else if (semantic.evidences.length === 0) {
    lines.push('- (no judgment dimension evidence extracted)');
  } else {
    for (const ev of semantic.evidences) {
      lines.push(`- ${ev.dimension}: ${ev.interpretedMeaning}`);
    }
  }
  lines.push('');
  lines.push('Expected Dimensions:');
  lines.push(
    spec.mustUpdate?.length
      ? spec.mustUpdate.join(', ')
      : spec.nonJudgmentSlot
        ? `(none — ${spec.nonJudgmentSlot})`
        : spec.mustNotUpdate?.length
          ? `(no update to ${spec.mustNotUpdate.join(', ')})`
          : '(contextual)',
  );
  lines.push('');
  lines.push('Actual Dimensions (trace):');
  lines.push(dims.length ? dims.join(', ') : 'none');
  lines.push('');
  lines.push('Expected Evidence:');
  if (spec.evidenceMustContain) {
    for (const [dim, re] of Object.entries(spec.evidenceMustContain)) {
      lines.push(`- ${dim}: ${re.toString()}`);
    }
  } else {
    lines.push('- (per dimension spec above)');
  }
  lines.push('');
  lines.push('Actual Evidence:');
  if (dims.length === 0) {
    lines.push('- none');
  } else {
    for (const dim of dims) {
      lines.push(`- ${dim}: ${traceEvidence(turn, dim)}`);
    }
  }
  lines.push('');
  lines.push('Previous State → New State:');
  for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
    const entry = turn.trace?.dimensionEntries.find((e) => e.affectedDimension === id);
    if (entry) {
      lines.push(
        `- ${id}: [${entry.previousJudgment.status}] "${entry.previousJudgment.summary || '(empty)'}" → [${entry.newJudgment.status}] "${entry.newJudgment.summary || '(empty)'}" (${entry.changeType})`,
      );
    }
  }
  if (!turn.trace?.dimensionEntries.length) {
    lines.push('- (no judgment update this turn — prior state preserved)');
  }
  lines.push('');
  lines.push('Next Question:');
  lines.push(turn.nextQuestion ?? '(none)');
  lines.push('');
  lines.push(`**Result: ${turnFails.length === 0 ? 'PASS' : 'FAIL'}**`);
  if (turnFails.length > 0) {
    for (const f of turnFails) {
      lines.push(`- ${f.field}: expected ${f.expected}, actual ${f.actual}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

function buildDimensionSourceMap(result: Day8iConversationResult): string {
  const final = result.finalJudgmentSnapshot;
  if (!final) return '(no final state)';

  if (isAiPmJudgmentFix6V1Active()) {
    return buildEvidenceSourceMap(final);
  }

  const lines: string[] = [];

  for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
    const summary = final.dimensions[id].summary;
    lines.push(`### ${CEO_JUDGMENT_DIMENSION_LABELS[id]}`);
    lines.push(`Final: ${statusEmoji(final.dimensions[id].status)} ${summary || '(empty)'}`);
    const sources: string[] = [];
    for (const t of result.turns) {
      for (const e of t.trace?.dimensionEntries ?? []) {
        if (e.affectedDimension !== id) continue;
        if (e.newJudgment.summary.trim() === summary.trim()) {
          sources.push(`Turn ${String(t.turnIndex).padStart(2, '0')}: "${e.evidence}"`);
        }
      }
    }
    if (sources.length === 0) {
      lines.push('Source Turn: (accumulated — no single trace match)');
    } else {
      lines.push('Source Turn / Evidence:');
      for (const s of sources) lines.push(`- ${s}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function buildMultiFactSection(result: Day8iConversationResult): string {
  const lines: string[] = [];
  for (const idx of MULTI_FACT_TURNS) {
    const t = result.turns[idx - 1];
    if (!t) continue;
    lines.push(`### Turn ${String(idx).padStart(2, '0')}`);
    lines.push(`CEO: ${t.ceoAnswer}`);
    lines.push('');
    const snap = t.judgmentSnapshot;
    if (snap) {
      for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
        const d = snap.dimensions[id];
        if (!d.summary.trim()) continue;
        const ev = traceEvidence(t, id);
        lines.push(`- **${id}**: ${d.summary}${ev !== '(none)' ? ` (evidence: ${ev})` : ''}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function buildUnsupportedInferenceSection(result: Day8iConversationResult): string {
  const lines: string[] = [];
  lines.push('| Turn | Trace Update | Prior State Preserved | Verdict |');
  lines.push('|------|--------------|----------------------|---------|');
  for (const idx of [13, 23]) {
    const t = result.turns[idx - 1];
    if (!t) continue;
    const traceCount = t.trace?.dimensionEntries.length ?? 0;
    const inf = result.unsupportedInferences.filter((x) => x.startsWith(`Turn ${idx}`));
    lines.push(
      `| ${idx} | ${traceCount === 0 ? 'none ✅' : `${traceCount} entries ❌`} | yes | ${inf.length === 0 ? 'PASS' : 'FAIL'} |`,
    );
  }
  lines.push('');
  if (result.unsupportedInferences.length === 0) {
    lines.push('Unsupported inference violations: **0**');
  } else {
    lines.push('Violations:');
    for (const inf of result.unsupportedInferences) lines.push(`- ${inf}`);
  }
  return lines.join('\n');
}

function buildNoGapSection(result: Day8iConversationResult): string {
  const lines: string[] = [];
  lines.push(`No-gap termination turns: ${result.noGapTerminations.map((n) => String(n).padStart(2, '0')).join(', ') || 'none'}`);
  lines.push(`Repeated display questions: ${result.repeatedQuestions.length}`);
  lines.push(`Repeated next questions: ${result.repeatedNextQuestions.length}`);
  lines.push('');
  lines.push('Termination path after no-gap:');
  lines.push('```text');
  lines.push('meaningful gap = 없음');
  lines.push('  ↓');
  lines.push('질문 생성 중단 (nextQuestion = null)');
  lines.push('  ↓');
  lines.push('Business Review mode (openBusinessReview)');
  lines.push('  ↓');
  lines.push(`동일 질문 재생성: ${result.repeatedNextQuestions.length}회`);
  lines.push('```');
  return lines.join('\n');
}

export function evaluateFix3Revalidation(
  result: Day8iConversationResult,
): Fix3RevalidationResult {
  const criticalFailures: TurnAcceptanceFailure[] = [];
  for (const spec of FIX3_CRITICAL_TURN_EXPECTATIONS) {
    const turn = result.turns[spec.turnIndex - 1];
    if (!turn) {
      criticalFailures.push({
        turnIndex: spec.turnIndex,
        label: spec.label,
        field: 'turn',
        expected: 'turn record',
        actual: 'missing',
      });
      continue;
    }
    criticalFailures.push(...evaluateTurnExpectation(spec, turn));
  }

  const finalFailures = result.finalJudgmentSnapshot
    ? [
        ...evaluateFinalReviewDimensions(result.finalJudgmentSnapshot),
        ...detectCrossDimensionCopy(result.finalJudgmentSnapshot),
      ]
    : [];

  const crossCopyFailures = result.finalJudgmentSnapshot
    ? detectCrossDimensionCopy(result.finalJudgmentSnapshot)
    : [];

  const overallPass =
    criticalFailures.length === 0 &&
    finalFailures.length === 0 &&
    result.unsupportedInferences.length === 0 &&
    result.repeatedNextQuestions.length === 0;

  return {
    conversation: result,
    criticalFailures,
    finalFailures,
    crossCopyFailures,
    overallPass,
  };
}

export function formatFix3RevalidationReport(
  result: Day8iConversationResult,
  meta: Fix3RevalidationMeta,
  reval: Fix3RevalidationResult,
): string {
  const lines: string[] = [];
  lines.push('# ALABOM — DAY 8-I P0 FIX-3 REVALIDATION Report');
  lines.push('');
  lines.push('> **CPO 4차 독립 검증용.** Unit test PASS ≠ 이 문서 PASS. 동일 Full Pipeline 결과만 유효.');
  lines.push('');
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| Commit SHA | \`${meta.commitSha}\` |`);
  lines.push(`| Branch | \`${meta.branch}\` |`);
  lines.push(`| Executed (UTC) | ${meta.executedAt} |`);
  lines.push(`| Pipeline | ${meta.pipeline} |`);
  lines.push(`| V3 Review | ${meta.flags.v3ReviewPipeline ? 'ON' : 'OFF'} |`);
  lines.push(`| Judgment Aggregation | ${meta.flags.judgmentAggregation ? 'ON' : 'OFF'} |`);
  lines.push(`| Answer Semantic SoT | ${meta.flags.answerSemanticSot ? 'ON' : 'OFF'} |`);
  lines.push(`| **Overall CPO Revalidation** | **${reval.overallPass ? 'PASS' : 'FAIL'}** |`);
  lines.push(`| Critical turn failures | ${reval.criticalFailures.length} |`);
  lines.push(`| Unsupported inference | ${result.unsupportedInferences.length} |`);
  lines.push(`| Repeated next questions | ${result.repeatedNextQuestions.length} |`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Section A — 30-Turn Full Pipeline (Actual Results)');
  lines.push('');
  for (const t of result.turns) {
    lines.push(formatTurnBlock(t));
    lines.push('---');
    lines.push('');
  }

  lines.push('## Section B — Critical Turn Expected vs Actual');
  lines.push('');
  for (const spec of FIX3_CRITICAL_TURN_EXPECTATIONS) {
    const turn = result.turns[spec.turnIndex - 1];
    if (turn) {
      lines.push(formatCriticalTurnVerdict(spec, turn, reval.criticalFailures));
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('## Section C — 4 Dimension Evolution');
  lines.push('');
  const header =
    '| Turn | Customer | Problem | Solution | Customer Change |';
  const sep = '|------|----------|---------|----------|-----------------|';
  const rows = result.turns.map((t) => {
    const snap = t.judgmentSnapshot;
    if (!snap) return `| ${String(t.turnIndex).padStart(2, '0')} | — | — | — | — |`;
    const cell = (id: CeoJudgmentDimensionId) => {
      const d = snap.dimensions[id];
      const g = d.status === 'clear' ? '🟢' : d.status === 'needs_check' ? '🟡' : '🔴';
      return `${g} ${d.summary.slice(0, 36) || '(empty)'}`;
    };
    return `| ${String(t.turnIndex).padStart(2, '0')} | ${cell('customer')} | ${cell('problem')} | ${cell('solution')} | ${cell('customerChange')} |`;
  });
  lines.push([header, sep, ...rows].join('\n'));
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## Section D — Unsupported Inference');
  lines.push('');
  lines.push(buildUnsupportedInferenceSection(result));

  lines.push('---');
  lines.push('');
  lines.push('## Section E — Multi-fact Separation (T06, T16, T26)');
  lines.push('');
  lines.push(buildMultiFactSection(result));

  lines.push('---');
  lines.push('');
  lines.push('## Section F — Correction (T08, T22)');
  lines.push('');
  for (const idx of [8, 22]) {
    const t = result.turns[idx - 1];
    if (!t) continue;
    lines.push(formatCriticalTurnVerdict(
      FIX3_CRITICAL_TURN_EXPECTATIONS.find((s) => s.turnIndex === idx)!,
      t,
      reval.criticalFailures,
    ));
  }

  lines.push('---');
  lines.push('');
  lines.push('## Section G — Research Intent (T12, T24)');
  lines.push('');
  for (const idx of [12, 24]) {
    const t = result.turns[idx - 1];
    if (!t) continue;
    lines.push(formatCriticalTurnVerdict(
      FIX3_CRITICAL_TURN_EXPECTATIONS.find((s) => s.turnIndex === idx)!,
      t,
      reval.criticalFailures,
    ));
  }

  lines.push('---');
  lines.push('');
  lines.push('## Section H — No-gap / Anti-repeat');
  lines.push('');
  lines.push(buildNoGapSection(result));

  lines.push('---');
  lines.push('');
  lines.push('## Section I — Final Business Review (Turn 30 Actual Output)');
  lines.push('');
  if (result.finalReview && result.finalJudgmentSnapshot) {
    const r = result.finalReview;
    const j = result.finalJudgmentSnapshot;
    lines.push('### 한 줄 사업 이해');
    lines.push(r.oneLiner);
    lines.push('');
    lines.push('### 4 Dimension');
    for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
      const d = j.dimensions[id];
      lines.push(`${CEO_JUDGMENT_DIMENSION_LABELS[id]}: ${statusEmoji(d.status)} ${d.summary || '(empty)'}`);
    }
    lines.push('');
    lines.push('### Dimension Source Trace');
    lines.push(buildDimensionSourceMap(result));
    lines.push('### 현재 AI 판단');
    lines.push(`${r.aiJudgmentHeadline}`);
    lines.push(r.aiJudgmentBody);
    lines.push('');
    lines.push('### GO / 조건부 GO / NO-GO');
    lines.push(`${r.verdictEmoji} ${r.verdictLabel} — ${r.verdictExplanation}`);
    lines.push('');
    lines.push('### 다음 행동');
    lines.push(r.nextAction);
  }

  lines.push('---');
  lines.push('');
  lines.push('## Section J — R1~R17 CPO Verification');
  lines.push('');
  const rChecks = runCpoRSelfChecks();
  const rExtended = runCpoR13ToR25Checks();
  lines.push('### R1~R12');
  lines.push('| ID | Verdict | Rationale |');
  lines.push('|----|---------|-----------|');
  for (const c of rChecks) {
    lines.push(`| ${c.id} | **${c.verdict}** | ${c.rationale.replace(/\|/g, '/')} |`);
  }
  lines.push('');
  lines.push('### R13~R25');
  lines.push('| ID | Verdict | Rationale |');
  lines.push('|----|---------|-----------|');
  for (const c of rExtended) {
    lines.push(`| ${c.id} | **${c.verdict}** | ${c.rationale.replace(/\|/g, '/')} |`);
  }
  const allChecks = [...rChecks, ...rExtended];
  const failCount = allChecks.filter((c) => c.verdict === 'FAIL').length;
  lines.push('');
  lines.push(`R1~R25: ${allChecks.length - failCount}/${allChecks.length} PASS`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`Report generated: ${meta.executedAt}`);
  lines.push(`CPO Revalidation Gate: **${reval.overallPass ? 'PASS' : 'FAIL — CEO TEST HOLD / Production HOLD'}**`);

  return lines.join('\n');
}

export type { CeoJudgmentState };
