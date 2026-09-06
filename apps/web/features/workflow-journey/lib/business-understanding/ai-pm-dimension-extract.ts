/**
 * DAY 8-I — Semantic extraction of dimension-specific summaries from CEO answers.
 * Prevents copying the full utterance into every judgment dimension.
 */

import type { CeoJudgmentDimensionId } from './ai-pm-ceo-judgment-dimensions';
import { interpretAnswerSemantics } from './interpret-answer-semantics';

export type DimensionExtractHit = {
  summary: string;
  interpretedMeaning: string;
  evidence: string;
  reason: string;
};

const CLAUSE_SPLIT_RE = /(?:[,，;；]|(?:\s*(?:하고|그래서|때문에|해서|하려고|하려\s*합니다|인데|지만|에서|으로)\s*))/i;

const CUSTOMER_SEGMENT_RE =
  /(?:소규모\s*)?(?:양조장?|반찬|꽃집|가게|사장|소상공인|CEO|PM|스타트업|고객|타깃|사용자|원장|배송\s*하는)[^,.;]*/i;
const PROBLEM_SEGMENT_RE =
  /(?:불편|문제|어렵|힘들|누락|분리|따로|번거|복잡|없고|부족|관리(?:해야|하다)|실수|엑셀|카카오)[^,.;]*/i;
const SOLUTION_SEGMENT_RE =
  /(?:한\s*곳에서|하나로\s*연결|한눈에|하려고|하려\s*합니다|연결하려|SaaS|플랫폼|통합(?:하는|하)?|연결(?:하는|하)?|구축|만들(?:려|는)?|제공(?:하는|할)?)[^,.;]*/i;
const CUSTOMER_CHANGE_SEGMENT_RE =
  /(?:줄이|줄일|줄어|감소|단축|편해|좋아지|누락\s*(?:을|이)?\s*(?:줄|감)|확인\s*시간|비용|실수|배송\s*누락|아낄|절감)[^,.;]*/i;
const CURRENT_ALTERNATIVE_RE =
  /(?:엑셀|카카오|카톡|수기|직접\s*관리|기존|지금은|현재는)[^,.;]*/i;

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

function pickBestSegment(
  clauses: string[],
  re: RegExp,
  fallback?: string,
): string | null {
  for (const clause of clauses) {
    if (re.test(clause)) return clip(clause);
  }
  if (fallback && re.test(fallback)) return clip(fallback);
  return null;
}

function dimensionReason(id: CeoJudgmentDimensionId): string {
  switch (id) {
    case 'customer':
      return '고객 세그먼트/페르소나 단서에서 추출';
    case 'problem':
      return '불편·문제·기존 방식 단서에서 추출';
    case 'solution':
      return '해결 방법·제공 방식 단서에서 추출';
    case 'customerChange':
      return '고객 체감 변화·결과 단서에서 추출';
  }
}

/**
 * Extract per-dimension summaries from a single CEO answer.
 * Returns only dimensions with distinct semantic evidence in the answer.
 */
