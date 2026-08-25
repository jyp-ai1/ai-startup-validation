import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import {
  buildSharedUnderstanding,
  SHARED_UNDERSTANDING_PENDING,
  SHARED_UNDERSTANDING_UNREADABLE_BUSINESS,
  type WorkspaceSharedUnderstanding,
} from './build-shared-understanding';
import { buildAiPmDynamicDiagnosis } from './build-ai-pm-dynamic-diagnosis';
import {
  confidenceFromProvenance,
  mapDocumentFirstSourceToProvenance,
  mapProvenanceToDocumentFirstSource,
  type UnderstandingConfidence,
  type UnderstandingProvenance,
} from './understanding-contract';
import {
  isWorkspaceDocumentReadable,
  looksLikeDocumentFileName,
} from './workspace-document-eligibility';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

/** @deprecated Prefer `provenance` — kept for Presenter i18n keys. */
export type DocumentFirstFieldSource = 'document' | 'inferred' | 'unknown';

export type DocumentFirstField = {
  id: 'business' | 'customer' | 'problem' | 'market' | 'competitor';
  value: string;
  /** Legacy Presenter key — mirrors provenance. */
  source: DocumentFirstFieldSource;
  provenance: UnderstandingProvenance;
  confidence: UnderstandingConfidence;
};

export type DocumentFirstDraft = {
  fields: DocumentFirstField[];
  /** Spine subset for Shared Understanding panel. */
  spine: WorkspaceSharedUnderstanding;
  confidencePercent: number;
  /** Aggregate: document-backed vs needs inference. */
  confidenceMode: 'document' | 'mixed' | 'inferred';
  documentReadable: boolean;
  /** Gap-only field ids for weak/partial docs — never full re-entry. */
  gapFieldIds: Array<DocumentFirstField['id']>;
};

function isPendingish(value: string): boolean {
  const trimmed = value.trim();
  return (
    !trimmed ||
    trimmed === SHARED_UNDERSTANDING_PENDING ||
    trimmed === SHARED_UNDERSTANDING_UNREADABLE_BUSINESS
  );
}

function sanitizeBusinessValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return SHARED_UNDERSTANDING_PENDING;
  if (looksLikeDocumentFileName(trimmed)) return SHARED_UNDERSTANDING_PENDING;
  return trimmed;
}

function resolveLegacySource(
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

function toField(
  id: DocumentFirstField['id'],
  value: string,
  legacy: DocumentFirstFieldSource,
): DocumentFirstField {
  const safeValue = id === 'business' ? sanitizeBusinessValue(value) : value;
  const source =
    id === 'business' && looksLikeDocumentFileName(value.trim()) ? 'unknown' : legacy;
  const provenance = mapDocumentFirstSourceToProvenance(source);
  return {
    id,
    value: safeValue,
    source: mapProvenanceToDocumentFirstSource(provenance),
    provenance,
    confidence: confidenceFromProvenance(provenance),
  };
}

function marketValue(
  entities: LaunchLensDomainContext | null,
  understanding: BusinessUnderstanding,
): string {
  const fromEntity = entities?.market.value?.trim();
  if (fromEntity && !looksLikeDocumentFileName(fromEntity)) return fromEntity.slice(0, 48);
  if (understanding.problem.value?.trim()) {
    return SHARED_UNDERSTANDING_PENDING;
  }
  return SHARED_UNDERSTANDING_PENDING;
}

function competitorValue(entities: LaunchLensDomainContext | null): string {
  const fromEntity = entities?.competitor.value?.trim();
  if (fromEntity && !looksLikeDocumentFileName(fromEntity)) return fromEntity.slice(0, 48);
  return SHARED_UNDERSTANDING_PENDING;
}

/**
 * S17-1 Document First — AI draft after upload/parse.
 * Always returns a draft when understanding exists (never an empty-form contract).
 * Weak/unreadable PDF → honest unknown values + gapFieldIds only (never “재입력하세요”).
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

  const problemLegacy: DocumentFirstFieldSource = (() => {
    if (!readable) return 'unknown';
    if (isPendingish(spine.problem)) return 'unknown';
    if (input.understanding.problem.status === 'document') return 'document';
    if (input.understanding.problem.status === 'needs_confirmation') return 'inferred';
    return 'inferred';
  })();

  const fields: DocumentFirstField[] = [
    toField(
      'business',
      spine.business,
      resolveLegacySource(spine.business, input.entities?.business.basis, readable),
    ),
    toField(
      'customer',
      spine.customer,
      resolveLegacySource(spine.customer, input.entities?.customer.basis, readable),
    ),
    toField('problem', spine.problem, problemLegacy),
    toField(
      'market',
      market,
      resolveLegacySource(market, input.entities?.market.basis, readable),
    ),
    toField(
      'competitor',
      competitor,
      resolveLegacySource(competitor, input.entities?.competitor.basis, readable),
    ),
  ];

  const gapFieldIds = fields
    .filter((f) => f.provenance === 'UNKNOWN' || isPendingish(f.value))
    .map((f) => f.id);

  const provenances = fields.map((f) => f.provenance);
  const hasDoc = provenances.includes('DOCUMENT');
  const hasUnknown =
    provenances.includes('UNKNOWN') || provenances.includes('AI_INFERENCE');
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
    spine: {
      ...spine,
      business: sanitizeBusinessValue(spine.business),
    },
    confidencePercent,
    confidenceMode,
    documentReadable: readable,
    gapFieldIds,
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
    if (!draftValue.trim() || isPendingish(draftValue)) return '';
    if (looksLikeDocumentFileName(draftValue)) return '';
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
