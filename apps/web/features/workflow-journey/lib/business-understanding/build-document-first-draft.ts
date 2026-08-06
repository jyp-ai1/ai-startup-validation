import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import {
  buildSharedUnderstanding,
  SHARED_UNDERSTANDING_PENDING,
  type WorkspaceSharedUnderstanding,
} from './build-shared-understanding';
import { buildAiPmDynamicDiagnosis } from './build-ai-pm-dynamic-diagnosis';
import { isWorkspaceDocumentReadable } from './workspace-document-eligibility';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

/** S17-1 — per-field provenance for Document First UX. */
export type DocumentFirstFieldSource = 'document' | 'inferred' | 'unknown';

export type DocumentFirstField = {
  id: 'business' | 'customer' | 'problem' | 'market' | 'competitor';
  value: string;
  source: DocumentFirstFieldSource;
};

export type DocumentFirstDraft = {
  fields: DocumentFirstField[];
  /** Spine subset for Shared Understanding panel. */
  spine: WorkspaceSharedUnderstanding;
  confidencePercent: number;
  /** Aggregate: document-backed vs needs inference. */
  confidenceMode: 'document' | 'mixed' | 'inferred';
  documentReadable: boolean;
};

function isPendingish(value: string): boolean {
  const trimmed = value.trim();
  return !trimmed || trimmed === SHARED_UNDERSTANDING_PENDING;
}

function resolveSource(
  value: string,
  basis: LaunchLensDomainContext['market']['basis'] | undefined,
  readable: boolean,
): DocumentFirstFieldSource {
  if (!readable) return 'unknown';
  if (isPendingish(value)) return 'unknown';
  if (basis === 'document') return 'document';
  if (basis === 'needs_confirmation' || basis === 'inferred') return 'inferred';
  if (basis === 'unknown') return 'unknown';
  return value.trim() ? 'inferred' : 'unknown';
}

function marketValue(
  entities: LaunchLensDomainContext | null,
  understanding: BusinessUnderstanding,
): string {
  const fromEntity = entities?.market.value?.trim();
  if (fromEntity) return fromEntity.slice(0, 48);
  if (understanding.problem.value?.trim()) {
    return SHARED_UNDERSTANDING_PENDING;
  }
  return SHARED_UNDERSTANDING_PENDING;
}

function competitorValue(entities: LaunchLensDomainContext | null): string {
  const fromEntity = entities?.competitor.value?.trim();
  if (fromEntity) return fromEntity.slice(0, 48);
  return SHARED_UNDERSTANDING_PENDING;
}

/**
 * S17-1 Document First — AI draft after upload/parse.
 * Always returns a draft when understanding exists (never an empty-form contract).
 * Weak/unreadable PDF → honest unknown values + low confidence.
 */
export function buildDocumentFirstDraft(input: {
  documentText: string;
  understanding: BusinessUnderstanding;
  entities?: LaunchLensDomainContext | null;
  turns?: AiPmLoopTurn[];
}): DocumentFirstDraft | null {
  const text = input.documentText.trim();
  if (text.length < 8) return null;

  const readable = isWorkspaceDocumentReadable(text);
  const spine =
    buildSharedUnderstanding({
      documentText: text,
      turns: input.turns ?? [],
      understanding: input.understanding,
      entities: input.entities ?? null,
    }) ?? {
      business: SHARED_UNDERSTANDING_PENDING,
      customer: SHARED_UNDERSTANDING_PENDING,
      problem: SHARED_UNDERSTANDING_PENDING,
    };

  const diagnosis = buildAiPmDynamicDiagnosis(
    input.understanding,
    input.entities,
    text,
  );

  const market = marketValue(input.entities ?? null, input.understanding);
  const competitor = competitorValue(input.entities ?? null);

  const fields: DocumentFirstField[] = [
    {
      id: 'business',
      value: spine.business,
      source: resolveSource(spine.business, input.entities?.business.basis, readable),
    },
    {
      id: 'customer',
      value: spine.customer,
      source: resolveSource(spine.customer, input.entities?.customer.basis, readable),
    },
    {
      id: 'problem',
      value: spine.problem,
      source: (() => {
        if (!readable) return 'unknown';
        if (isPendingish(spine.problem)) return 'unknown';
        if (input.understanding.problem.status === 'document') return 'document';
        if (input.understanding.problem.status === 'needs_confirmation') return 'inferred';
        return 'inferred';
      })(),
    },
    {
      id: 'market',
      value: market,
      source: resolveSource(market, input.entities?.market.basis, readable),
    },
    {
      id: 'competitor',
      value: competitor,
      source: resolveSource(competitor, input.entities?.competitor.basis, readable),
    },
  ];

  const sources = fields.map((f) => f.source);
  const hasDoc = sources.includes('document');
  const hasUnknown = sources.includes('unknown') || sources.includes('inferred');
  const confidenceMode: DocumentFirstDraft['confidenceMode'] = !readable
    ? 'inferred'
    : hasDoc && hasUnknown
      ? 'mixed'
      : hasDoc
        ? 'document'
        : 'inferred';

  const confidencePercent = readable
    ? diagnosis.confidencePercent
    : Math.min(diagnosis.confidencePercent, 42);

  return {
    fields,
    spine,
    confidencePercent,
    confidenceMode,
    documentReadable: readable,
  };
}

/** Seed domain edit values from draft so Edit never opens as a blank form. */
export function seedDomainFromDocumentFirstDraft(
  draft: DocumentFirstDraft,
  current: {
    founder: string;
    business: string;
    customer: string;
    market: string;
    competitor: string;
  },
): {
  founder: string;
  business: string;
  customer: string;
  market: string;
  competitor: string;
} {
  const byId = Object.fromEntries(draft.fields.map((f) => [f.id, f.value])) as Record<
    DocumentFirstField['id'],
    string
  >;
  const pick = (currentValue: string, draftValue: string) => {
    if (currentValue.trim()) return currentValue;
    if (!draftValue.trim() || draftValue === SHARED_UNDERSTANDING_PENDING) return '';
    return draftValue;
  };
  return {
    founder: current.founder,
    business: pick(current.business, byId.business ?? ''),
    customer: pick(current.customer, byId.customer ?? ''),
    market: pick(current.market, byId.market ?? ''),
    competitor: pick(current.competitor, byId.competitor ?? ''),
  };
}
