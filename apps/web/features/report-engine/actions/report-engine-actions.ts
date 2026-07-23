'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';

import { getLatestPlan } from '@/features/agents/orchestrator';
import { buildProjectDashboardStats } from '@/features/dashboard/services/dashboard-service';
import { generateProjectDecision } from '@/features/decision';
import { buildExecutiveWorkspace } from '@/features/executive';
import { getProject } from '@/features/projects/actions/project-actions';

import { enqueueExport, pollExportJob } from '../export/export-queue';
import { reportBuilder } from '../report-builder/report-builder';
import type { ReportBuildContext } from '../report-builder/report-build-context';
import {
  getReport,
  getReportByProject,
  listExportJobsForReport,
  updateReport,
} from '../repositories/report-store';
import type { ExportFormat, ReportSectionId, ReportTemplateId } from '../types/report-types';

async function buildContext(projectId: string): Promise<ReportBuildContext | null> {
  const project = await getProject(projectId);
  const stats = await buildProjectDashboardStats(projectId);
  const decision = await generateProjectDecision(projectId);
  if (!project || !stats || !decision) return null;

  const orchestratorPlan = await getLatestPlan(projectId);
  const workspace = buildExecutiveWorkspace(project, stats, decision, orchestratorPlan);
  const locale = await getLocale();

  return {
    workspace,
    decision,
    orchestratorPlan,
    locale: locale as ReportBuildContext['locale'],
  };
}

export async function generateExecutiveReport(projectId: string) {
  const project = await getProject(projectId);
  const ctx = await buildContext(projectId);
  if (!project || !ctx) return { error: 'Unable to build report context' };

  const report = await reportBuilder.generateAndSave(
    {
      projectId,
      projectTitle: project.title,
      projectType: project.projectType,
      language: ctx.locale,
    },
    ctx,
  );

  revalidatePath(`/projects/${projectId}/executive-report`);
  revalidatePath('/dashboard');
  return { reportId: report.id };
}

export async function getExecutiveReport(projectId: string) {
  return getReportByProject(projectId);
}

export async function reorderReportSectionsAction(
  reportId: string,
  projectId: string,
  orderedIds: ReportSectionId[],
) {
  const report = await getReport(reportId);
  const ctx = await buildContext(projectId);
  if (!report || !ctx) return { error: 'Report not found' };

  const updated = reportBuilder.reorderReportSections(report, orderedIds);
  await updateReport(updated);
  revalidatePath(`/projects/${projectId}/executive-report`);
  return { success: true };
}

export async function changeReportTemplateAction(
  reportId: string,
  projectId: string,
  templateId: ReportTemplateId,
) {
  const report = await getReport(reportId);
  const ctx = await buildContext(projectId);
  if (!report || !ctx) return { error: 'Report not found' };

  const updated = reportBuilder.changeTemplate(report, templateId, ctx);
  await updateReport(updated);
  revalidatePath(`/projects/${projectId}/executive-report`);
  return { success: true };
}

export async function approveReportAction(reportId: string, projectId: string) {
  const report = await getReport(reportId);
  if (!report) return { error: 'Report not found' };

  const updated = reportBuilder.approveReport(report);
  await updateReport(updated);
  revalidatePath(`/projects/${projectId}/executive-report`);
  return { success: true };
}

export async function resolveReviewCommentAction(
  reportId: string,
  projectId: string,
  commentId: string,
) {
  const report = await getReport(reportId);
  if (!report) return { error: 'Report not found' };

  const updated = reportBuilder.resolveComment(report, commentId);
  await updateReport(updated);
  revalidatePath(`/projects/${projectId}/executive-report`);
  return { success: true };
}

export async function requestReportExportAction(
  reportId: string,
  projectId: string,
  format: ExportFormat,
) {
  const report = await getReport(reportId);
  if (!report) return { error: 'Report not found' };

  const job = await enqueueExport(report, format);
  revalidatePath(`/projects/${projectId}/executive-report`);
  return { jobId: job.id };
}

export async function getReportExportJob(jobId: string) {
  return pollExportJob(jobId);
}

export { listExportJobsForReport };
