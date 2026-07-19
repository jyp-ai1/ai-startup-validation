'use server';

import { revalidatePath } from 'next/cache';

import { BaseError, InternalServerError, ValidationError } from '@repo/core/errors';
import { parseWithSchema } from '@repo/core/validation';
import { isSupabaseConfigured } from '@repo/db';
import type { KnowledgeDocument, KnowledgeResult } from '@repo/types/validation';

import { findStartupProject } from '@/features/projects/services/project-service';

import { queryKnowledgeSchema, formDataToObject } from '../schemas/knowledge-schema';
import { listKnowledgeDocuments } from '../services/knowledge-service';
import {
  processProjectEvidence,
  searchProjectKnowledge,
} from '../services/knowledge-processor';

export type KnowledgeActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  processed?: number;
  created?: number;
  updated?: number;
  results?: KnowledgeResult[];
};

function mapValidationError(error: ValidationError): KnowledgeActionState {
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

function knowledgePaths(projectId: string) {
  return {
    list: `/projects/${projectId}/knowledge`,
    query: `/projects/${projectId}/knowledge/query`,
  };
}

function revalidateKnowledgePaths(projectId: string): void {
  const paths = knowledgePaths(projectId);
  revalidatePath(paths.list);
  revalidatePath(paths.query);
  revalidatePath(`/projects/${projectId}`);
}

async function assertProjectExists(projectId: string): Promise<void> {
  const project = await findStartupProject(projectId);
  if (!project) {
    throw new InternalServerError(`Startup project not found: ${projectId}`);
  }
}

export async function getKnowledgeList(projectId: string): Promise<KnowledgeDocument[]> {
  return listKnowledgeDocuments(projectId);
}

export async function createKnowledge(projectId: string): Promise<KnowledgeActionState> {
  return processEvidence(projectId);
}

export async function processEvidence(projectId: string): Promise<KnowledgeActionState> {
  if (!isSupabaseConfigured()) {
    return { error: 'Database is not configured.' };
  }

  try {
    await assertProjectExists(projectId);
    const result = await processProjectEvidence(projectId);
    revalidateKnowledgePaths(projectId);

    return {
      success: true,
      processed: result.processed,
      created: result.created,
      updated: result.updated,
    };
  } catch (error) {
    if (error instanceof BaseError) {
      return { error: error.message };
    }
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'Knowledge processing failed' };
  }
}

export async function queryKnowledge(
  projectId: string,
  _prevState: KnowledgeActionState,
  formData: FormData,
): Promise<KnowledgeActionState> {
  try {
    assertDbConfigured();
    await assertProjectExists(projectId);

    const raw = formDataToObject(formData);
    const parsed = parseWithSchema(queryKnowledgeSchema, { question: raw.question });
    const results = await searchProjectKnowledge(projectId, parsed.question);

    return { success: true, results };
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    if (error instanceof BaseError) {
      return { error: error.message };
    }
    return { error: 'Knowledge query failed' };
  }
}

export async function queryKnowledgeDirect(
  projectId: string,
  question: string,
): Promise<KnowledgeResult[]> {
  assertDbConfigured();
  await assertProjectExists(projectId);
  return searchProjectKnowledge(projectId, question);
}
