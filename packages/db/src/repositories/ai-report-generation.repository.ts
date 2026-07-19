import type { BaseRepository } from '@repo/core/repository';
import type { ID } from '@repo/types';
import type {
  AIReportGeneration,
  CreateAIReportGenerationInput,
  UpdateAIReportGenerationInput,
} from '@repo/types/validation';

import { getServiceClient } from '../adapters/supabase/service';
import {
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'ai_report_generations';

type AIReportGenerationRow = {
  id: string;
  project_id: string;
  report_id: string;
  provider: string;
  model: string;
  status: AIReportGeneration['status'];
  error_message: string | null;
  created_at: string;
};

function toAIReportGeneration(row: AIReportGenerationRow): AIReportGeneration {
  return {
    id: row.id,
    projectId: row.project_id,
    reportId: row.report_id,
    provider: row.provider,
    model: row.model,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

function toInsertRow(input: CreateAIReportGenerationInput) {
  return {
    project_id: input.projectId,
    report_id: input.reportId,
    provider: input.provider,
    model: input.model,
    status: input.status ?? 'PROCESSING',
    error_message: input.errorMessage ?? null,
  };
}

function toUpdateRow(input: UpdateAIReportGenerationInput) {
  return {
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.errorMessage !== undefined ? { error_message: input.errorMessage } : {}),
    ...(input.provider !== undefined ? { provider: input.provider } : {}),
    ...(input.model !== undefined ? { model: input.model } : {}),
  };
}

export type AIReportGenerationRepository = BaseRepository<
  AIReportGeneration,
  CreateAIReportGenerationInput,
  UpdateAIReportGenerationInput
> & {
  findByReportId(reportId: ID): Promise<AIReportGeneration[]>;
  findLatestByReportId(reportId: ID): Promise<AIReportGeneration | null>;
};

/** Supabase adapter for ai_report_generations table. */
export class SupabaseAIReportGenerationRepository
  implements AIReportGenerationRepository
{
  private clientInstance: SupabaseClient | null = null;

  constructor(private readonly clientOverride?: SupabaseClient) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  async findById(id: ID): Promise<AIReportGeneration | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toAIReportGeneration(data as AIReportGenerationRow) : null;
  }

  async findByReportId(reportId: ID): Promise<AIReportGeneration[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false });

    assertNoError(error);
    return ((data ?? []) as AIReportGenerationRow[]).map(toAIReportGeneration);
  }

  async findLatestByReportId(reportId: ID): Promise<AIReportGeneration | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    assertNoError(error);
    return data ? toAIReportGeneration(data as AIReportGenerationRow) : null;
  }

  async findAll(): Promise<AIReportGeneration[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    assertNoError(error);
    return ((data ?? []) as AIReportGenerationRow[]).map(toAIReportGeneration);
  }

  async create(input: CreateAIReportGenerationInput): Promise<AIReportGeneration> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(toInsertRow(input))
      .select('*')
      .single();

    assertNoError(error);
    return toAIReportGeneration(
      assertRow(data as AIReportGenerationRow, 'AIReportGeneration'),
    );
  }

  async update(
    id: ID,
    input: UpdateAIReportGenerationInput,
  ): Promise<AIReportGeneration> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(toUpdateRow(input))
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toAIReportGeneration(
      assertRow(data as AIReportGenerationRow, 'AIReportGeneration'),
    );
  }

  async delete(id: ID): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq('id', id);
    assertNoError(error);
  }

  async exists(id: ID): Promise<boolean> {
    return (await this.findById(id)) !== null;
  }

  async count(): Promise<number> {
    const { count, error } = await this.client
      .from(TABLE)
      .select('*', { count: 'exact', head: true });
    assertNoError(error);
    return count ?? 0;
  }
}
