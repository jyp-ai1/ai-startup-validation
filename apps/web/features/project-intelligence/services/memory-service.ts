import 'server-only';

import type { ProjectMemoryEntry } from '@repo/db';
import { isSupabaseConfigured } from '@repo/db';

import { getProjectMemoryRepository } from '@/lib/db/platform';

import {
  getMemoriesFromStore,
  saveMemoriesToStore,
  upsertMemoryInStore,
} from '../repositories/memory-store';
import type { SaveMemoryInput } from '../types';

function nowIso(): string {
  return new Date().toISOString();
}

function createId(): string {
  return globalThis.crypto.randomUUID();
}

async function loadEntries(projectId: string): Promise<ProjectMemoryEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      const repo = getProjectMemoryRepository();
      const rows = await repo.findByProjectId(projectId);
      if (rows.length > 0) {
        await saveMemoriesToStore(projectId, rows);
        return rows;
      }
    } catch {
      /* migration 018 may not be applied */
    }
  }

  return getMemoriesFromStore(projectId);
}

async function persistEntry(entry: ProjectMemoryEntry): Promise<ProjectMemoryEntry> {
  await upsertMemoryInStore(entry);

  if (!isSupabaseConfigured()) return entry;

  try {
    const repo = getProjectMemoryRepository();
    const existing = await repo.findById(entry.id);
    if (existing) {
      return repo.update(entry.id, {
        title: entry.title,
        summary: entry.summary,
        payload: entry.payload,
        occurredAt: entry.occurredAt,
      });
    }
    return repo.create({
      projectId: entry.projectId,
      memoryType: entry.memoryType,
      title: entry.title,
      summary: entry.summary,
      payload: entry.payload,
      occurredAt: entry.occurredAt,
    });
  } catch {
    return entry;
  }
}

export async function getMemory(projectId: string): Promise<ProjectMemoryEntry[]> {
  return loadEntries(projectId);
}

export async function saveMemory(input: SaveMemoryInput): Promise<ProjectMemoryEntry> {
  const entries = await loadEntries(input.projectId);
  const sourceId = input.sourceId ?? `${input.memoryType}-${input.title}`;
  const existing = entries.find(
    (entry) => entry.payload.sourceId === sourceId || entry.id === sourceId,
  );
  const timestamp = input.occurredAt ?? nowIso();

  if (existing) {
    const updated: ProjectMemoryEntry = {
      ...existing,
      title: input.title,
      summary: input.summary ?? existing.summary,
      payload: { ...existing.payload, ...(input.payload ?? {}), sourceId },
      occurredAt: timestamp,
      updatedAt: nowIso(),
    };
    return persistEntry(updated);
  }

  const created: ProjectMemoryEntry = {
    id: createId(),
    projectId: input.projectId,
    memoryType: input.memoryType,
    title: input.title,
    summary: input.summary ?? null,
    payload: { ...(input.payload ?? {}), sourceId },
    occurredAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return persistEntry(created);
}

export async function updateMemory(
  id: string,
  projectId: string,
  patch: {
    title?: string;
    summary?: string | null;
    payload?: Record<string, unknown>;
    occurredAt?: string;
  },
): Promise<ProjectMemoryEntry | null> {
  const entries = await loadEntries(projectId);
  const existing = entries.find((entry) => entry.id === id);
  if (!existing) return null;

  const updated: ProjectMemoryEntry = {
    ...existing,
    title: patch.title ?? existing.title,
    summary: patch.summary !== undefined ? patch.summary : existing.summary,
    payload: patch.payload ? { ...existing.payload, ...patch.payload } : existing.payload,
    occurredAt: patch.occurredAt ?? existing.occurredAt,
    updatedAt: nowIso(),
  };

  return persistEntry(updated);
}

export async function buildSummary(projectId: string): Promise<string> {
  const entries = await loadEntries(projectId);
  if (entries.length === 0) {
    return 'No project memory yet. Complete onboarding and research to build context.';
  }

  const grouped = entries.slice(0, 12).map((entry) => {
    const summary = entry.summary ?? entry.title;
    return `- [${entry.memoryType}] ${summary}`;
  });

  return [`Project memory summary (${entries.length} entries):`, ...grouped].join('\n');
}
