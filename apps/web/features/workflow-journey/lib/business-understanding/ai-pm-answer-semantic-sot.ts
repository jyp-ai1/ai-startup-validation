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
import { isAiPmJudgmentMeaningModelV1Active } from './ai-pm-judgment-meaning-model-v1';
import { isAiPmJudgmentFix8V1Active } from './ai-pm-judgment-fix8-v1';
import { isMetaConfirmationAnswer } from './ai-pm-answer-meta-slots';
import {
  extractProblemPriorityCorrection,
  isProblemPriorityCorrection,
} from './ai-pm-judgment-problem-correction';
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
  | 'metaConfirmation'
  | 'none';

export type AnswerSemanticEvidence = {
  dimension: CeoJudgmentDimensionId;
  summary: string;
  evidence: string;
  interpretedMeaning: string;
  reason: string;
  evidenceType?: 'fact' | 'hypothesis' | 'expectation';
};

export type AnswerSemanticExtraction = {
  evidences: AnswerSemanticEvidence[];
  nonJudgmentSlot: AnswerSemanticSlot | null;
  frozen: boolean;
};

/** Avoid splitting on `에서` — breaks phrases like `한 곳에서`. Include `이고` for multi-fact answers.
 *  Do NOT split on bare `해서` — breaks `불편해서`, `생겨서` stays for T06 multi-fact. */
const CLAUSE_SPLIT_RE = /(?:[,，;；]|(?:\s*(?:하고|이고|그래서|때문에|생겨서|인데|지만)\s*))/i;

const CUSTOMER_SEGMENT_RE =
  /(?:소규모\s*)?(?:양조장?|반찬|꽃집|가게|사장|소상공인|CEO|PM|스타트업|고객|타깃|사용자|원장)[^,.;]*/i;
const PROBLEM_SEGMENT_RE =
  /(?:불편|문제|어렵|힘들|누락|분리|따로|번거|복잡|실수|확인\s*시간|엑셀|카카오|카톡|놓치|재주문)[^,.;]*/i;
const SOLUTION_SEGMENT_RE =
  /(?:한\s*곳에서|하나로\s*연결|한눈에|관리하려(?:고|는)?|하려고|하려\s*합니다|SaaS|플랫폼|MVP|체크리스트|모바일|연결(?:하는|하)?|만들(?:려|는)?)/i;
const SOLUTION_BENEFIT_ONLY_RE =
  /(?:실수|시간|누락).*(?:줄이|아낄|단축|감소).*(?:수\s*있|할\s*수)/i;
const CUSTOMER_CHANGE_SEGMENT_RE =
  /(?:(?:줄이|줄일|단축|감소|아낄|절감).*(?:수\s*있|할\s*수|기대|목표)|(?:편해|좋아지).*(?:질|진|다)|(?:실수|시간).*(?:줄이|아낄).*(?:수\s*있|할\s*수)|확인\s*시간\s*(?:을\s*)?(?:단축|줄)|누락\s*(?:을|이)?\s*(?:줄|감).*(?:수\s*있|기대|목표)|가장\s*큰\s*변화)/i;
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

function isTruncatedCustomerSummary(summary: string): boolean {
  const t = summary.trim();
  if (/^(?:소상공인|반찬가게|양조장|꽃집|가게)$/.test(t)) return true;
  if (/^(?:소상공인|반찬가게|양조장|꽃집|가게)(?:은|는|이|가)$/.test(t)) return true;
  if (t.length <= 8 && /(?:은|는|이|가)$/.test(t)) return true;
  return false;
}

/** Subject-only mention in a problem/change sentence is not a customer definition. */
function isCustomerDefinitionClause(clause: string): boolean {
  if (isTruncatedCustomerSummary(clause)) return false;
  if (/주\s*고객|포함|타깃|타겟|대상|사장님(?:이|들)?\s*주\s*고객|고객(?:입니다|이고)?|(?:이|가)\s*고객/.test(clause)) {
    return true;
  }
  if (/(?:\d+\s*건|하루\s*\d+|주문을\s*받|매출)/.test(clause)) {
    return false;
  }
  if (SOLUTION_BENEFIT_ONLY_RE.test(clause)) {
    return false;
  }
  if (/실수를\s*줄|시간을\s*아낄|줄이고\s*시간/.test(clause)) {
    return false;
  }
  if (/문제|놓치|재주문|불편|심각/.test(clause) && !/주\s*고객|포함|사장님|고객(?:입니다|이고)?/.test(clause)) {
    return false;
  }
  if (
    /(?:줄이|아낄|단축|감소|편해).*(?:수\s*있|할\s*수|습니다)/.test(clause) &&
    !/주\s*고객|포함|사장님|고객(?:입니다|이고)?/.test(clause)
  ) {
    return false;
  }
  return true;
}

