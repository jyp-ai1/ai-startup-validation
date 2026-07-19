import type { BaseRepository } from '@repo/core/repository';
import type { ID } from '@repo/types';
import type {
  CreateVOCInput,
  UpdateVOCInput,
  VOC,
  VOCListFilter,
} from '@repo/types/validation';

import { getServiceClient } from '../adapters/supabase/service';
import {
  applyEqFilters,
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'voc_entries';

type VOCRow = {
  id: string;
  project_id: string;
  title: string;
  content: string;
  source_type: VOC['sourceType'];
  customer_segment: VOC['customerSegment'];
  pain_point: string;
  emotion: VOC['emotion'];
  frequency: VOC['frequency'];
  severity: VOC['severity'];
  willingness_to_pay: VOC['willingnessToPay'];
  created_at: string;
  updated_at: string;
};

function toVOC(row: VOCRow): VOC {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    content: row.content,
    sourceType: row.source_type,
    customerSegment: row.customer_segment,
    painPoint: row.pain_point,
    emotion: row.emotion,
    frequency: row.frequency,
    severity: row.severity,
    willingnessToPay: row.willingness_to_pay,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsertRow(input: CreateVOCInput) {
  return {
    project_id: input.projectId,
    title: input.title,
    content: input.content,
    source_type: input.sourceType ?? null,
    customer_segment: input.customerSegment ?? null,
    pain_point: input.painPoint,
    emotion: input.emotion ?? null,
    frequency: input.frequency ?? null,
    severity: input.severity ?? null,
    willingness_to_pay: input.willingnessToPay ?? 'UNKNOWN',
  };
}

function toUpdateRow(input: UpdateVOCInput) {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.content !== undefined ? { content: input.content } : {}),
    ...(input.sourceType !== undefined ? { source_type: input.sourceType } : {}),
    ...(input.customerSegment !== undefined
      ? { customer_segment: input.customerSegment }
      : {}),
    ...(input.painPoint !== undefined ? { pain_point: input.painPoint } : {}),
    ...(input.emotion !== undefined ? { emotion: input.emotion } : {}),
    ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
    ...(input.severity !== undefined ? { severity: input.severity } : {}),
    ...(input.willingnessToPay !== undefined
      ? { willingness_to_pay: input.willingnessToPay }
      : {}),
    updated_at: new Date().toISOString(),
  };
}

export type VOCRepository = BaseRepository<VOC, CreateVOCInput, UpdateVOCInput> & {
  findByProjectId(projectId: ID, filter?: VOCListFilter): Promise<VOC[]>;
};

/** Supabase adapter for voc_entries table. */
export class SupabaseVOCRepository implements VOCRepository {
  private clientInstance: SupabaseClient | null = null;

  constructor(private readonly clientOverride?: SupabaseClient) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  async findById(id: ID): Promise<VOC | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toVOC(data as VOCRow) : null;
  }

  async findByProjectId(projectId: ID, filter?: VOCListFilter): Promise<VOC[]> {
    let query = this.client
      .from(TABLE)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (filter?.sourceType) {
      query = query.eq('source_type', filter.sourceType);
    }
    if (filter?.customerSegment) {
      query = query.eq('customer_segment', filter.customerSegment);
    }
    if (filter?.severity) {
      query = query.eq('severity', filter.severity);
    }
    if (filter?.frequency) {
      query = query.eq('frequency', filter.frequency);
    }

    const { data, error } = await query;
    assertNoError(error);
    return ((data ?? []) as VOCRow[]).map(toVOC);
  }

  async findAll(filter?: Record<string, unknown>): Promise<VOC[]> {
    const query = applyEqFilters(
      this.client.from(TABLE).select('*').order('created_at', { ascending: false }),
      filter,
    );
    const { data, error } = await query;
    assertNoError(error);
    return ((data ?? []) as VOCRow[]).map(toVOC);
  }

  async create(input: CreateVOCInput): Promise<VOC> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(toInsertRow(input))
      .select('*')
      .single();

    assertNoError(error);
    return toVOC(assertRow(data as VOCRow, 'VOC'));
  }

  async update(id: ID, input: UpdateVOCInput): Promise<VOC> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(toUpdateRow(input))
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toVOC(assertRow(data as VOCRow, 'VOC'));
  }

  async delete(id: ID): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq('id', id);
    assertNoError(error);
  }

  async exists(id: ID): Promise<boolean> {
    return (await this.findById(id)) !== null;
  }

  async count(filter?: Record<string, unknown>): Promise<number> {
    const query = applyEqFilters(
      this.client.from(TABLE).select('*', { count: 'exact', head: true }),
      filter,
    );
    const { count, error } = await query;
    assertNoError(error);
    return count ?? 0;
  }
}
