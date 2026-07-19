import { isSupabaseConfigured } from '@repo/db';
import type {
  Competitor,
  CompetitorComparison,
  CompetitorComparisonField,
} from '@repo/types/validation';

import { getCompetitorRepository } from '@/lib/db/platform';

import { COMPARISON_FIELDS } from '../schemas/competitor-schema';

export async function listCompetitors(projectId: string): Promise<Competitor[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const repo = getCompetitorRepository();
  return repo.findByProjectId(projectId);
}

export async function findCompetitor(id: string): Promise<Competitor | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const repo = getCompetitorRepository();
  return repo.findById(id);
}

export async function buildCompetitorComparison(
  projectId: string,
): Promise<CompetitorComparison> {
  const competitors = await listCompetitors(projectId);

  return {
    competitors,
    fields: [...COMPARISON_FIELDS] as CompetitorComparisonField[],
  };
}