function stripCausalPrefix(text: string): string {
  return text
    .replace(/^(?:[^,.;]{0,16}(?:생겨서|해서|때문에|이어서|그래서)\s*)+/i, '')
    .replace(/^(?:이|가|을|를|에서)\s+/, '')
    .trim();
}

function refineSolutionSegment(clause: string): string {
  const cleaned = stripCausalPrefix(clause);
  const m = cleaned.match(
    /(?:주문[^,.;]{0,40}?(?:한\s*곳에서|통합)[^,.;]{0,40}?(?:관리|연결)[^,.;]{0,24}(?:하려고|합니다)?|(?:한\s*곳에서|SaaS|MVP|모바일|체크리스트)[^,.;]{0,60}|(?:관리하려고|만들려고|제공)[^,.;]{0,48})/i,
  );
  const refined = stripCausalPrefix(m?.[0]?.trim() || cleaned);
  return clip(refined || cleaned);
}

function extractCustomerEvidence(clauses: string[], trimmed: string): AnswerSemanticEvidence | null {
  if (/가장\s*큰\s*변화|변화입니다/.test(trimmed)) return null;
  if (/고객에게/.test(trimmed) && CUSTOMER_CHANGE_SEGMENT_RE.test(trimmed)) return null;
  for (const clause of clauses) {
    if (!CUSTOMER_SEGMENT_RE.test(clause)) continue;
    if (!isCustomerDefinitionClause(clause)) continue;
    const seg = clip(clause);
    if (PAYER_RE.test(seg) && !/(양조|반찬|꽃집|사장|소상공인|고객)/.test(seg)) continue;
    const persona = seg.split(/(?:이\s*)?(?:엑셀|카카오|주문|배송|누락)/i)[0]?.trim();
    const summary = clip(persona && persona.length >= 4 ? persona.replace(/(?:이|가|은|는)$/, '') : seg);
    if (isTruncatedCustomerSummary(summary)) continue;
    return {
      dimension: 'customer',
      summary,
      evidence: summary,
      interpretedMeaning: 'CEO 답변 — 고객(누구) meaning unit',
      reason: dimensionReason('customer'),
    };
  }
  if (CUSTOMER_SEGMENT_RE.test(trimmed) && isCustomerDefinitionClause(trimmed)) {
    const persona = trimmed.split(/(?:이\s*)?(?:엑셀|카카오|주문|배송|누락)/i)[0]?.trim();
    const summary = clip(persona && persona.length >= 4 ? persona.replace(/(?:이|가|은|는)$/, '') : trimmed);
    if (!isTruncatedCustomerSummary(summary)) {
      return {
        dimension: 'customer',
        summary,
        evidence: summary,
        interpretedMeaning: 'CEO 답변 — 고객(누구) meaning unit',
        reason: dimensionReason('customer'),
      };
    }
  }
  return null;
}

function isOutcomeClause(clause: string): boolean {
  return (
    SOLUTION_BENEFIT_ONLY_RE.test(clause) ||
    /(?:누락|확인\s*시간).*(?:줄|단축|감).*(?:수\s*있|할\s*수)/.test(clause) ||
    /(?:줄이|아낄|단축).*(?:수\s*있|할\s*수|습니다)/.test(clause)
  );
}

