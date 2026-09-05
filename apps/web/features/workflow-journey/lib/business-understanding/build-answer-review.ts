/**
 * PR1 — Canonical answer semantic review builder (S12).
 * B18 submit canonicalization lives here when V3_REVIEW_PIPELINE is ON.
 * @see docs/architecture/ai-pm-v3/readiness/V3_ANSWER_REVIEW_DATA_CONTRACT.md
 */

import type {
  AnswerReview,
  ContradictionRecord,
  ExtractedFact,
  GapCompleteness,
  GapVerdict,
  RecommendedAction,
} from '@repo/types/domain/answer-review';

import type { ConversationFactKey } from './conversation-memory';
import { inferTargetGapFromQuestionText } from './gap-question-map';
import {
  interpretAnswerSemantics,
  type SemanticInterpretation,
} from './interpret-answer-semantics';
import { isOnSlotCompetitorAnswer } from './competitor-answer-cues';
import {
  hasCustomerPersonaCue,
  hasPersonaSegmentCue,
  isRelevanceDominantOnPersonaAsk,
} from './persona-answer-cues';
import { isOnSlotPayerAnswer } from './payer-answer-cues';
import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';
import {
  resolveNuclearWrongSlotAtSubmit,
  type WrongSlotMergeContext,
} from './wrong-slot-priority';

export type BuildAnswerReviewInput = {
  turnId: string;
  askedGapId: string;
  askedQuestionText: string;
  askedIssueId: AiPmLoopIssueId;
  userAnswer: string;
  existingFact?: string | null;
  existingFactsByKey?: Partial<Record<ConversationFactKey, string | null>>;
  displayedQuestionText: string;
  /** Gaps already CLOSED before this turn — preserved in review, never re-opened (PR2). */
  priorClosedGaps?: string[];
};

export type CanonicalizedSubmitSemantics = {
  semantic: SemanticInterpretation;
  resolvedAskedGap: string | null;
  nuclearWrongSlot: WrongSlotMergeContext | null;
};

export type BuildAnswerReviewResult = CanonicalizedSubmitSemantics & {
  review: AnswerReview;
};

