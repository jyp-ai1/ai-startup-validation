/**
 * DAY 8-D Phase C — No-Ask / Semantic Repeat policy.
 * CEO already answered → CONFIRM or MOVE; never raw re-ask on OPEN gap alone.
 * General semantic scan — no per-gap hardcode skip rules.
 */

import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import { selectAdaptiveNextGaps } from './adaptive-question-select';
import { isUserConfirmedClaim } from './adaptive-question-select';
import { gapSemanticCluster } from './ai-pm-semantic-clusters';
import type { NextQuestionDecision } from './decide-next-question-from-review';
import {
  isStageBGap,
  type StageReadiness,
} from './evaluate-stage-readiness';
import { resolveGapQuestionBinding } from './gap-question-map';
import { SHARED_UNDERSTANDING_PENDING } from './build-shared-understanding';
import {
  getFact,
  memoryHasFact,
  type ConversationFactKey,
  type ConversationMemory,
} from './conversation-memory';
import type { LivingUnderstandingState } from './living-understanding-state';
import { whyNowForGapField } from './living-understanding-state';
import { isAiPmNoAskPolicyV1Active } from './ai-pm-no-ask-policy-v1';
import { hasCustomerPersonaCue, hasPersonaSegmentCue } from './persona-answer-cues';
import { isSameMeaningQuestion } from './reframe-question';
import { isGapAskable } from './update-gap-state-from-review';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';
import { interpretAnswerSemantics } from './interpret-answer-semantics';
import { gapForSemanticFactKey } from './ai-pm-answer-first-routing';

export type NoAskAction = 'ASK' | 'CONFIRM' | 'MOVE';

export type NoAskVerdict =
  | { action: 'ASK' }
  | {
      action: 'CONFIRM';
      gapId: string;
      confirmText: string;
      knownValue: string;
      reason: string;
    }
  | {
      action: 'MOVE';
      fromGapId: string;
      toGapId: string;
      reason: string;
    };

export type SemanticKnowledgeHit = {
  gapId: string;
  factKey: ConversationFactKey;
  value: string;
  source: 'memory_user' | 'memory_document' | 'claim' | 'spine' | 'prior_turn';
  userConfirmed: boolean;
};

const SPINE_FACT: Partial<Record<ConversationFactKey, keyof LivingUnderstandingState['spine']>> = {
  business: 'business',
  customer: 'customer',
  problem: 'problem',
};

const CONFIRM_FIRST_GAPS = new Set([
  'businessOneLiner',
  'customerPersona',
  'problemJtbd',
  'alternativesCompetitors',
  'differentiationVsAlternatives',
]);

const GAP_CONFIRM_LABEL: Record<string, string> = {
  businessOneLiner: '사업 한 줄',
  customerPersona: '핵심 고객',
  problemJtbd: '핵심 불편',
  alternativesCompetitors: '경쟁·대안',
  differentiationVsAlternatives: '차별점',
  solution: '제공 가치',
  payer: '결제 주체',
  revenueModel: '수익 구조',
  marketChannel: '검증 채널',
};

function isPendingSpine(value: string | null | undefined): boolean {
  const t = value?.trim() ?? '';
  return !t || t === SHARED_UNDERSTANDING_PENDING || t.includes('아직 확인');
}

function claimForGap(living: LivingUnderstandingState, gapId: string) {
  return living.claims.find((c) => c.fieldKey === gapId);
}

