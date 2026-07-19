import type { BaseRepository } from '@repo/core/repository';
import type { ID } from '@repo/types';
import type {
  CreateReportSectionInput,
  ReportSection,
  UpdateReportSectionInput,
} from '@repo/types/validation';

import { getServiceClient } from '../adapters/supabase/service';
import {
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'report_sections';

type ReportSectionRow = {
  id: string;
  report_id: string;
  section_type: ReportSection['sectionType'];
  title: string;
  content: string;
  section_order: number;
  created_at: string;
  updated_at: string;
};

function toReportSection(row: ReportSectionRow): ReportSection {
  return {
    id: row.id,
    reportId: row.report_id,
    sectionType: row.section_type,
    title: row.title,
    content: row.content,
    order: row.section_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsertRow(input: CreateReportSectionInput) {
  return {
    report_id: input.reportId,
    section_type: input.sectionType,
    title: input.title,
    content: input.content ?? '',
    section_order: input.order,
  };
}

function toUpdateRow(input: UpdateReportSectionInput) {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.content !== undefined ? { content: input.content } : {}),
    ...(input.order !== undefined ? { section_order: input.order } : {}),
    updated_at: new Date().toISOString(),
  };
}

export type ReportSectionRepository = BaseRepository<
  ReportSection,
  CreateReportSectionInput,
  UpdateReportSectionInput
> & {
  findByReportId(reportId: ID): Promise<ReportSection[]>;
  createMany(inputs: CreateReportSectionInput[]): Promise<ReportSection[]>;
  reorder(reportId: ID, orderedSectionIds: ID[]): Promise<ReportSection[]>;
};

/** Supabase adapter for report_sections table. */
export class SupabaseReportSectionRepository implements ReportSectionRepository {
  private clientInstance: SupabaseClient | null = null;

  constructor(private readonly clientOverride?: SupabaseClient) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  async findById(id: ID): Promise<ReportSection | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toReportSection(data as ReportSectionRow) : null;
  }

  async findByReportId(reportId: ID): Promise<ReportSection[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('report_id', reportId)
      .order('section_order', { ascending: true });

    assertNoError(error);
    return ((data ?? []) as ReportSectionRow[]).map(toReportSection);
  }

  async findAll(): Promise<ReportSection[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .order('section_order', { ascending: true });

    assertNoError(error);
    return ((data ?? []) as ReportSectionRow[]).map(toReportSection);
  }

  async create(input: CreateReportSectionInput): Promise<ReportSection> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(toInsertRow(input))
      .select('*')
      .single();

    assertNoError(error);
    return toReportSection(assertRow(data as ReportSectionRow, 'ReportSection'));
  }

  async createMany(inputs: CreateReportSectionInput[]): Promise<ReportSection[]> {
    if (inputs.length === 0) return [];

    const { data, error } = await this.client
      .from(TABLE)
      .insert(inputs.map(toInsertRow))
      .select('*');

    assertNoError(error);
    return ((data ?? []) as ReportSectionRow[])
      .map(toReportSection)
      .sort((a, b) => a.order - b.order);
  }

  async update(id: ID, input: UpdateReportSectionInput): Promise<ReportSection> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(toUpdateRow(input))
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toReportSection(assertRow(data as ReportSectionRow, 'ReportSection'));
  }

  async reorder(reportId: ID, orderedSectionIds: ID[]): Promise<ReportSection[]> {
    const updates = orderedSectionIds.map((sectionId, index) =>
      this.client
        .from(TABLE)
        .update({
          section_order: index + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sectionId)
        .eq('report_id', reportId),
    );

    const results = await Promise.all(updates);
    for (const { error } of results) {
      assertNoError(error);
    }

    return this.findByReportId(reportId);
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
