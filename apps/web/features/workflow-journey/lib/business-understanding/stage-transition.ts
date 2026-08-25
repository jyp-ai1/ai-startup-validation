/**
 * Long Sprint W9 — Stage Transition Engine.
 * Understanding → Validation is NOT answer-count based.
 * Gates: required evidence + confidence + no critical contradiction + critical unknowns resolved.
 */

import type { ConversationMemory } from './conversation-memory';
import { memoryHasFact } from './conversation-memory';
import type { AiPmLoopState } from './workspace-ai-pm-loop-types';
import {
  deriveEvidenceStatusFromMemory,
  isRequiredReviewEvidenceConfirmed,
} from './evidence-status';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

/** Product stages A–D (SCOPE §18). */
export type ProductStageId = 'A_understanding' | 'B_validation' | 'C_risk' | 'D_decision';

export type StageTransitionBlocker =
  | 'critical_unknown'
  | 'required_evidence'
  | 'pending_contradiction'
  | 'low_confidence'
  | null;

export type StageTransitionEvaluation = {
  currentStage: ProductStageId;
  canTransitionToValidation: boolean;
  blocker: StageTransitionBlocker;
  /** Founder-facing handoff when ready */
  validationHandoff: string;
  /** Founder-facing when blocked */
  blockedHandoff: string;
  /** Turn count is informational only — never a gate */
  turnCount: number;
};

const CRITICAL_FACT_KEYS = ['customer', 'problem', 'business'] as const;

export type StageTransitionInput = {
  loop: AiPmLoopState;
  memory: ConversationMemory;
  entities?: LaunchLensDomainContext | null;
  /** Open contradiction awaiting confirm */
  pendingContradiction?: boolean;
};

/**
 * Evaluate whether Understanding stage may transition to Validation.
 * Does NOT use answer/turn count as a gate.
 */
export function evaluateStageTransition(
  input: StageTransitionInput,
): StageTransitionEvaluation {
  const turnCount = input.loop.turns.length;
  const evidence = deriveEvidenceStatusFromMemory({
    memory: input.memory,
    entities: input.entities,
  });
  const evidenceReady = isRequiredReviewEvidenceConfirmed(evidence);

  const missingCritical = CRITICAL_FACT_KEYS.filter((key) => {
    if (key === 'business') {
      return !memoryHasFact(input.memory, 'business') && !memoryHasFact(input.memory, 'revenue');
    }
    return !memoryHasFact(input.memory, key);
  });

  if (input.pendingContradiction) {
    return {
      currentStage: 'A_understanding',
      canTransitionToValidation: false,
      blocker: 'pending_contradiction',
      validationHandoff: '',
      blockedHandoff:
        '이전에 확인한 내용과 새 답변이 다릅니다. 어느 쪽이 맞는지 확인한 뒤 검증으로 넘어갑니다.',
      turnCount,
    };
  }

  if (missingCritical.length > 0) {
    return {
      currentStage: 'A_understanding',
      canTransitionToValidation: false,
      blocker: 'critical_unknown',
      validationHandoff: '',
      blockedHandoff:
        '아직 핵심 이해(고객·문제·사업)가 비어 있습니다. 부족한 항목만 확인하면 검증으로 넘어갑니다.',
      turnCount,
    };
  }

  if (!evidenceReady) {
    return {
      currentStage: 'A_understanding',
      canTransitionToValidation: false,
      blocker: 'required_evidence',
      validationHandoff: '',
      blockedHandoff:
        '검증에 필요한 확인이 남아 있습니다. 답변 개수가 아니라 확인된 내용이 기준입니다.',
      turnCount,
    };
  }

  return {
    currentStage: 'B_validation',
    canTransitionToValidation: true,
    blocker: null,
    validationHandoff:
      '이해가 충분합니다. 이제 사업성 검증으로 넘어가 판단·근거·다음 행동 하나를 정리합니다.',
    blockedHandoff: '',
    turnCount,
  };
}

/** True when Validation handoff is allowed (product gate). */
export function canEnterValidation(input: StageTransitionInput): boolean {
  return evaluateStageTransition(input).canTransitionToValidation;
}
