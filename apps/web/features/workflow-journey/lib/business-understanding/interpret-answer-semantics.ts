/**
 * ALABOM Core v4/v5 — Semantic Interpretation Layer.
 * User answer → intent + multi-fact routing by meaning (NOT current question slot dump).
 * Core v5 — differentiation / diffRelevance / defensibility distinct from competitor.
 */

import type { ConversationFactKey } from './conversation-memory';
import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';
import { evaluateAnswerQuality, answersContradict } from './understanding-contract';

export type AnswerIntent =
  | 'business_fact'
  | 'why_meta'
  | 'mid_judgment'
  | 'nonsense'
  | 'correction'
  | 'unknown_signal';

export type SemanticFactHit = {
  key: ConversationFactKey;
  issueId: AiPmLoopIssueId;
};

export type SemanticInterpretation = {
  intent: AnswerIntent;
  /** Primary fact key (highest-weight route) — null when answer must NOT enter Fact DB */
  factKey: ConversationFactKey | null;
  /** Issue aligned with primary semantic fact (may differ from asked issue) */
  resolvedIssueId: AiPmLoopIssueId | null;
  /** Core v4 — one utterance may yield multiple facts (payer + revenue, competition + diff) */
  facts: SemanticFactHit[];
  value: string | null;
  /** True only for business_fact / correction that may merge */
  mergeable: boolean;
  /** Display-only response (why / mid-judgment) — never Memory */
  displayOnly: boolean;
  rationale: string;
  quality: ReturnType<typeof evaluateAnswerQuality>['quality'];
};

const WHY_META_RE =
  /^(왜|왜\s*(그래|중요|물어|필요)|why(\s|$|\?)|why\s+(is|do|does|ask)|근거가\s*뭐|어떻게\s*생각하)/i;
const MID_JUDGMENT_RE =
  /(지금까지|요약|정리해|정리해줘|중간\s*판단|현재\s*이해|how\s+do\s+you\s+see|mid[-\s]?summary|understand(ing)?\s+so\s+far)/i;
const CORRECTION_RE =
  /(아니\s*그게\s*아니라|사실은|정정|고쳐|수정하|아니라\s*|다시\s*말하|correction|actually\s+it)/i;
/** Explicit conflict with a prior claim — force CONFLICT even if token overlap is high */
const EXPLICIT_CONFLICT_CUE_RE =
  /(다릅니다|다르다|와\s*다름|이\s*아니라|그게\s*아니라|모순|충돌|contradict|instead\s+of)/i;
/** Hangul jamo mash / repeated syllables without real words */
const HANGUL_JAMO_MASH_RE = /^[\u3131-\u318E\s]{4,}$/;
const HANGUL_REPEATED_SYLLABLE_RE = /^(?:([가-힣])\1{2,}|([가-힣]{1,2})\2{3,})$/;

/** Competitor name / alternative cues — excludes pure differentiation language */
const COMPETITOR_NAME_CUE_RE =
  /(경쟁|대안|tripadvisor|클룩|트립닷컴|트립어드바이저|네이버\s*지도|구글\s*맵|비슷한\s*서비스|이미\s*있지만|가이드\s*매칭|vs\.?|대비\s*(해|해서)|경쟁사)/i;
/** Differentiation / positioning cues (distinct ConversationFactKey) */
const DIFF_CUE_RE = /(차별|differentiat|인플루언서|핫플이\s*아니라|포지션|우리만|모방\s*어렵|방어력)/i;
/** Broad cue used only to refuse dumping into customer/problem */
const COMPETITOR_OR_DIFF_CUE_RE =
  /(경쟁|대안|차별|differentiat|tripadvisor|네이버\s*지도|구글\s*맵|비슷한\s*서비스|vs\.?|대비|인플루언서|핫플이\s*아니라|포지션|우리만)/i;
const PAYER_CUE_RE = /(결제|지불|payer|누가\s*(내|지불)|비용을?\s*내|구매자|돈\s*내)/i;
const REVENUE_CUE_RE =
  /(수익|수수료|구독|pricing|매출|비즈니스\s*모델|\bbm\b|monetiz|커미션|중개\s*수수)/i;

