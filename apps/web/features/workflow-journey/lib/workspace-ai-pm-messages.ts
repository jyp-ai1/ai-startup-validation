import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import { evaluateDomainTrust } from './domain/domain-trust-rules';
import { extractDocumentEntities } from './domain/extract-document-entities';
import type { V2ValidationEvidence } from './v2-validation-store';

export type WorkspaceDomainFieldId =
  | 'founder'
  | 'business'
  | 'customer'
  | 'market'
  | 'competitor';

export type WorkspaceDomainEvidence = Record<WorkspaceDomainFieldId, string>;

export type WorkspaceDomainFieldMeta = {
  id: WorkspaceDomainFieldId;
  basis: 'document' | 'inferred' | 'unknown' | 'needs_confirmation';
};

const EMPTY: WorkspaceDomainEvidence = {
  founder: '',
  business: '',
  customer: '',
  market: '',
  competitor: '',
};

function domainKey(projectId?: string): string {
  return `launchlens.domain.${projectId ?? 'demo'}.workspace`;
}

function entitiesKey(projectId?: string): string {
  return `launchlens.entities.${projectId ?? 'demo'}.workspace`;
}

export function emptyWorkspaceDomain(): WorkspaceDomainEvidence {
  return { ...EMPTY };
}

export function validationToWorkspaceDomain(
  evidence: V2ValidationEvidence,
): WorkspaceDomainEvidence {
  return {
    founder: '',
    business: evidence.idea?.trim() ?? '',
    customer: '',
    market: '',
    competitor: '',
  };
}

export function workspaceDomainToValidation(
  domain: WorkspaceDomainEvidence,
): V2ValidationEvidence {
  return {
    idea: domain.business.trim(),
    customer: domain.customer.trim() || undefined,
    problem: undefined,
    mvp: undefined,
    pricing: undefined,
  };
}

export function loadWorkspaceDomain(projectId?: string): WorkspaceDomainEvidence | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(domainKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkspaceDomainEvidence>;
    return { ...EMPTY, ...parsed };
  } catch {
    return null;
  }
}

export function saveWorkspaceDomain(
  domain: WorkspaceDomainEvidence,
  projectId?: string,
): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(domainKey(projectId), JSON.stringify(domain));
}

export function loadWorkspaceEntities(projectId?: string): LaunchLensDomainContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(entitiesKey(projectId));
    if (!raw) return null;
    return JSON.parse(raw) as LaunchLensDomainContext;
  } catch {
    return null;
  }
}

export function saveWorkspaceEntities(
  entities: LaunchLensDomainContext,
  projectId?: string,
): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(entitiesKey(projectId), JSON.stringify(entities));
}

export function inferDomainFromPaste(content: string): {
  domain: WorkspaceDomainEvidence;
  entities: LaunchLensDomainContext;
} {
  const entities = extractDocumentEntities(content);
  const domain: WorkspaceDomainEvidence = {
    founder: entities.founder.value ?? '',
    business: entities.business.name ?? entities.business.value ?? '',
    customer:
      entities.customer.basis === 'document' ? (entities.customer.value ?? '') : '',
    market: entities.market.value ?? '',
    competitor: entities.competitor.value ?? '',
  };
  return { domain, entities };
}

export function getDomainFieldMeta(
  id: WorkspaceDomainFieldId,
  entities?: LaunchLensDomainContext | null,
): WorkspaceDomainFieldMeta['basis'] {
  if (!entities) return 'unknown';
  if (id === 'business') return entities.business.basis;
  return entities[id].basis;
}

export function getDomainFieldExcerpt(
  id: WorkspaceDomainFieldId,
  entities?: LaunchLensDomainContext | null,
): string | null {
  if (!entities) return null;
  if (id === 'business') return entities.business.excerpt ?? null;
  return entities[id].excerpt ?? null;
}

function resolveEntitiesForReview(
  domain: WorkspaceDomainEvidence,
  entities?: LaunchLensDomainContext | null,
): LaunchLensDomainContext {
  if (entities) return entities;
  return extractDocumentEntities(
    [domain.founder, domain.business, domain.customer, domain.market, domain.competitor]
      .filter(Boolean)
      .join('\n'),
  );
}

export function canProceedWorkspaceReview(
  domain: WorkspaceDomainEvidence,
  entities?: LaunchLensDomainContext | null,
): boolean {
  if (domain.business.trim().length < 4) return false;
  if (domain.customer.trim().length < 2) return false;

  const ctx = resolveEntitiesForReview(domain, entities);
  const trust = evaluateDomainTrust(ctx);

  if (trust.mustConfirmCustomer) return false;
  if (ctx.customer.basis !== 'document') return false;

  return true;
}

export type AiPmMessageBlock = {
  paragraphs: string[];
  /** Observation → Reasoning → Decision → Next Action (P1 trust conversation) */
  ordA?: {
    observation: string;
    reasoning: string;
    decision: string;
    nextAction: string;
  };
  blocked: boolean;
  activeField: WorkspaceDomainFieldId | null;
};

function customerIsDocumentBacked(
  domain: WorkspaceDomainEvidence,
  entities?: LaunchLensDomainContext | null,
): boolean {
  const ctx = resolveEntitiesForReview(domain, entities);
  return ctx.customer.basis === 'document' && Boolean(ctx.customer.value?.trim());
}