function extractProblemEvidence(clauses: string[], trimmed: string): AnswerSemanticEvidence | null {
  if (/가장\s*큰\s*변화|변화입니다/.test(trimmed)) return null;
  if (SOLUTION_BENEFIT_ONLY_RE.test(trimmed) && !/(?:엑셀|따로|심각|10%)/.test(trimmed)) {
    return null;
  }

  if (isProblemPriorityCorrection(trimmed)) {
    const correction = extractProblemPriorityCorrection(trimmed);
    if (correction) {
      const evidence = isAiPmJudgmentFix8V1Active()
        ? correction.fullEvidence
        : correction.evidence;
      const meaning = isAiPmJudgmentFix8V1Active()
        ? '주문 확인 시간이 배송 누락보다 더 큼'
        : correction.meaning;
      return {
        dimension: 'problem',
        summary: correction.primaryProblem,
        evidence,
        interpretedMeaning: meaning,
        reason: 'CEO가 문제 우선순위를 수정함',
      };
    }
  }

  const units: string[] = [];
  for (const clause of clauses) {
    if (isOutcomeClause(clause)) continue;
    if (SOLUTION_SEGMENT_RE.test(clause) && !PROBLEM_SEGMENT_RE.test(clause)) continue;
    if (!PROBLEM_SEGMENT_RE.test(clause)) continue;

    const excel = clause.match(/엑셀[^,.;]{0,24}?(?:관리|누락)/i)?.[0];
    if (excel) units.push(clip(excel.replace(/\s*누락.*$/, '').trim() || excel, 32));

    if (/배송\s*누락/.test(clause) && !/(?:줄|감|단축)/.test(clause)) {
      if (/10%|심각/.test(clause)) {
        const fullSeverity =
          clause.match(/[^,.;]*배송\s*누락[^,.;]*(?:10%|심각)[^,.;]*/i)?.[0]?.trim() ??
          clause.match(/[^,.;]{0,60}(?:10%|심각)[^,.;]{0,30}/i)?.[0]?.trim() ??
          clause.trim();
        units.push(isAiPmJudgmentFix8V1Active() ? clip(fullSeverity, 80) : clip(fullSeverity, 36));
      } else {
        units.push('배송 누락');
      }
    }
    if (/따로\s*관리/.test(clause)) units.push('주문·배송 분리 관리');
    if (/확인\s*시간/.test(clause) && !/(?:단축|줄)/.test(clause)) {
      units.push(clip(clause.match(/확인\s*시간[^,.;]{0,20}/i)?.[0] ?? '확인 시간', 24));
    }
    if (/10%|심각/.test(clause) && !/배송\s*누락/.test(clause)) {
      units.push(clip(clause.match(/[^,.;]{0,30}(?:10%|심각)[^,.;]{0,20}/i)?.[0] ?? clause, 36));
    }
    if (/놓치|재주문/.test(clause)) {
      units.push(clip(clause.match(/[^,.;]{0,40}(?:놓치|재주문)[^,.;]{0,24}/i)?.[0] ?? clause, 40));
    }
  }

  const unique = [...new Set(units.map((u) => u.trim()).filter((u) => u.length >= 4))];
  if (unique.length === 0) {
    for (const clause of clauses) {
      if (isOutcomeClause(clause)) continue;
      if (PROBLEM_SEGMENT_RE.test(clause)) {
        const problemOnly =
          clause.match(
            /(?:엑셀[^,.;]{0,30}?(?:관리|누락)|카카오[^,.;]{0,30}|누락[^,.;]{0,30}|불편[^,.;]{0,30}|문제[^,.;]{0,40}|놓치[^,.;]{0,30}|재주문[^,.;]{0,30}|확인\s*시간[^,.;]{0,30}|심각[^,.;]{0,20})/i,
          )?.[0] ?? clause;
        unique.push(clip(problemOnly.trim(), 40));
        break;
      }
    }
  }

  if (unique.length === 0) return null;

  const primaryFact = unique[0]!;
  const summary = isAiPmJudgmentFix8V1Active()
    ? clip(primaryFact)
    : clip(unique.join(' · '));
  const evidence =
    isAiPmJudgmentFix8V1Active()
      ? unique.find((u) => /10%|심각/.test(u)) ??
        unique.reduce((a, b) => (b.length > a.length ? b : a), primaryFact)
      : primaryFact;
  const interpretedMeaning = isAiPmJudgmentFix8V1Active() ? clip(evidence, 80) : summary;

  return {
    dimension: 'problem',
    summary,
    evidence,
    interpretedMeaning,
    reason: dimensionReason('problem'),
  };
}

