/**
 * ALABOM Core v2 — Living Understanding State (single SoT).
 * Known / Inferred / Confirmed / Unknown / Contradiction / Evidence.
 * All readers (Overview · AI PM · Progress · Review · Question engine) derive from here.
 */

import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import {
  BUSINESS_UNDERSTANDING_DOMAIN,
  confidenceFromProvenance,
  type BusinessUnderstandingDomainKey,
  type UnderstandingConfidence,
  type UnderstandingProvenance,
} from './understanding-contract';
import {
  getConflictFact,
  getFact,
  memoryHasFact,
  memoryHasOpenConflict,
  type ConversationMemory,
} from './conversation-memory';
import {
  buildSharedUnderstanding,
  SHARED_UNDERSTANDING_PENDING,
  type WorkspaceSharedUnderstanding,
} from './build-shared-understanding';
import type { AiPmLoopIssueId, AiPmLoopTurn } from './workspace-ai-pm-loop-types';
import type { ProductStageId } from './stage-transition';
import { factKeyForIssue } from './build-conversation-memory';

export type LivingClaimStatus =
  | 'known'
  | 'inferred'
  | 'confirmed'
  | 'unknown'
  | 'contradiction';

export type LivingEvidenceKind = 'document' | 'user_answer' | 'ai_inference';

export type LivingEvidence = {
  kind: LivingEvidenceKind;
  excerpt: string;
};

export type LivingClaim = {
  fieldKey: BusinessUnderstandingDomainKey | string;
  value: string | null;
  status: LivingClaimStatus;
  provenance: UnderstandingProvenance;
  confidence: UnderstandingConfidence;
  evidence: LivingEvidence[];
};

export type LivingUnderstandingGap = {
  fieldKey: string;
  issueId: AiPmLoopIssueId | null;
  rationale: string;
  priorityScore: number;
};

export type LivingUnderstandingState = {
  version: 1;
  claims: LivingClaim[];
  /** Deterministic specificity — NOT success probability. */
  coveragePercent: number;
  productStage: ProductStageId;
  gaps: LivingUnderstandingGap[];
  judgmentSummary: string;
  spine: WorkspaceSharedUnderstanding;
};

const ISSUE_FOR_DOMAIN: Partial<Record<string, AiPmLoopIssueId>> = {
  customerPersona: 'customer_definition',
  payer: 'bm_design',
  problemJtbd: 'problem_definition',
  problemFrequencySeverity: 'problem_definition',
  revenueModel: 'bm_design',
  pricingHint: 'bm_design',
  marketChannel: 'market_validation',
  marketSizeEvidence: 'market_validation',
  alternativesCompetitors: 'competitor_analysis',
  differentiationVsAlternatives: 'competitor_analysis',
  businessOneLiner: 'bm_design',
  categoryScope: 'bm_design',
  solution: 'bm_design',
  differentiationHypothesis: 'competitor_analysis',
};

const DOMAIN_IMPACT_WEIGHT: Partial<Record<string, number>> = {
  businessOneLiner: 10,
  customerPersona: 10,
  problemJtbd: 10,
  payer: 8,
  revenueModel: 7,
  alternativesCompetitors: 6,
  marketChannel: 5,
  solution: 5,
  differentiationHypothesis: 5,
  problemFrequencySeverity: 4,
  categoryScope: 4,
  pricingHint: 3,
  marketSizeEvidence: 3,
  differentiationVsAlternatives: 4,
  topRisks: 2,
  validationTestability: 3,
  executionConstraints: 2,
  evidenceStrengthSummary: 2,
  currentJudgment: 1,
  nextAction: 1,
};

function isPending(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? '';
  return !trimmed || trimmed === SHARED_UNDERSTANDING_PENDING;
}

function statusFromProvenance(
  provenance: UnderstandingProvenance,
  hasValue: boolean,
): LivingClaimStatus {
  if (!hasValue) return 'unknown';
  if (provenance === 'USER_CONFIRMED' || provenance === 'USER_CORRECTED') return 'confirmed';
  if (provenance === 'DOCUMENT') return 'known';
  if (provenance === 'AI_INFERENCE' || provenance === 'EXTERNAL_EVIDENCE') return 'inferred';
  return 'unknown';
}

function claimFromValue(
  fieldKey: string,
  value: string | null,
  provenance: UnderstandingProvenance,
  evidence: LivingEvidence[],
): LivingClaim {
  const hasValue = !isPending(value);
  const status = statusFromProvenance(provenance, hasValue);
  return {
    fieldKey,
    value: hasValue ? value!.trim() : null,
    status,
    provenance: hasValue ? provenance : 'UNKNOWN',
    confidence: hasValue ? confidenceFromProvenance(provenance) : 'UNKNOWN',
    evidence,
  };
}

