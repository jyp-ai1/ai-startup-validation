import { randomUUID } from 'crypto';

import type { ExecutiveReport, ExportFormat, ExportJob, ExportProvider } from '../types/report-types';
import { getExportJob, saveExportJob, updateExportJob, updateReport } from '../repositories/report-store';
import { mockDocxProvider } from './providers/docx-provider';
import { mockPdfProvider } from './providers/pdf-provider';
import { mockPptxProvider } from './providers/pptx-provider';

const PROVIDERS: Record<ExportFormat, ExportProvider> = {
  PDF: mockPdfProvider,
  PPTX: mockPptxProvider,
  DOCX: mockDocxProvider,
};

export function getExportProvider(format: ExportFormat): ExportProvider {
  return PROVIDERS[format];
}

/** Queue-based export — REQUESTED → GENERATING → COMPLETED */
export async function enqueueExport(
  report: ExecutiveReport,
  format: ExportFormat,
): Promise<ExportJob> {
  const job: ExportJob = {
    id: randomUUID(),
    reportId: report.id,
    format,
    status: 'REQUESTED',
    requestedAt: new Date().toISOString(),
    completedAt: null,
    downloadUrl: null,
    fileName: null,
    errorMessage: null,
  };

  await saveExportJob(job);
  processExportJob(job.id, report).catch(() => undefined);
  return job;
}

async function processExportJob(jobId: string, report: ExecutiveReport): Promise<ExportJob | null> {
  let job = await getExportJob(jobId);
  if (!job) return null;

  job = { ...job, status: 'GENERATING' };
  await updateExportJob(job);

  try {
    const provider = getExportProvider(job.format);
    const result = await provider.generate(report);

    job = {
      ...job,
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      downloadUrl: result.downloadUrl,
      fileName: result.fileName,
    };

    await updateReport({
      ...report,
      review: { ...report.review, status: 'EXPORTED' },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    job = {
      ...job,
      status: 'FAILED',
      completedAt: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : 'Export failed',
    };
  }

  await updateExportJob(job);
  return job;
}

export async function pollExportJob(jobId: string): Promise<ExportJob | null> {
  return getExportJob(jobId);
}
