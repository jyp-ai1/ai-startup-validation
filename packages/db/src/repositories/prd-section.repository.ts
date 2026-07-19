import type { BaseRepository } from '@repo/core/repository';
import type { ID } from '@repo/types';
import type {
  CreatePRDSectionInput,
  PRDSection,
  UpdatePRDSectionInput,
} from '@repo/types/validation';

import { getServiceClient } from '../adapters/supabase/service';
import {
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'prd_sections';

type PRDSectionRow = {
  id: string;
  prd_id: string;
  section_type: PRDSection['sectionType'];
  title: string;
  content: string;
  section_order: number;
  created_at: string;
  updated_at: string;
};

function toPRDSection(row: PRDSectionRow): PRDSection {
  return {
    id: row.id,
    prdId: row.prd_id,
    sectionType: row.section_type,
    title: row.title,
    content: row.content,
    order: row.section_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsertRow(input: CreatePRDSectionInput) {
  return {
    prd_id: input.prdId,
    section_type: input.sectionType,
    title: input.title,
    content: input.content ?? '',
    section_order: input.order,
  };
}

function toUpdateRow(input: UpdatePRDSectionInput) {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.content !== undefined ? { content: input.content } : {}),
    ...(input.order !== undefined ? { section_order: input.order } : {}),
    updated_at: new Date().toISOString(),
  };
}

export type PRDSectionRepository = BaseRepository<
  PRDSection,
  CreatePRDSectionInput,
  UpdatePRDSectionInput
> & {
  findByPRDId(prdId: ID): Promise<PRDSection[]>;
  createMany(inputs: CreatePRDSectionInput[]): Promise<PRDSection[]>;
};

export class SupabasePRDSectionRepository implements PRDSectionRepository {
  private clientInstance: SupabaseClient | null = null;

  constructor(private readonly clientOverride?: SupabaseClient) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  async findById(id: ID): Promise<PRDSection | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toPRDSection(data as PRDSectionRow) : null;
  }

  async findByPRDId(prdId: ID): Promise<PRDSection[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('prd_id', prdId)
      .order('section_order', { ascending: true });

    assertNoError(error);
    return ((data ?? []) as PRDSectionRow[]).map(toPRDSection);
  }

  async findAll(): Promise<PRDSection[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .order('section_order', { ascending: true });

    assertNoError(error);
    return ((data ?? []) as PRDSectionRow[]).map(toPRDSection);
  }

  async create(input: CreatePRDSectionInput): Promise<PRDSection> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(toInsertRow(input))
      .select('*')
      .single();

    assertNoError(error);
    return toPRDSection(assertRow(data as PRDSectionRow, 'PRDSection'));
  }

  async createMany(inputs: CreatePRDSectionInput[]): Promise<PRDSection[]> {
    if (inputs.length === 0) return [];

    const { data, error } = await this.client
      .from(TABLE)
      .insert(inputs.map(toInsertRow))
      .select('*');

    assertNoError(error);
    return ((data ?? []) as PRDSectionRow[])
      .map(toPRDSection)
      .sort((a, b) => a.order - b.order);
  }

  async update(id: ID, input: UpdatePRDSectionInput): Promise<PRDSection> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(toUpdateRow(input))
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toPRDSection(assertRow(data as PRDSectionRow, 'PRDSection'));
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