function factValue(
  mem: ConversationMemory | null,
  key: import('./conversation-memory').ConversationFactKey,
): string | null {
  if (!mem) return null;
  return getFact(mem, key)?.value ?? null;
}

function resolveDomainValue(
  fieldKey: string,
  input: BuildLivingStateInput,
  spine: WorkspaceSharedUnderstanding,
): LivingClaim {
  const { understanding, entities, memory } = input;
  const mem = memory ?? null;

  switch (fieldKey) {
    case 'businessOneLiner': {
      const fromMem = factValue(mem, 'business');
      if (fromMem) {
        return claimFromValue(fieldKey, fromMem, 'USER_CONFIRMED', [
          { kind: 'user_answer', excerpt: fromMem.slice(0, 80) },
        ]);
      }
      const val = isPending(spine.business) ? understanding.business.value : spine.business;
      const prov =
        understanding.business.status === 'document' ? 'DOCUMENT' : 'AI_INFERENCE';
      return claimFromValue(fieldKey, val, prov, val ? [{ kind: 'document', excerpt: val.slice(0, 80) }] : []);
    }
    case 'categoryScope': {
      const val = entities?.market.value ?? understanding.valueProposition.value;
      const prov = entities?.market.basis === 'document' ? 'DOCUMENT' : 'AI_INFERENCE';
      return claimFromValue(fieldKey, val, prov, val ? [{ kind: 'ai_inference', excerpt: val.slice(0, 80) }] : []);
    }
    case 'customerPersona': {
      const conflict = mem ? getConflictFact(mem, 'customer') : null;
      if (conflict) {
        return {
          fieldKey,
          value: conflict.value,
          status: 'contradiction',
          provenance: 'USER_CORRECTED',
          confidence: 'INFERRED',
          evidence: [
            { kind: 'user_answer', excerpt: conflict.value.slice(0, 80) },
            ...(conflict.conflictWith
              ? [{ kind: 'user_answer' as const, excerpt: conflict.conflictWith.slice(0, 80) }]
              : []),
          ],
        };
      }
      const fromMem = factValue(mem, 'customer');
      if (fromMem) {
        return claimFromValue(fieldKey, fromMem, 'USER_CONFIRMED', [
          { kind: 'user_answer', excerpt: fromMem.slice(0, 80) },
        ]);
      }
      const val = isPending(spine.customer) ? understanding.customer.value : spine.customer;
      const prov =
        understanding.customer.status === 'document' ? 'DOCUMENT' : 'AI_INFERENCE';
      return claimFromValue(fieldKey, val, prov, val ? [{ kind: 'document', excerpt: val.slice(0, 80) }] : []);
    }
    case 'payer': {
      const conflict = mem ? getConflictFact(mem, 'buyer') : null;
      if (conflict) {
        return {
          fieldKey,
          value: conflict.value,
          status: 'contradiction',
          provenance: 'USER_CORRECTED',
          confidence: 'INFERRED',
          evidence: [
            { kind: 'user_answer', excerpt: conflict.value.slice(0, 80) },
            ...(conflict.conflictWith
              ? [{ kind: 'user_answer' as const, excerpt: conflict.conflictWith.slice(0, 80) }]
              : []),
          ],
        };
      }
      const buyer = factValue(mem, 'buyer');
      if (buyer) {
        return claimFromValue(fieldKey, buyer, 'USER_CONFIRMED', [
          { kind: 'user_answer', excerpt: buyer.slice(0, 80) },
        ]);
      }
      return claimFromValue(fieldKey, null, 'UNKNOWN', []);
    }
    case 'problemJtbd': {
      const conflict = mem ? getConflictFact(mem, 'problem') : null;
      if (conflict) {
        return {
          fieldKey,
          value: conflict.value,
          status: 'contradiction',
          provenance: 'USER_CORRECTED',
          confidence: 'INFERRED',
          evidence: [
            { kind: 'user_answer', excerpt: conflict.value.slice(0, 80) },
            ...(conflict.conflictWith
              ? [{ kind: 'user_answer' as const, excerpt: conflict.conflictWith.slice(0, 80) }]
              : []),
          ],
        };
      }
      const fromMem = factValue(mem, 'problem');
      if (fromMem) {
        return claimFromValue(fieldKey, fromMem, 'USER_CONFIRMED', [
          { kind: 'user_answer', excerpt: fromMem.slice(0, 80) },
        ]);
      }
      const val = isPending(spine.problem) ? understanding.problem.value : spine.problem;
      const prov = understanding.problem.status === 'document' ? 'DOCUMENT' : 'AI_INFERENCE';
      return claimFromValue(fieldKey, val, prov, val ? [{ kind: 'document', excerpt: val.slice(0, 80) }] : []);
    }
    case 'problemFrequencySeverity': {
      const val = understanding.problem.excerpt ?? understanding.problem.unknownNote ?? null;
      return claimFromValue(
        fieldKey,
        val,
        understanding.problem.status === 'document' ? 'DOCUMENT' : 'UNKNOWN',
        val ? [{ kind: 'document', excerpt: val.slice(0, 80) }] : [],
      );
    }
    case 'solution': {
      const val = understanding.solution.value;
      return claimFromValue(
        fieldKey,
        val,
        understanding.solution.status === 'document' ? 'DOCUMENT' : 'AI_INFERENCE',
        val ? [{ kind: 'document', excerpt: val.slice(0, 80) }] : [],
      );
    }
    case 'differentiationHypothesis': {
      const val = understanding.valueProposition.value;
      return claimFromValue(fieldKey, val, 'AI_INFERENCE', val ? [{ kind: 'ai_inference', excerpt: val.slice(0, 80) }] : []);
    }
    case 'revenueModel': {
      const fromMem = factValue(mem, 'revenue');
      if (fromMem) {
        return claimFromValue(fieldKey, fromMem, 'USER_CONFIRMED', [
          { kind: 'user_answer', excerpt: fromMem.slice(0, 80) },
        ]);
      }
      return claimFromValue(
        fieldKey,
        understanding.revenue.value,
        understanding.revenue.status === 'document' ? 'DOCUMENT' : 'UNKNOWN',
        understanding.revenue.value
          ? [{ kind: 'document', excerpt: understanding.revenue.value.slice(0, 80) }]
          : [],
      );
    }
    case 'pricingHint': {
      return claimFromValue(fieldKey, null, 'UNKNOWN', []);
    }
    case 'marketChannel': {
      const fromMem = factValue(mem, 'market');
      if (fromMem) {
        return claimFromValue(fieldKey, fromMem, 'USER_CONFIRMED', [
          { kind: 'user_answer', excerpt: fromMem.slice(0, 80) },
        ]);
      }
      const val = entities?.market.value ?? null;
      return claimFromValue(
        fieldKey,
        val,
        entities?.market.basis === 'document' ? 'DOCUMENT' : 'UNKNOWN',
        val ? [{ kind: 'document', excerpt: val.slice(0, 80) }] : [],
      );
    }
    case 'marketSizeEvidence':
      return claimFromValue(fieldKey, null, 'UNKNOWN', []);
    case 'alternativesCompetitors': {
      const fromMem = factValue(mem, 'competitor');
      if (fromMem) {
        return claimFromValue(fieldKey, fromMem, 'USER_CONFIRMED', [
          { kind: 'user_answer', excerpt: fromMem.slice(0, 80) },
        ]);
      }
      const val = entities?.competitor.value ?? null;
      return claimFromValue(
        fieldKey,
        val,
        entities?.competitor.basis === 'document' ? 'DOCUMENT' : 'UNKNOWN',
        val ? [{ kind: 'document', excerpt: val.slice(0, 80) }] : [],
      );
    }
    case 'differentiationVsAlternatives':
      return claimFromValue(fieldKey, null, 'UNKNOWN', []);
    case 'topRisks':
    case 'validationTestability':
    case 'executionConstraints':
    case 'evidenceStrengthSummary':
    case 'currentJudgment':
    case 'nextAction':
      return claimFromValue(fieldKey, null, 'UNKNOWN', []);
    default:
      return claimFromValue(fieldKey, null, 'UNKNOWN', []);
  }
}

