/**
 * DAY 8-I — Semantic extraction of dimension-specific summaries from CEO answers.
 * P0 FIX: Question target binding + semantic copy prevention.
 */

import type { CeoJudgmentDimensionId } from './ai-pm-ceo-judgment-dimensions';
import {
  isCustomerCorrectionAnswer,
  isProblemCorrectionAnswer,
  isSemanticCopy,
  resolveJudgmentTargetDimension,
  type JudgmentAnswerContext,
} from './ai-pm-judgment-target-binding';
import { isAiPmJudgmentTargetBindingV1Active } from './ai-pm-judgment-target-binding-v1';
import { interpretAnswerSemantics } from './interpret-answer-semantics';

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

const CLAUSE_SPLIT_RE = /(?:[,，;；]|(?:\s*(?:하고|그래서|때문에|해서|인데|지만|에서|으로)\s*))/i;

const CUSTOMER_SEGMENT_RE =
  /(?:소규모\s*)?(?:양조장?|반찬|꽃집|가게|사장|소상공인|CEO|PM|스타트업|고객|타깃|사용자|원장|배송\s*하는)[^,.;]*/i;
const PROBLEM_SEGMENT_RE =
  /(?:불편|문제|어렵|힘들|누락|분리|따로|번거|복잡|없고|부족|관리(?:해야|하다)|실수|엑셀|카카오)[^,.;]*/i;
const SOLUTION_SEGMENT_RE =
  /(?:한\s*곳에서|하나로\s*연결|한눈에|하려고|하려\s*합니다|연결하려|SaaS|플랫폼|통합(?:하는|하)?|연결(?:하는|하)?|구축|만들(?:려|는)?|제공(?:하는|할)?|MVP|체크리스트)[^,.;]*/i;
/** Outcome/change — requires future/imperative outcome, not bare symptom. */
const CUSTOMER_CHANGE_SEGMENT_RE =
  /(?:(?:줄이|줄일|단축|감소|아낄|절감).*(?:수\s*있|할\s*수|될\s*수|기대)|(?:편해|좋아지).*(?:질|진|다)|확인\s*시간\s*(?:을\s*)?(?:단축|줄)|누락\s*(?:을|이)?\s*(?:줄|감).*(?:수\s*있|기대|목표))/i;
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

function extractCustomer(trimmed: string, clauses: string[]): DimensionExtractHit | null {
  const customerSeg = pickBestSegment(clauses, CUSTOMER_SEGMENT_RE, trimmed);
  if (!customerSeg) return null;
  const personaOnly = customerSeg.split(/(?:이\s*)?(?:엑셀|카카오|주문|배송)/i)[0]?.trim();
  return {
    summary: clip(personaOnly && personaOnly.length >= 4 ? personaOnly : customerSeg),
    interpretedMeaning: '이 답변에서 고객(누구)에 해당하는 부분',
    evidence: customerSeg,
    reason: dimensionReason('customer'),
  };
}

function extractProblem(trimmed: string, clauses: string[]): DimensionExtractHit | null {
  const altSeg = pickBestSegment(clauses, CURRENT_ALTERNATIVE_RE, trimmed);
  for (const clause of clauses) {
    if (CUSTOMER_CHANGE_SEGMENT_RE.test(clause) && /(?:수\s*있|할\s*수|기대|목표)/.test(clause)) {
      continue;
    }
    if (PROBLEM_SEGMENT_RE.test(clause) || (altSeg && clause.includes(altSeg.slice(0, 8)))) {
      const problemOnly =
        clause.match(/(?:엑셀|카카오|누락|불편|문제|관리|실수|확인\s*시간|따로)[^,.;]*/i)?.[0] ?? clause;
      const problemSummary = problemOnly.trim().length >= 4 ? problemOnly : clause;
      return {
        summary: clip(problemSummary),
        interpretedMeaning: '이 답변에서 고객이 겪는 문제/불편에 해당하는 부분',
        evidence: clip(clause),
        reason: altSeg && !PROBLEM_SEGMENT_RE.test(trimmed)
          ? '기존 방식 단서를 문제 근거로 해석'
          : dimensionReason('problem'),
      };
    }
  }
  const problemSeg =
    pickBestSegment(clauses, PROBLEM_SEGMENT_RE, trimmed) ??
    (altSeg ? `현재 ${altSeg}(으)로 관리하며 불편함` : null);
  if (!problemSeg || (CUSTOMER_CHANGE_SEGMENT_RE.test(problemSeg) && !CURRENT_ALTERNATIVE_RE.test(problemSeg))) {
    return null;
  }
  const problemOnly =
    problemSeg.match(/(?:엑셀|카카오|누락|불편|문제|관리|실수|확인\s*시간)[^,.;]*/i)?.[0] ?? problemSeg;
  const problemSummary = problemOnly.trim().length >= 4 ? problemOnly : problemSeg;
  return {
    summary: clip(problemSummary),
    interpretedMeaning: '이 답변에서 고객이 겪는 문제/불편에 해당하는 부분',
    evidence: problemSeg,
    reason: altSeg && !PROBLEM_SEGMENT_RE.test(trimmed)
      ? '기존 방식 단서를 문제 근거로 해석'
      : dimensionReason('problem'),
  };
}