function extractSolutionEvidence(clauses: string[], trimmed: string): AnswerSemanticEvidence | null {
  if (SOLUTION_BENEFIT_ONLY_RE.test(trimmed) && !/(?:SaaS|MVP|만들|관리하려|한\s*곳에서|모바일|체크리스트)/.test(trimmed)) {
    return null;
  }
  for (const clause of clauses) {
    if (/(?:줄이|단축|감소|아낄)\s*(?:할|수|기대)/.test(clause) && !SOLUTION_SEGMENT_RE.test(clause)) {
      continue;
    }
    if (SOLUTION_BENEFIT_ONLY_RE.test(clause) && !/(?:SaaS|MVP|만들|관리하려|한\s*곳에서|모바일)/.test(clause)) {
      continue;
    }
    if (SOLUTION_SEGMENT_RE.test(clause)) {
      const refined = refineSolutionSegment(clause);
      return {
        dimension: 'solution',
        summary: refined,
        evidence: refined,
        interpretedMeaning: 'CEO 답변 — 해결 방법 evidence',
        reason: dimensionReason('solution'),
      };
    }
  }
  const seg = pickSegment(clauses, SOLUTION_SEGMENT_RE, trimmed);
  if (!seg || (SOLUTION_BENEFIT_ONLY_RE.test(trimmed) && !/(?:SaaS|MVP|만들|관리하려)/.test(seg))) {
    return null;
  }
  const refined = refineSolutionSegment(seg);
  return {
    dimension: 'solution',
    summary: refined,
    evidence: refined,
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
  if (SOLUTION_BENEFIT_ONLY_RE.test(trimmed)) {
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

function enforceDistinctEvidenceSpans(evidences: AnswerSemanticEvidence[]): AnswerSemanticEvidence[] {
  if (!isAiPmJudgmentMeaningModelV1Active()) return evidences;
  const out: AnswerSemanticEvidence[] = [];
  for (const ev of evidences) {
    const overlaps = out.some(
      (e) =>
        e.dimension !== ev.dimension &&
        (isSemanticCopy(e.evidence, ev.evidence) ||
          isSemanticCopy(e.summary, ev.evidence) ||
          isSemanticCopy(ev.summary, e.evidence)),
    );
    if (!overlaps) out.push(ev);
  }
  return out;
}

function dedupeEvidences(evidences: AnswerSemanticEvidence[]): AnswerSemanticEvidence[] {
  const separated = enforceDistinctEvidenceSpans(evidences);
  const out: AnswerSemanticEvidence[] = [];
  for (const ev of separated) {
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

  if (isMetaConfirmationAnswer(trimmed)) {
    return { evidences: [], nonJudgmentSlot: 'metaConfirmation', frozen: false };
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

  if (customer) collected.push(customer);
  if (problem) collected.push(problem);
  if (solution) collected.push(solution);

  if (HYPOTHESIS_RE.test(trimmed)) {
    collected.push({
      dimension: 'customerChange',
      summary: clip(trimmed),
      evidence: trimmed,
      interpretedMeaning: 'CEO 답변 — 고객 변화 가설 (검증 전)',
      reason: 'CEO 답변에서 가설·기대 효과 evidence 추출',
      evidenceType: 'hypothesis',
    });
  } else if (
    /(?:실수|시간|아낄|줄이).*(?:수\s*있|할\s*수)/.test(trimmed) &&
    !/(?:80%|가설)/.test(trimmed)
  ) {
    collected.push({
      dimension: 'customerChange',
      summary: clip(trimmed),
      evidence: trimmed,
      interpretedMeaning: 'CEO 답변 — 기대효과 주장 (검증 전)',
      reason: 'CEO 기대효과 — 고객 검증 전',
      evidenceType: 'expectation',
    });
  } else {
    const change = extractCustomerChangeEvidence(clauses, trimmed);
    if (change) collected.push(change);
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
    {
      summary: string;
      interpretedMeaning: string;
      evidence: string;
      reason: string;
      evidenceType?: 'fact' | 'hypothesis' | 'expectation';
    }
  >
> {
  if (!isAiPmAnswerSemanticSotV1Active()) return {};
  const out: Partial<
    Record<
      CeoJudgmentDimensionId,
      {
        summary: string;
        interpretedMeaning: string;
        evidence: string;
        reason: string;
        evidenceType?: 'fact' | 'hypothesis' | 'expectation';
      }
    >
  > = {};
  for (const ev of extraction.evidences) {
    out[ev.dimension] = {
      summary: ev.summary,
      interpretedMeaning: ev.interpretedMeaning,
      evidence: ev.evidence,
      reason: ev.reason,
      evidenceType: ev.evidenceType,
    };
  }
  return out;
}
