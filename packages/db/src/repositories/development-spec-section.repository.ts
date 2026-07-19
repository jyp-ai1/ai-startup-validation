import type { BaseRepository } from '@repo/core/repository';
import type { ID } from '@repo/types';
import type {
  CreateDevelopmentSpecSectionInput,
  DevelopmentSpecSection,
  UpdateDevelopmentSpecSectionInput,
} from '@repo/types/validation';

import { getServiceClient } from '../adapters/supabase/service';
import {
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'development_spec_sections';

type DevelopmentSpecSectionRow = {
  id: string;
  development_spec_id: string;
  section_type: DevelopmentSpecSection['sectionType'];
  title: string;
  content: string;
  section_order: number;
  created_at: string;
  updated_at: string;
};

function toDevelopmentSpecSection(row: DevelopmentSpecSectionRow): DevelopmentSpecSection {
  return {
    id: row.id,
    developmentSpecId: row.development_spec_id,
    sectionType: row.section_type,
    title: row.title,
    content: row.content,
    order: row.section_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsertRow(input: CreateDevelopmentSpecSectionInput) {
  return {
    development_spec_id: input.developmentSpecId,
    section_type: input.sectionType,
    title: input.title,
    content: input.content ?? '',
    section_order: input.order,
  };
}

function toUpdateRow(input: UpdateDevelopmentSpecSectionInput) {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.content !== undefined ? { content: input.content } : {}),
    ...(input.order !== undefined ? { section_order: input.order } : {}),
    updated_at: new Date().toISOString(),
  };
}

export type DevelopmentSpecSectionRepository = BaseRepository<
  DevelopmentSpecSection,
  CreateDevelopmentSpecSectionInput,
  UpdateDevelopmentSpecSectionInput
> & {
  findByDevelopmentSpecId(developmentSpecId: ID): Promise<DevelopmentSpecSection[]>;
  createMany(inputs: CreateDevelopmentSpecSectionInput[]): Promise<DevelopmentSpecSection[]>;
};

export class SupabaseDevelopmentSpecSectionRepository
  implements DevelopmentSpecSectionRepository
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

  async findById(id: ID): Promise<DevelopmentSpecSection | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toDevelopmentSpecSection(data as DevelopmentSpecSectionRow) : null;
  }

  async findByDevelopmentSpecId(developmentSpecId: ID): Promise<DevelopmentSpecSection[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('development_spec_id', developmentSpecId)
      .order('section_order', { ascending: true });

    assertNoError(error);
    return ((data ?? []) as DevelopmentSpecSectionRow[]).map(toDevelopmentSpecSection);
  }

  async findAll(): Promise<DevelopmentSpecSection[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .order('section_order', { ascending: true });

    assertNoError(error);
    return ((data ?? []) as DevelopmentSpecSectionRow[]).map(toDevelopmentSpecSection);
  }

  async create(input: CreateDevelopmentSpecSectionInput): Promise<DevelopmentSpecSection> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(toInsertRow(input))
      .select('*')
      .single();

    assertNoError(error);
    return toDevelopmentSpecSection(
      assertRow(data as DevelopmentSpecSectionRow, 'DevelopmentSpecSection'),
    );
  }

  async createMany(
    inputs: CreateDevelopmentSpecSectionInput[],
  ): Promise<DevelopmentSpecSection[]> {
    if (inputs.length === 0) return [];

    const { data, error } = await this.client
      .from(TABLE)
      .insert(inputs.map(toInsertRow))
      .select('*');

    assertNoError(error);
    return ((data ?? []) as DevelopmentSpecSectionRow[])
      .map(toDevelopmentSpecSection)
      .sort((a, b) => a.order - b.order);
  }

  async update(
    id: ID,
    input: UpdateDevelopmentSpecSectionInput,
  ): Promise<DevelopmentSpecSection> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(toUpdateRow(input))
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toDevelopmentSpecSection(
      assertRow(data as DevelopmentSpecSectionRow, 'DevelopmentSpecSection'),
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