function extractSolution(trimmed: string, clauses: string[]): DimensionExtractHit | null {
  for (const clause of clauses) {
    if (/한\s*곳에서|하려고|SaaS|MVP|체크리스트|통합/.test(clause) && !/(?:줄이|단축|감소)\s*(?:할|수)/.test(clause)) {
      return {
        summary: clip(clause),
        interpretedMeaning: '이 답변에서 무엇으로 해결하는지에 해당하는 부분',
        evidence: clip(clause),
        reason: dimensionReason('solution'),
      };
    }
  }
  const solutionSeg =
    pickBestSegment(clauses, SOLUTION_SEGMENT_RE, trimmed) ??
    (SOLUTION_SEGMENT_RE.test(trimmed) ? clip(trimmed) : null);
  if (!solutionSeg) return null;
  const outcomeHeavy =
    /(?:줄이|단축|감소)/.test(solutionSeg) &&
    !/(하려고|하려\s*합니다|SaaS|플랫폼|만들|MVP|체크리스트|통합)/.test(solutionSeg);
  if (outcomeHeavy) return null;
  return {
    summary: solutionSeg,
    interpretedMeaning: '이 답변에서 무엇으로 해결하는지에 해당하는 부분',
    evidence: solutionSeg,
    reason: dimensionReason('solution'),
  };
}

function extractCustomerChange(trimmed: string, clauses: string[]): DimensionExtractHit | null {
  const changeSeg = pickBestSegment(clauses, CUSTOMER_CHANGE_SEGMENT_RE, trimmed);
  if (!changeSeg) {
    if (
      /(?:줄이|단축|감소|아낄).*(?:수\s*있|할\s*수|기대|목표)/.test(trimmed) &&
      !PROBLEM_SEGMENT_RE.test(trimmed.replace(/줄이|단축|감소/g, ''))
    ) {
      return {
        summary: clip(trimmed),
        interpretedMeaning: '이 답변에서 사용 후 달라지는 점에 해당하는 부분',
        evidence: trimmed,
        reason: dimensionReason('customerChange'),
      };
    }
    return null;
  }
  if (PROBLEM_SEGMENT_RE.test(changeSeg) && !/(수\s*있|기대|목표|달라)/.test(changeSeg)) {
    return null;
  }
  return {
    summary: clip(changeSeg),
    interpretedMeaning: '이 답변에서 사용 후 달라지는 점에 해당하는 부분',
    evidence: changeSeg,
    reason: dimensionReason('customerChange'),
  };
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

  for (let i = 0; i < priority.length; i += 1) {
    const id = priority[i]!;
    const hit = result[id];
    if (!hit) continue;
    for (let j = i + 1; j < priority.length; j += 1) {
      const other = priority[j]!;
      const otherHit = result[other];
      if (!otherHit) continue;
      if (isSemanticCopy(hit.summary, otherHit.summary)) {
        delete result[other];
      }
    }
  }

  return result;
}

