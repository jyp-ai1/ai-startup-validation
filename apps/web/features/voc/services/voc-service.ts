import { isSupabaseConfigured } from '@repo/db';
import type {
  VOC,
  VOCListFilter,
  VOCSummary,
} from '@repo/types/validation';
import {
  VOC_CUSTOMER_SEGMENTS,
  VOC_FREQUENCIES,
  VOC_SEVERITIES,
  VOC_WILLINGNESS_TO_PAY,
} from '@repo/types/validation';

import { getVOCRepository } from '@/lib/db/platform';

import {
  VOC_CUSTOMER_SEGMENT_LABELS,
  VOC_FREQUENCY_LABELS,
  VOC_SEVERITY_LABELS,
  VOC_WILLINGNESS_LABELS,
} from '../schemas/voc-schema';

export async function listVOCEntries(
  projectId: string,
  filter?: VOCListFilter,
): Promise<VOC[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const repo = getVOCRepository();
  return repo.findByProjectId(projectId, filter);
}

export async function findVOCEntry(id: string): Promise<VOC | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const repo = getVOCRepository();
  return repo.findById(id);
}

function buildDistribution<T extends string>(
  entries: VOC[],
  getValue: (entry: VOC) => T | null,
  keys: readonly T[],
  labels: Record<T, string>,
  unsetLabel = 'Unset',
): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const key of keys) {
    counts.set(labels[key], 0);
  }
  counts.set(unsetLabel, 0);

  for (const entry of entries) {
    const value = getValue(entry);
    const label = value ? labels[value] : unsetLabel;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

export async function buildVOCSummary(projectId: string): Promise<VOCSummary> {
  const entries = await listVOCEntries(projectId);

  const painPointMap = new Map<string, number>();
  for (const entry of entries) {
    const key = entry.painPoint.trim();
    painPointMap.set(key, (painPointMap.get(key) ?? 0) + 1);
  }

  const painPointRanking = [...painPointMap.entries()]
    .map(([painPoint, count]) => ({ painPoint, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalCount: entries.length,
    painPointRanking,
    severityDistribution: buildDistribution(
      entries,
      (e) => e.severity,
      VOC_SEVERITIES,
      VOC_SEVERITY_LABELS,
    ),
    frequencyDistribution: buildDistribution(
      entries,
      (e) => e.frequency,
      VOC_FREQUENCIES,
      VOC_FREQUENCY_LABELS,
    ),
    willingnessDistribution: buildDistribution(
      entries,
      (e) => e.willingnessToPay,
      VOC_WILLINGNESS_TO_PAY,
      VOC_WILLINGNESS_LABELS,
    ),
    customerSegmentDistribution: buildDistribution(
      entries,
      (e) => e.customerSegment,
      VOC_CUSTOMER_SEGMENTS,
      VOC_CUSTOMER_SEGMENT_LABELS,
    ),
  };
}