export function buildAiPmPrimaryMessage(
  domain: WorkspaceDomainEvidence,
  reviewCount: number,
  entities?: LaunchLensDomainContext | null,
): AiPmMessageBlock {
  const hasBusiness = domain.business.trim().length >= 4;
  const hasFounder = domain.founder.trim().length >= 2;
  const hasCustomer = domain.customer.trim().length >= 2;
  const customerConfirmed = customerIsDocumentBacked(domain, entities);

  if (!hasBusiness) {
    return {
      blocked: true,
      activeField: 'business',
      ordA: {
        observation: 'LaunchLens AI PM입니다. 아직 Business(사업/서비스) 정의가 없습니다.',
        reasoning: 'Founder와 Customer는 Business와 분리해 정리해야 신뢰할 수 있는 검토가 가능합니다.',
        decision: 'Business를 먼저 확인합니다.',
        nextAction: 'Business(사업/서비스)가 무엇인지 알려주세요.',
      },
      paragraphs: [
        '대표님, LaunchLens AI PM입니다.',
        '먼저 Business(사업/서비스)가 무엇인지 알려주세요. Founder와 Customer는 따로 정리하겠습니다.',
      ],
    };
  }

  if (!hasFounder) {
    return {
      blocked: true,
      activeField: 'founder',
      ordA: {
        observation: `${domain.business} — Business는 확인했습니다.`,
        reasoning: 'Founder ≠ Customer 입니다. Founder는 문서 근거 없이 단정하지 않습니다.',
        decision: 'Founder 정보를 먼저 확인합니다.',
        nextAction: 'Founder(대표/창업자) 정보를 입력해 주세요.',
      },
      paragraphs: [
        '대표님,',
        `${domain.business} — Business는 확인했습니다.`,
        'Founder(대표/창업자) 정보를 먼저 정리해 주세요. Founder ≠ Customer 입니다.',
      ],
    };
  }

  if (!hasCustomer || !customerConfirmed) {
    const ctx = resolveEntitiesForReview(domain, entities);
    const confirmed: string[] = [];
    if (ctx.business.model === 'B2C') confirmed.push('B2C');
    if (ctx.business.model === 'B2B') confirmed.push('B2B');
    if (ctx.business.basis === 'document' && domain.business.trim()) {
      confirmed.push(`Business: ${domain.business}`);
    }

    const needsCheck = [
      '일반 소비자',
      '외국인 관광객',
      '전통주 관심 고객',
    ];

    const reasoningConfirmed =
      confirmed.length > 0 ? `확인한 내용: ${confirmed.join(', ')}` : '문서에 고객 정의가 명확하지 않습니다.';
    const reasoningNeeds = `확인 필요: ${needsCheck.join(', ')}`;

    return {
      blocked: true,
      activeField: 'customer',
      ordA: {
        observation: '현재 문서에서는 실제 서비스 고객을 확정할 수 없습니다.',
        reasoning: `${reasoningConfirmed}. ${reasoningNeeds}`,
        decision: 'Customer는 추측하지 않고 확인 필요 상태로 유지합니다.',
        nextAction: '실제 서비스 고객이 누구인지 알려주세요.',
      },
      paragraphs: [
        '대표님,',
        '현재 문서에서는 실제 서비스 고객을 확정할 수 없습니다.',
        '',
        '확인한 내용',
        ...(confirmed.length > 0 ? confirmed.map((line) => `✓ ${line}`) : ['✓ (문서 근거 없음)']),
        '',
        '확인이 필요한 내용',
        ...needsCheck.map((line) => `□ ${line}`),
        '',
        '실제 고객이 누구인지 같이 확인하겠습니다.',
      ],
    };
  }

  if (reviewCount === 0) {
    const ctx = resolveEntitiesForReview(domain, entities);
    const customerExcerpt = ctx.customer.excerpt?.trim();
    const evidenceLine = customerExcerpt
      ? `(근거: "${customerExcerpt}")`
      : '(문서 기반)';
    return {
      blocked: false,
      activeField: null,
      ordA: {
        observation: '문서에서 확인한 Business·Customer 정보입니다.',
        reasoning: `Business ${domain.business}, Customer ${domain.customer} ${evidenceLine}`,
        decision: 'Founder · Business · Customer를 문서 기반으로 확인했습니다.',
        nextAction: 'Market과 Competitor를 정리한 뒤 Overview를 생성하겠습니다.',
      },
      paragraphs: [
        '대표님,',
        `Business는 ${domain.business}로 확인했습니다.`,
        customerExcerpt
          ? `Customer는 ${domain.customer}입니다. (근거: "${customerExcerpt}")`
          : `Customer는 ${domain.customer}입니다.`,
        '시장과 경쟁을 정리한 뒤 Overview를 만들겠습니다.',
      ],
    };
  }

  return {
    blocked: false,
    activeField: null,
      ordA: {
        observation: '문서 기반 검토를 이어갑니다.',
        reasoning: domain.market
          ? `Market: ${domain.market}`
          : 'Market 정의가 아직 부족합니다.',
        decision: '도메인 검토를 이어갑니다.',
        nextAction: 'Sidebar에서 Insight를 이어가겠습니다.',
      },
      paragraphs: [
        '대표님,',
        domain.market
          ? `Market: ${domain.market}. Sidebar에서 Insight를 이어가겠습니다.`
          : '다음으로 Market 정의를 보완하겠습니다.',
      ],
  };
}