/** Deterministic coverage — field is covered when value exists and status ≠ unknown. */
export function computeUnderstandingCoverage(claims: LivingClaim[]): number {
  if (claims.length === 0) return 0;
  const covered = claims.filter(
    (c) => c.status !== 'unknown' && c.value != null && c.value.trim().length >= 2,
  ).length;
  return Math.round((covered / claims.length) * 100);
}

/**
 * Judgment-first whyNow — never generic "다음 질문입니다" / empty-field template.
 * Each gap explains why the business decision needs this answer *now*.
 */
export function whyNowForGapField(fieldKey: string): string {
  const map: Record<string, string> = {
    payer:
      '누가 비용을 지불하는지 모르면 GO/HOLD를 결정할 수 없습니다. 지불자를 지금 확정합니다.',
    customerPersona:
      '고객이 넓거나 미정이면 검증·메시지 설계가 흔들립니다. 가장 필요로 하는 사람을 지금 좁힙니다.',
    problemJtbd:
      '해결하려는 불편이 비어 있으면 사업 판단의 출발점이 없습니다. 핵심 문제를 먼저 고정합니다.',
    problemFrequencySeverity:
      '문제가 얼마나 자주·심각하게 발생하는지 모르면 우선순위를 판단할 수 없습니다.',
    alternativesCompetitors:
      '이미 쓰는 대안·경쟁이 비면 차별화를 판단할 기준이 없습니다. 지금 쓰는 대안을 확인합니다.',
    differentiationVsAlternatives:
      '경쟁만 알고 차별이 없으면 「왜 우리인가」를 말할 수 없습니다. 차이점을 지금 확인합니다.',
    differentiationHypothesis:
      '차별 가설이 비어 있으면 경쟁 대비 포지션을 판단할 수 없습니다.',
    revenueModel:
      '수익 구조가 비면 지속 가능성을 판단할 수 없습니다. 누가·어떻게 돈을 버는지 확인합니다.',
    pricingHint:
      '가격 신호가 없으면 수익·지불 의사 검증을 설계할 수 없습니다.',
    marketChannel:
      '도달 채널이 비면 수요 검증을 어디서 할지 모릅니다. 검증 채널을 지금 정합니다.',
    marketSizeEvidence:
      '시장·수요 근거가 없으면 규모 판단을 할 수 없습니다.',
    businessOneLiner:
      '한 줄 사업 정의가 비면 이후 질문을 정렬할 기준이 없습니다.',
    categoryScope:
      '카테고리 범위가 모호하면 경쟁·시장 비교가 흔들립니다.',
    solution:
      '해결 방식(솔루션)이 비면 문제–제공가치 연결을 판단할 수 없습니다.',
  };
  return (
    map[fieldKey] ??
    `「${fieldKey}」가 비어 있어 지금 사업 GO/HOLD 판단에 필요한 공백입니다.`
  );
}

