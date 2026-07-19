import type { BaseRepository } from '@repo/core/repository';
import type { ID } from '@repo/types';
import type {
  BusinessPlanSection,
  CreateBusinessPlanSectionInput,
  UpdateBusinessPlanSectionInput,
} from '@repo/types/validation';

import { getServiceClient } from '../adapters/supabase/service';
import {
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'business_plan_sections';

type BusinessPlanSectionRow = {
  id: string;
  business_plan_id: string;
  section_type: BusinessPlanSection['sectionType'];
  title: string;
  content: string;
  section_order: number;
  created_at: string;
  updated_at: string;
};

function toBusinessPlanSection(row: BusinessPlanSectionRow): BusinessPlanSection {
  return {
    id: row.id,
    businessPlanId: row.business_plan_id,
    sectionType: row.section_type,
    title: row.title,
    content: row.content,
    order: row.section_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsertRow(input: CreateBusinessPlanSectionInput) {
  return {
    business_plan_id: input.businessPlanId,
    section_type: input.sectionType,
    title: input.title,
    content: input.content ?? '',
    section_order: input.order,
  };
}

function toUpdateRow(input: UpdateBusinessPlanSectionInput) {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.content !== undefined ? { content: input.content } : {}),
    ...(input.order !== undefined ? { section_order: input.order } : {}),
    updated_at: new Date().toISOString(),
  };
}

export type BusinessPlanSectionRepository = BaseRepository<
  BusinessPlanSection,
  CreateBusinessPlanSectionInput,
  UpdateBusinessPlanSectionInput
> & {
  findByBusinessPlanId(businessPlanId: ID): Promise<BusinessPlanSection[]>;
  createMany(inputs: CreateBusinessPlanSectionInput[]): Promise<BusinessPlanSection[]>;
  reorder(businessPlanId: ID, orderedSectionIds: ID[]): Promise<BusinessPlanSection[]>;
};

export class SupabaseBusinessPlanSectionRepository
  implements BusinessPlanSectionRepository
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

  async findById(id: ID): Promise<BusinessPlanSection | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toBusinessPlanSection(data as BusinessPlanSectionRow) : null;
  }

  async findByBusinessPlanId(businessPlanId: ID): Promise<BusinessPlanSection[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('business_plan_id', businessPlanId)
      .order('section_order', { ascending: true });

    assertNoError(error);
    return ((data ?? []) as BusinessPlanSectionRow[]).map(toBusinessPlanSection);
  }

  async findAll(): Promise<BusinessPlanSection[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .order('section_order', { ascending: true });

    assertNoError(error);
    return ((data ?? []) as BusinessPlanSectionRow[]).map(toBusinessPlanSection);
  }

  async create(input: CreateBusinessPlanSectionInput): Promise<BusinessPlanSection> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(toInsertRow(input))
      .select('*')
      .single();

    assertNoError(error);
    return toBusinessPlanSection(
      assertRow(data as BusinessPlanSectionRow, 'BusinessPlanSection'),
    );
  }

  async createMany(
    inputs: CreateBusinessPlanSectionInput[],
  ): Promise<BusinessPlanSection[]> {
    if (inputs.length === 0) return [];

    const { data, error } = await this.client
      .from(TABLE)
      .insert(inputs.map(toInsertRow))
      .select('*');

    assertNoError(error);
    return ((data ?? []) as BusinessPlanSectionRow[])
      .map(toBusinessPlanSection)
      .sort((a, b) => a.order - b.order);
  }

  async update(
    id: ID,
    input: UpdateBusinessPlanSectionInput,
  ): Promise<BusinessPlanSection> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(toUpdateRow(input))
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toBusinessPlanSection(
      assertRow(data as BusinessPlanSectionRow, 'BusinessPlanSection'),
    );
  }

  async reorder(
    businessPlanId: ID,
    orderedSectionIds: ID[],
  ): Promise<BusinessPlanSection[]> {
    const updates = orderedSectionIds.map((sectionId, index) =>
      this.client
        .from(TABLE)
        .update({
          section_order: index + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sectionId)
        .eq('business_plan_id', businessPlanId),
    );

    const results = await Promise.all(updates);
    for (const { error } of results) {
      assertNoError(error);
    }

    return this.findByBusinessPlanId(businessPlanId);
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
