'use server';

import { revalidatePath } from 'next/cache';

import { BaseError } from '@repo/core/errors';
import {
  generateValidationReportFromContext,
  isAIConfigured,
  resolveAIModel,
  resolveAIProvider,
} from '@repo/ai/validation';
import { isSupabaseConfigured } from '@repo/db';
import type { AIReportGeneration } from '@repo/types/validation';

import { findReportWithSections } from '@/features/reports/services/report-service';
import {
  getAIReportGenerationRepository,
  getReportSectionRepository,
  getValidationReportRepository,
} from '@/lib/db/platform';

import { collectValidationContext } from '../services/context-collector';
import { findLatestGeneration } from '../services/generation-service';

export type AIReportActionState = {
  error?: string;
  success?: boolean;
  generationId?: string;
  usedMock?: boolean;
};

function reportPaths(projectId: string, reportId: string) {
  const base = `/projects/${projectId}/reports/${reportId}`;
  return { detail: base, preview: `${base}/preview`, list: `/projects/${projectId}/reports` };
}

function mapError(error: unknown): string {
  if (error instanceof BaseError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'AI report generation failed';
}

export async function getGenerationStatus(
  reportId: string,
): Promise<AIReportGeneration | null> {
  return findLatestGeneration(reportId);
}

export async function generateValidationReport(
  projectId: string,
  reportId: string,
): Promise<AIReportActionState> {
  if (!isSupabaseConfigured()) {
    return {
      error: 'Database is not configured. Add Supabase environment variables and run migrations.',
    };
  }

  const report = await findReportWithSections(projectId, reportId);
  if (!report) {
    return { error: 'Report not found' };
  }

  const context = await collectValidationContext(projectId);
  if (!context) {
    return { error: 'Project not found' };
  }

  const generationRepo = getAIReportGenerationRepository();
  const expectedProvider = isAIConfigured() ? resolveAIProvider() : 'mock';
  const expectedModel = isAIConfigured()
    ? resolveAIModel(resolveAIProvider())
    : 'context-template';

  const generation = await generationRepo.create({
    projectId,
    reportId,
    provider: expectedProvider,
    model: expectedModel,
    status: 'PROCESSING',
  });

  try {
    const result = await generateValidationReportFromContext(context);

    const reportRepo = getValidationReportRepository();
    const sectionRepo = getReportSectionRepository();

    await reportRepo.update(reportId, {
      summary: result.output.summary,
      status: 'IN_PROGRESS',
    });

    const sectionByType = new Map(
      report.sections.map((section) => [section.sectionType, section]),
    );

    for (const aiSection of result.output.sections) {
      const existing = sectionByType.get(aiSection.type);
      if (existing) {
        await sectionRepo.update(existing.id, {
          title: aiSection.title,
          content: aiSection.content,
        });
      }
    }

    await generationRepo.update(generation.id, {
      status: 'COMPLETED',
      errorMessage: null,
      provider: result.provider,
      model: result.model,
    });

    const paths = reportPaths(projectId, reportId);
    revalidatePath(paths.detail);
    revalidatePath(paths.preview);
    revalidatePath(paths.list);

    return {
      success: true,
      generationId: generation.id,
      usedMock: result.usedMock,
    };
  } catch (error) {
    const message = mapError(error);
    await generationRepo.update(generation.id, {
      status: 'FAILED',
      errorMessage: message,
    });

    return { error: message, generationId: generation.id };
  }
}