function clipValue(value: string, max = 48): string {
  const t = value.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function extractPersonaSnippet(text: string): string | null {
  const trimmed = text.trim();
  const segment = trimmed.match(/([\w가-힣]+(?:가게|집|점|소상공인|팀|업)[^.，,]*)/);
  if (segment?.[1]) return clipValue(segment[1], 40);
  if (hasCustomerPersonaCue(trimmed)) return clipValue(trimmed, 40);
  return null;
}

/** Prior turns — semantic fact keys + live interpret fallback. */
function priorTurnHitForFact(
  factKey: ConversationFactKey,
  turns: AiPmLoopTurn[],
): { value: string; gapId: string } | null {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const turn = turns[i]!;
    if (turn.superseded) continue;
    const answer = turn.answer?.trim() ?? '';
    if (answer.length < 2) continue;

    const storedKeys =
      turn.semanticFactKeys && turn.semanticFactKeys.length > 0
        ? turn.semanticFactKeys
        : turn.semanticFactKey
          ? [turn.semanticFactKey]
          : [];

    let keys = storedKeys as ConversationFactKey[];
    if (keys.length === 0) {
      const interpreted = interpretAnswerSemantics({
        answer,
        askedIssueId: turn.issueId,
        askedTargetGap: turn.targetGap,
      });
      if (interpreted.mergeable && interpreted.facts.length > 0) {
        keys = interpreted.facts.map((f) => f.key);
      } else if (interpreted.factKey) {
        keys = [interpreted.factKey];
      }
    }

    if (keys.includes(factKey)) {
      const gapId = gapForSemanticFactKey(factKey) ?? turn.targetGap?.trim() ?? '';
      return { value: clipValue(answer), gapId };
    }

    if (factKey === 'customer' && (hasCustomerPersonaCue(answer) || hasPersonaSegmentCue(answer))) {
      const snippet = extractPersonaSnippet(answer);
      if (snippet) return { value: snippet, gapId: 'customerPersona' };
    }
  }
  return null;
}

/**
 * Scan living + memory + prior turns for semantic satisfaction of a gap.
 * General — uses gap binding factKey, not gap-specific hardcode.
 */
export function scanSemanticKnowledgeForGap(input: {
  gapId: string;
  living: LivingUnderstandingState;
  memory: ConversationMemory | null;
  turns: AiPmLoopTurn[];
}): SemanticKnowledgeHit | null {
  const gapId = input.gapId.trim();
  if (!gapId) return null;

  const binding = resolveGapQuestionBinding(gapId);
  const factKey = binding.factKey;

  // Payer — inference alone never satisfies (CPO locked)
  if (factKey === 'buyer') {
    const claim = claimForGap(input.living, gapId);
    if (isUserConfirmedClaim(claim) && claim?.value?.trim()) {
      return {
        gapId,
        factKey,
        value: clipValue(claim.value),
        source: 'claim',
        userConfirmed: true,
      };
    }
    const mem = input.memory ? getFact(input.memory, 'buyer') : null;
    if (mem?.source === 'user_turn' && mem.value.trim()) {
      return {
        gapId,
        factKey,
        value: clipValue(mem.value),
        source: 'memory_user',
        userConfirmed: true,
      };
    }
    return null;
  }

  if (input.memory && memoryHasFact(input.memory, factKey)) {
    const mem = getFact(input.memory, factKey)!;
    if (mem.value.trim()) {
      return {
        gapId,
        factKey,
        value: clipValue(mem.value),
        source: mem.source === 'document' ? 'memory_document' : 'memory_user',
        userConfirmed: mem.source === 'user_turn',
      };
    }
  }

  const claim = claimForGap(input.living, gapId);
  if (claim?.value?.trim() && claim.status !== 'unknown') {
    const userConfirmed =
      claim.provenance === 'USER_CONFIRMED' || claim.provenance === 'USER_CORRECTED';
    if (claim.status === 'confirmed' || claim.status === 'inferred' || claim.status === 'known') {
      return {
        gapId,
        factKey,
        value: clipValue(claim.value),
        source: 'claim',
        userConfirmed,
      };
    }
  }

  const spineKey = SPINE_FACT[factKey];
  if (spineKey) {
    const spineVal = input.living.spine[spineKey];
    if (!isPendingSpine(spineVal)) {
      return {
        gapId,
        factKey,
        value: clipValue(spineVal),
        source: 'spine',
        userConfirmed: false,
      };
    }
  }

  const prior = priorTurnHitForFact(factKey, input.turns);
  if (prior) {
    return {
      gapId,
      factKey,
      value: prior.value,
      source: 'prior_turn',
      userConfirmed: true,
    };
  }

  return null;
}

