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

export function emptyWorkspaceDomain(): WorkspaceDomainEvidence {
  return { ...EMPTY };
}

export function validationToWorkspaceDomain(
  evidence: V2ValidationEvidence,
): WorkspaceDomainEvidence {
  return {
    founder: '',
    business: evidence.idea?.trim() ?? '',
    customer: evidence.customer?.trim() ?? '',
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

export function inferDomainFromPaste(content: string): {
  domain: WorkspaceDomainEvidence;
  entities: LaunchLensDomainContext;
} {
  const entities = extractDocumentEntities(content);
  const domain: WorkspaceDomainEvidence = {
    founder: entities.founder.value ?? '',
    business: entities.business.name ?? entities.business.value ?? '',
    customer:
      entities.customer.basis === 'needs_confirmation' || entities.customer.basis === 'unknown'
        ? ''
        : (entities.customer.value ?? ''),
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

export function canProceedWorkspaceReview(domain: WorkspaceDomainEvidence): boolean {
  const entities: LaunchLensDomainContext = {
    founder: { value: domain.founder || null, basis: domain.founder ? 'document' : 'unknown' },
    business: {
      value: domain.business || null,
      basis: domain.business ? 'document' : 'unknown',
      model: null,
      name: domain.business || null,
    },
    customer: { value: domain.customer || null, basis: domain.customer ? 'document' : 'unknown' },
    product: { value: null, basis: 'unknown' },
    market: { value: domain.market || null, basis: domain.market ? 'document' : 'unknown' },
    competitor: {
      value: domain.competitor || null,
      basis: domain.competitor ? 'document' : 'unknown',
    },
  };
  const trust = evaluateDomainTrust(entities);
  return domain.business.trim().length >= 4 && !trust.mustConfirmCustomer && domain.customer.trim().length >= 2;
}

export type AiPmMessageBlock = {
  paragraphs: string[];
  blocked: boolean;
  activeField: WorkspaceDomainFieldId | null;
};

export function buildAiPmPrimaryMessage(
  domain: WorkspaceDomainEvidence,
  reviewCount: number,
): AiPmMessageBlock {
  const hasBusiness = domain.business.trim().length >= 4;
  const hasCustomer = domain.customer.trim().length >= 2;
  const hasFounder = domain.founder.trim().length >= 2;

  if (!hasBusiness) {
    return {
      blocked: true,
      activeField: 'business',
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
      paragraphs: [
        '대표님, 사업계획서를 먼저 읽었습니다.',
        `${domain.business} — Business는 확인했습니다.`,
        'Founder(대표/창업자) 정보를 먼저 정리해 주세요. Founder ≠ Customer 입니다.',
      ],
    };
  }

  if (!hasCustomer) {
    return {
      blocked: true,
      activeField: 'customer',
      paragraphs: [
        '대표님,',
        '현재 문서만으로는 실제 Customer(서비스 사용자)를 판단할 수 없습니다.',
        'Founder와 Customer를 구분해 확인 부탁드립니다. 여기서 추측하지 않고 멈춥니다.',
      ],
    };
  }

  if (reviewCount === 0) {
    return {
      blocked: false,
      activeField: null,
      paragraphs: [
        '대표님,',
        `Business는 ${domain.business}로 확인했습니다. Customer는 ${domain.customer}입니다.`,
        '시장과 경쟁을 정리한 뒤 Overview를 만들겠습니다.',
      ],
    };
  }

  return {
    blocked: false,
    activeField: null,
    paragraphs: [
      '대표님,',
      '사업계획서를 검토했습니다. 시장은 확인되었습니다.',
      domain.market
        ? `Market: ${domain.market}. Sidebar에서 Insight를 이어가겠습니다.`
        : '다음으로 Market 정의를 보완하겠습니다.',
    ],
  };
}
