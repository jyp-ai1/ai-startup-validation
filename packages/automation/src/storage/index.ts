import type { JobResult, JobStoragePort } from '../types';

/** In-memory job result storage — replace with @repo/db in production. */
export class InMemoryJobStorage implements JobStoragePort {
  private readonly results = new Map<string, JobResult>();
  private readonly byJob = new Map<string, string[]>();

  async saveResult(result: JobResult): Promise<void> {
    this.results.set(result.runId, result);
    const list = this.byJob.get(result.jobId) ?? [];
    list.push(result.runId);
    this.byJob.set(result.jobId, list);
  }

  async getResult(runId: string): Promise<JobResult | undefined> {
    return this.results.get(runId);
  }

  async listResults(jobId: string, limit = 50): Promise<JobResult[]> {
    const runIds = this.byJob.get(jobId) ?? [];
    return runIds
      .slice(-limit)
      .map((id) => this.results.get(id)!)
      .filter(Boolean);
  }
}

export const jobStorage = new InMemoryJobStorage();
export type { JobStoragePort } from '../types';