function buildConfirmText(gapId: string, value: string): string {
  const label = GAP_CONFIRM_LABEL[gapId] ?? '내용';
  return `${label}은(는) 「${clipValue(value, 36)}」으로 이해했습니다. 맞나요?`;
}

function closedGapExcludeSet(gapState: GapKnowledgeState): Set<string> {
  const exclude = new Set<string>();
  for (const gapId of Object.keys(gapState.gaps)) {
    if (!isGapAskable(gapId, gapState)) exclude.add(gapId);
  }
  return exclude;
}

function lastAskedGapId(turns: AiPmLoopTurn[]): string | null {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const t = turns[i]!;
    if (t.superseded) continue;
    const gap = t.targetGap?.trim();
    if (gap) return gap;
  }
  return null;
}

function findMoveTargetGap(input: {
  fromGapId: string;
  living: LivingUnderstandingState;
  turns: AiPmLoopTurn[];
  gapState: GapKnowledgeState;
  stageReadiness: StageReadiness;
  memory: ConversationMemory | null;
}): string | null {
  const exclude = closedGapExcludeSet(input.gapState);
  exclude.add(input.fromGapId);

  const fromCluster = gapSemanticCluster(input.fromGapId);
  const candidates = selectAdaptiveNextGaps(input.living, {
    excludeGaps: exclude,
    turns: input.turns,
  });

  for (const candidate of candidates) {
    if (!input.stageReadiness.stageBAllowed && isStageBGap(candidate.fieldKey)) continue;
    if (!isGapAskable(candidate.fieldKey, input.gapState)) continue;
    const cluster = gapSemanticCluster(candidate.fieldKey);
    if (fromCluster && cluster === fromCluster) {
      const hit = scanSemanticKnowledgeForGap({
        gapId: candidate.fieldKey,
        living: input.living,
        memory: input.memory,
        turns: input.turns,
      });
      if (hit) continue;
    }
    return candidate.fieldKey;
  }

  for (const candidate of candidates) {
    if (!isGapAskable(candidate.fieldKey, input.gapState)) continue;
    return candidate.fieldKey;
  }

  return null;
}

function isSemanticRepeatAsk(input: {
  targetGapId: string;
  questionText: string;
  living: LivingUnderstandingState;
  memory: ConversationMemory | null;
  turns: AiPmLoopTurn[];
}): SemanticKnowledgeHit | null {
  const hit = scanSemanticKnowledgeForGap({
    gapId: input.targetGapId,
    living: input.living,
    memory: input.memory,
    turns: input.turns,
  });
  if (!hit) return null;

  const stock = resolveGapQuestionBinding(input.targetGapId).questionText;
  if (isSameMeaningQuestion(input.questionText, stock)) return hit;

  return hit;
}

/**
 * Evaluate whether the proposed question should be suppressed or confirmed.
 */
