/**
 * P0-8 — Final Integrity Gate before Review / GO.
 * Score alone cannot GO: Original Intent · Identity · Critical Gap · Contradiction.
 */

import { listUnconfirmedCriticalGaps } from './adaptive-question-select';
import type { ConversationMemory } from './conversation-memory';
import { memoryHasOpenConflict } from './conversation-memory';
import type { LivingUnderstandingState } from './living-understanding-state';
import {
  evaluateIntentDrift,
  loadOriginalBusinessIntent,
  summarizeCurrentBusinessIntent,
} from './original-business-intent';
import type { AiPmLoopState } from './workspace-ai-pm-loop-types';
import { evaluateStageTransition } from './stage-transition';

export type FinalIntegrityBlocker =
  | 'intent_drift'
  | 'unresolved_contradiction'
  | 'critical_gap'
  | 'identity_mismatch'
  | 'insufficient_understanding'
  | null;

export type FinalIntegrityEvaluation = {
  canRecommendGo: boolean;
  blocker: FinalIntegrityBlocker;
  blockers: string[];
  intentAligned: boolean;
  identityIntegrity: boolean;
  /** Founder-facing — never silent GO on drift */
  handoff: string;
};

export type FinalIntegrityInput = {
  living: LivingUnderstandingState;
  memory: ConversationMemory;
  loop: AiPmLoopState;
  projectId?: string;
  documentText?: string;
};

/**
 * Evaluate whether Final Review may recommend GO.
 * Blocks when pinned intent drifts, contradictions open, or critical gaps remain.
 */
export function evaluateFinalIntegrityGate(input: FinalIntegrityInput): FinalIntegrityEvaluation {
  const blockers: string[] = [];
  const original = loadOriginalBusinessIntent(input.projectId);
  const currentSummary = summarizeCurrentBusinessIntent({
    spineBusiness: input.living.spine.business,
    spineCustomer: input.living.spine.customer,
    documentExcerpt: input.documentText?.slice(0, 200) ?? null,
  });

  let intentAligned = true;
  if (original) {
    const drift = evaluateIntentDrift(original.text, currentSummary);
    intentAligned = !drift.drifted;
    if (drift.drifted) {
      blockers.push(drift.rationale);
    }
  }

  const hasContradiction =
    input.living.claims.some((c) => c.status === 'contradiction') ||
    memoryHasOpenConflict(input.memory);

  if (hasContradiction) {
    blockers.push('아직 해결되지 않은 모순된 답이 있습니다.');
  }

  // Long Sprint — align Final Integrity Critical Unknown with Analysis Ready gate
  // (ADAPTIVE_CRITICAL_GAP_KEYS). priorityScore≥100 falsely treated pricingHint /
  // marketSizeEvidence / residual Stage-A fields as Critical after Start Analysis.
  const criticalGapKeys = new Set<string>(listUnconfirmedCriticalGaps(input.living));
  const criticalGaps = input.living.gaps.filter((g) => criticalGapKeys.has(g.fieldKey));
  if (criticalGaps.length > 0) {
    blockers.push(`Critical Unknown ${criticalGaps.length}건 — ${criticalGaps[0]?.rationale ?? ''}`);
  }

  const stageEval = evaluateStageTransition({
    loop: input.loop,
    memory: input.memory,
    pendingContradiction: hasContradiction,
    criticalGapCount: criticalGaps.length,
    understandingCoveragePercent: input.living.coveragePercent,
  });

  if (!stageEval.canTransitionToValidation) {
    if (stageEval.blocker === 'critical_unknown') {
      blockers.push(stageEval.blockedHandoff);
    } else if (stageEval.blocker === 'pending_contradiction') {
      blockers.push(stageEval.blockedHandoff);
    } else if (stageEval.blocker === 'low_confidence') {
      blockers.push(stageEval.blockedHandoff);
    }
  }

  // Identity: business one-liner must align with pinned seed — compare spine + claim, not solution text
  const businessClaim = input.living.claims.find((c) => c.fieldKey === 'businessOneLiner');
  const solutionClaim = input.living.claims.find((c) => c.fieldKey === 'solution');
  let identityIntegrity = true;
  if (original && businessClaim?.value) {
    const identityText =
      businessClaim.value === solutionClaim?.value
        ? input.living.spine.business || businessClaim.value
        : businessClaim.value;
    const idDrift = evaluateIntentDrift(original.text, identityText);
    if (idDrift.drifted) {
      identityIntegrity = false;
      if (!blockers.some((b) => b.includes('정체성') || b.includes('어긋'))) {
        blockers.push('확정된 사업 한 줄이 시작 의도와 맞지 않습니다.');
      }
    }
  }

  const canRecommendGo =
    intentAligned &&
    identityIntegrity &&
    !hasContradiction &&
    criticalGaps.length === 0 &&
    stageEval.canTransitionToValidation;

  let blocker: FinalIntegrityBlocker = null;
  if (!intentAligned || !identityIntegrity) blocker = 'intent_drift';
  else if (hasContradiction) blocker = 'unresolved_contradiction';
  else if (criticalGaps.length > 0) blocker = 'critical_gap';
  else if (!stageEval.canTransitionToValidation) blocker = 'insufficient_understanding';

  const handoff = canRecommendGo
    ? '원래 사업 의도 · 현재 이해 · Critical Gap · 모순 검사를 통과했습니다. 분석 결과를 검토할 수 있습니다.'
    : blockers[0] ??
      '아직 Final Review GO 조건을 충족하지 못했습니다. 점수만으로 GO하지 않습니다.';

  return {
    canRecommendGo,
    blocker,
    blockers: [...new Set(blockers)],
    intentAligned,
    identityIntegrity,
    handoff,
  };
}

/** Override analysis GO verdict when integrity gate fails. */
export function gateAnalysisVerdict(
  rawVerdict: 'GO' | 'HOLD' | 'NO_GO',
  integrity: FinalIntegrityEvaluation,
): 'GO' | 'HOLD' | 'NO_GO' {
  if (!integrity.canRecommendGo && rawVerdict === 'GO') return 'HOLD';
  return rawVerdict;
}
