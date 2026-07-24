import { isSupabaseConfigured } from '@repo/db';
import type { EvidenceCategory, EvidenceSourceType } from '@repo/types/validation';

import { getEvidenceRepository } from '@/lib/db/platform';

import type {
  GeneratedEvidenceItem,
  ResearchJob,
  ResearchSource,
  ResearchTaskType,
} from './research-agent-types';

function mapCategory(task: ResearchTaskType): EvidenceCategory {
  switch (task) {
    case 'MARKET':
      return 'MARKET';
    case 'COMPETITOR':
      return 'COMPETITOR';
    case 'GOVERNMENT':
      return 'REGULATION';
    case 'VOC':
      return 'CUSTOMER';
    case 'TECHNOLOGY':
      return 'TECHNOLOGY';
    default:
      return 'BUSINESS';
  }
}

function mapSourceType(source?: ResearchSource): EvidenceSourceType | null {
  if (!source) return 'WEBSITE';
  switch (source.sourceType) {
    case 'NEWS':
      return 'NEWS';
    case 'REPORT':
      return 'REPORT';
    case 'GOVERNMENT':
      return 'REPORT';
    case 'WEB':
    default:
      return 'WEBSITE';
  }
}

function resolveSource(
  item: GeneratedEvidenceItem,
  sources: ResearchSource[],
): ResearchSource | undefined {
  return sources.find((source) => source.id === item.sourceId);
}

function sanitizeUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Persist approved research agent output into Evidence DB (Sprint L3.1). */
export async function persistResearchEvidence(job: ResearchJob): Promise<number> {
  if (!isSupabaseConfigured() || !job.result || job.evidencePersisted) {
    return 0;
  }

  const repo = getEvidenceRepository();
  const { request, result, id: researchId } = job;
  let created = 0;

  for (const item of result.evidence) {
    const source = resolveSource(item, result.sources);
    const title = item.title ?? item.titleKey;
    const summary = item.summary ?? item.summaryKey;

    await repo.create({
      projectId: request.projectId,
      researchId,
      title,
      summary,
      category: mapCategory(item.category),
      confidence: item.confidence,
      sourceType: mapSourceType(source),
      sourceName: source?.title ?? 'LaunchLens AI Research',
      sourceUrl: sanitizeUrl(source?.url),
      content: summary,
    });
    created += 1;
  }

  return created;
}