/** B18 — display SoT canonicalization (moved from workspace-ai-pm-loop-panel L1190–1307). */
export function canonicalizeSubmitSemantics(input: {
  answer: string;
  askedIssueId: AiPmLoopIssueId;
  existingFact?: string | null;
  existingFactsByKey?: Partial<Record<ConversationFactKey, string | null>>;
  displayedQuestionText: string;
  visibleGap: string | null;
  initialResolvedAskedGap: string | null;
  initialSemantic: SemanticInterpretation;
}): CanonicalizedSubmitSemantics {
  const trimmed = input.answer.trim();
  let semantic = input.initialSemantic;
  let resolvedAskedGap = input.initialResolvedAskedGap;

  const displayedGapForCanonical =
    inferTargetGapFromQuestionText(input.displayedQuestionText) ?? input.visibleGap;

  if (displayedGapForCanonical === 'solution' && semantic.mergeable) {
    resolvedAskedGap = 'solution';
    if (!semantic.facts.some((f) => f.key === 'business')) {
      semantic = {
        ...semantic,
        factKey: 'business',
        resolvedIssueId: 'problem_definition',
        facts: [{ key: 'business', issueId: 'problem_definition' }],
      };
    }
  } else if (displayedGapForCanonical === 'payer' && semantic.mergeable) {
    if (semantic.factKey !== 'buyer' && isOnSlotPayerAnswer(trimmed)) {
      semantic = {
        ...semantic,
        factKey: 'buyer',
        resolvedIssueId: 'bm_design',
        facts: [{ key: 'buyer', issueId: 'bm_design' }],
      };
    }
  } else if (displayedGapForCanonical === 'alternativesCompetitors' && semantic.mergeable) {
    if (semantic.factKey !== 'competitor' && isOnSlotCompetitorAnswer(trimmed)) {
      semantic = {
        ...semantic,
        factKey: 'competitor',
        resolvedIssueId: 'competitor_analysis',
        facts: [{ key: 'competitor', issueId: 'competitor_analysis' }],
      };
    }
  } else if (displayedGapForCanonical === 'customerPersona' && semantic.mergeable) {
    if (isRelevanceDominantOnPersonaAsk(trimmed)) {
      semantic = {
        ...semantic,
        factKey: 'diffRelevance',
        resolvedIssueId: 'competitor_analysis',
        facts: [{ key: 'diffRelevance', issueId: 'competitor_analysis' }],
      };
      resolvedAskedGap = 'customerPersona';
    } else if (hasPersonaSegmentCue(trimmed) && semantic.factKey !== 'customer') {
      semantic = {
        ...semantic,
        factKey: 'customer',
        resolvedIssueId: 'customer_definition',
        facts: [{ key: 'customer', issueId: 'customer_definition' }],
      };
    }
  } else if (displayedGapForCanonical === 'problemJtbd' && semantic.mergeable) {
    const personaSegmentCue = hasPersonaSegmentCue(trimmed);
    const problemCue =
      /(불편|pain|문제|해결|jtbd|획일|동선\s*낭비|맞춤\s*일정|패키지)/i.test(trimmed);
    if (personaSegmentCue && !problemCue) {
      semantic = {
        ...semantic,
        factKey: 'customer',
        resolvedIssueId: 'customer_definition',
        facts: [{ key: 'customer', issueId: 'customer_definition' }],
      };
      resolvedAskedGap = 'problemJtbd';
    }
  }

  if (
    semantic.factKey === 'diffRelevance' &&
    semantic.mergeable &&
    inferTargetGapFromQuestionText(input.displayedQuestionText) === 'customerPersona'
  ) {
    resolvedAskedGap = 'customerPersona';
  }
  if (
    semantic.factKey === 'customer' &&
    semantic.mergeable &&
    inferTargetGapFromQuestionText(input.displayedQuestionText) === 'problemJtbd'
  ) {
    resolvedAskedGap = 'problemJtbd';
  }

  const nuclearWrongSlot = resolveNuclearWrongSlotAtSubmit({
    questionText: input.displayedQuestionText,
    answer: trimmed,
  });
  if (nuclearWrongSlot) {
    resolvedAskedGap = nuclearWrongSlot.askedGap;
    if (nuclearWrongSlot.closedFactKey === 'diffRelevance') {
      semantic = {
        ...semantic,
        factKey: 'diffRelevance',
        resolvedIssueId: 'competitor_analysis',
        facts: [{ key: 'diffRelevance', issueId: 'competitor_analysis' }],
      };
    } else if (nuclearWrongSlot.closedFactKey === 'customer') {
      semantic = {
        ...semantic,
        factKey: 'customer',
        resolvedIssueId: 'customer_definition',
        facts: [{ key: 'customer', issueId: 'customer_definition' }],
      };
    }
  }

  return { semantic, resolvedAskedGap, nuclearWrongSlot };
}

const FACT_KEY_TO_GAP: Partial<Record<ConversationFactKey, string>> = {
  buyer: 'payer',
  customer: 'customerPersona',
  problem: 'problemJtbd',
  business: 'businessOneLiner',
  revenue: 'revenueModel',
  market: 'marketChannel',
  competitor: 'alternativesCompetitors',
  differentiation: 'differentiationVsAlternatives',
  diffRelevance: 'differentiationVsAlternatives',
  defensibility: 'differentiationHypothesis',
};

function gapForFactKey(key: ConversationFactKey): string | undefined {
  return FACT_KEY_TO_GAP[key];
}

/** V3-06 — technology/solution prose on persona ask is off-topic (R5 IRRELEVANT). */
const TECH_SOLUTION_CUE_RE =
  /(기술|AI|인공지능|알고리즘|딥러닝|머신러닝|플랫폼|SaaS|솔루션|API|백엔드|프론트|엔진|모델)/i;

function isOffTopicForAskedGap(askedGapId: string, userAnswer: string): boolean {
  const t = userAnswer.trim();
  if (askedGapId === 'customerPersona') {
    const hasTechCue = TECH_SOLUTION_CUE_RE.test(t);
    const hasPersonaCue = hasCustomerPersonaCue(t) || hasPersonaSegmentCue(t);
    return hasTechCue && !hasPersonaCue;
  }
  return false;
}

function offTopicSemanticOverride(
  askedGapId: string,
  userAnswer: string,
): SemanticInterpretation {
  return {
    intent: 'business_fact',
    factKey: null,
    resolvedIssueId: null,
    facts: [],
    value: userAnswer.trim(),
    mergeable: false,
    displayOnly: false,
    rationale: `답변이 ${askedGapId} 주제와 무관합니다 — technology ≠ customer segment.`,
    quality: 'IRRELEVANT',
  };
}

