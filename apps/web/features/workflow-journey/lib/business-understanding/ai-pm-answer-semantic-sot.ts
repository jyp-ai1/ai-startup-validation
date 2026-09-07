/**
 * DAY 8-I P0 FIX-3 — Answer Semantic Source of Truth.
 *
 * Flow (mandatory):
 *   CEO Answer → Meaning Extraction → Evidence → Affected Dimension(s) → Judgment Update
 *
 * Question slot / factKey must NEVER force a dimension without answer evidence.
 */

import type { CeoJudgmentDimensionId } from './ai-pm-ceo-judgment-dimensions';
import { isAiPmAnswerSemanticSotV1Active } from './ai-pm-answer-semantic-sot-v1';
import {
  isCustomerCorrectionAnswer,
  isInferenceRiskAnswer,
  isPartialUnknownAnswer,
  isProblemCorrectionAnswer,
  isSemanticCopy,
  isVagueOrUnknownAnswer,
} from './ai-pm-judgment-target-binding';

export type AnswerSemanticSlot =
  | 'customer'
  | 'problem'
  | 'solution'
  | 'customerChange'
  | 'payer'
  | 'businessGoal'
  | 'marketUnknown'
  | 'researchIntent'
  | 'hypothesis'
  | 'none';

export type AnswerSemanticEvidence = {
  dimension: CeoJudgmentDimensionId;
  summary: string;
  evidence: string;
  interpretedMeaning: string;
  reason: string;
};

export type AnswerSemanticExtraction = {
  evidences: AnswerSemanticEvidence[];
  nonJudgmentSlot: AnswerSemanticSlot | null;
  frozen: boolean;
};

/** Avoid splitting on `에서` — breaks phrases like `한 곳에서`. */
const CLAUSE_SPLIT_RE = /(?:[,，;；]|(?:\s*(?:하고|그래서|때문에|해서|인데|지만)\s*))/i;

const CUSTOMER_SEGMENT_RE =
  /(?:소규모\s*)?(?:양조장?|반찬|꽃집|가게|사장|소상공인|CEO|PM|스타트업|고객|타깃|사용자|원장)[^,.;]*/i;
const PROBLEM_SEGMENT_RE =
  /(?:불편|문제|어렵|힘들|누락|분리|따로|번거|복잡|실수|확인\s*시간|엑셀|카카오|카톡|놓치|재주문)[^,.;]*/i;
const SOLUTION_SEGMENT_RE =
  /(?:한\s*곳에서|하나로\s*연결|한눈에|관리하려(?:고|는)?|하려고|하려\s*합니다|SaaS|플랫폼|통합|MVP|체크리스트|모바일|연결(?:하는|하)?|만들(?:려|는)?)/i;
const CUSTOMER_CHANGE_SEGMENT_RE =
  /(?:(?:줄이|줄일|단축|감소|아낄|절감).*(?:수\s*있|할\s*수|기대|목표)|(?:편해|좋아지).*(?:질|진|다)|확인\s*시간\s*(?:을\s*)?(?:단축|줄)|누락\s*(?:을|이)?\s*(?:줄|감).*(?:수\s*있|기대|목표)|가장\s*큰\s*변화)/i;
const PAYER_RE = /(?:월\s*구독|\d+\s*만\s*원|직접\s*결제|수수료|요금|수익\s*은)/i;
const BUSINESS_GOAL_RE = /(?:\d+\s*곳|1년\s*내|목표로)/i;
const RESEARCH_INTENT_RE = /(?:확인해\s*주세요|조사(?:해|를)?|research|경쟁사)/i;
const HYPOTHESIS_RE = /(?:가설|80%|줄일\s*수\s*있다)/i;

function clip(text: string, max = 72): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function splitClauses(text: string): string[] {
  return text
    .split(CLAUSE_SPLIT_RE)
    .map((c) => c.trim())
    .filter((c) => c.length >= 3);
}

function dimensionReason(id: CeoJudgmentDimensionId): string {
  switch (id) {
    case 'customer':
      return 'CEO 답변에서 고객 세그먼트 evidence 추출';
    case 'problem':
      return 'CEO 답변에서 문제/불편 evidence 추출';
    case 'solution':
      return 'CEO 답변에서 해결 방법 evidence 추출';
    case 'customerChange':
      return 'CEO 답변에서 고객 체감 변화 evidence 추출';
  }
}

function pickSegment(clauses: string[], re: RegExp, fallback?: string): string | null {
  for (const clause of clauses) {
    if (re.test(clause)) return clip(clause);
  }
  if (fallback && re.test(fallback)) return clip(fallback);
  return null;
}

