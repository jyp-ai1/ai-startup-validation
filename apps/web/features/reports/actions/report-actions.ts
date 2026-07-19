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
import type {
  ReportSection,
  ValidationReport,
  ValidationReportWithSections,
} from '@repo/types/validation';

import { findStartupProject } from '@/features/projects/services/project-service';
import {
  getReportSectionRepository,
  getValidationReportRepository,
} from '@/lib/db/platform';

import {
  createReportSchema,
  formDataToObject,
  reorderSectionsSchema,
  updateReportSchema,
  updateReportSectionSchema,
} from '../schemas/report-schema';
import {
  findReport,
  findReportSectionById,
  findReportWithSections,
  listReports,
} from '../services/report-service';
import { DEFAULT_REPORT_SECTIONS } from '../utils/default-sections';

export type ReportActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  saved?: boolean;
};

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function mapValidationError(error: ValidationError): ReportActionState {
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

function reportPaths(projectId: string, reportId?: string) {
  const base = `/projects/${projectId}/reports`;
  return {
    list: base,
    detail: reportId ? `${base}/${reportId}` : base,
    preview: reportId ? `${base}/${reportId}/preview` : base,
    new: `${base}/new`,
  };
}

async function assertProjectExists(projectId: string): Promise<void> {
  const project = await findStartupProject(projectId);
  if (!project) {
    throw new NotFoundError(`Startup project not found: ${projectId}`);
  }
}

async function assertReportBelongsToProject(
  projectId: string,
  reportId: string,
): Promise<ValidationReport> {
  const report = await findReport(reportId);
  if (!report || report.projectId !== projectId) {
    throw new NotFoundError(`Report not found: ${reportId}`);
  }
  return report;
}

function revalidateReportPaths(projectId: string, reportId: string): void {
  const paths = reportPaths(projectId, reportId);
  revalidatePath(paths.list);
  revalidatePath(paths.detail);
  revalidatePath(paths.preview);
  revalidatePath(`/projects/${projectId}`);
}

export async function getReportList(projectId: string): Promise<ValidationReport[]> {
  return listReports(projectId);
}

export async function getReportDetail(
  projectId: string,
  reportId: string,
): Promise<ValidationReportWithSections | null> {
  return findReportWithSections(projectId, reportId);
}

export async function createReport(
  projectId: string,
  _prevState: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  try {
    assertDbConfigured();
    await assertProjectExists(projectId);

    const raw = formDataToObject(formData);
    const parsed = parseWithSchema(createReportSchema, { title: raw.title });

    const reportRepo = getValidationReportRepository();
    const sectionRepo = getReportSectionRepository();

    const report = await reportRepo.create({
      projectId,
      title: parsed.title,
      status: 'DRAFT',
    });

    await sectionRepo.createMany(
      DEFAULT_REPORT_SECTIONS.map((section) => ({
        reportId: report.id,
        sectionType: section.sectionType,
        title: section.title,
        content: '',
        order: section.order,
      })),
    );

    const paths = reportPaths(projectId, report.id);
    revalidatePath(paths.list);
    revalidatePath(`/projects/${projectId}`);
    redirect(paths.detail);
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function updateReport(
  projectId: string,
  reportId: string,
  _prevState: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  try {
    assertDbConfigured();
    await assertReportBelongsToProject(projectId, reportId);

    const raw = formDataToObject(formData);
    const parsed = parseWithSchema(updateReportSchema, {
      title: raw.title || undefined,
      status: raw.status || undefined,
      summary: raw.summary !== undefined ? emptyToNull(raw.summary) : undefined,
    });

    const repo = getValidationReportRepository();
    await repo.update(reportId, parsed);

    revalidateReportPaths(projectId, reportId);
    redirect(reportPaths(projectId, reportId).detail);
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function deleteReport(
  projectId: string,
  reportId: string,
): Promise<void> {
  assertDbConfigured();
  await assertReportBelongsToProject(projectId, reportId);

  const repo = getValidationReportRepository();
  await repo.delete(reportId);

  revalidatePath(reportPaths(projectId).list);
  revalidatePath(`/projects/${projectId}`);
  redirect(reportPaths(projectId).list);
}

export async function createReportSections(
  reportId: string,
  sections: Array<{
    sectionType: ReportSection['sectionType'];
    title: string;
    content?: string;
    order: number;
  }>,
): Promise<ReportSection[]> {
  assertDbConfigured();

  const sectionRepo = getReportSectionRepository();
  return sectionRepo.createMany(
    sections.map((section) => ({
      reportId,
      sectionType: section.sectionType,
      title: section.title,
      content: section.content ?? '',
      order: section.order,
    })),
  );
}

export async function updateReportSection(
  projectId: string,
  reportId: string,
  sectionId: string,
  _prevState: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  try {
    assertDbConfigured();
    await assertReportBelongsToProject(projectId, reportId);

    const existing = await findReportSectionById(sectionId);
    if (!existing || existing.reportId !== reportId) {
      throw new NotFoundError(`Report section not found: ${sectionId}`);
    }

    const raw = formDataToObject(formData);
    const parsed = parseWithSchema(updateReportSectionSchema, {
      title: raw.title,
      content: raw.content ?? '',
    });

    const repo = getReportSectionRepository();
    await repo.update(sectionId, parsed);

    revalidateReportPaths(projectId, reportId);
    return { saved: true };
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function reorderSections(
  projectId: string,
  reportId: string,
  orderedSectionIds: string[],
): Promise<ReportActionState> {
  try {
    assertDbConfigured();
    await assertReportBelongsToProject(projectId, reportId);

    const parsed = parseWithSchema(reorderSectionsSchema, {
      sectionIds: orderedSectionIds,
    });

    const repo = getReportSectionRepository();
    await repo.reorder(reportId, parsed.sectionIds);

    revalidateReportPaths(projectId, reportId);
    return {};
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function moveSectionUp(
  projectId: string,
  reportId: string,
  sectionId: string,
): Promise<void> {
  assertDbConfigured();
  await assertReportBelongsToProject(projectId, reportId);

  const repo = getReportSectionRepository();
  const sections = await repo.findByReportId(reportId);
  const index = sections.findIndex((section) => section.id === sectionId);

  if (index <= 0) return;

  const reordered = [...sections];
  const [current] = reordered.splice(index, 1);
  reordered.splice(index - 1, 0, current!);

  await repo.reorder(
    reportId,
    reordered.map((section) => section.id),
  );
  revalidateReportPaths(projectId, reportId);
}

export async function moveSectionDown(
  projectId: string,
  reportId: string,
  sectionId: string,
): Promise<void> {
  assertDbConfigured();
  await assertReportBelongsToProject(projectId, reportId);

  const repo = getReportSectionRepository();
  const sections = await repo.findByReportId(reportId);
  const index = sections.findIndex((section) => section.id === sectionId);

  if (index < 0 || index >= sections.length - 1) return;

  const reordered = [...sections];
  const [current] = reordered.splice(index, 1);
  reordered.splice(index + 1, 0, current!);

  await repo.reorder(
    reportId,
    reordered.map((section) => section.id),
  );
  revalidateReportPaths(projectId, reportId);
}
