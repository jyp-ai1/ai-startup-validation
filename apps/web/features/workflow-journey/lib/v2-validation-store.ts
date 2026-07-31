import { getActiveProjectId } from '@/lib/project/project-context-store';

import { DEMO_SESSION_PROJECT_ID } from './demo-samples';

/** Legacy global keys — migrated on read, cleared on project reset. */
const LEGACY_EVIDENCE_KEY = 'll_v2_validation_evidence';
const LEGACY_OPTIONS_KEY = 'll_v2_validation_options';
const LEGACY_IDEA_KEY = 'll_v2_validation_idea';
const LEGACY_REGISTRATION_KEY = 'll_project_registration';

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

function resolveScopeId(projectId?: string): string {
  if (projectId) return projectId;
  return getActiveProjectId() ?? 'demo';
}

function allowsLegacyMigration(projectId?: string): boolean {
  if (!projectId) return true;
  return projectId === 'demo' || projectId === DEMO_SESSION_PROJECT_ID;
}

function evidenceKey(projectId?: string): string {
  return `launchlens.evidence.${resolveScopeId(projectId)}.validation`;
}

function registrationKey(projectId?: string): string {
  return `launchlens.project.${resolveScopeId(projectId)}.registration`;
}

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

export function saveV2Validation(evidence: V2ValidationEvidence, projectId?: string): void {
  if (typeof window === 'undefined') return;

  const key = evidenceKey(projectId);
  sessionStorage.setItem(key, JSON.stringify(evidence));
  sessionStorage.removeItem('ll_v2_validation_score');

  sessionStorage.setItem(
    registrationKey(projectId),
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
  const idea = sessionStorage.getItem(LEGACY_IDEA_KEY);
  if (!idea?.trim()) return null;

  const optionsRaw = sessionStorage.getItem(LEGACY_OPTIONS_KEY);
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

export function loadV2Validation(projectId?: string): V2ValidationSnapshot | null {
  if (typeof window === 'undefined') return null;

  try {
    const scopedRaw = sessionStorage.getItem(evidenceKey(projectId));
    if (scopedRaw) {
      const evidence = JSON.parse(scopedRaw) as V2ValidationEvidence;
      if (!evidence.idea?.trim()) return null;
      return {
        evidence,
        filledCount: countFilledEvidence(evidence),
        totalCount: TOTAL_FIELDS,
      };
    }

    if (!allowsLegacyMigration(projectId)) {
      return null;
    }

    const legacyRaw = sessionStorage.getItem(LEGACY_EVIDENCE_KEY);
    if (legacyRaw) {
      const evidence = JSON.parse(legacyRaw) as V2ValidationEvidence;
      if (!evidence.idea?.trim()) return null;
      saveV2Validation(evidence, projectId);
      return {
        evidence,
        filledCount: countFilledEvidence(evidence),
        totalCount: TOTAL_FIELDS,
      };
    }

    const legacy = migrateLegacyEvidence();
    if (!legacy) return null;

    saveV2Validation(legacy, projectId);
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
