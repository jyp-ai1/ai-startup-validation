/**
 * F13 — Clause/claim segmentation for multi-fact answers.
 * Raw answer → clauses → per-claim slot/entity → FACT / ASSUMPTION / INFERENCE.
 *
 * Only role-pattern claims (who buys, who uses, current workaround) are recognized, and the
 * result is used only when ≥2 slot-mapped claims are found. Answers without role patterns
 * (all single-fact answers) yield no segmentation and keep the existing interpretation path.
 */

import type { EvidenceClass } from '@repo/types/domain/answer-review';

import type { ConversationFactKey } from './conversation-memory';
import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';

export type AnswerClaimRole = 'buyer' | 'user' | 'workaround' | 'workaroundProblem';

export type AnswerClaim = {
  role: AnswerClaimRole;
  clause: string;
  /** null when the slot vocabulary has no owner for this claim (e.g. daily user). */
  key: ConversationFactKey | null;
  issueId: AiPmLoopIssueId | null;
  value: string;
  evidenceClass: Extract<EvidenceClass, 'FACT' | 'ASSUMPTION' | 'INFERENCE'>;
  /** Repeat-usage evidence only — not a Stage A/B required gap. */
  usageFrequency?: string;
};

const CLAUSE_SPLIT_RE = /[,.;!?]\s*|(?<=(?:하고|하며|이고|이며))\s+/u;

const HEDGE_RE = /(아마|것\s*같|같아요|같습니다|추정|예상|모르겠)/u;

const BUYER_RE =
  /^(.+?)(?:께서|가|이)\s*(?:직접\s*)?(?:구매|결제|구입|비용을\s*(?:내|부담)|돈을\s*내|계약)/u;

const USER_RE = /^(.+?)(?:께서|가|이)\s*(?:매일|주로|직접|실제로)?\s*(?:사용|이용|씁|씀|쓰)/u;
const USAGE_FREQUENCY_RE = /(매일|매주|하루에도|항상|매일같이)/u;

const WORKAROUND_RE =
  /(?:지금은|현재는|현재|요즘은)\s*(.+?)(?:으로|로)\s*(?:(.+?)(?:을|를)\s*)?(?:관리|처리|해결|대응|버티|때우)/u;

function cleanEntity(raw: string): string {
  return raw
    .replace(/^(?:그리고|또|또한|그런데|참고로)\s+/u, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function claimsForClause(clause: string): AnswerClaim[] {
  const evidenceClass = HEDGE_RE.test(clause) ? 'ASSUMPTION' : 'FACT';

  const buyer = clause.match(BUYER_RE);
  if (buyer) {
    const value = cleanEntity(buyer[1]);
    if (value.length < 2) return [];
    return [{ role: 'buyer', clause, key: 'buyer', issueId: 'bm_design', value, evidenceClass }];
  }

  const workaround = clause.match(WORKAROUND_RE);
  if (workaround) {
    const tool = cleanEntity(workaround[1]);
    if (tool.length < 2) return [];
    const claims: AnswerClaim[] = [
      {
        role: 'workaround',
        clause,
        key: 'competitor',
        issueId: 'competitor_analysis',
        value: tool,
        evidenceClass,
      },
    ];
    const object = workaround[2] ? cleanEntity(workaround[2]) : '';
    if (object.length >= 2) {
      claims.push({
        role: 'workaroundProblem',
        clause,
        key: 'problem',
        issueId: 'problem_definition',
        value: object,
        evidenceClass: evidenceClass === 'ASSUMPTION' ? 'ASSUMPTION' : 'INFERENCE',
      });
    }
    return claims;
  }

  const user = clause.match(USER_RE);
  if (user) {
    const value = cleanEntity(user[1]);
    if (value.length < 1) return [];
    const usageFrequency = clause.match(USAGE_FREQUENCY_RE)?.[1];
    return [
      {
        role: 'user',
        clause,
        key: null,
        issueId: null,
        value,
        evidenceClass,
        ...(usageFrequency ? { usageFrequency } : {}),
      },
    ];
  }

  return [];
}

export function splitAnswerClauses(answer: string): string[] {
  return answer
    .split(CLAUSE_SPLIT_RE)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

export function segmentAnswerClaims(answer: string): AnswerClaim[] {
  return splitAnswerClauses(answer).flatMap(claimsForClause);
}

/** Slot-mapped claims when the answer is a multi-claim utterance; otherwise []. */
export function segmentMultiClaimAnswer(answer: string): AnswerClaim[] {
  const claims = segmentAnswerClaims(answer);
  const mapped = claims.filter((c) => c.key !== null);
  const distinctKeys = new Set(mapped.map((c) => c.key));
  return distinctKeys.size >= 2 ? mapped : [];
}