function extractFactValue(key: ConversationFactKey, userAnswer: string): string {
  const t = userAnswer.trim();
  switch (key) {
    case 'buyer': {
      const m = t.match(/(고객|소비자|사용자|구매자|기업|회사|B2B|B2C)/i);
      if (m) return m[0];
      break;
    }
    case 'revenue': {
      const m = t.match(/(구독[^,.·]*|수수료[^,.·]*|매출[^,.·]*|커미션[^,.·]*|월\s*\d+[^,.·]*)/i);
      if (m) return m[0];
      break;
    }
    case 'customer': {
      const m = t.match(
        /(마케팅\s*팀|[\w가-힣]+팀|관광객|여행객|중소기업|스타트업|직장인|학생|커플|부부)/i,
      );
      if (m) return m[0];
      break;
    }
    default:
      break;
  }
  return t;
}

function isWeakGenericSegment(text: string): boolean {
  const t = text.trim();
  return /^(사람들|사람|누군가|모두|전부)$/i.test(t);
}

function isAmbiguousHedge(text: string): boolean {
  const t = text.trim();
  if (/^(음|글쎄|모르|잘\s*모)/i.test(t)) return true;
  if (/^음[…\.]{0,2}\s*글쎄/i.test(t)) return true;
  // Short hedge utterances — R3 ambiguous (V3-03)
  if (/음/.test(t) && /글쎄|모르/.test(t) && t.length <= 16) return true;
  return false;
}

function isOnSlotPersonaAnswer(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return false;
  if (isRelevanceDominantOnPersonaAsk(t)) return false;
  return (
    hasCustomerPersonaCue(t) ||
    hasPersonaSegmentCue(t) ||
    /(마케팅\s*팀|중소기업|스타트업|[\w가-힣]{2,}팀)/i.test(t)
  );
}

const REVENUE_CUE_RE = /(수익|수수료|구독|pricing|매출|monetiz|커미션|중개\s*수수)/i;

/** Ensure payer+revenue multi-fact hits when both cues appear in one utterance (V3-07). */
function enrichMultiFactSemantic(
  semantic: SemanticInterpretation,
  userAnswer: string,
  askedGapId: string,
): SemanticInterpretation {
  if (!semantic.mergeable) return semantic;

  let facts = [...semantic.facts];
  const trimmed = userAnswer.trim();

  if (
    askedGapId === 'payer' &&
    (isOnSlotPayerAnswer(trimmed) || hasImplicitPayerCue(trimmed)) &&
    !facts.some((f) => f.key === 'buyer')
  ) {
    facts = [{ key: 'buyer', issueId: 'bm_design' }, ...facts];
  }

  if (REVENUE_CUE_RE.test(trimmed) && !facts.some((f) => f.key === 'revenue')) {
    facts = [...facts, { key: 'revenue', issueId: 'bm_design' }];
  }

  if (facts.length === semantic.facts.length) return semantic;

  return {
    ...semantic,
    facts,
    factKey: semantic.factKey ?? facts[0]?.key ?? null,
    resolvedIssueId: semantic.resolvedIssueId ?? 'bm_design',
  };
}

function evidenceForExtractedFact(
  hit: { key: ConversationFactKey },
  semantic: SemanticInterpretation,
  userAnswer: string,
  askedGapId: string,
): { evidenceClass: ExtractedFact['evidenceClass']; confidence: ExtractedFact['confidence'] } {
  const onSlot =
    (hit.key === 'buyer' && askedGapId === 'payer' && isOnSlotPayerAnswer(userAnswer)) ||
    (hit.key === 'customer' && askedGapId === 'customerPersona' && isOnSlotPersonaAnswer(userAnswer)) ||
    (hit.key === 'revenue' && REVENUE_CUE_RE.test(userAnswer));

  if (onSlot && semantic.mergeable) {
    return { evidenceClass: 'FACT', confidence: 'high' };
  }
  if (semantic.quality === 'CONTRADICTORY') {
    return { evidenceClass: 'CONTRADICTION', confidence: 'low' };
  }
  if (semantic.quality === 'PARTIAL') {
    return { evidenceClass: 'ASSUMPTION', confidence: 'low' };
  }
  if (semantic.quality === 'VALID') {
    return { evidenceClass: 'FACT', confidence: 'high' };
  }
  return { evidenceClass: 'INFERENCE', confidence: 'medium' };
}

