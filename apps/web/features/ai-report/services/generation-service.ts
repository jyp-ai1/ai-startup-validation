import { isSupabaseConfigured } from '@repo/db';
import type { AIReportGeneration } from '@repo/types/validation';

import { getAIReportGenerationRepository } from '@/lib/db/platform';

export async function findLatestGeneration(
  reportId: string,
): Promise<AIReportGeneration | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const repo = getAIReportGenerationRepository();
  return repo.findLatestByReportId(reportId);
}

export async function listGenerations(
  reportId: string,
): Promise<AIReportGeneration[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const repo = getAIReportGenerationRepository();
  return repo.findByReportId(reportId);
}
