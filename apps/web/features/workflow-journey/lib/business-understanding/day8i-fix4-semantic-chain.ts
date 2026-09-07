/**
 * DAY 8-I P0 FIX-4 — Strict semantic chain validation (CPO P0-5).
 *
 * CEO Answer → Meaning → Evidence Span → Dimension → State
 * Any semantic mismatch → FAIL (not dimension-name-only PASS).
 */

import type { CeoJudgmentDimensionId } from './ai-pm-ceo-judgment-dimensions';
import { extractAnswerSemanticEvidences } from './ai-pm-answer-semantic-sot';
import { isSemanticCopy } from './ai-pm-judgment-target-binding';
import type { Day8iConversationTurnRecord } from './day8i-conversation-harness';
import { FIX3_CRITICAL_TURN_EXPECTATIONS } from './day8i-fix3-turn-acceptance';
import type { TurnAcceptanceFailure } from './day8i-fix3-turn-acceptance';

const FRAGMENT_EVIDENCE_RE = /^(?:이|가|을|를|에서)\s|(?:생겨서|해서)\s/;

const CHAIN_TURNS = new Set(
  FIX3_CRITICAL_TURN_EXPECTATIONS.filter(
    (s) => s.mustUpdate?.length || s.evidenceMustNotOverlap,
  ).map((s) => s.turnIndex),
);

function traceEntry(turn: Day8iConversationTurnRecord, dim: CeoJudgmentDimensionId) {
  return turn.trace?.dimensionEntries.find((e) => e.affectedDimension === dim);
}

function meaningForDimension(
  turn: Day8iConversationTurnRecord,
  dim: CeoJudgmentDimensionId,
): string | null {
  const { evidences } = extractAnswerSemanticEvidences(turn.ceoAnswer);
  return evidences.find((e) => e.dimension === dim)?.interpretedMeaning ?? null;
}

function whyChanged(
  turn: Day8iConversationTurnRecord,
  dim: CeoJudgmentDimensionId,
): string {
  const entry = traceEntry(turn, dim);
  if (!entry) return '(no update)';
  return `${entry.changeType}: ${entry.reason}`;
}

export function evaluateSemanticChain(turn: Day8iConversationTurnRecord): TurnAcceptanceFailure[] {
  if (!CHAIN_TURNS.has(turn.turnIndex)) return [];

  const failures: TurnAcceptanceFailure[] = [];
  const spec = FIX3_CRITICAL_TURN_EXPECTATIONS.find((s) => s.turnIndex === turn.turnIndex);
  const semantic = extractAnswerSemanticEvidences(turn.ceoAnswer);
  const traceDims =
    turn.trace?.dimensionEntries.map((e) => e.affectedDimension) ?? [];

  for (const dim of spec?.mustUpdate ?? []) {
    const meaning = meaningForDimension(turn, dim);
    const entry = traceEntry(turn, dim);
    const evidence = entry?.evidence ?? '';

    if (!meaning) {
      failures.push({
        turnIndex: turn.turnIndex,
        label: spec?.label ?? `T${turn.turnIndex}`,
        field: `semanticChain.${dim}.meaning`,
        expected: 'meaning extracted from CEO answer',
        actual: '(none)',
      });
    }

    if (!evidence.trim()) {
      failures.push({
        turnIndex: turn.turnIndex,
        label: spec?.label ?? `T${turn.turnIndex}`,
        field: `semanticChain.${dim}.evidence`,
        expected: 'evidence span in trace',
        actual: '(empty)',
      });
    } else if (FRAGMENT_EVIDENCE_RE.test(evidence)) {
      failures.push({
        turnIndex: turn.turnIndex,
        label: spec?.label ?? `T${turn.turnIndex}`,
        field: `semanticChain.${dim}.evidenceFragment`,
        expected: 'clean meaning-unit span (no causal fragment prefix)',
        actual: evidence,
      });
    }

    const semEv = semantic.evidences.find((e) => e.dimension === dim);
    if (
      semEv &&
      evidence &&
      semEv.evidence !== evidence &&
      !isSemanticCopy(semEv.evidence, evidence)
    ) {
      failures.push({
        turnIndex: turn.turnIndex,
        label: spec?.label ?? `T${turn.turnIndex}`,
        field: `semanticChain.${dim}.evidenceMismatch`,
        expected: semEv.evidence,
        actual: evidence,
      });
    }
  }

  if (spec?.evidenceMustNotOverlap && turn.trace?.dimensionEntries.length) {
    const entries = turn.trace.dimensionEntries;
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        const a = entries[i]!;
        const b = entries[j]!;
        if (
          isSemanticCopy(a.evidence, b.evidence) ||
          a.evidence.includes(b.evidence) ||
          b.evidence.includes(a.evidence)
        ) {
          failures.push({
            turnIndex: turn.turnIndex,
            label: spec.label,
            field: 'semanticChain.evidenceOverlap',
            expected: 'distinct evidence spans per dimension',
            actual: `${a.affectedDimension}="${a.evidence}" ⊂ ${b.affectedDimension}="${b.evidence}"`,
          });
        }
      }
    }
  }

  for (const dim of spec?.mustNotUpdate ?? []) {
    if (traceDims.includes(dim)) {
      failures.push({
        turnIndex: turn.turnIndex,
        label: spec?.label ?? `T${turn.turnIndex}`,
        field: `semanticChain.mustNotUpdate.${dim}`,
        expected: 'no dimension binding',
        actual: `trace includes ${dim}`,
      });
    }
  }

  return failures;
}

export function formatSemanticChainBlock(turn: Day8iConversationTurnRecord): string {
  const lines: string[] = [];
  const spec = FIX3_CRITICAL_TURN_EXPECTATIONS.find((s) => s.turnIndex === turn.turnIndex);
  if (!spec || !CHAIN_TURNS.has(turn.turnIndex)) return '';

  lines.push(`#### Turn ${String(turn.turnIndex).padStart(2, '0')} Semantic Chain`);
  lines.push('');
  lines.push('```text');
  lines.push(`CEO Answer: ${turn.ceoAnswer}`);
  lines.push('↓');

  const semantic = extractAnswerSemanticEvidences(turn.ceoAnswer);
  if (semantic.frozen) {
    lines.push('Meaning: frozen — no judgment update');
  } else if (semantic.nonJudgmentSlot) {
    lines.push(`Meaning: non-judgment (${semantic.nonJudgmentSlot})`);
  } else {
    for (const ev of semantic.evidences) {
      lines.push(`Meaning (${ev.dimension}): ${ev.interpretedMeaning}`);
      lines.push(`Evidence Span: ${ev.evidence}`);
      lines.push(`Expected Dimension: ${ev.dimension}`);
      const entry = traceEntry(turn, ev.dimension);
      lines.push(`Actual Dimension: ${entry ? ev.dimension : '(not in trace)'}`);
      if (entry) {
        lines.push(
          `Previous State: [${entry.previousJudgment.status}] "${entry.previousJudgment.summary || '(empty)'}"`,
        );
        lines.push(
          `New State: [${entry.newJudgment.status}] "${entry.newJudgment.summary || '(empty)'}"`,
        );
        lines.push(`Why Changed: ${whyChanged(turn, ev.dimension)}`);
      }
      lines.push('---');
    }
  }
  lines.push('```');
  lines.push('');
  return lines.join('\n');
}

export function evaluateAllSemanticChains(
  turns: Day8iConversationTurnRecord[],
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  for (const turn of turns) {
    failures.push(...evaluateSemanticChain(turn));
  }
  return failures;
}
