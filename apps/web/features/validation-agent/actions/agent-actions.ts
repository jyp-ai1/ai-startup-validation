'use server';

import { generateValidationAgentResponse } from '@repo/ai/validation';
import { BaseError, InternalServerError, ValidationError } from '@repo/core/errors';
import { parseWithSchema } from '@repo/core/validation';
import { isSupabaseConfigured } from '@repo/db';
import type { ValidationAgentOutput } from '@repo/types/validation';

import { findStartupProject } from '@/features/projects/services/project-service';

import {
  askValidationAgentSchema,
  formDataToObject,
} from '../schemas/agent-schema';
import { collectValidationAgentContext } from '../services/context-collector';

export type ValidationAgentActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  output?: ValidationAgentOutput;
  usedMock?: boolean;
};

function mapValidationError(error: ValidationError): ValidationAgentActionState {
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

async function assertProjectExists(projectId: string): Promise<void> {
  const project = await findStartupProject(projectId);
  if (!project) {
    throw new InternalServerError(`Startup project not found: ${projectId}`);
  }
}

export async function askValidationAgent(
  projectId: string,
  _prevState: ValidationAgentActionState,
  formData: FormData,
): Promise<ValidationAgentActionState> {
  try {
    assertDbConfigured();
    await assertProjectExists(projectId);

    const raw = formDataToObject(formData);
    const parsed = parseWithSchema(askValidationAgentSchema, { question: raw.question });

    const context = await collectValidationAgentContext(projectId, parsed.question);
    if (!context) {
      return { error: 'Project not found' };
    }

    const result = await generateValidationAgentResponse(context);

    return {
      success: true,
      output: result.output,
      usedMock: result.usedMock,
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    if (error instanceof BaseError) {
      return { error: error.message };
    }
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'Validation agent request failed' };
  }
}