function scoreGap(
  claim: LivingClaim,
  resolvedIssueIds: Set<AiPmLoopIssueId>,
  options?: { hasContradiction?: boolean },
): LivingUnderstandingGap | null {
  if (claim.status === 'contradiction') {
    const issueId = ISSUE_FOR_DOMAIN[claim.fieldKey] ?? null;
    return {
      fieldKey: claim.fieldKey,
      issueId,
      rationale: `「${claim.fieldKey}」에 서로 다른 답이 있습니다. 어느 쪽이 맞는지 확인해야 사업 판단을 이어갈 수 있습니다.`,
      priorityScore: 50_000,
    };
  }

  if (claim.status !== 'unknown') return null;

  const issueId = ISSUE_FOR_DOMAIN[claim.fieldKey] ?? null;
  if (issueId && resolvedIssueIds.has(issueId)) return null;

  // Judgment-critical Stage A fields first — not fixed form order
  const impact = DOMAIN_IMPACT_WEIGHT[claim.fieldKey] ?? 3;
  const unknownFactor = 10;
  const decisionRelevance =
    claim.fieldKey === 'payer' ||
    claim.fieldKey === 'customerPersona' ||
    claim.fieldKey === 'problemJtbd' ||
    claim.fieldKey === 'alternativesCompetitors' ||
    claim.fieldKey === 'differentiationVsAlternatives'
      ? 9
      : claim.fieldKey.startsWith('current') || claim.fieldKey.startsWith('next')
        ? 1
        : 5;
  const answerability = issueId ? 8 : 2;
  const contradictionBoost = options?.hasContradiction ? 0 : 0;
  const priorityScore =
    impact * unknownFactor * decisionRelevance * answerability + contradictionBoost;

  return {
    fieldKey: claim.fieldKey,
    issueId,
    rationale: whyNowForGapField(claim.fieldKey),
    priorityScore,
  };
}

