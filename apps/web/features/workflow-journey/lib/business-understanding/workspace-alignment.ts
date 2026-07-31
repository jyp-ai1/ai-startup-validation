import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import type { WorkspaceDomainEvidence } from '../workspace-ai-pm-messages';

export type MarketCandidate = {
  id: string;
  label: string;
  documentQuote: string;
};

export type StrategyDirection =
  | 'unset'
  | 'has_direction'
  | 'thinking'
  | 'decide_after_review';

/** Review 전 — 검토 맥락만. 전략 확정·우선순위는 Review 이후 Recommend. */
export type MarketAlignmentState = {
  direction: StrategyDirection;
  primaryLabel: string | null;
};

const alignmentKey = (projectId?: string): string =>
  `launchlens.decisionAlignment.${projectId ?? 'demo'}`;

const MENTION_LABELS: Record<string, string> = {
  MZ: '전통주에 관심 있는 일반 소비자',
  FIT: 'FIT 관광객',
  외국인: '방한 관광객',
  전통주: '전통주 관심 소비자',
  일반인: '일반 소비자',
};

/** Document-backed parties only — deduped by label. */
export function buildMarketCandidates(u: BusinessUnderstanding): MarketCandidate[] {
  const candidates: MarketCandidate[] = [];
  const seenLabels = new Set<string>();

  for (const mention of u.customerMentions) {
    const label = MENTION_LABELS[mention.quote] ?? mention.label;
    if (seenLabels.has(label)) continue;
    seenLabels.add(label);
    candidates.push({
      id: `mention-${mention.quote}`,
      label,
      documentQuote: mention.quote,
    });
  }

  if (u.partner.value || u.partner.confirmedExpressions?.length) {
    const quote = u.partner.confirmedExpressions?.[0] ?? '양조장';
    const label = '전국 양조장';
    if (!seenLabels.has(label)) {
      candidates.push({
        id: 'brewery-partner',
        label,
        documentQuote: quote.includes('양조') ? quote : '전국 양조장',
      });
    }
  }

  return candidates;
}

/** PM insight — up to two common paths from document parties. */
export function buildCommonStrategyPaths(candidates: MarketCandidate[]): string[] {
  return candidates.slice(0, 2).map((c) => c.label);
}

export function buildDefaultMarketAlignment(): MarketAlignmentState {
  return { direction: 'unset', primaryLabel: null };
}

function migrateLegacyState(parsed: Record<string, unknown>): MarketAlignmentState | null {
  if ('direction' in parsed) {
    return parsed as MarketAlignmentState;
  }
  if ('hasPriority' in parsed) {
    const legacy = parsed as { hasPriority: string; primaryLabel?: string | null };
    if (legacy.hasPriority === 'yes') {
      return { direction: 'has_direction', primaryLabel: legacy.primaryLabel ?? null };
    }
    if (legacy.hasPriority === 'no') {
      return { direction: 'decide_after_review', primaryLabel: null };
    }
  }
  return null;
}

export function loadMarketAlignment(projectId?: string): MarketAlignmentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(alignmentKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return migrateLegacyState(parsed);
  } catch {
    return null;
  }
}

export function saveMarketAlignment(state: MarketAlignmentState, projectId?: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(alignmentKey(projectId), JSON.stringify(state));
}

export function buildReviewReadyTrust(): string {
  return [
    '좋습니다.',
    '현재 문서를 기준으로 검토를 시작하겠습니다.',
    '검토를 진행하면서 부족하거나 확인이 필요한 부분은 따로 알려드리겠습니다.',
    '검토를 진행하면서 대표님이 아직 정하지 않은 부분과 문서만으로 판단하기 어려운 부분은 추측하지 않고 따로 구분해서 말씀드리겠습니다.',
  ].join('\n\n');
}

export function buildViabilityIntro(state: MarketAlignmentState): string {
  if (state.direction === 'thinking') {
    return [
      '알겠습니다.',
      '우선 전체 기준으로 사업성을 검토한 뒤',
      '함께 방향을 정리하겠습니다.',
    ].join('\n\n');
  }
  if (state.direction === 'decide_after_review') {
    return [
      '좋습니다.',
      '검토 결과를 보고 함께 결정하겠습니다.',
      '우선 사업성부터 검토하겠습니다.',
    ].join('\n\n');
  }
  if (state.direction === 'has_direction' && state.primaryLabel?.trim()) {
    return `좋습니다.\n\n${state.primaryLabel.trim()} 방향을 염두에 두고 사업성을 검토하겠습니다.`;
  }
  return '이 기준으로 사업성을 검토하겠습니다.';
}

export const buildDecisionAlignmentClose = buildViabilityIntro;
export const buildMarketStrategyAck = buildViabilityIntro;
export const buildStrategySummary = buildViabilityIntro;

export function resolvePrimaryCustomerLabel(state: MarketAlignmentState): string {
  return state.direction === 'has_direction' ? (state.primaryLabel?.trim() ?? '') : '';
}

export function isMarketAlignmentValid(state: MarketAlignmentState): boolean {
  if (state.direction === 'thinking' || state.direction === 'decide_after_review') {
    return true;
  }
  if (state.direction === 'has_direction') {
    return Boolean(state.primaryLabel?.trim() && state.primaryLabel.trim().length >= 2);
  }
  return false;
}

export function allowsOpenReview(state: MarketAlignmentState | null): boolean {
  return (
    state?.direction === 'thinking' ||
    state?.direction === 'decide_after_review'
  );
}

export function applyMarketAlignmentToWorkspace(
  state: MarketAlignmentState,
  _candidates: MarketCandidate[],
  domain: WorkspaceDomainEvidence,
  entities: LaunchLensDomainContext | null,
): { domain: WorkspaceDomainEvidence; entities: LaunchLensDomainContext } {
  const customer = resolvePrimaryCustomerLabel(state);
  const trimmed = customer.trim();
  const nextDomain: WorkspaceDomainEvidence = { ...domain, customer: trimmed || domain.customer };

  const base =
    entities ??
    ({
      founder: { value: null, basis: 'unknown', excerpt: null },
      business: { value: null, basis: 'unknown', excerpt: null, name: null, model: null },
      customer: { value: null, basis: 'unknown', excerpt: null },
      product: { value: null, basis: 'unknown', excerpt: null },
      market: { value: null, basis: 'unknown', excerpt: null },
      competitor: { value: null, basis: 'unknown', excerpt: null },
    } satisfies LaunchLensDomainContext);

  return {
    domain: nextDomain,
    entities: {
      ...base,
      customer: trimmed
        ? { value: trimmed, basis: 'document', excerpt: base.customer.excerpt }
        : base.customer,
    },
  };
}

export function buildMarketTimelineLines(state: MarketAlignmentState): string[] {
  const label = resolvePrimaryCustomerLabel(state);
  return label ? ['START', label] : ['START'];
}
