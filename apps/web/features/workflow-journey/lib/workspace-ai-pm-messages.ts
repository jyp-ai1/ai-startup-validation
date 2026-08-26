import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import { pinOriginalBusinessIntent } from './business-understanding/original-business-intent';
import { extractDocumentEntities } from './domain/extract-document-entities';
import { buildFirstTrustMessage } from './first-trust/build-first-trust-message';
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

function documentTextKey(projectId?: string): string {
  return `launchlens.document.${projectId ?? 'demo'}.raw`;
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

export function saveWorkspaceDocumentText(content: string, projectId?: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(documentTextKey(projectId), content);
  pinOriginalBusinessIntent(content, projectId, 'document_seed');
}

export function loadWorkspaceDocumentText(projectId?: string): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(documentTextKey(projectId));
}

export function inferDomainFromPaste(content: string, projectId?: string): {
  domain: WorkspaceDomainEvidence;
  entities: LaunchLensDomainContext;
} {
  saveWorkspaceDocumentText(content, projectId);
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
  if (domain.founder.trim().length < 2) return false;

  const ctx = resolveEntitiesForReview(domain, entities);
  const trust = evaluateDomainTrust(ctx);

  if (trust.mustConfirmCustomer && ctx.customer.basis !== 'document') return false;
  if (trust.issues.includes('founder_equals_customer')) return false;

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
  const customerConfirmed = customerIsDocumentBacked(domain, entities);
  return buildFirstTrustMessage(domain, reviewCount, entities, { customerConfirmed });
}
