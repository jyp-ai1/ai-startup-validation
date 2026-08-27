/**
 * Core Final W6 — Adaptive Question Selection.
 * Select next Q from Known / Inferred / Confirmed / Unknown / Contradiction / Criticality / Evidence.
 * No fixed spine. Competition before Differentiation when both unknown.
 */

import type { LivingClaim, LivingUnderstandingState } from './living-understanding-state';
import { resolveGapQuestionBinding } from './gap-question-map';
import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';

/**
 * Critical viability gaps — shared with analysis gate (avoid circular import).
 * P0 Judgment: Sufficiency ≠ Analysis Ready. These must be USER_CONFIRMED
 * before Start Analysis. Includes solution (CPO HOLD @ eabca85).
 */
export const ADAPTIVE_CRITICAL_GAP_KEYS = [
  'customerPersona',
  'problemJtbd',
  'payer',
  'solution',
  'alternativesCompetitors',
  'differentiationVsAlternatives',
] as const;

export type AdaptiveCriticalGapKey = (typeof ADAPTIVE_CRITICAL_GAP_KEYS)[number];

export type AdaptiveGapCandidate = {
  fieldKey: string;
  issueId: AiPmLoopIssueId;
  score: number;
  rationale: string;
};

function isUserConfirmed(claim: LivingClaim | undefined): boolean {
  return (
    claim != null &&
    (claim.provenance === 'USER_CONFIRMED' || claim.provenance === 'USER_CORRECTED') &&
    claim.status === 'confirmed' &&
    Boolean(claim.value?.trim())
  );
}

function isUnknownOrWeak(claim: LivingClaim | undefined): boolean {
  if (!claim) return true;
  if (claim.status === 'unknown' || claim.status === 'contradiction') return true;
  if (!claim.value?.trim()) return true;
  // DOCUMENT / AI_INFERENCE alone = still adaptive gap for viability
  if (claim.status === 'inferred' || claim.status === 'known') return true;
  if (
    claim.provenance === 'AI_INFERENCE' ||
    claim.provenance === 'UNKNOWN' ||
    claim.provenance === 'DOCUMENT'
  ) {
    // Document extract needs verify — treat as soft unknown for selection
    return claim.provenance !== 'DOCUMENT' || claim.status !== 'confirmed';
  }
  return false;
}

function claimByKey(
  living: LivingUnderstandingState,
  key: string,
): LivingClaim | undefined {
  return living.claims.find((c) => c.fieldKey === key);
}

/** Detect tourism-like vs B2B SaaS-like from confirmed/known claims + spine. */
export function detectBusinessArchetype(
  living: LivingUnderstandingState,
): 'tourism' | 'b2b_saas' | 'generic' {
  const blob = [
    living.spine.business,
    living.spine.customer,
    living.spine.problem,
    ...living.claims.map((c) => c.value ?? ''),
  ]
    .join(' ')
    .toLowerCase();

  if (/관광|여행|투어|외국인|핏|fit|가이드|현지|체험/.test(blob)) return 'tourism';
  if (/b2b|saas|구독|엔터프라이즈|sme|중소기업|api/.test(blob)) return 'b2b_saas';
  return 'generic';
}

/**
 * Rank adaptive next gaps. Prefer:
 * 1) Contradictions
 * 2) Critical viability unknowns (user-unconfirmed)
 * 3) Competition before Differentiation when both open
 * 4) Revenue chain after payer confirmed
 * 5) Evidence / channel
 */
