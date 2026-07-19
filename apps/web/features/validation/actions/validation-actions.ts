'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  InternalServerError,
  NotFoundError,
  ValidationError,
} from '@repo/core/errors';
import { parseWithSchema } from '@repo/core/validation';
import { isSupabaseConfigured } from '@repo/db';
import type { ValidationScore } from '@repo/types/validation';

import { findStartupProject } from '@/features/projects/services/project-service';
import { getValidationScoreRepository } from '@/lib/db/platform';

import {
  createValidationScoreSchema,
  formDataToObject,
  updateValidationScoreSchema,
} from '../schemas/validation-schema';
import {
  findLatestValidationScore,
  findValidationScoreById,
  listValidationScores,
} from '../services/validation-service';
import {
  calculateDecision,
  calculateTotalScore,
} from '../utils/score-calculator';

export type ValidationActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function mapValidationError(error: ValidationError): ValidationActionState {
  return {
    error: error.message,
    fieldErrors: error.details as Record<string, string[]> | undefined,
  };
}

function assertDbConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new InternalServerError(
      'Database is not configured. Add Supabase environment variables and run migrations.',
    );
  }
}

function validationPaths(projectId: string) {
  const base = `/projects/${projectId}/validation`;
  return {
    dashboard: base,
    history: `${base}/history`,
    summary: `${base}/summary`,
    new: `${base}/new`,
  };
}

async function assertProjectExists(projectId: string): Promise<void> {
  const project = await findStartupProject(projectId);
  if (!project) {
    throw new NotFoundError(`Startup project not found: ${projectId}`);
  }
}

function parseFormScores(raw: Record<string, string>) {
  return {
    marketScore: raw.marketScore,
    problemScore: raw.problemScore,
    competitionScore: raw.competitionScore,
    businessModelScore: raw.businessModelScore,
    executionScore: raw.executionScore,
    founderFitScore: raw.founderFitScore,
    comment: emptyToNull(raw.comment),
  };
}

function withComputedTotals<T extends {
  marketScore: number;
  problemScore: number;
  competitionScore: number;
  businessModelScore: number;
  executionScore: number;
  founderFitScore: number;
}>(scores: T) {
  const totalScore = calculateTotalScore(scores);
  const decision = calculateDecision(totalScore);
  return { ...scores, totalScore, decision };
}

export async function getValidationScore(
  projectId: string,
): Promise<ValidationScore | null> {
  const score = await findLatestValidationScore(projectId);
  if (!score || score.projectId !== projectId) {
    return null;
  }
  return score;
}

export async function getValidationHistory(
  projectId: string,
): Promise<ValidationScore[]> {
  return listValidationScores(projectId);
}

export async function createValidationScore(
  projectId: string,
  _prevState: ValidationActionState,
  formData: FormData,
): Promise<ValidationActionState> {
  try {
    assertDbConfigured();
    await assertProjectExists(projectId);

    const raw = formDataToObject(formData);
    const parsed = parseWithSchema(createValidationScoreSchema, parseFormScores(raw));
    const computed = withComputedTotals(parsed);

    const repo = getValidationScoreRepository();
    await repo.create({
      projectId,
      ...computed,
    });

    const paths = validationPaths(projectId);
    revalidatePath(paths.dashboard);
    revalidatePath(paths.history);
    revalidatePath(paths.summary);
    revalidatePath(`/projects/${projectId}`);
    redirect(paths.dashboard);
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function updateValidationScore(
  projectId: string,
  scoreId: string,
  _prevState: ValidationActionState,
  formData: FormData,
): Promise<ValidationActionState> {
  try {
    assertDbConfigured();
    await assertProjectExists(projectId);

    const existing = await findValidationScoreById(scoreId);
    if (!existing || existing.projectId !== projectId) {
      throw new NotFoundError(`Validation score not found: ${scoreId}`);
    }

    const raw = formDataToObject(formData);
    const parsed = parseWithSchema(updateValidationScoreSchema, parseFormScores(raw));

    const merged = {
      marketScore: parsed.marketScore ?? existing.marketScore,
      problemScore: parsed.problemScore ?? existing.problemScore,
      competitionScore: parsed.competitionScore ?? existing.competitionScore,
      businessModelScore: parsed.businessModelScore ?? existing.businessModelScore,
      executionScore: parsed.executionScore ?? existing.executionScore,
      founderFitScore: parsed.founderFitScore ?? existing.founderFitScore,
      comment: parsed.comment !== undefined ? parsed.comment : existing.comment,
    };

    const computed = withComputedTotals(merged);

    const repo = getValidationScoreRepository();
    await repo.update(scoreId, computed);

    const paths = validationPaths(projectId);
    revalidatePath(paths.dashboard);
    revalidatePath(paths.history);
    revalidatePath(paths.summary);
    redirect(paths.dashboard);
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}