export function evaluateNoAskPolicy(input: {
  targetGapId: string;
  questionText: string;
  living: LivingUnderstandingState;
  gapState: GapKnowledgeState;
  turns: AiPmLoopTurn[];
  memory: ConversationMemory | null;
  stageReadiness: StageReadiness;
}): NoAskVerdict {
  if (!isAiPmNoAskPolicyV1Active()) return { action: 'ASK' };

  const targetGapId = input.targetGapId.trim();
  if (!targetGapId || !isGapAskable(targetGapId, input.gapState)) {
    return { action: 'ASK' };
  }

  const knowledge = isSemanticRepeatAsk({
    targetGapId,
    questionText: input.questionText,
    living: input.living,
    memory: input.memory,
    turns: input.turns,
  });

  if (knowledge) {
    if (CONFIRM_FIRST_GAPS.has(targetGapId) || !knowledge.userConfirmed) {
      return {
        action: 'CONFIRM',
        gapId: targetGapId,
        confirmText: buildConfirmText(targetGapId, knowledge.value),
        knownValue: knowledge.value,
        reason: `semantic repeat — ${knowledge.source}`,
      };
    }

    const moveTo = findMoveTargetGap({
      fromGapId: targetGapId,
      living: input.living,
      turns: input.turns,
      gapState: input.gapState,
      stageReadiness: input.stageReadiness,
      memory: input.memory,
    });
    if (moveTo) {
      return {
        action: 'MOVE',
        fromGapId: targetGapId,
        toGapId: moveTo,
        reason: 'already known — advance to next gap',
      };
    }
  }

  const lastGap = lastAskedGapId(input.turns);
  const lastCluster = gapSemanticCluster(lastGap);
  const nextCluster = gapSemanticCluster(targetGapId);
  if (lastCluster && nextCluster && lastCluster === nextCluster) {
    const clusterHit = scanSemanticKnowledgeForGap({
      gapId: targetGapId,
      living: input.living,
      memory: input.memory,
      turns: input.turns,
    });
    if (clusterHit) {
      const moveTo = findMoveTargetGap({
        fromGapId: targetGapId,
        living: input.living,
        turns: input.turns,
        gapState: input.gapState,
        stageReadiness: input.stageReadiness,
        memory: input.memory,
      });
      if (moveTo) {
        return {
          action: 'MOVE',
          fromGapId: targetGapId,
          toGapId: moveTo,
          reason: `same cluster ${lastCluster} — knowledge already captured`,
        };
      }
      if (CONFIRM_FIRST_GAPS.has(targetGapId)) {
        return {
          action: 'CONFIRM',
          gapId: targetGapId,
          confirmText: buildConfirmText(targetGapId, clusterHit.value),
          knownValue: clusterHit.value,
          reason: `same cluster ${lastCluster} — confirm known`,
        };
      }
    }
  }

  return { action: 'ASK' };
}

export type ApplyNoAskPolicyInput = {
  decision: NextQuestionDecision;
  living: LivingUnderstandingState;
  gapState: GapKnowledgeState;
  turns: AiPmLoopTurn[];
  memory: ConversationMemory | null;
  stageReadiness: StageReadiness;
};

/** Apply No-Ask verdict on V3/policy decision output — presentation-safe only. */
export function applyNoAskPolicy(input: ApplyNoAskPolicyInput): NextQuestionDecision {
  if (!isAiPmNoAskPolicyV1Active()) return input.decision;

  const verdict = evaluateNoAskPolicy({
    targetGapId: input.decision.targetGapId,
    questionText: input.decision.questionText,
    living: input.living,
    gapState: input.gapState,
    turns: input.turns,
    memory: input.memory,
    stageReadiness: input.stageReadiness,
  });

  if (verdict.action === 'ASK') return input.decision;

  if (verdict.action === 'CONFIRM') {
    const binding = resolveGapQuestionBinding(verdict.gapId);
    return {
      ...input.decision,
      targetGap: verdict.gapId,
      targetGapId: verdict.gapId,
      issueId: binding.issueId,
      questionText: verdict.confirmText,
      whyNow: `이미 말씀하신 내용을 바탕으로 확인합니다. (${verdict.reason})`,
      rationale: verdict.reason,
      reframed: true,
      actionRationale: 'No-Ask CONFIRM — gap OPEN이지만 의미상 이미 충족',
      reason: `no-ask confirm ${verdict.gapId}`,
    };
  }

  const binding = resolveGapQuestionBinding(verdict.toGapId);
  const whyNow = whyNowForGapField(verdict.toGapId) || binding.whyNow;
  return {
    ...input.decision,
    targetGap: verdict.toGapId,
    targetGapId: verdict.toGapId,
    issueId: binding.issueId,
    questionText: binding.questionText,
    whyNow,
    rationale: binding.whyNow,
    reframed: true,
    actionRationale: `No-Ask MOVE — ${verdict.fromGapId} → ${verdict.toGapId} (${verdict.reason})`,
    reason: `no-ask move ${verdict.fromGapId}→${verdict.toGapId}`,
  };
}