export function extractDimensionSummaries(
  answer: string,
): Partial<Record<CeoJudgmentDimensionId, DimensionExtractHit>> {
  const trimmed = answer.trim();
  if (trimmed.length < 4) return {};

  const clauses = splitClauses(trimmed);
  const semantic = interpretAnswerSemantics({ answer: trimmed });
  const out: Partial<Record<CeoJudgmentDimensionId, DimensionExtractHit>> = {};

  const customerSeg = pickBestSegment(clauses, CUSTOMER_SEGMENT_RE, trimmed);
  if (customerSeg) {
    const personaOnly = customerSeg.split(/(?:이\s*)?(?:엑셀|카카오|주문|배송)/i)[0]?.trim();
    out.customer = {
      summary: clip(personaOnly && personaOnly.length >= 4 ? personaOnly : customerSeg),
      interpretedMeaning: '이 답변에서 고객(누구)에 해당하는 부분',
      evidence: customerSeg,
      reason: dimensionReason('customer'),
    };
  }

  const altSeg = pickBestSegment(clauses, CURRENT_ALTERNATIVE_RE, trimmed);
  const problemSeg =
    pickBestSegment(clauses, PROBLEM_SEGMENT_RE, trimmed) ??
    (altSeg ? `현재 ${altSeg}(으)로 관리하며 불편함` : null);
  if (problemSeg) {
    const problemOnly =
      problemSeg.match(/(?:엑셀|카카오|누락|불편|문제|관리)[^,.;]*/i)?.[0] ?? problemSeg;
    const problemSummary =
      problemOnly.trim().length >= 4 ? problemOnly : problemSeg;
    out.problem = {
      summary: clip(problemSummary),
      interpretedMeaning: '이 답변에서 고객이 겪는 문제/불편에 해당하는 부분',
      evidence: problemSeg,
      reason: altSeg && !PROBLEM_SEGMENT_RE.test(trimmed)
        ? '기존 방식 단서를 문제 근거로 해석'
        : dimensionReason('problem'),
    };
  }

  const solutionSeg = pickBestSegment(clauses, SOLUTION_SEGMENT_RE, trimmed);
  if (solutionSeg) {
    const outcomeHeavy =
      CUSTOMER_CHANGE_SEGMENT_RE.test(solutionSeg) &&
      !/(하려고|하려\s*합니다|SaaS|플랫폼|만들)/.test(solutionSeg);
    out.solution = {
      summary: solutionSeg,
      interpretedMeaning: outcomeHeavy
        ? '해결 방향 단서 (고객 변화와 구분 필요)'
        : '이 답변에서 무엇으로 해결하는지에 해당하는 부분',
      evidence: solutionSeg,
      reason: outcomeHeavy
        ? '방법·결과 혼재 — 해결 방법은 needs_check'
        : dimensionReason('solution'),
    };
  }

  const changeSeg =
    pickBestSegment(clauses, CUSTOMER_CHANGE_SEGMENT_RE, trimmed) ??
    (/줄이|단축|감소|좋아지|편해|아낄/.test(trimmed) ? clip(trimmed) : null);
  if (changeSeg) {
    out.customerChange = {
      summary: clip(changeSeg),
      interpretedMeaning: '이 답변에서 사용 후 달라지는 점에 해당하는 부분',
      evidence: changeSeg,
      reason: dimensionReason('customerChange'),
    };
  } else if (
    /(줄이|단축|감소|좋아지|편해)/.test(trimmed) &&
    !out.customerChange
  ) {
    out.customerChange = {
      summary: clip(trimmed),
      interpretedMeaning: '고객 체감 변화/결과 단서',
      evidence: trimmed,
      reason: dimensionReason('customerChange'),
    };
  }

  for (const hit of semantic.facts) {
    const map: Partial<Record<string, CeoJudgmentDimensionId>> = {
      customer: 'customer',
      problem: 'problem',
      business: 'solution',
      diffRelevance: 'customerChange',
      differentiation: 'solution',
    };
    const dim = map[hit.key];
    if (!dim || out[dim]) continue;
    if (hit.key === 'business' && !SOLUTION_SEGMENT_RE.test(trimmed)) continue;
    const seg = pickBestSegment(clauses, dim === 'customer' ? CUSTOMER_SEGMENT_RE : dim === 'problem' ? PROBLEM_SEGMENT_RE : dim === 'customerChange' ? CUSTOMER_CHANGE_SEGMENT_RE : SOLUTION_SEGMENT_RE, trimmed);
    if (!seg && hit.key !== 'customer' && hit.key !== 'problem') continue;
    out[dim] = {
      summary: clip(seg ?? trimmed),
      interpretedMeaning: `semantic factKey=${hit.key} 라우팅`,
      evidence: seg ?? trimmed,
      reason: dimensionReason(dim),
    };
  }

  return dedupeIdenticalSummaries(out);
}

function dedupeIdenticalSummaries(
  hits: Partial<Record<CeoJudgmentDimensionId, DimensionExtractHit>>,
): Partial<Record<CeoJudgmentDimensionId, DimensionExtractHit>> {
  const priority: CeoJudgmentDimensionId[] = [
    'customer',
    'problem',
    'solution',
    'customerChange',
  ];
  const result = { ...hits };

  for (const id of priority) {
    const hit = result[id];
    if (!hit) continue;
    for (const other of priority) {
      if (other === id) continue;
      const otherHit = result[other];
      if (!otherHit) continue;
      if (hit.summary.trim() !== otherHit.summary.trim()) continue;
      if (priority.indexOf(id) < priority.indexOf(other)) {
        delete result[other];
      }
    }
  }

  return result;
}
