import type { ID } from '@repo/types';

import { getServiceClient } from '../adapters/supabase/service';
import {
  applyEqFilters,
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'project_memory_entries';

export const PROJECT_MEMORY_TYPES = [
  'CONVERSATION',
  'RESEARCH',
  'DECISION',
  'REPORT',
  'EVIDENCE',
  'GOVERNMENT',
  'MARKET',
  'COMPETITOR',
] as const;

export type ProjectMemoryType = (typeof PROJECT_MEMORY_TYPES)[number];

export type ProjectMemoryEntry = {
  id: ID;
  projectId: ID;
  memoryType: ProjectMemoryType;
  title: string;
  summary: string | null;
  payload: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectMemoryInput = {
  projectId: ID;
  memoryType: ProjectMemoryType;
  title: string;
  summary?: string | null;
  payload?: Record<string, unknown>;
  occurredAt?: string;
};

export type UpdateProjectMemoryInput = {
  title?: string;
  summary?: string | null;
  payload?: Record<string, unknown>;
  occurredAt?: string;
};

type ProjectMemoryRow = {
  id: string;
  project_id: string;
  memory_type: ProjectMemoryType;
  title: string;
  summary: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
  updated_at: string;
};

function toEntry(row: ProjectMemoryRow): ProjectMemoryEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    memoryType: row.memory_type,
    title: row.title,
    summary: row.summary,
    payload: row.payload ?? {},
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsertRow(input: CreateProjectMemoryInput) {
  return {
    project_id: input.projectId,
    memory_type: input.memoryType,
    title: input.title,
    summary: input.summary ?? null,
    payload: input.payload ?? {},
    occurred_at: input.occurredAt ?? new Date().toISOString(),
  };
}

function toUpdateRow(input: UpdateProjectMemoryInput) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) row.title = input.title;
  if (input.summary !== undefined) row.summary = input.summary;
  if (input.payload !== undefined) row.payload = input.payload;
  if (input.occurredAt !== undefined) row.occurred_at = input.occurredAt;
  return row;
}

export interface ProjectMemoryRepository {
  findByProjectId(projectId: ID): Promise<ProjectMemoryEntry[]>;
  findById(id: ID): Promise<ProjectMemoryEntry | null>;
  create(input: CreateProjectMemoryInput): Promise<ProjectMemoryEntry>;
  update(id: ID, input: UpdateProjectMemoryInput): Promise<ProjectMemoryEntry>;
}

export class SupabaseProjectMemoryRepository implements ProjectMemoryRepository {
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async findByProjectId(projectId: ID): Promise<ProjectMemoryEntry[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('project_id', projectId)
      .order('occurred_at', { ascending: false });

    assertNoError(error);
    return ((data ?? []) as ProjectMemoryRow[]).map(toEntry);
  }

  async findById(id: ID): Promise<ProjectMemoryEntry | null> {
    const { data, error } = await this.client.from(TABLE).select('*').eq('id', id).maybeSingle();
    assertNoError(error);
    return data ? toEntry(data as ProjectMemoryRow) : null;
  }

  async create(input: CreateProjectMemoryInput): Promise<ProjectMemoryEntry> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(toInsertRow(input))
      .select('*')
      .single();

    assertNoError(error);
    return toEntry(assertRow(data as ProjectMemoryRow, 'ProjectMemoryEntry'));
  }

  async update(id: ID, input: UpdateProjectMemoryInput): Promise<ProjectMemoryEntry> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(toUpdateRow(input))
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toEntry(assertRow(data as ProjectMemoryRow, 'ProjectMemoryEntry'));
  }

  async countByProject(projectId: ID): Promise<number> {
    const query = applyEqFilters(
      this.client.from(TABLE).select('*', { count: 'exact', head: true }),
      { project_id: projectId },
    );
    const { count, error } = await query;
    assertNoError(error);
    return count ?? 0;
  }
}