function extractAllDimensions(
  trimmed: string,
  clauses: string[],
): Partial<Record<CeoJudgmentDimensionId, DimensionExtractHit>> {
  const out: Partial<Record<CeoJudgmentDimensionId, DimensionExtractHit>> = {};

  const customer = extractCustomer(trimmed, clauses);
  if (customer) out.customer = customer;

  const problem = extractProblem(trimmed, clauses);
  if (problem) out.problem = problem;

  const solution = extractSolution(trimmed, clauses);
  if (solution) out.solution = solution;

  const change = extractCustomerChange(trimmed, clauses);
  if (change) out.customerChange = change;

  return out;
}

/**
 * Extract per-dimension summaries from a single CEO answer.
 * P0: respects question target; prevents semantic copy across dimensions.
 */
export function extractDimensionSummaries(
  answer: string,
  options?: ExtractDimensionOptions,
): Partial<Record<CeoJudgmentDimensionId, DimensionExtractHit>> {
  const trimmed = answer.trim();
  if (trimmed.length < 4) return {};

  const clauses = splitClauses(trimmed);
  const allowMultiFact = options?.allowMultiFact ?? false;

  if (isCustomerCorrectionAnswer(trimmed)) {
    const customer = extractCustomer(trimmed, clauses);
    if (customer) {
      return {
        customer: {
          ...customer,
          interpretedMeaning: '고객 정정 — customer dimension에 반영',
          reason: 'CEO가 고객 정의를 수정함',
        },
      };
    }
  }

  if (isProblemCorrectionAnswer(trimmed)) {
    const problem = extractProblem(trimmed, clauses);
    if (problem) {
      return {
        problem: {
          ...problem,
          interpretedMeaning: '문제 정정 — problem dimension에 반영',
          reason: 'CEO가 문제 정의를 수정함',
        },
      };
    }
  }

  const target = isAiPmJudgmentTargetBindingV1Active()
    ? resolveJudgmentTargetDimension({
        answer: trimmed,
        targetGap: options?.targetGap,
        issueId: options?.issueId,
        allowMultiFact,
      })
    : null;

  let out = extractAllDimensions(trimmed, clauses);

  if (target && !allowMultiFact) {
    const single = out[target];
    if (single) {
      out = { [target]: single };
    } else {
      const PROBLEM_OVERRIDE_RE = /(?:엑셀|누락|불편|따로\s*관리|실수|카카오)/i;
      const CUSTOMER_OVERRIDE_RE = /(?:양조|반찬|꽃집|사장|소상공인|고객|타깃)/i;
      if (target === 'customerChange' && out.problem && PROBLEM_OVERRIDE_RE.test(trimmed)) {
        out = { problem: out.problem };
      } else if (target === 'customerChange' && out.customer && CUSTOMER_OVERRIDE_RE.test(trimmed)) {
        out = { customer: out.customer };
      } else if (target === 'problem' && out.problem) {
        out = { problem: out.problem };
      } else if (target === 'solution' && out.solution) {
        out = { solution: out.solution };
      } else {
        out = {};
      }
    }
  } else if (target && allowMultiFact) {
    const primary = out[target];
    if (primary) {
      const filtered = { [target]: primary };
      for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
        if (id === target || !out[id]) continue;
        if (!isSemanticCopy(out[id]!.summary, primary.summary)) {
          filtered[id] = out[id]!;
        }
      }
      out = filtered;
    }
  }

  const semantic = interpretAnswerSemantics({
    answer: trimmed,
    askedIssueId: options?.issueId ?? null,
    askedTargetGap: options?.targetGap,
  });
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
    if (target && !allowMultiFact && dim !== target) continue;
    if (hit.key === 'business' && !SOLUTION_SEGMENT_RE.test(trimmed)) continue;
    const seg = pickBestSegment(
      clauses,
      dim === 'customer'
        ? CUSTOMER_SEGMENT_RE
        : dim === 'problem'
          ? PROBLEM_SEGMENT_RE
          : dim === 'customerChange'
            ? CUSTOMER_CHANGE_SEGMENT_RE
            : SOLUTION_SEGMENT_RE,
      trimmed,
    );
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
