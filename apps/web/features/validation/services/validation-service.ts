import { isSupabaseConfigured } from '@repo/db';
import type { ValidationScore } from '@repo/types/validation';

import { getValidationScoreRepository } from '@/lib/db/platform';

export async function listValidationScores(
  projectId: string,
): Promise<ValidationScore[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const repo = getValidationScoreRepository();
  return repo.findByProjectId(projectId);
}

export async function findLatestValidationScore(
  projectId: string,
): Promise<ValidationScore | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const repo = getValidationScoreRepository();
  return repo.findLatestByProjectId(projectId);
}

export async function findValidationScoreById(
  id: string,
): Promise<ValidationScore | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const repo = getValidationScoreRepository();
  return repo.findById(id);
}