function isOnSlotSufficient(
  askedGapId: string,
  userAnswer: string,
  semantic: SemanticInterpretation,
): boolean {
  // AC10 — payer CLOSED only when payer/payment decision-maker explicitly confirmed
  if (askedGapId === 'payer') {
    if (!semantic.mergeable) return false;
    return (
      isOnSlotPayerAnswer(userAnswer) &&
      (semantic.factKey === 'buyer' || hasImplicitPayerCue(userAnswer))
    );
  }
  if (askedGapId === 'customerPersona') {
    if (!semantic.mergeable) return false;
    return isOnSlotPersonaAnswer(userAnswer);
  }
  if (semantic.quality === 'VALID' && semantic.mergeable) return true;
  return false;
}

function hasImplicitPayerCue(text: string): boolean {
  return /(고객|소비자|사용자|직접\s*내|직접\s*결제|구매자)/i.test(text.trim());
}

function deriveGapCompleteness(
  semantic: SemanticInterpretation,
  askedGapId: string,
  userAnswer: string,
): GapCompleteness {
  if (semantic.quality === 'CONTRADICTORY') return 'CONTRADICTED';
  if (isWeakGenericSegment(userAnswer)) return 'PARTIAL';
  if (isAmbiguousHedge(userAnswer) || semantic.quality === 'AMBIGUOUS') return 'OPEN';
  if (semantic.intent === 'nonsense' || semantic.quality === 'IRRELEVANT') return 'OPEN';
  if (semantic.quality === 'UNKNOWN') return 'OPEN';
  if (isOnSlotSufficient(askedGapId, userAnswer, semantic)) return 'CLOSED';
  if (semantic.quality === 'PARTIAL' && semantic.mergeable) return 'PARTIAL';
  if (semantic.quality === 'VALID' && semantic.mergeable) return 'CLOSED';
  return 'OPEN';
}

function deriveRecommendedAction(
  completeness: GapCompleteness,
  semantic: SemanticInterpretation,
  userAnswer: string,
): RecommendedAction {
  if (completeness === 'CONTRADICTED') return 'challenge';
  if (completeness === 'OPEN' && (semantic.quality === 'AMBIGUOUS' || isAmbiguousHedge(userAnswer))) {
    return 'clarify';
  }
  if (completeness === 'PARTIAL') return 'probe';
  if (completeness === 'OPEN') return 'probe';
  if (completeness === 'CLOSED') return 'advance';
  return 'probe';
}

function buildExtractedFacts(
  semantic: SemanticInterpretation,
  resolvedAskedGap: string | null,
  userAnswer: string,
): ExtractedFact[] {
  if (!semantic.mergeable || semantic.facts.length === 0) return [];

  const fallbackValue = semantic.value ?? userAnswer.trim();
  return semantic.facts.map((hit) => {
    const { evidenceClass, confidence } = evidenceForExtractedFact(
      hit,
      semantic,
      userAnswer,
      resolvedAskedGap ?? '',
    );
    return {
      key: hit.key,
      value: extractFactValue(hit.key, userAnswer) || fallbackValue,
      evidenceClass,
      confidence,
      targetGap: gapForFactKey(hit.key) ?? resolvedAskedGap ?? '',
      source: semantic.intent === 'correction' ? 'corrected' : 'explicit',
    };
  });
}

function buildContradictions(
  semantic: SemanticInterpretation,
  askedGapId: string,
  existingFactsByKey?: Partial<Record<ConversationFactKey, string | null>>,
): ContradictionRecord[] {
  if (semantic.quality !== 'CONTRADICTORY' || !semantic.factKey) return [];

  const prior =
    existingFactsByKey?.[semantic.factKey]?.trim() ??
    null;
  if (!prior) return [];

  const conflictGapId = gapForFactKey(semantic.factKey) ?? askedGapId;
  return [
    {
      factKey: semantic.factKey,
      gapId: conflictGapId,
      priorValue: prior,
      newValue: semantic.value ?? '',
      resolutionRequired: true,
    },
  ];
}