const FACT_ROUTE: Array<{
  key: ConversationFactKey;
  issueId: AiPmLoopIssueId;
  re: RegExp;
  /** Prefer this over asked-slot fallback when score ≥ threshold */
  weight: number;
}> = [
  {
    key: 'buyer',
    // Loop bookkeeping: payer lives under BM, not customer spine
    issueId: 'bm_design',
    re: PAYER_CUE_RE,
    weight: 12,
  },
  {
    key: 'differentiation',
    issueId: 'competitor_analysis',
    re: DIFF_CUE_RE,
    weight: 12,
  },
  {
    key: 'competitor',
    issueId: 'competitor_analysis',
    re: COMPETITOR_NAME_CUE_RE,
    weight: 11,
  },
  {
    key: 'problem',
    issueId: 'problem_definition',
    re: /(문제|불편|고통|pain|jtbd|풀려는|해결하|막혀|어려움|파편)/i,
    weight: 10,
  },
  {
    key: 'customer',
    issueId: 'customer_definition',
    re: /(고객|타깃|타겟|사용자|유저|persona|관광객|여행객|원장|누가\s*쓰|필요로\s*하)/i,
    weight: 10,
  },
  {
    key: 'market',
    issueId: 'market_validation',
    re: /(시장|수요|채널|tam|sam|증거|검증|얼마나\s*많)/i,
    weight: 9,
  },
  {
    key: 'revenue',
    issueId: 'bm_design',
    re: REVENUE_CUE_RE,
    weight: 9,
  },
  {
    key: 'business',
    issueId: 'bm_design',
    re: /(사업\s*(한\s*줄|요약)|한\s*줄로|우리는\s*.*제공|플랫폼|서비스는)/i,
    weight: 7,
  },
];

const ISSUE_TO_FACT: Partial<Record<AiPmLoopIssueId, ConversationFactKey>> = {
  customer_definition: 'customer',
  problem_definition: 'problem',
  bm_design: 'revenue',
  market_validation: 'market',
  competitor_analysis: 'competitor',
};

const DIFF_GAP_KEYS = new Set([
  'differentiationVsAlternatives',
  'differentiationHypothesis',
]);

function emptyInterpretation(
  partial: Omit<SemanticInterpretation, 'facts'> & { facts?: SemanticFactHit[] },
): SemanticInterpretation {
  return { ...partial, facts: partial.facts ?? [] };
}

function isNonsenseText(trimmed: string): boolean {
  if (HANGUL_JAMO_MASH_RE.test(trimmed)) return true;
  if (HANGUL_REPEATED_SYLLABLE_RE.test(trimmed)) return true;
  const jamoCount = (trimmed.match(/[\u3131-\u318E]/g) ?? []).length;
  if (jamoCount >= 4 && jamoCount / trimmed.replace(/\s/g, '').length >= 0.6) return true;
  return false;
}

function scoreRoutes(
  text: string,
): Array<{ key: ConversationFactKey; issueId: AiPmLoopIssueId; score: number }> {
  const hits: Array<{ key: ConversationFactKey; issueId: AiPmLoopIssueId; score: number }> = [];
  for (const route of FACT_ROUTE) {
    if (route.re.test(text)) {
      hits.push({ key: route.key, issueId: route.issueId, score: route.weight });
    }
  }
  return hits.sort((a, b) => b.score - a.score);
}

/** Collect multi-fact hits — competitor/diff never co-route into customer. */
function collectFactHits(
  text: string,
  routes: Array<{ key: ConversationFactKey; issueId: AiPmLoopIssueId; score: number }>,
): SemanticFactHit[] {
  const seen = new Set<ConversationFactKey>();
  const hits: SemanticFactHit[] = [];

  for (const route of routes) {
    if (seen.has(route.key)) continue;
    // Customer keyword often co-occurs with payer/competitor — demote when stronger BM/comp cues exist
    if (
      route.key === 'customer' &&
      (PAYER_CUE_RE.test(text) ||
        COMPETITOR_OR_DIFF_CUE_RE.test(text) ||
        REVENUE_CUE_RE.test(text))
    ) {
      continue;
    }
    seen.add(route.key);
    hits.push({ key: route.key, issueId: route.issueId });
  }

  const hasDiff = DIFF_CUE_RE.test(text);
  const hasCompetitorName = COMPETITOR_NAME_CUE_RE.test(text);

  // Core v5 — DIFF alone → differentiation; names alone → competitor; both → both
  if (hasDiff && !seen.has('differentiation')) {
    hits.push({ key: 'differentiation', issueId: 'competitor_analysis' });
    seen.add('differentiation');
  }
  if (hasCompetitorName && !seen.has('competitor')) {
    hits.push({ key: 'competitor', issueId: 'competitor_analysis' });
    seen.add('competitor');
  }

  return hits;
}

