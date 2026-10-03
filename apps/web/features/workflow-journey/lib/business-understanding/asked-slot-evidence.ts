/**
 * Phase 2-D A — the asked gap closes (or is contradicted) only on direct evidence for its slot.
 * An answer without such evidence leaves the asked gap unresolved instead of being keyed to it
 * by the asked-slot fallback.
 */

import { splitAnswerClauses } from './answer-claim-segmentation';
import { isCustomerFieldCorrection } from './ai-pm-correction-semantics';
import type { SemanticInterpretation } from './interpret-answer-semantics';
import { declaredValueForSlot } from './understanding-contract';

/** The founder says the point is not decided yet ("아직 하나로 좁히지 못했습니다"). */
const NON_COMMITTAL_CLAUSE_RE =
  /(?:정하지|정리하지|좁히지|결정하지)(?:는|도)?\s*못|대략적으로만|아직\s*(?:잘\s*)?모르겠/u;

/** Company profile (team size, HQ, incorporation) — not a claim about any business slot. */
const ORGANIZATION_CONTEXT_CLAUSE_RE =
  /팀(?:원)?(?:은|이|는)?\s*\d+\s*명|직원(?:은|이)?\s*\d+\s*명|\d+\s*명\s*(?:팀|규모)|본사(?:는|가)?\s|사무실(?:은|이)\s|법인\s*설립|설립(?:했|한|된)/u;

/** Every clause is either non-committal or company-profile context. */
export function isNoSlotContentAnswer(answer: string): boolean {
  const clauses = splitAnswerClauses(answer);
  if (clauses.length === 0) return false;
  return clauses.every(
    (c) => NON_COMMITTAL_CLAUSE_RE.test(c) || ORGANIZATION_CONTEXT_CLAUSE_RE.test(c),
  );
}

/**
 * The other-slot facts in the answer are explicit declarations (a correction, clause-level
 * claims, or an identity statement such as "핵심 고객은 X입니다") rather than keyword hits.
 */
export function isDeclaredOtherSlotAnswer(
  semantic: SemanticInterpretation,
  answer: string,
): boolean {
  if (semantic.intent === 'correction' || isCustomerFieldCorrection(answer)) return true;
  if (semantic.facts.length > 0 && semantic.facts.every((f) => f.claimValue !== undefined)) {
    return true;
  }
  const keys = semantic.facts.length > 0 ? semantic.facts.map((f) => f.key) : [semantic.factKey];
  return (
    keys.length > 0 &&
    keys.every((k) => (k === 'customer' || k === 'problem') && declaredValueForSlot(answer, k) !== null)
  );
}