function detectNonJudgmentSlot(answer: string): AnswerSemanticSlot | null {
  const t = answer.trim();
  if (RESEARCH_INTENT_RE.test(t)) return 'researchIntent';
  if (BUSINESS_GOAL_RE.test(t) && /\d+\s*곳|목표/.test(t)) return 'businessGoal';
  if (PAYER_RE.test(t) && !PROBLEM_SEGMENT_RE.test(t.replace(/결제|구독|만원|수익/g, ''))) {
    return 'payer';
  }
  if (isPartialUnknownAnswer(t) && /시장\s*규모|유지율|측정/.test(t)) return 'marketUnknown';
  return null;
}

function extractCustomerEvidence(clauses: string[], trimmed: string): AnswerSemanticEvidence | null {
  const seg = pickSegment(clauses, CUSTOMER_SEGMENT_RE, trimmed);
  if (!seg) return null;
  if (PAYER_RE.test(seg) && !/(양조|반찬|꽃집|사장|소상공인|고객)/.test(seg)) return null;
  if (PROBLEM_SEGMENT_RE.test(seg) && !CUSTOMER_SEGMENT_RE.test(seg.split(/(?:엑셀|누락|문제)/)[0] ?? '')) {
    return null;
  }
  const persona = seg.split(/(?:이\s*)?(?:엑셀|카카오|주문|배송|누락)/i)[0]?.trim();
  const summary = clip(persona && persona.length >= 4 ? persona : seg);
  return {
    dimension: 'customer',
    summary,
    evidence: seg,
    interpretedMeaning: 'CEO 답변 — 고객(누구) evidence',
    reason: dimensionReason('customer'),
  };
}

function extractProblemEvidence(clauses: string[], trimmed: string): AnswerSemanticEvidence | null {
  if (/가장\s*큰\s*변화|변화입니다/.test(trimmed)) return null;
  for (const clause of clauses) {
    if (CUSTOMER_CHANGE_SEGMENT_RE.test(clause) && /(?:수\s*있|기대|목표|달라)/.test(clause)) {
      continue;
    }
    if (SOLUTION_SEGMENT_RE.test(clause) && !PROBLEM_SEGMENT_RE.test(clause)) continue;
    if (PROBLEM_SEGMENT_RE.test(clause)) {
      const problemOnly =
        clause.match(/(?:엑셀|카카오|누락|불편|문제|관리|실수|확인\s*시간|따로|놓치|재주문|심각)[^,.;]*/i)?.[0] ??
        clause;
      return {
        dimension: 'problem',
        summary: clip(problemOnly.trim().length >= 4 ? problemOnly : clause),
        evidence: clip(clause),
        interpretedMeaning: 'CEO 답변 — 문제/불편 evidence',
        reason: dimensionReason('problem'),
      };
    }
  }
  const alt = pickSegment(clauses, /(?:엑셀|카카오|카톡|수기)/i, trimmed);
  if (alt && PROBLEM_SEGMENT_RE.test(trimmed)) {
    return {
      dimension: 'problem',
      summary: clip(`현재 ${alt}(으)로 관리하며 불편`),
      evidence: alt,
      interpretedMeaning: 'CEO 답변 — 기존 방식/문제 evidence',
      reason: 'CEO 답변에서 기존 방식·문제 evidence 추출',
    };
  }
  return null;
}

function extractSolutionEvidence(clauses: string[], trimmed: string): AnswerSemanticEvidence | null {
  for (const clause of clauses) {
    if (/(?:줄이|단축|감소)\s*(?:할|수|기대)/.test(clause) && !SOLUTION_SEGMENT_RE.test(clause)) {
      continue;
    }
    if (SOLUTION_SEGMENT_RE.test(clause)) {
      return {
        dimension: 'solution',
        summary: clip(clause),
        evidence: clip(clause),
        interpretedMeaning: 'CEO 답변 — 해결 방법 evidence',
        reason: dimensionReason('solution'),
      };
    }
  }
  const seg = pickSegment(clauses, SOLUTION_SEGMENT_RE, trimmed);
  if (!seg) return null;
  return {
    dimension: 'solution',
    summary: seg,
    evidence: seg,
    interpretedMeaning: 'CEO 답변 — 해결 방법 evidence',
    reason: dimensionReason('solution'),
  };
}

function extractCustomerChangeEvidence(clauses: string[], trimmed: string): AnswerSemanticEvidence | null {
  if (/가장\s*큰\s*변화|변화입니다/.test(trimmed)) {
    return {
      dimension: 'customerChange',
      summary: clip(trimmed),
      evidence: trimmed,
      interpretedMeaning: 'CEO 답변 — 고객 체감 변화 evidence',
      reason: dimensionReason('customerChange'),
    };
  }
  const seg = pickSegment(clauses, CUSTOMER_CHANGE_SEGMENT_RE, trimmed);
  if (!seg) return null;
  if (PROBLEM_SEGMENT_RE.test(seg) && !/(?:수\s*있|기대|목표|달라|변화|단축|줄)/.test(seg)) {
    return null;
  }
  return {
    dimension: 'customerChange',
    summary: clip(seg),
    evidence: seg,
    interpretedMeaning: 'CEO 답변 — 고객 체감 변화 evidence',
    reason: dimensionReason('customerChange'),
  };
}

