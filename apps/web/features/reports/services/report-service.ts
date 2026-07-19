import { isSupabaseConfigured } from '@repo/db';
import type {
  ReportSection,
  ValidationReport,
  ValidationReportWithSections,
} from '@repo/types/validation';

import {
  getReportSectionRepository,
  getValidationReportRepository,
} from '@/lib/db/platform';

export async function listReports(projectId: string): Promise<ValidationReport[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const repo = getValidationReportRepository();
  return repo.findByProjectId(projectId);
}

export async function findReport(reportId: string): Promise<ValidationReport | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const repo = getValidationReportRepository();
  return repo.findById(reportId);
}

export async function findReportSections(reportId: string): Promise<ReportSection[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const repo = getReportSectionRepository();
  return repo.findByReportId(reportId);
}

export async function findReportWithSections(
  projectId: string,
  reportId: string,
): Promise<ValidationReportWithSections | null> {
  const report = await findReport(reportId);
  if (!report || report.projectId !== projectId) {
    return null;
  }

  const sections = await findReportSections(reportId);
  return { ...report, sections };
}

export async function findReportSectionById(
  sectionId: string,
): Promise<ReportSection | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const repo = getReportSectionRepository();
  return repo.findById(sectionId);
}
