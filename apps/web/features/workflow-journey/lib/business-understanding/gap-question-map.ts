/**
 * P0-3 / P0-4 — Gap field → question · factKey · issueId (one dynamic Q per turn).
 * whyNow and visible question MUST share the same targetGap fieldKey.
 */

import type { ConversationFactKey } from './conversation-memory';
import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';
import { whyNowForGapField } from './living-understanding-state';

export type GapQuestionBinding = {
  targetGap: string;
  questionText: string;
  factKey: ConversationFactKey;
  issueId: AiPmLoopIssueId;
  whyNow: string;
};

/** Shown when gap fieldKey cannot be mapped — must never replace a real ask in UI. */
export const GENERIC_GAP_QUESTION_TEXT =
  '아직 확인이 필요한 핵심 공백이 있습니다. 알려 주세요.';

export function isGenericGapQuestionText(text: string | null | undefined): boolean {
  const q = text?.trim();
  return Boolean(q && q === GENERIC_GAP_QUESTION_TEXT);
}

const GAP_BINDINGS: Record<string, Omit<GapQuestionBinding, 'targetGap' | 'whyNow'>> = {
  customerPersona: {
    questionText: '이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?',
    factKey: 'customer',
    issueId: 'customer_definition',
  },
  payer: {
    questionText: '서비스 비용은 누가 지불하나요?',
    factKey: 'buyer',
    issueId: 'bm_design',
  },
  problemJtbd: {
    questionText: '지금 가장 크게 해결하려는 불편은 무엇인가요?',
    factKey: 'problem',
    issueId: 'problem_definition',
  },
  problemFrequencySeverity: {
    questionText: '그 문제는 얼마나 자주·심각하게 발생하나요?',
    factKey: 'problem',
    issueId: 'problem_definition',
  },
  alternativesCompetitors: {
    questionText: '비슷한 역할을 이미 하고 있는 서비스가 있나요?',
    factKey: 'competitor',
    issueId: 'competitor_analysis',
  },
  differentiationVsAlternatives: {
    questionText: '경쟁 대비 이 서비스만의 차별점은 무엇인가요?',
    factKey: 'differentiation',
    issueId: 'competitor_analysis',
  },
  differentiationHypothesis: {
    questionText: '경쟁 대비 포지셔닝 가설은 무엇인가요?',
    factKey: 'differentiation',
    issueId: 'competitor_analysis',
  },
  /** Core Final — One judgment purpose only (no dual ask). */
  validationTestability: {
    questionText: '그 차별점이 고객에게 왜 중요한가요?',
    factKey: 'diffRelevance',
    issueId: 'competitor_analysis',
  },
  /** Core v5 — Differentiation conversation: defensibility. */
  executionConstraints: {
    questionText: '경쟁사가 따라오기 어려운 방어력은 무엇인가요?',
    factKey: 'defensibility',
    issueId: 'competitor_analysis',
  },
  revenueModel: {
    questionText: '수익은 어떤 구조로 발생하나요?',
    factKey: 'revenue',
    issueId: 'bm_design',
  },
  pricingHint: {
    questionText: '가격·요금에 대한 가설이나 신호가 있나요?',
    factKey: 'revenue',
    issueId: 'bm_design',
  },
  marketChannel: {
    questionText: '고객·수요를 검증할 채널은 어디인가요?',
    factKey: 'market',
    issueId: 'market_validation',
  },
  marketSizeEvidence: {
    questionText: '이 시장에 수요가 있다는 근거는 무엇인가요?',
    factKey: 'market',
    issueId: 'market_validation',
  },
  businessOneLiner: {
    questionText: '한 줄로, 무엇을 누구에게 제공하는 사업인가요?',
    factKey: 'business',
    issueId: 'bm_design',
  },
  categoryScope: {
    questionText: '사업 카테고리·범위를 어떻게 정의하시나요?',
    factKey: 'business',
    issueId: 'bm_design',
  },
  solution: {
    questionText: '문제를 해결하는 방식(제공 가치)은 무엇인가요?',
    factKey: 'business',
    issueId: 'problem_definition',
  },
};