function resolveProductStage(coveragePercent: number, memory: ConversationMemory | null): ProductStageId {
  const hasCritical =
    memory != null &&
    memoryHasFact(memory, 'customer') &&
    memoryHasFact(memory, 'problem') &&
    (memoryHasFact(memory, 'business') || memoryHasFact(memory, 'revenue'));

  if (!hasCritical) return 'A_understanding';
  if (coveragePercent < 55) return 'A_understanding';
  if (coveragePercent < 75) return 'B_validation';
  if (coveragePercent < 90) return 'C_risk';
  return 'D_decision';
}

function buildJudgmentSummary(
  spine: WorkspaceSharedUnderstanding,
  coveragePercent: number,
  topGap: LivingUnderstandingGap | null,
): string {
  const parts: string[] = [];
  if (!isPending(spine.business)) parts.push(`사업: ${spine.business}`);
  if (!isPending(spine.customer)) parts.push(`고객: ${spine.customer}`);
  if (!isPending(spine.problem)) parts.push(`문제: ${spine.problem}`);
  const base =
    parts.length > 0
      ? `현재 이해 — ${parts.join(' · ')}.`
      : '아직 핵심 사업 이해가 비어 있습니다.';
  const coverage = `구체화도 ${coveragePercent}%.`;
  const gap = topGap ? ` 다음 공백: ${topGap.rationale}` : '';
  return `${base} ${coverage}${gap}`;
}

export type BuildLivingStateInput = {
  documentText: string;
  understanding: BusinessUnderstanding;
  entities?: LaunchLensDomainContext | null;
  turns?: AiPmLoopTurn[];
  memory?: ConversationMemory | null;
  resolvedIssueIds?: AiPmLoopIssueId[];
};

/** Single SoT builder — all workspace readers must call this. */
export function buildLivingUnderstandingState(input: BuildLivingStateInput): LivingUnderstandingState {
  const memory = input.memory ?? null;
  const turns = input.turns ?? [];
  const resolved = new Set(input.resolvedIssueIds ?? turns.map((t) => t.issueId));

  const spine =
    buildSharedUnderstanding({
      documentText: input.documentText,
      turns,
      understanding: input.understanding,
      entities: input.entities ?? null,
      memory,
    }) ?? {
      business: SHARED_UNDERSTANDING_PENDING,
      customer: SHARED_UNDERSTANDING_PENDING,
      problem: SHARED_UNDERSTANDING_PENDING,
    };

  const claims: LivingClaim[] = BUSINESS_UNDERSTANDING_DOMAIN.map((domain) =>
    resolveDomainValue(domain.key, input, spine),
  );

  const coveragePercent = computeUnderstandingCoverage(claims);
  const hasContradiction =
    claims.some((c) => c.status === 'contradiction') ||
    (memory != null && memoryHasOpenConflict(memory));

  const gaps = claims
    .map((c) => scoreGap(c, resolved, { hasContradiction }))
    .filter((g): g is LivingUnderstandingGap => g != null)
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const productStage = resolveProductStage(coveragePercent, memory);
  const judgmentSummary = buildJudgmentSummary(spine, coveragePercent, gaps[0] ?? null);

  return {
    version: 1,
    claims,
    coveragePercent,
    productStage,
    gaps,
    judgmentSummary,
    spine,
  };
}

/** Map living gap to loop issue — judgment priority, not field order. */
export function resolveNextIssueFromLivingState(
  living: LivingUnderstandingState,
  resolvedIssueIds: AiPmLoopIssueId[],
  lockedIssueIds: Set<AiPmLoopIssueId>,
): AiPmLoopIssueId | null {
  const resolved = new Set(resolvedIssueIds);
  for (const gap of living.gaps) {
    if (!gap.issueId) continue;
    if (resolved.has(gap.issueId)) continue;
    if (lockedIssueIds.has(gap.issueId)) continue;
    return gap.issueId;
  }
  return null;
}

/** Invalidate downstream when user edits a prior step — trim turns after edited issue. */
export function invalidateDownstreamTurns(
  turns: AiPmLoopTurn[],
  editedIssueId: AiPmLoopIssueId,
  issueOrder: AiPmLoopIssueId[],
): AiPmLoopTurn[] {
  const editIndex = issueOrder.indexOf(editedIssueId);
  if (editIndex < 0) return turns;

  const downstream = new Set(issueOrder.slice(editIndex + 1));
  return turns.filter((t) => !downstream.has(t.issueId));
}

/** Rebuild memory facts after edit invalidation. */
export function factsToClearAfterEdit(editedIssueId: AiPmLoopIssueId): string[] {
  const key = factKeyForIssue(editedIssueId);
  const keys: string[] = key ? [key] : [];
  if (editedIssueId === 'customer_definition') keys.push('buyer');
  return keys;
}
