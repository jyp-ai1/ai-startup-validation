/**
 * DAY 8-I P0 FIX-4 — Accumulative dimension merge (existing fact + new refinement).
 */

import {
  CEO_JUDGMENT_DIMENSION_LABELS,
  type CeoJudgmentDimension,
  type CeoJudgmentDimensionId,
} from './ai-pm-ceo-judgment-dimensions';
import { isSemanticCopy } from './ai-pm-judgment-target-binding';
import { isAiPmJudgmentMeaningModelV1Active } from './ai-pm-judgment-meaning-model-v1';

const ACCUMULATIVE_MAX = 200;

function clip(text: string, max = ACCUMULATIVE_MAX): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function splitFacts(summary: string): string[] {
  return summary
    .replace(/…$/, '')
    .split(/\s*·\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
}

function isValidMeaningFact(fact: string): boolean {
  const t = fact.trim();
  if (t.length < 8) return false;
  if (/^(?:이|가|을|를|에서)\s/.test(t)) return false;
  if (/생겨서/.test(t) && t.length < 24) return false;
  return true;
}

function dedupeFacts(facts: string[]): string[] {
  const out: string[] = [];
  for (const fact of facts) {
    if (!isValidMeaningFact(fact)) continue;
    if (out.some((f) => isSemanticCopy(f, fact))) continue;
    out.push(fact);
  }
  return out;
}

/** Keep base + latest facts visible when over clip limit. */
function joinFacts(facts: string[]): string {
  const unique = dedupeFacts(facts);
  if (unique.length === 0) return '';
  const joined = unique.join(' · ');
  if (joined.length <= ACCUMULATIVE_MAX) return joined;
  if (unique.length <= 2) return clip(joined);
  const first = unique[0]!;
  const tail = unique.slice(-2).join(' · ');
  const compact = `${first} · … · ${tail}`;
  return compact.length <= ACCUMULATIVE_MAX ? compact : clip(compact);
}

function mergeFactList(priorFacts: string[], nextFact: string): string {
  const nf = nextFact.trim();
  if (!nf || !isValidMeaningFact(nf)) return joinFacts(priorFacts);
  const merged = dedupeFacts([...priorFacts, nf]);
  return joinFacts(merged);
}

const ACCUMULATIVE_DIMENSIONS: CeoJudgmentDimensionId[] = ['solution', 'problem'];

/**
 * Merge prior dimension with new extract — solution/problem accumulate distinct facts.
 */
export function mergeDimensionAccumulative(
  prior: CeoJudgmentDimension,
  next: Partial<CeoJudgmentDimension>,
): CeoJudgmentDimension {
  if (!isAiPmJudgmentMeaningModelV1Active()) {
    return { ...prior, ...next, label: CEO_JUDGMENT_DIMENSION_LABELS[prior.id] } as CeoJudgmentDimension;
  }
  if (!next.summary?.trim()) return prior;
  if (!ACCUMULATIVE_DIMENSIONS.includes(prior.id)) {
    return {
      ...prior,
      ...next,
      label: CEO_JUDGMENT_DIMENSION_LABELS[prior.id],
      summary: clip(next.summary!),
    };
  }

  if (!prior.summary.trim()) {
    return {
      ...prior,
      ...next,
      label: CEO_JUDGMENT_DIMENSION_LABELS[prior.id],
      summary: clip(next.summary!),
      statusReason: next.statusReason ?? 'CEO 답변에서 첫 evidence',
    };
  }

  if (isSemanticCopy(prior.summary, next.summary!)) {
    return prior;
  }

  const priorFacts = splitFacts(prior.summary);
  const nextTrim = next.summary!.trim();

  if (priorFacts.some((f) => isSemanticCopy(f, nextTrim))) {
    return {
      ...prior,
      ...next,
      label: CEO_JUDGMENT_DIMENSION_LABELS[prior.id],
      summary: joinFacts(priorFacts),
    };
  }

  const combined = mergeFactList(priorFacts, nextTrim);

  return {
    ...prior,
    ...next,
    label: CEO_JUDGMENT_DIMENSION_LABELS[prior.id],
    summary: combined,
    statusReason: 'CEO 답변 누적 — 기존 사실 + 새 구체화',
  };
}
