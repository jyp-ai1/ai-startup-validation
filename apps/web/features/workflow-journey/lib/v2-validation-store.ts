const VALIDATION_EVIDENCE_KEY = 'll_v2_validation_evidence';

/** Legacy boolean toggles — migrated on read. */
const VALIDATION_OPTIONS_KEY = 'll_v2_validation_options';
const VALIDATION_IDEA_KEY = 'll_v2_validation_idea';

export type V2EvidenceField = 'problem' | 'customer' | 'mvp' | 'pricing';

export const V2_EVIDENCE_OPTIONAL_FIELDS: V2EvidenceField[] = [
  'problem',
  'customer',
  'mvp',
  'pricing',
];

export type V2ValidationEvidence = {
  idea: string;
  problem?: string;
  customer?: string;
  mvp?: string;
  pricing?: string;
};

export type V2ValidationSnapshot = {
  evidence: V2ValidationEvidence;
  filledCount: number;
  totalCount: number;
};

const TOTAL_FIELDS = 5;

function deriveProjectName(idea: string): string {
  const trimmed = idea.trim();
  if (trimmed.length <= 36) return trimmed;
  return `${trimmed.slice(0, 33).trim()}…`;
}

export function isEvidenceFieldFilled(
  field: 'idea' | V2EvidenceField,
  evidence: V2ValidationEvidence,
): boolean {
  if (field === 'idea') return evidence.idea.trim().length >= 4;
  return (evidence[field]?.trim().length ?? 0) >= 2;
}

export function countFilledEvidence(evidence: V2ValidationEvidence): number {
  let count = 0;
  if (isEvidenceFieldFilled('idea', evidence)) count += 1;
  for (const field of V2_EVIDENCE_OPTIONAL_FIELDS) {
    if (isEvidenceFieldFilled(field, evidence)) count += 1;
  }
  return count;
}

export function saveV2Validation(evidence: V2ValidationEvidence): void {
  if (typeof window === 'undefined') return;

  sessionStorage.setItem(VALIDATION_EVIDENCE_KEY, JSON.stringify(evidence));
  sessionStorage.setItem(VALIDATION_IDEA_KEY, evidence.idea.trim());
  sessionStorage.removeItem('ll_v2_validation_score');

  sessionStorage.setItem(
    'll_project_registration',
    JSON.stringify({
      projectName: deriveProjectName(evidence.idea),
      ideaOneLiner: evidence.idea.trim(),
      websiteUrl: '',
      targetMarket: evidence.customer?.trim() ?? '',
      optionalNote: evidence.problem?.trim() ?? '',
    }),
  );
}

function migrateLegacyEvidence(): V2ValidationEvidence | null {
  const idea = sessionStorage.getItem(VALIDATION_IDEA_KEY);
  if (!idea?.trim()) return null;

  const optionsRaw = sessionStorage.getItem(VALIDATION_OPTIONS_KEY);
  const evidence: V2ValidationEvidence = { idea: idea.trim() };

  if (optionsRaw) {
    try {
      const options = JSON.parse(optionsRaw) as Record<string, boolean>;
      if (options.problem) evidence.problem = '';
      if (options.customer) evidence.customer = '';
      if (options.mvp) evidence.mvp = '';
      if (options.pricing) evidence.pricing = '';
    } catch {
      // ignore
    }
  }

  return evidence;
}

export function loadV2Validation(): V2ValidationSnapshot | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(VALIDATION_EVIDENCE_KEY);
    if (raw) {
      const evidence = JSON.parse(raw) as V2ValidationEvidence;
      if (!evidence.idea?.trim()) return null;
      return {
        evidence,
        filledCount: countFilledEvidence(evidence),
        totalCount: TOTAL_FIELDS,
      };
    }

    const legacy = migrateLegacyEvidence();
    if (!legacy) return null;

    return {
      evidence: legacy,
      filledCount: countFilledEvidence(legacy),
      totalCount: TOTAL_FIELDS,
    };
  } catch {
    return null;
  }
}

/** @deprecated Score-based validation removed (ADR-023). */
export type V2ValidationOptions = {
  problem?: boolean;
  customer?: boolean;
  mvp?: boolean;
  pricing?: boolean;
};
