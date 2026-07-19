import type { BaseRepository } from '@repo/core/repository';
import type { ID } from '@repo/types';
import type {
  CreateValidationScoreInput,
  UpdateValidationScoreInput,
  ValidationScore,
} from '@repo/types/validation';

import { getServiceClient } from '../adapters/supabase/service';
import {
  applyEqFilters,
  assertNoError,
  assertRow,
  type SupabaseClient,
} from '../adapters/supabase/repositories/repository.utils';

const TABLE = 'validation_scores';

type ValidationScoreRow = {
  id: string;
  project_id: string;
  market_score: number;
  problem_score: number;
  competition_score: number;
  business_model_score: number;
  execution_score: number;
  founder_fit_score: number;
  total_score: number;
  decision: ValidationScore['decision'];
  comment: string | null;
  created_at: string;
  updated_at: string;
};

function toValidationScore(row: ValidationScoreRow): ValidationScore {
  return {
    id: row.id,
    projectId: row.project_id,
    marketScore: row.market_score,
    problemScore: row.problem_score,
    competitionScore: row.competition_score,
    businessModelScore: row.business_model_score,
    executionScore: row.execution_score,
    founderFitScore: row.founder_fit_score,
    totalScore: row.total_score,
    decision: row.decision,
    comment: row.comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsertRow(
  input: CreateValidationScoreInput & {
    totalScore: number;
    decision: ValidationScore['decision'];
  },
) {
  return {
    project_id: input.projectId,
    market_score: input.marketScore,
    problem_score: input.problemScore,
    competition_score: input.competitionScore,
    business_model_score: input.businessModelScore,
    execution_score: input.executionScore,
    founder_fit_score: input.founderFitScore,
    total_score: input.totalScore,
    decision: input.decision,
    comment: input.comment ?? null,
  };
}

function toUpdateRow(
  input: UpdateValidationScoreInput & {
    totalScore?: number;
    decision?: ValidationScore['decision'];
  },
) {
  return {
    ...(input.marketScore !== undefined ? { market_score: input.marketScore } : {}),
    ...(input.problemScore !== undefined ? { problem_score: input.problemScore } : {}),
    ...(input.competitionScore !== undefined
      ? { competition_score: input.competitionScore }
      : {}),
    ...(input.businessModelScore !== undefined
      ? { business_model_score: input.businessModelScore }
      : {}),
    ...(input.executionScore !== undefined
      ? { execution_score: input.executionScore }
      : {}),
    ...(input.founderFitScore !== undefined
      ? { founder_fit_score: input.founderFitScore }
      : {}),
    ...(input.totalScore !== undefined ? { total_score: input.totalScore } : {}),
    ...(input.decision !== undefined ? { decision: input.decision } : {}),
    ...(input.comment !== undefined ? { comment: input.comment } : {}),
    updated_at: new Date().toISOString(),
  };
}

export type ValidationScoreRepository = BaseRepository<
  ValidationScore,
  CreateValidationScoreInput & { totalScore: number; decision: ValidationScore['decision'] },
  UpdateValidationScoreInput & {
    totalScore?: number;
    decision?: ValidationScore['decision'];
  }
> & {
  findByProjectId(projectId: ID): Promise<ValidationScore[]>;
  findLatestByProjectId(projectId: ID): Promise<ValidationScore | null>;
};

/** Supabase adapter for validation_scores table. */
export class SupabaseValidationScoreRepository implements ValidationScoreRepository {
  private clientInstance: SupabaseClient | null = null;

  constructor(private readonly clientOverride?: SupabaseClient) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  async findById(id: ID): Promise<ValidationScore | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    assertNoError(error);
    return data ? toValidationScore(data as ValidationScoreRow) : null;
  }

  async findByProjectId(projectId: ID): Promise<ValidationScore[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    assertNoError(error);
    return ((data ?? []) as ValidationScoreRow[]).map(toValidationScore);
  }

  async findLatestByProjectId(projectId: ID): Promise<ValidationScore | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    assertNoError(error);
    return data ? toValidationScore(data as ValidationScoreRow) : null;
  }

  async findAll(filter?: Record<string, unknown>): Promise<ValidationScore[]> {
    const query = applyEqFilters(
      this.client.from(TABLE).select('*').order('created_at', { ascending: false }),
      filter,
    );
    const { data, error } = await query;
    assertNoError(error);
    return ((data ?? []) as ValidationScoreRow[]).map(toValidationScore);
  }

  async create(
    input: CreateValidationScoreInput & {
      totalScore: number;
      decision: ValidationScore['decision'];
    },
  ): Promise<ValidationScore> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(toInsertRow(input))
      .select('*')
      .single();

    assertNoError(error);
    return toValidationScore(
      assertRow(data as ValidationScoreRow, 'ValidationScore'),
    );
  }

  async update(
    id: ID,
    input: UpdateValidationScoreInput & {
      totalScore?: number;
      decision?: ValidationScore['decision'];
    },
  ): Promise<ValidationScore> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(toUpdateRow(input))
      .eq('id', id)
      .select('*')
      .single();

    assertNoError(error);
    return toValidationScore(
      assertRow(data as ValidationScoreRow, 'ValidationScore'),
    );
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
