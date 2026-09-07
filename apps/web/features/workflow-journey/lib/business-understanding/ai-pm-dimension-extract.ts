/**
 * DAY 8-I — Semantic extraction of dimension-specific summaries from CEO answers.
 * FIX-3: Answer Semantic SoT — CEO answer text determines dimensions, not question slot.
 */

import type { CeoJudgmentDimensionId } from './ai-pm-ceo-judgment-dimensions';
import {
  extractAnswerSemanticEvidences,
  semanticEvidencesToDimensionHits,
} from './ai-pm-answer-semantic-sot';
import { isAiPmAnswerSemanticSotV1Active } from './ai-pm-answer-semantic-sot-v1';
import {
  isCustomerCorrectionAnswer,
  isProblemCorrectionAnswer,
  isSemanticCopy,
} from './ai-pm-judgment-target-binding';
import type { JudgmentAnswerContext } from './ai-pm-judgment-target-binding';

export type DimensionExtractHit = {
  summary: string;
  interpretedMeaning: string;
  evidence: string;
  reason: string;
};

export type ExtractDimensionOptions = {
  targetGap?: string | null;
  issueId?: JudgmentAnswerContext['issueId'];
  allowMultiFact?: boolean;
};

/**
 * Extract per-dimension summaries from a single CEO answer.
 * FIX-3 flow: Answer → Semantic Evidence → Affected Dimension(s) only.
 */
export function extractDimensionSummaries(
  answer: string,
  options?: ExtractDimensionOptions,
): Partial<Record<CeoJudgmentDimensionId, DimensionExtractHit>> {
  const trimmed = answer.trim();
  if (trimmed.length < 4) return {};

  if (isAiPmAnswerSemanticSotV1Active()) {
    const extraction = extractAnswerSemanticEvidences(trimmed);
    if (extraction.frozen || extraction.nonJudgmentSlot === 'researchIntent' ||
        extraction.nonJudgmentSlot === 'payer' ||
        extraction.nonJudgmentSlot === 'businessGoal') {
      return {};
    }
    return semanticEvidencesToDimensionHits(extraction);
  }

  return extractDimensionSummariesLegacy(trimmed, options);
}

/** @deprecated Legacy path — kept for flag-off rollback only. */
function extractDimensionSummariesLegacy(
  trimmed: string,
  options?: ExtractDimensionOptions,
): Partial<Record<CeoJudgmentDimensionId, DimensionExtractHit>> {
  const clauses = trimmed.split(/(?:[,，;；]|(?:\s*(?:하고|그래서|때문에|해서)\s*))/i).map((c) => c.trim()).filter(Boolean);

  if (isCustomerCorrectionAnswer(trimmed)) {
    const hit = legacyExtractCustomer(clauses, trimmed);
    return hit ? { customer: hit } : {};
  }
  if (isProblemCorrectionAnswer(trimmed)) {
    const hit = legacyExtractProblem(clauses, trimmed);
    return hit ? { problem: hit } : {};
  }

  const out: Partial<Record<CeoJudgmentDimensionId, DimensionExtractHit>> = {};
  const c = legacyExtractCustomer(clauses, trimmed);
  const p = legacyExtractProblem(clauses, trimmed);
  const s = legacyExtractSolution(clauses, trimmed);
  const ch = legacyExtractChange(clauses, trimmed);
  if (c) out.customer = c;
  if (p) out.problem = p;
  if (s) out.solution = s;
  if (ch) out.customerChange = ch;

  return dedupeLegacy(out);
}

function clip(text: string, max = 72): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function legacyExtractCustomer(clauses: string[], trimmed: string): DimensionExtractHit | null {
  const re = /(?:양조|반찬|꽃집|사장|소상공인|고객)/i;
  const seg = clauses.find((c) => re.test(c)) ?? (re.test(trimmed) ? trimmed : null);
  if (!seg) return null;
  return {
    summary: clip(seg),
    interpretedMeaning: 'legacy customer extract',
    evidence: clip(seg),
    reason: 'legacy',
  };
}

function legacyExtractProblem(clauses: string[], trimmed: string): DimensionExtractHit | null {
  const re = /(?:누락|불편|문제|엑셀|따로|실수)/i;
  const seg = clauses.find((c) => re.test(c)) ?? (re.test(trimmed) ? trimmed : null);
  if (!seg) return null;
  return {
    summary: clip(seg),
    interpretedMeaning: 'legacy problem extract',
    evidence: clip(seg),
    reason: 'legacy',
  };
}

function legacyExtractSolution(clauses: string[], trimmed: string): DimensionExtractHit | null {
  const re = /(?:SaaS|한\s*곳|MVP|통합|하려고)/i;
  const seg = clauses.find((c) => re.test(c)) ?? (re.test(trimmed) ? trimmed : null);
  if (!seg) return null;
  return {
    summary: clip(seg),
    interpretedMeaning: 'legacy solution extract',
    evidence: clip(seg),
    reason: 'legacy',
  };
}

function legacyExtractChange(clauses: string[], trimmed: string): DimensionExtractHit | null {
  const re = /(?:줄이|단축|감소|변화)/i;
  const seg = clauses.find((c) => re.test(c) && /(?:수\s*있|기대|목표|달라|변화)/.test(c)) ??
    (re.test(trimmed) ? trimmed : null);
  if (!seg) return null;
  return {
    summary: clip(seg),
    interpretedMeaning: 'legacy change extract',
    evidence: clip(seg),
    reason: 'legacy',
  };
}

function dedupeLegacy(
  hits: Partial<Record<CeoJudgmentDimensionId, DimensionExtractHit>>,
): Partial<Record<CeoJudgmentDimensionId, DimensionExtractHit>> {
  const ids: CeoJudgmentDimensionId[] = ['customer', 'problem', 'solution', 'customerChange'];
  const result = { ...hits };
  for (let i = 0; i < ids.length; i += 1) {
    const a = ids[i]!;
    if (!result[a]) continue;
    for (let j = i + 1; j < ids.length; j += 1) {
      const b = ids[j]!;
      if (result[b] && isSemanticCopy(result[a]!.summary, result[b]!.summary)) {
        delete result[b];
      }
    }
  }
  return result;
}