function deriveSecondaryGapCompleteness(
  fact: ExtractedFact,
  askedGapId: string,
): GapCompleteness {
  if (fact.targetGap === 'payer') {
    if (fact.key === 'buyer' && fact.evidenceClass === 'FACT') return 'CLOSED';
    return 'OPEN';
  }
  if (fact.evidenceClass === 'FACT') return 'CLOSED';
  if (fact.evidenceClass === 'ASSUMPTION') return 'PARTIAL';
  return 'OPEN';
}

function seedPriorClosedVerdicts(
  verdicts: Record<string, GapVerdict>,
  priorClosedGaps: string[] | undefined,
): void {
  for (const gapId of priorClosedGaps ?? []) {
    const existing = verdicts[gapId];
    // Gap addressed this turn (e.g. CONTRADICTED) — do not re-seal as CLOSED.
    if (existing) continue;
    verdicts[gapId] = {
      gapId,
      completeness: 'CLOSED',
      rationale: 'Prior turn CLOSED — preserved in review.',
      factKeys: [],
    };
  }
}

function buildGapVerdicts(
  askedGapId: string,
  semantic: SemanticInterpretation,
  extractedFacts: ExtractedFact[],
  userAnswer: string,
  priorClosedGaps?: string[],
): Record<string, GapVerdict> {
  const verdicts: Record<string, GapVerdict> = {};

  const askedCompleteness = deriveGapCompleteness(semantic, askedGapId, userAnswer);
  const askedFactKeys =
    semantic.facts.length > 0
      ? semantic.facts.map((f) => f.key)
      : semantic.factKey
        ? [semantic.factKey]
        : [];

  verdicts[askedGapId] = {
    gapId: askedGapId,
    completeness: askedCompleteness,
    rationale: semantic.rationale,
    factKeys: askedFactKeys,
  };

  for (const fact of extractedFacts) {
    const gapId = fact.targetGap;
    if (!gapId) continue;

    const completeness = deriveSecondaryGapCompleteness(fact, askedGapId);
    const existing = verdicts[gapId];

    if (existing) {
      // Never downgrade asked gap OPEN from ambiguous/irrelevant to PARTIAL via fact evidence
      if (
        gapId === askedGapId &&
        (existing.completeness === 'OPEN' || existing.completeness === 'CONTRADICTED') &&
        completeness !== 'CLOSED'
      ) {
        continue;
      }
      if (completeness === 'CLOSED' || existing.completeness !== 'CLOSED') {
        verdicts[gapId] = {
          gapId,
          completeness,
          rationale:
            gapId === askedGapId
              ? semantic.rationale
              : `Multi-fact utterance — ${fact.key}`,
          factKeys: [...new Set([...(existing.factKeys ?? []), fact.key])],
        };
      }
      continue;
    }

    verdicts[gapId] = {
      gapId,
      completeness,
      rationale: `Multi-fact utterance — ${fact.key}`,
      factKeys: [fact.key],
    };
  }

  if (semantic.quality === 'CONTRADICTORY' && semantic.factKey) {
    const conflictGapId = gapForFactKey(semantic.factKey);
    if (conflictGapId) {
      verdicts[conflictGapId] = {
        gapId: conflictGapId,
        completeness: 'CONTRADICTED',
        rationale: semantic.rationale,
        factKeys: [semantic.factKey],
      };
    }
  }

  seedPriorClosedVerdicts(verdicts, priorClosedGaps);
  return verdicts;
}

function buildKnownUnconfirmedUnknown(
  askedGapId: string,
  gapVerdicts: Record<string, GapVerdict>,
): { known: string[]; unconfirmed: string[]; unknown: string[] } {
  const known: string[] = [];
  const unconfirmed: string[] = [];
  const unknown: string[] = [];

  for (const [gapId, verdict] of Object.entries(gapVerdicts)) {
    if (verdict.completeness === 'CLOSED') {
      known.push(gapId);
    } else if (verdict.completeness === 'PARTIAL') {
      unconfirmed.push(gapId);
    } else if (verdict.completeness === 'OPEN' || verdict.completeness === 'CONTRADICTED') {
      if (gapId === askedGapId || verdict.completeness === 'CONTRADICTED') {
        unknown.push(gapId);
      }
    }
  }

  return { known, unconfirmed, unknown };
}

