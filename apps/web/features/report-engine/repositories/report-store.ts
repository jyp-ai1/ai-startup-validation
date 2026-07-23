import type { ExecutiveReport, ExportJob } from '../types/report-types';

type StoreState = {
  reports: Map<string, ExecutiveReport>;
  reportsByProject: Map<string, string>;
  exportJobs: Map<string, ExportJob>;
};

const STORE_KEY = '__launchlens_report_engine_store__';

function getStore(): StoreState {
  const g = globalThis as typeof globalThis & { [STORE_KEY]?: StoreState };
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = {
      reports: new Map(),
      reportsByProject: new Map(),
      exportJobs: new Map(),
    };
  }
  return g[STORE_KEY]!;
}

export async function saveReport(report: ExecutiveReport): Promise<void> {
  getStore().reports.set(report.id, structuredClone(report));
  getStore().reportsByProject.set(report.projectId, report.id);
}

export async function updateReport(report: ExecutiveReport): Promise<void> {
  getStore().reports.set(report.id, structuredClone(report));
}

export async function getReport(id: string): Promise<ExecutiveReport | null> {
  const report = getStore().reports.get(id);
  return report ? structuredClone(report) : null;
}

export async function getReportByProject(projectId: string): Promise<ExecutiveReport | null> {
  const id = getStore().reportsByProject.get(projectId);
  if (!id) return null;
  return getReport(id);
}

export async function saveExportJob(job: ExportJob): Promise<void> {
  getStore().exportJobs.set(job.id, structuredClone(job));
}

export async function updateExportJob(job: ExportJob): Promise<void> {
  getStore().exportJobs.set(job.id, structuredClone(job));
}

export async function getExportJob(id: string): Promise<ExportJob | null> {
  const job = getStore().exportJobs.get(id);
  return job ? structuredClone(job) : null;
}

export async function listExportJobsForReport(reportId: string): Promise<ExportJob[]> {
  return [...getStore().exportJobs.values()]
    .filter((j) => j.reportId === reportId)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
    .map((j) => structuredClone(j));
}
