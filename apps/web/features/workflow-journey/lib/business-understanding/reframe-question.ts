/**
 * Core Final — Re-question Prevention (W7) + Why/Mid return (W8).
 * Same-meaning identical Q banned. Nonsense / why / mid → REFRAME with current understanding.
 */

import type { LivingUnderstandingState } from './living-understanding-state';
import { resolveGapQuestionBinding } from './gap-question-map';

export type ReframeReason = 'nonsense' | 'why_meta' | 'mid_judgment' | 'unknown_signal' | 'adaptive';

export type ReframedQuestion = {
  targetGap: string;
  questionText: string;
  whyNow: string;
  /** True when wording differs from the stock binding (reframe applied) */
  reframed: boolean;
  reason: ReframeReason;
};

function claimSnippet(
  living: LivingUnderstandingState,
  fieldKey: string,
  max = 48,
): string | null {
  const claim = living.claims.find((c) => c.fieldKey === fieldKey);
  const v = claim?.value?.trim();
  if (!v || claim?.status === 'unknown') return null;
  return v.length > max ? `${v.slice(0, max)}…` : v;
}

function knownDigest(living: LivingUnderstandingState): string {
  const parts = [
    claimSnippet(living, 'businessOneLiner', 36),
    claimSnippet(living, 'customerPersona', 28),
    claimSnippet(living, 'problemJtbd', 28),
    claimSnippet(living, 'payer', 24),
    claimSnippet(living, 'alternativesCompetitors', 28),
    claimSnippet(living, 'differentiationVsAlternatives', 28),
  ].filter(Boolean);
  return parts.slice(0, 3).join(' · ') || living.judgmentSummary.slice(0, 80);
}

/** Gap-specific reframed stems grounded in what we already know. */
function reframeStem(targetGap: string, living: LivingUnderstandingState): string | null {
  const business = claimSnippet(living, 'businessOneLiner', 40);
  const customer = claimSnippet(living, 'customerPersona', 32);
  const problem = claimSnippet(living, 'problemJtbd', 32);
  const payer = claimSnippet(living, 'payer', 28);
  const competitor = claimSnippet(living, 'alternativesCompetitors', 36);
  const diff = claimSnippet(living, 'differentiationVsAlternatives', 36);

  switch (targetGap) {
    case 'differentiationVsAlternatives':
      if (competitor) {
        return `${competitor}와 비교할 때, 이 서비스만의 결정적 차이는 무엇인가요?`;
      }
      if (problem && customer) {
        return `${customer}의 「${problem}」을 풀 때, 기존 대안과 무엇이 다릅니까?`;
      }
      if (business) {
        return `「${business}」가 대안과 갈리는 핵심 한 가지는 무엇인가요?`;
      }
      return '지금 이해한 사업을 기준으로, 대안 대비 우리만의 차이는 무엇입니까?';
    case 'alternativesCompetitors':
      if (customer && problem) {
        return `${customer}이 「${problem}」을 풀 때 이미 쓰는 대안·서비스는 무엇인가요?`;
      }
      if (business) {
        return `「${business}」와 비슷한 역할을 이미 하는 서비스가 있나요?`;
      }
      return '고객이 지금 이 문제를 어떻게 해결하고 있나요? (대안·경쟁)';
    case 'validationTestability':
      if (diff) {
        return `「${diff}」가 고객에게 왜 중요한가요?`;
      }
      return '그 차이가 고객에게 체감되는 순간은 언제인가요?';
    case 'executionConstraints':
      if (diff) {
        return `「${diff}」를 경쟁사가 따라오기 어렵게 만드는 방어력은 무엇인가요?`;
      }
      return '따라오기 어려운 방어력·해자는 무엇인가요?';
    case 'payer':
      if (customer) {
        return `${customer}이 쓰는 이 서비스의 비용은 누가 지불하나요?`;
      }
      return '실제 결제·정산 주체는 누구인가요?';
    case 'problemJtbd':
      if (customer) {
        return `${customer}이 가장 크게 겪는 불편은 무엇인가요?`;
      }
      return '지금 이해한 사업을 기준으로, 해결하려는 핵심 불편은 무엇입니까?';
    case 'customerPersona':
      if (problem) {
        return `「${problem}」을 가장 절실히 느끼는 사람은 누구인가요?`;
      }
      return '이 서비스를 가장 필요로 하는 구체 고객은 누구인가요?';
    case 'revenueModel':
      if (payer) {
        return `${payer} 기준으로, 수익은 어떤 구조로 발생하나요?`;
      }
      return '수익이 발생하는 구조(수수료·구독·판매 등)는 무엇인가요?';
    case 'pricingHint':
      if (payer) {
        return `${payer}가 받아들일 가격·요금 가설이 있나요?`;
      }
      return '가격·요금에 대한 가설이나 신호가 있나요?';
    case 'marketChannel':
      if (customer) {
        return `${customer}에게 도달·검증할 채널은 어디인가요?`;
      }
      return '수요를 검증할 채널은 어디인가요?';
    case 'marketSizeEvidence':
      return '이 시장·수요가 있다는 근거는 무엇인가요?';
    default:
      return null;
  }
}

function contextualWhyNow(
  targetGap: string,
  living: LivingUnderstandingState,
  reason: ReframeReason,
): string {
  const digest = knownDigest(living);
  const base = resolveGapQuestionBinding(targetGap).whyNow;
  if (reason === 'nonsense') {
    return `이전 답은 사업 사실에 반영되지 않았습니다. 현재 이해(${digest})를 기준으로 ${base}`;
  }
  if (reason === 'why_meta') {
    return `왜 지금인지: ${base} (현재 이해: ${digest})`;
  }
  if (reason === 'mid_judgment') {
    return `중간 정리 후 재판단했습니다. 남은 핵심 공백「${targetGap}」— ${base}`;
  }
  return `${base} (현재 이해: ${digest})`;
}

/**
 * Build a reframed question for the same (or re-judged) gap.
 * Wording MUST differ from the stock template when understanding context exists.
 */
export function reframeQuestion(input: {
  targetGap: string;
  living: LivingUnderstandingState;
  reason: ReframeReason;
  previousQuestionText?: string | null;
}): ReframedQuestion {
  const binding = resolveGapQuestionBinding(input.targetGap);
  const stem = reframeStem(input.targetGap, input.living);
  let questionText = stem ?? binding.questionText;

  // Guarantee different wording vs previous identical ask
  const prev = input.previousQuestionText?.trim() ?? '';
  if (prev && questionText.trim() === prev) {
    const digest = knownDigest(input.living);
    questionText = `현재 이해(${digest})를 기준으로 다시 묻습니다 — ${questionText}`;
  }

  const whyNow = contextualWhyNow(input.targetGap, input.living, input.reason);
  const reframed = questionText.trim() !== binding.questionText.trim();

  return {
    targetGap: input.targetGap,
    questionText,
    whyNow,
    reframed,
    reason: input.reason,
  };
}

/** Same-meaning check: identical normalized question text. */
export function isSameMeaningQuestion(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  return Boolean(a && b && norm(a) === norm(b));
}