const ISSUE_FALLBACK: Record<AiPmLoopIssueId, GapQuestionBinding> = {
  customer_definition: {
    targetGap: 'customerPersona',
    ...GAP_BINDINGS.customerPersona!,
    whyNow: whyNowForGapField('customerPersona'),
  },
  problem_definition: {
    targetGap: 'problemJtbd',
    ...GAP_BINDINGS.problemJtbd!,
    whyNow: whyNowForGapField('problemJtbd'),
  },
  bm_design: {
    targetGap: 'payer',
    ...GAP_BINDINGS.payer!,
    whyNow: whyNowForGapField('payer'),
  },
  market_validation: {
    targetGap: 'marketSizeEvidence',
    ...GAP_BINDINGS.marketSizeEvidence!,
    whyNow: whyNowForGapField('marketSizeEvidence'),
  },
  competitor_analysis: {
    targetGap: 'alternativesCompetitors',
    ...GAP_BINDINGS.alternativesCompetitors!,
    whyNow: whyNowForGapField('alternativesCompetitors'),
  },
};

/** Match visible ask text → gap fieldKey (Loop 7 append fallback). */
export function inferTargetGapFromQuestionText(
  questionText: string | null | undefined,
): string | null {
  const q = questionText?.trim().replace(/\s+/g, ' ');
  if (!q || q.length < 6) return null;

  for (const [gap, binding] of Object.entries(GAP_BINDINGS)) {
    const stock = binding.questionText.trim();
    if (q.includes(stock) || stock.includes(q)) return gap;
    const phrase = stock.replace(/[?？]/g, '').slice(0, 16);
    if (phrase.length >= 8 && q.includes(phrase)) return gap;
  }

  if (/가장 필요로 하는 사람|가장 필요로 하는|누구인가요/.test(q)) return 'customerPersona';
  if (/크게 해결하려는 불편|핵심 불편/.test(q)) return 'problemJtbd';
  if (/제공 가치|해결하는 방식/.test(q)) return 'solution';
  if (/비용은 누가|누가\s*(비용|지불)|비용을?\s*지불|누가\s*내|결제\s*주체/.test(q)) return 'payer';
  if (/비슷한 역할|이미 하고 있는 서비스|하는 서비스가/.test(q)) return 'alternativesCompetitors';
  if (/차별점은 무엇|차별점이/.test(q) && !/왜 중요/.test(q)) return 'differentiationVsAlternatives';
  if (/고객에게 왜 중요|어떤 가치를 만드/.test(q)) return 'validationTestability';
  if (/방어력|따라오기/.test(q)) return 'executionConstraints';
  if (/수익은 어떤|수익 구조/.test(q)) return 'revenueModel';

  return null;
}

/** Resolve question binding from Living gap fieldKey — primary path. */
export function resolveGapQuestionBinding(
  targetGap: string | null | undefined,
  fallbackIssueId?: AiPmLoopIssueId | null,
): GapQuestionBinding {
  const gap = targetGap?.trim();
  if (gap && GAP_BINDINGS[gap]) {
    const base = GAP_BINDINGS[gap]!;
    return {
      targetGap: gap,
      ...base,
      whyNow: whyNowForGapField(gap),
    };
  }
  if (fallbackIssueId && ISSUE_FALLBACK[fallbackIssueId]) {
    return ISSUE_FALLBACK[fallbackIssueId];
  }
  const genericGap = gap ?? 'unknown';
  return {
    targetGap: genericGap,
    questionText: GENERIC_GAP_QUESTION_TEXT,
    factKey: 'business',
    issueId: fallbackIssueId ?? 'bm_design',
    whyNow: whyNowForGapField(genericGap),
  };
}

/** P0-4 test helper — whyNow must match targetGap, not a different slot. */
export function whyNowAlignsWithTargetGap(
  targetGap: string,
  whyNow: string,
): boolean {
  const expected = whyNowForGapField(targetGap);
  if (whyNow.trim() === expected.trim()) return true;

  const binding = GAP_BINDINGS[targetGap];
  if (!binding) return whyNow.includes(targetGap);

  // Payer whyNow must mention payment; customer must mention customer narrowing, etc.
  if (targetGap === 'payer') return /지불|결제|GO\/HOLD/.test(whyNow);
  if (targetGap === 'customerPersona') return /고객|타깃|필요/.test(whyNow);
  if (targetGap === 'problemJtbd') return /문제|불편|JTBD|해결/.test(whyNow);
  if (targetGap.includes('competitor') || targetGap.includes('differentiation')) {
    return /경쟁|대안|차별/.test(whyNow);
  }
  if (targetGap === 'validationTestability') return /고객|관련|체감|차별/.test(whyNow);
  if (targetGap === 'executionConstraints') return /방어|모방|따라|차별/.test(whyNow);
  if (targetGap.includes('market')) return /시장|수요|채널|근거/.test(whyNow);
  return true;
}

/** Map gap fieldKey → loop issue when Living gap has no issueId. */
export function issueIdForGapField(fieldKey: string): AiPmLoopIssueId | null {
  return resolveGapQuestionBinding(fieldKey).issueId;
}