export function selectAdaptiveNextGaps(
  living: LivingUnderstandingState,
  options?: { excludeGaps?: Set<string>; answeredFactGaps?: Set<string> },
): AdaptiveGapCandidate[] {
  const exclude = options?.excludeGaps ?? new Set<string>();
  const answered = options?.answeredFactGaps ?? new Set<string>();
  const archetype = detectBusinessArchetype(living);
  const candidates: AdaptiveGapCandidate[] = [];

  const byKey = (k: string) => claimByKey(living, k);

  // 1) Contradictions first
  for (const claim of living.claims) {
    if (claim.status !== 'contradiction') continue;
    if (exclude.has(claim.fieldKey) || answered.has(claim.fieldKey)) continue;
    const binding = resolveGapQuestionBinding(claim.fieldKey);
    candidates.push({
      fieldKey: claim.fieldKey,
      issueId: binding.issueId,
      score: 100_000,
      rationale: `모순 해소 필요: ${claim.fieldKey}`,
    });
  }

  // 2) Critical viability — require user confirmation
  for (const key of ADAPTIVE_CRITICAL_GAP_KEYS) {
    if (exclude.has(key) || answered.has(key)) continue;
    const claim = byKey(key);
    if (isUserConfirmed(claim)) continue;
    if (!isUnknownOrWeak(claim) && claim?.status === 'confirmed') continue;

    let score = 50_000;
    // Competition before Differentiation when both open
    if (key === 'alternativesCompetitors') {
      const diff = byKey('differentiationVsAlternatives');
      if (!isUserConfirmed(diff)) score = 55_000;
    }
    if (key === 'differentiationVsAlternatives') {
      const comp = byKey('alternativesCompetitors');
      if (!isUserConfirmed(comp)) {
        // Demote differentiation until competitor confirmed
        score = 40_000;
      } else {
        score = 54_000;
      }
    }
    // Solution after problem locked — blocks dishonest Start Analysis
    if (key === 'solution') {
      const problem = byKey('problemJtbd');
      score = isUserConfirmed(problem) ? 52_000 : 45_000;
    }
    // Tourism: problem/customer slightly ahead of generic BM
    if (archetype === 'tourism' && (key === 'problemJtbd' || key === 'customerPersona')) {
      score += 2_000;
    }
    // B2B: payer / revenue pressure earlier
    if (archetype === 'b2b_saas' && key === 'payer') {
      score += 1_500;
    }

    const binding = resolveGapQuestionBinding(key);
    candidates.push({
      fieldKey: key,
      issueId: binding.issueId,
      score,
      rationale: binding.whyNow,
    });
  }

  // 3) Differentiation chain after diff confirmed
  const diffConfirmed = isUserConfirmed(byKey('differentiationVsAlternatives'));
  if (diffConfirmed) {
    for (const key of ['validationTestability', 'executionConstraints'] as const) {
      if (exclude.has(key) || answered.has(key)) continue;
      if (isUserConfirmed(byKey(key))) continue;
      const binding = resolveGapQuestionBinding(key);
      candidates.push({
        fieldKey: key,
        issueId: binding.issueId,
        score: key === 'validationTestability' ? 35_000 : 34_000,
        rationale: binding.whyNow,
      });
    }
  }

  // 4) Revenue chain after payer confirmed
  if (isUserConfirmed(byKey('payer'))) {
    for (const key of ['revenueModel', 'pricingHint'] as const) {
      if (exclude.has(key) || answered.has(key)) continue;
      if (isUserConfirmed(byKey(key))) continue;
      const binding = resolveGapQuestionBinding(key);
      candidates.push({
        fieldKey: key,
        issueId: binding.issueId,
        score: key === 'revenueModel' ? 30_000 : 28_000,
        rationale: binding.whyNow,
      });
    }
  }

  // 5) Market / channel evidence
  for (const key of ['marketSizeEvidence', 'marketChannel'] as const) {
    if (exclude.has(key) || answered.has(key)) continue;
    if (isUserConfirmed(byKey(key))) continue;
    const binding = resolveGapQuestionBinding(key);
    candidates.push({
      fieldKey: key,
      issueId: binding.issueId,
      score: key === 'marketSizeEvidence' ? 22_000 : 20_000,
      rationale: binding.whyNow,
    });
  }

  // Merge living.gaps scores as soft boost
  for (const gap of living.gaps) {
    const existing = candidates.find((c) => c.fieldKey === gap.fieldKey);
    if (existing) {
      existing.score = Math.max(existing.score, gap.priorityScore);
      continue;
    }
    if (exclude.has(gap.fieldKey) || answered.has(gap.fieldKey)) continue;
    if (!gap.issueId) continue;
    candidates.push({
      fieldKey: gap.fieldKey,
      issueId: gap.issueId,
      score: gap.priorityScore,
      rationale: gap.rationale,
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export function selectTopAdaptiveGap(
  living: LivingUnderstandingState,
  options?: { excludeGaps?: Set<string>; answeredFactGaps?: Set<string> },
): AdaptiveGapCandidate | null {
  return selectAdaptiveNextGaps(living, options)[0] ?? null;
}

/** Critical keys still lacking USER_CONFIRMED. */
export function listUnconfirmedCriticalGaps(
  living: LivingUnderstandingState,
): AdaptiveCriticalGapKey[] {
  return ADAPTIVE_CRITICAL_GAP_KEYS.filter((key) => {
    const claim = claimByKey(living, key);
    return !isUserConfirmed(claim);
  });
}
