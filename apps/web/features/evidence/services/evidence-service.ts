import { isSupabaseConfigured } from '@repo/db';
import type {
  Evidence,
  EvidenceListFilter,
} from '@repo/types/validation';

import { getEvidenceRepository } from '@/lib/db/platform';

export async function listEvidence(
  projectId: string,
  filter?: EvidenceListFilter,
): Promise<Evidence[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const repo = getEvidenceRepository();
  return repo.findByProjectId(projectId, filter);
}

export async function findEvidence(id: string): Promise<Evidence | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const repo = getEvidenceRepository();
  return repo.findById(id);
}