function refuseCustomerSlotForCompetitorOrDiff(
  factKey: ConversationFactKey | null,
  text: string,
): { factKey: ConversationFactKey; issueId: AiPmLoopIssueId } | null {
  if (factKey !== 'customer' && factKey !== 'problem') return null;
  if (!COMPETITOR_OR_DIFF_CUE_RE.test(text)) return null;
  if (DIFF_CUE_RE.test(text)) {
    return { factKey: 'differentiation', issueId: 'competitor_analysis' };
  }
  return { factKey: 'competitor', issueId: 'competitor_analysis' };
}

function isDifferentiationAskedGap(gap: string | null | undefined): boolean {
  return Boolean(gap && DIFF_GAP_KEYS.has(gap));
}

/**
 * Interpret answer by meaning. Wrong-slot merge is forbidden:
 * asked issue is only a weak prior when no semantic signal exists.
 */
export function interpretAnswerSemantics(input: {
  answer: string;
  askedIssueId: AiPmLoopIssueId | null;
  existingFact?: string | null;
  existingFactsByKey?: Partial<Record<ConversationFactKey, string | null>>;
  /** Living gap that was asked — used to avoid dumping competitor into customer when asked */
  askedTargetGap?: string | null;
}): SemanticInterpretation {
  const trimmed = input.answer.trim().replace(/\s+/g, ' ');
  const askedFact = input.askedIssueId ? ISSUE_TO_FACT[input.askedIssueId] ?? null : null;
  const askedGap = input.askedTargetGap?.trim() ?? null;

  if (trimmed.length < 2) {
    return emptyInterpretation({
      intent: 'unknown_signal',
      factKey: null,
      resolvedIssueId: null,
      value: null,
      mergeable: false,
      displayOnly: false,
      rationale: '답변이 비어 있습니다.',
      quality: 'UNKNOWN',
    });
  }

  if (isNonsenseText(trimmed) || evaluateAnswerQuality(trimmed).quality === 'IRRELEVANT') {
    return emptyInterpretation({
      intent: 'nonsense',
      factKey: null,
      resolvedIssueId: null,
      value: null,
      mergeable: false,
      displayOnly: false,
      rationale: '의미 없는 입력 — Fact로 저장하지 않습니다.',
      quality: 'IRRELEVANT',
    });
  }

  if (WHY_META_RE.test(trimmed) || /왜\s*그게\s*중요/.test(trimmed)) {
    return emptyInterpretation({
      intent: 'why_meta',
      factKey: null,
      resolvedIssueId: input.askedIssueId,
      value: null,
      mergeable: false,
      displayOnly: true,
      rationale: 'Why/meta — 근거 설명만 하고 루프로 복귀. Fact DB 금지.',
      quality: 'IRRELEVANT',
    });
  }

  if (MID_JUDGMENT_RE.test(trimmed)) {
    return emptyInterpretation({
      intent: 'mid_judgment',
      factKey: null,
      resolvedIssueId: input.askedIssueId,
      value: null,
      mergeable: false,
      displayOnly: true,
      rationale: '중간 판단/요약 요청 — 화면 표시만. Confirmed Fact 자동 저장 금지.',
      quality: 'IRRELEVANT',
    });
  }

  const unknownProbe = evaluateAnswerQuality(trimmed);
  if (unknownProbe.quality === 'UNKNOWN' && !unknownProbe.mergeable) {
    return emptyInterpretation({
      intent: 'unknown_signal',
      factKey: null,
      resolvedIssueId: null,
      value: null,
      mergeable: false,
      displayOnly: false,
      rationale: '모름 신호 — Fact로 확정하지 않습니다.',
      quality: 'UNKNOWN',
    });
  }

  const isCorrection = CORRECTION_RE.test(trimmed);
  const routes = scoreRoutes(trimmed);
  const top = routes[0] ?? null;
  let facts = collectFactHits(trimmed, routes);

  // Semantic winner beats asked slot when clearly signaled
  let factKey: ConversationFactKey | null = top?.key ?? askedFact;
  let resolvedIssueId: AiPmLoopIssueId | null = top?.issueId ?? input.askedIssueId;

  // Guard: if asked slot conflicts with a strong competing signal, prefer semantic
  if (top && askedFact && top.key !== askedFact && top.score >= 9) {
    factKey = top.key;
    resolvedIssueId = top.issueId;
  }

  // Asked customer/persona but answer is competitor/diff → never dump into CUSTOMER
  const refused = refuseCustomerSlotForCompetitorOrDiff(factKey, trimmed);
  if (refused) {
    factKey = refused.factKey;
    resolvedIssueId = refused.issueId;
    if (refused.factKey === 'differentiation') {
      facts = [
        { key: 'differentiation', issueId: 'competitor_analysis' },
        ...facts.filter((f) => f.key !== 'customer' && f.key !== 'problem'),
      ];
      if (COMPETITOR_NAME_CUE_RE.test(trimmed) && !facts.some((f) => f.key === 'competitor')) {
        facts.push({ key: 'competitor', issueId: 'competitor_analysis' });
      }
    } else if (!facts.some((f) => f.key === 'competitor')) {
      facts = [
        { key: 'competitor', issueId: 'competitor_analysis' },
        ...facts.filter((f) => f.key !== 'customer'),
      ];
    } else {
      facts = facts.filter((f) => f.key !== 'customer');
    }
  }

  // Differentiation must never land in customer/problem
  if (DIFF_CUE_RE.test(trimmed) && (factKey === 'customer' || factKey === 'problem')) {
    factKey = 'differentiation';
    resolvedIssueId = 'competitor_analysis';
  }

  // Core Final — semantic first: NEVER force-fill asked slot when cues point elsewhere.
  // Asked differentiation is only a weak prior when no competing strong signal.
  const hasDiffCue = DIFF_CUE_RE.test(trimmed);
  const hasCompetitorCue = COMPETITOR_NAME_CUE_RE.test(trimmed);
  const hasStrongOtherCue =
    PAYER_CUE_RE.test(trimmed) ||
    REVENUE_CUE_RE.test(trimmed) ||
    (hasCompetitorCue && !hasDiffCue);

  if (hasDiffCue) {
    factKey = 'differentiation';
    resolvedIssueId = 'competitor_analysis';
    if (!facts.some((f) => f.key === 'differentiation')) {
      facts.push({ key: 'differentiation', issueId: 'competitor_analysis' });
    }
    if (hasCompetitorCue && !facts.some((f) => f.key === 'competitor')) {
      facts.push({ key: 'competitor', issueId: 'competitor_analysis' });
    }
  } else if (hasCompetitorCue && !hasDiffCue) {
    factKey = 'competitor';
    resolvedIssueId = 'competitor_analysis';
    if (!facts.some((f) => f.key === 'competitor')) {
      facts.push({ key: 'competitor', issueId: 'competitor_analysis' });
    }
  } else if (
    isDifferentiationAskedGap(askedGap) &&
    !hasStrongOtherCue &&
    !top
  ) {
    // Weak prior only — no semantic cue at all
    factKey = 'differentiation';
    resolvedIssueId = 'competitor_analysis';
    if (!facts.some((f) => f.key === 'differentiation')) {
      facts.push({ key: 'differentiation', issueId: 'competitor_analysis' });
    }
  }

  // Asked-gap weak prior for follow-ups — skip when strong competing cue
  if (!hasStrongOtherCue && !hasDiffCue && !hasCompetitorCue) {
    if (askedGap === 'alternativesCompetitors' && !top) {
      factKey = 'competitor';
      resolvedIssueId = 'competitor_analysis';
      if (!facts.some((f) => f.key === 'competitor')) {
        facts = [{ key: 'competitor', issueId: 'competitor_analysis' }, ...facts];
      }
    } else if (askedGap === 'validationTestability' && !top) {
      factKey = 'diffRelevance';
      resolvedIssueId = 'competitor_analysis';
      if (!facts.some((f) => f.key === 'diffRelevance')) {
        facts = [{ key: 'diffRelevance', issueId: 'competitor_analysis' }, ...facts];
      }
    } else if (askedGap === 'executionConstraints' && !top) {
      factKey = 'defensibility';
      resolvedIssueId = 'competitor_analysis';
      if (!facts.some((f) => f.key === 'defensibility')) {
        facts = [{ key: 'defensibility', issueId: 'competitor_analysis' }, ...facts];
      }
    }
  } else if (askedGap === 'alternativesCompetitors' && hasCompetitorCue) {
    factKey = 'competitor';
    resolvedIssueId = 'competitor_analysis';
  } else if (askedGap === 'validationTestability' && hasDiffCue === false && top?.key === undefined) {
    // keep asked weak prior only if answer looks like relevance text
    if (/중요|체감|고객/.test(trimmed)) {
      factKey = 'diffRelevance';
      resolvedIssueId = 'competitor_analysis';
    }
  } else if (askedGap === 'executionConstraints' && /방어|따라|모방|네트워크/.test(trimmed)) {
    factKey = 'defensibility';
    resolvedIssueId = 'competitor_analysis';
  }

  // Never dump competitor/diff into customer
  facts = facts.filter((f) => {
    if (f.key !== 'customer') return true;
    return !COMPETITOR_OR_DIFF_CUE_RE.test(trimmed);
  });

  // Payer phrases must not land in problem; bookkeeping under bm_design
  if (factKey === 'problem' && PAYER_CUE_RE.test(trimmed)) {
    factKey = 'buyer';
    resolvedIssueId = 'bm_design';
  }

  // When asked revenue gap and answer has revenue cue, ensure revenue fact hit
  if (
    (askedGap === 'revenueModel' || askedGap === 'pricingHint') &&
    REVENUE_CUE_RE.test(trimmed) &&
    !facts.some((f) => f.key === 'revenue')
  ) {
    facts.push({ key: 'revenue', issueId: 'bm_design' });
  }

  // Payer+revenue multi-fact: keep both when both cues present
  if (PAYER_CUE_RE.test(trimmed) && REVENUE_CUE_RE.test(trimmed)) {
    if (!facts.some((f) => f.key === 'buyer')) {
      facts.push({ key: 'buyer', issueId: 'bm_design' });
    }
    if (!facts.some((f) => f.key === 'revenue')) {
      facts.push({ key: 'revenue', issueId: 'bm_design' });
    }
  }

  if (!factKey || !resolvedIssueId) {
    return emptyInterpretation({
      intent: isCorrection ? 'correction' : 'business_fact',
      factKey: null,
      resolvedIssueId: null,
      value: trimmed,
      mergeable: false,
      displayOnly: false,
      rationale: '의미는 있으나 사업 Fact 슬롯을 확정할 수 없습니다 — 재질문.',
      quality: 'AMBIGUOUS',
    });
  }

  // Primary must appear in facts list
  if (!facts.some((f) => f.key === factKey)) {
    facts = [{ key: factKey, issueId: resolvedIssueId }, ...facts];
  }

  const existingForKey =
    input.existingFactsByKey?.[factKey] ??
    (askedFact === factKey ? input.existingFact : null) ??
    null;

  if (
    existingForKey &&
    (answersContradict(existingForKey, trimmed) || EXPLICIT_CONFLICT_CUE_RE.test(trimmed))
  ) {
    return emptyInterpretation({
      intent: isCorrection || EXPLICIT_CONFLICT_CUE_RE.test(trimmed) ? 'correction' : 'business_fact',
      factKey,
      resolvedIssueId,
      facts,
      value: trimmed,
      mergeable: false,
      displayOnly: false,
      rationale: `기존 「${factKey}」 Fact와 충돌 — CONFLICT 확인 필요.`,
      quality: 'CONTRADICTORY',
    });
  }

  const quality = evaluateAnswerQuality(trimmed, { existingFact: existingForKey });
  if (!quality.mergeable) {
    return emptyInterpretation({
      intent: 'business_fact',
      factKey: null,
      resolvedIssueId: null,
      value: trimmed,
      mergeable: false,
      displayOnly: false,
      rationale: '답변 품질 부족 — Fact 미저장.',
      quality: quality.quality,
    });
  }

  return emptyInterpretation({
    intent: isCorrection ? 'correction' : 'business_fact',
    factKey,
    resolvedIssueId,
    facts,
    value: trimmed,
    mergeable: true,
    displayOnly: false,
    rationale: top
      ? `의미 라우팅: ${facts.map((f) => f.key).join('+')} (primary=${factKey}, signal≥${top.score}${askedFact && askedFact !== factKey ? `; asked-slot ${askedFact} 무시` : ''})`
      : `약한 prior: asked issue → ${factKey}`,
    quality: quality.quality,
  });
}

export function issueIdForFactKey(key: ConversationFactKey): AiPmLoopIssueId | null {
  const hit = FACT_ROUTE.find((r) => r.key === key);
  if (hit) return hit.issueId;
  if (key === 'business') return 'bm_design';
  if (key === 'diffRelevance' || key === 'defensibility' || key === 'differentiation') {
    return 'competitor_analysis';
  }
  return null;
}