function buildReviewRationale(
  recommendedAction: RecommendedAction,
  askedGapId: string,
  semantic: SemanticInterpretation,
): string {
  switch (recommendedAction) {
    case 'advance':
      return `답변이 충분합니다 — ${askedGapId} gap CLOSED, 다음 주제로 진행.`;
    case 'probe':
      if (semantic.quality === 'IRRELEVANT') {
        return `답변이 ${askedGapId} 주제와 무관합니다 — 같은 gap 재확인.`;
      }
      return `답변이 부분적이거나 관련 정보가 부족합니다 — ${askedGapId} gap 추가 확인.`;
    case 'clarify':
      return `답변이 모호합니다 — ${askedGapId} gap 의미 명확화 필요.`;
    case 'challenge':
      return `기존 확인 내용과 충돌 — ${askedGapId} gap 해소 필요.`;
    default:
      return semantic.rationale;
  }
}

function createReviewId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `rev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Canonical semantic review builder — sole owner of submit canonicalization when V3 flag ON. */
export function buildAnswerReview(input: BuildAnswerReviewInput): BuildAnswerReviewResult {
  const trimmed = input.userAnswer.trim();
  const visibleGap =
    inferTargetGapFromQuestionText(input.displayedQuestionText) ?? input.askedGapId;

  const initialSemantic = interpretAnswerSemantics({
    answer: trimmed,
    askedIssueId: input.askedIssueId,
    existingFact: input.existingFact,
    existingFactsByKey: input.existingFactsByKey,
    askedTargetGap: visibleGap ?? input.askedGapId,
  });

  let { semantic, resolvedAskedGap, nuclearWrongSlot } = canonicalizeSubmitSemantics({
    answer: trimmed,
    askedIssueId: input.askedIssueId,
    existingFact: input.existingFact,
    existingFactsByKey: input.existingFactsByKey,
    displayedQuestionText: input.displayedQuestionText,
    visibleGap,
    initialResolvedAskedGap: input.askedGapId,
    initialSemantic,
  });

  const askedGapId = resolvedAskedGap ?? input.askedGapId;

  if (isOffTopicForAskedGap(askedGapId, trimmed)) {
    semantic = offTopicSemanticOverride(askedGapId, trimmed);
    resolvedAskedGap = input.askedGapId;
  } else if (isAmbiguousHedge(trimmed)) {
    semantic = {
      ...semantic,
      factKey: null,
      facts: [],
      mergeable: false,
      quality: 'AMBIGUOUS',
      rationale: '답변이 모호합니다 — 의미 명확화 필요.',
    };
  } else {
    semantic = enrichMultiFactSemantic(semantic, trimmed, askedGapId);
  }

  const extractedFacts = buildExtractedFacts(semantic, askedGapId, trimmed);
  const contradictions = buildContradictions(semantic, askedGapId, input.existingFactsByKey);
  const gapVerdicts = buildGapVerdicts(
    askedGapId,
    semantic,
    extractedFacts,
    trimmed,
    input.priorClosedGaps,
  );
  const askedCompleteness = gapVerdicts[askedGapId]?.completeness ?? 'OPEN';
  const reviewAskedGapId =
    contradictions[0]?.gapId?.trim() || askedGapId;
  const recommendedAction =
    contradictions.length > 0
      ? 'challenge'
      : deriveRecommendedAction(askedCompleteness, semantic, trimmed);
  const { known, unconfirmed, unknown } = buildKnownUnconfirmedUnknown(
    reviewAskedGapId,
    gapVerdicts,
  );

  const createdAt = new Date().toISOString();
  const review: AnswerReview = {
    reviewId: createReviewId(),
    turnId: input.turnId,
    sourceTurnId: input.turnId,
    createdAt,
    askedGapId: reviewAskedGapId,
    askedQuestionText: input.askedQuestionText,
    askedIssueId: input.askedIssueId,
    userAnswer: trimmed,
    extractedFacts,
    known,
    unknown,
    unconfirmed,
    contradictions,
    gapVerdicts,
    recommendedAction,
    rationale: buildReviewRationale(recommendedAction, askedGapId, semantic),
    semanticInterpretationRef: {
      intent: semantic.intent,
      quality: semantic.quality,
      mergeable: semantic.mergeable,
    },
  };

  return { review, semantic, resolvedAskedGap, nuclearWrongSlot };
}
