/**
 * ALABOM Core v3 — Semantic Interpretation Layer.
 * User answer → intent + fact routing by meaning (NOT current question slot dump).
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

export type SemanticInterpretation = {
  intent: AnswerIntent;
  /** null when answer must NOT enter Fact DB */
  factKey: ConversationFactKey | null;
  /** Issue aligned with semantic fact (may differ from asked issue) */
  resolvedIssueId: AiPmLoopIssueId | null;
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

const FACT_ROUTE: Array<{
  key: ConversationFactKey;
  issueId: AiPmLoopIssueId;
  re: RegExp;
  /** Prefer this over asked-slot fallback when score ≥ threshold */
  weight: number;
}> = [
  {
    key: 'buyer',
    issueId: 'customer_definition',
    re: /(결제|지불|payer|누가\s*(내|지불)|비용을?\s*내|구매자|돈\s*내)/i,
    weight: 12,
  },
  {
    key: 'competitor',
    issueId: 'competitor_analysis',
    re: /(경쟁|대안|차별|differentiat|tripadvisor|네이버\s*지도|구글\s*맵|비슷한\s*서비스|vs\.?|대비)/i,
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
    re: /(수익|수수료|구독|pricing|매출|비즈니스\s*모델|bm| monetiz)/i,
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

function isNonsenseText(trimmed: string): boolean {
  if (HANGUL_JAMO_MASH_RE.test(trimmed)) return true;
  if (HANGUL_REPEATED_SYLLABLE_RE.test(trimmed)) return true;
  // Dense jamo mixed with latin mash (e.g. ㅁㄴㅇㄻㄴㅇㄻㅇ)
  const jamoCount = (trimmed.match(/[\u3131-\u318E]/g) ?? []).length;
  if (jamoCount >= 4 && jamoCount / trimmed.replace(/\s/g, '').length >= 0.6) return true;
  return false;
}

function scoreRoutes(text: string): Array<{ key: ConversationFactKey; issueId: AiPmLoopIssueId; score: number }> {
  const hits: Array<{ key: ConversationFactKey; issueId: AiPmLoopIssueId; score: number }> = [];
  for (const route of FACT_ROUTE) {
    if (route.re.test(text)) {
      hits.push({ key: route.key, issueId: route.issueId, score: route.weight });
    }
  }
  return hits.sort((a, b) => b.score - a.score);
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
}): SemanticInterpretation {
  const trimmed = input.answer.trim().replace(/\s+/g, ' ');
  const askedFact = input.askedIssueId ? ISSUE_TO_FACT[input.askedIssueId] ?? null : null;

  if (trimmed.length < 2) {
    return {
      intent: 'unknown_signal',
      factKey: null,
      resolvedIssueId: null,
      value: null,
      mergeable: false,
      displayOnly: false,
      rationale: '답변이 비어 있습니다.',
      quality: 'UNKNOWN',
    };
  }

  if (isNonsenseText(trimmed) || evaluateAnswerQuality(trimmed).quality === 'IRRELEVANT') {
    return {
      intent: 'nonsense',
      factKey: null,
      resolvedIssueId: null,
      value: null,
      mergeable: false,
      displayOnly: false,
      rationale: '의미 없는 입력 — Fact로 저장하지 않습니다.',
      quality: 'IRRELEVANT',
    };
  }

  if (WHY_META_RE.test(trimmed) || /왜\s*그게\s*중요/.test(trimmed)) {
    return {
      intent: 'why_meta',
      factKey: null,
      resolvedIssueId: input.askedIssueId,
      value: null,
      mergeable: false,
      displayOnly: true,
      rationale: 'Why/meta — 근거 설명만 하고 루프로 복귀. Fact DB 금지.',
      quality: 'IRRELEVANT',
    };
  }

  if (MID_JUDGMENT_RE.test(trimmed)) {
    return {
      intent: 'mid_judgment',
      factKey: null,
      resolvedIssueId: input.askedIssueId,
      value: null,
      mergeable: false,
      displayOnly: true,
      rationale: '중간 판단/요약 요청 — 화면 표시만. Confirmed Fact 자동 저장 금지.',
      quality: 'IRRELEVANT',
    };
  }

  const unknownProbe = evaluateAnswerQuality(trimmed);
  if (unknownProbe.quality === 'UNKNOWN' && !unknownProbe.mergeable) {
    return {
      intent: 'unknown_signal',
      factKey: null,
      resolvedIssueId: null,
      value: null,
      mergeable: false,
      displayOnly: false,
      rationale: '모름 신호 — Fact로 확정하지 않습니다.',
      quality: 'UNKNOWN',
    };
  }

  const isCorrection = CORRECTION_RE.test(trimmed);
  const routes = scoreRoutes(trimmed);
  const top = routes[0] ?? null;

  // Semantic winner beats asked slot when clearly signaled
  let factKey: ConversationFactKey | null = top?.key ?? askedFact;
  let resolvedIssueId: AiPmLoopIssueId | null = top?.issueId ?? input.askedIssueId;

  // Guard: if asked slot conflicts with a strong competing signal, prefer semantic
  if (top && askedFact && top.key !== askedFact && top.score >= 10) {
    factKey = top.key;
    resolvedIssueId = top.issueId;
  }

  // Differentiation must never land in customer/problem
  if (
    /(차별|differentiat|인플루언서|핫플이\s*아니라)/i.test(trimmed) &&
    (factKey === 'customer' || factKey === 'problem')
  ) {
    factKey = 'competitor';
    resolvedIssueId = 'competitor_analysis';
  }

  // Payer phrases must not land in problem
  if (factKey === 'problem' && /(결제|지불|payer)/i.test(trimmed)) {
    factKey = 'buyer';
    resolvedIssueId = 'customer_definition';
  }

  if (!factKey || !resolvedIssueId) {
    return {
      intent: isCorrection ? 'correction' : 'business_fact',
      factKey: null,
      resolvedIssueId: null,
      value: trimmed,
      mergeable: false,
      displayOnly: false,
      rationale: '의미는 있으나 사업 Fact 슬롯을 확정할 수 없습니다 — 재질문.',
      quality: 'AMBIGUOUS',
    };
  }

  const existingForKey =
    input.existingFactsByKey?.[factKey] ??
    (askedFact === factKey ? input.existingFact : null) ??
    null;

  if (
    existingForKey &&
    (answersContradict(existingForKey, trimmed) || EXPLICIT_CONFLICT_CUE_RE.test(trimmed))
  ) {
    return {
      intent: isCorrection || EXPLICIT_CONFLICT_CUE_RE.test(trimmed) ? 'correction' : 'business_fact',
      factKey,
      resolvedIssueId,
      value: trimmed,
      mergeable: false,
      displayOnly: false,
      rationale: `기존 「${factKey}」 Fact와 충돌 — CONFLICT 확인 필요.`,
      quality: 'CONTRADICTORY',
    };
  }

  const quality = evaluateAnswerQuality(trimmed, { existingFact: existingForKey });
  if (!quality.mergeable) {
    return {
      intent: 'business_fact',
      factKey: null,
      resolvedIssueId: null,
      value: trimmed,
      mergeable: false,
      displayOnly: false,
      rationale: '답변 품질 부족 — Fact 미저장.',
      quality: quality.quality,
    };
  }

  return {
    intent: isCorrection ? 'correction' : 'business_fact',
    factKey,
    resolvedIssueId,
    value: trimmed,
    mergeable: true,
    displayOnly: false,
    rationale: top
      ? `의미 라우팅: ${factKey} (signal≥${top.score}${askedFact && askedFact !== factKey ? `; asked-slot ${askedFact} 무시` : ''})`
      : `약한 prior: asked issue → ${factKey}`,
    quality: quality.quality,
  };
}

export function issueIdForFactKey(key: ConversationFactKey): AiPmLoopIssueId | null {
  const hit = FACT_ROUTE.find((r) => r.key === key);
  if (hit) return hit.issueId;
  if (key === 'business') return 'bm_design';
  return null;
}