function dedupeEvidences(evidences: AnswerSemanticEvidence[]): AnswerSemanticEvidence[] {
  const out: AnswerSemanticEvidence[] = [];
  for (const ev of evidences) {
    const dup = out.find(
      (e) =>
        e.dimension !== ev.dimension &&
        isSemanticCopy(e.summary, ev.summary),
    );
    if (dup) {
      const priority: CeoJudgmentDimensionId[] =
        /가장\s*큰\s*변화|변화입니다/.test(ev.evidence) ||
        /가장\s*큰\s*변화|변화입니다/.test(dup.evidence)
          ? ['customerChange', 'customer', 'problem', 'solution']
          : ['customer', 'problem', 'solution', 'customerChange'];
      if (priority.indexOf(ev.dimension) < priority.indexOf(dup.dimension)) {
        const idx = out.indexOf(dup);
        out[idx] = ev;
      }
      continue;
    }
    if (!out.some((e) => e.dimension === ev.dimension)) out.push(ev);
  }
  return out;
}

/**
 * Extract semantic evidences from CEO answer — dimensions determined ONLY by answer text.
 */
export function extractAnswerSemanticEvidences(answer: string): AnswerSemanticExtraction {
  const trimmed = answer.trim();
  if (trimmed.length < 4) {
    return { evidences: [], nonJudgmentSlot: null, frozen: false };
  }

  if (isInferenceRiskAnswer(trimmed)) {
    return { evidences: [], nonJudgmentSlot: null, frozen: true };
  }

  const nonJudgmentSlot = detectNonJudgmentSlot(trimmed);
  if (nonJudgmentSlot === 'researchIntent') {
    return { evidences: [], nonJudgmentSlot, frozen: false };
  }

  if (isVagueOrUnknownAnswer(trimmed) || isPartialUnknownAnswer(trimmed)) {
    return {
      evidences: [],
      nonJudgmentSlot: nonJudgmentSlot ?? 'marketUnknown',
      frozen: true,
    };
  }
  if (nonJudgmentSlot === 'payer' || nonJudgmentSlot === 'businessGoal') {
    return { evidences: [], nonJudgmentSlot, frozen: false };
  }

  const clauses = splitClauses(trimmed);

  if (isCustomerCorrectionAnswer(trimmed)) {
    const c = extractCustomerEvidence(clauses, trimmed);
    return {
      evidences: c ? [{ ...c, reason: 'CEO가 고객 정의를 수정함' }] : [],
      nonJudgmentSlot: null,
      frozen: false,
    };
  }

  if (isProblemCorrectionAnswer(trimmed)) {
    const p = extractProblemEvidence(clauses, trimmed);
    return {
      evidences: p ? [{ ...p, reason: 'CEO가 문제 정의를 수정함' }] : [],
      nonJudgmentSlot: null,
      frozen: false,
    };
  }

  const collected: AnswerSemanticEvidence[] = [];
  const customer = extractCustomerEvidence(clauses, trimmed);
  const problem = extractProblemEvidence(clauses, trimmed);
  const solution = extractSolutionEvidence(clauses, trimmed);
  const change = extractCustomerChangeEvidence(clauses, trimmed);

  if (customer) collected.push(customer);
  if (problem) collected.push(problem);
  if (solution) collected.push(solution);
  if (change) collected.push(change);

  if (HYPOTHESIS_RE.test(trimmed) && !change && !problem) {
    collected.push({
      dimension: 'customerChange',
      summary: clip(trimmed),
      evidence: trimmed,
      interpretedMeaning: 'CEO 답변 — 검증 가설/기대 효과 evidence',
      reason: 'CEO 답변에서 가설·기대 효과 evidence 추출',
    });
  }

  return {
    evidences: dedupeEvidences(collected),
    nonJudgmentSlot,
    frozen: false,
  };
}

export function semanticEvidencesToDimensionHits(
  extraction: AnswerSemanticExtraction,
): Partial<
  Record<
    CeoJudgmentDimensionId,
    { summary: string; interpretedMeaning: string; evidence: string; reason: string }
  >
> {
  if (!isAiPmAnswerSemanticSotV1Active()) return {};
  const out: Partial<
    Record<
      CeoJudgmentDimensionId,
      { summary: string; interpretedMeaning: string; evidence: string; reason: string }
    >
  > = {};
  for (const ev of extraction.evidences) {
    out[ev.dimension] = {
      summary: ev.summary,
      interpretedMeaning: ev.interpretedMeaning,
      evidence: ev.evidence,
      reason: ev.reason,
    };
  }
  return out;
}
