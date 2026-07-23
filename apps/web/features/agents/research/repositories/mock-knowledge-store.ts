import type {
  AgentExecutionRecord,
  AgentActivityStats,
  KnowledgeStore,
  ResearchJob,
} from '../services/research-agent-types';

type StoreState = {
  jobs: Map<string, ResearchJob>;
  executions: AgentExecutionRecord[];
  processing: boolean;
};

const STORE_KEY = '__launchlens_research_agent_store__';

function getStore(): StoreState {
  const g = globalThis as typeof globalThis & { [STORE_KEY]?: StoreState };
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = { jobs: new Map(), executions: [], processing: false };
  }
  return g[STORE_KEY]!;
}

/** Mock knowledge store — replace with vector DB in Sprint 9+. */
export class MockKnowledgeStore implements KnowledgeStore {
  async saveJob(job: ResearchJob): Promise<void> {
    getStore().jobs.set(job.id, structuredClone(job));
  }

  async updateJob(job: ResearchJob): Promise<void> {
    getStore().jobs.set(job.id, structuredClone(job));
  }

  async getJob(id: string): Promise<ResearchJob | null> {
    const job = getStore().jobs.get(id);
    return job ? structuredClone(job) : null;
  }

  async listJobsByProject(projectId: string): Promise<ResearchJob[]> {
    return [...getStore().jobs.values()]
      .filter((j) => j.request.projectId === projectId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .map((j) => structuredClone(j));
  }

  async listRecentJobs(limit = 10): Promise<ResearchJob[]> {
    return [...getStore().jobs.values()]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit)
      .map((j) => structuredClone(j));
  }

  async saveExecution(record: AgentExecutionRecord): Promise<void> {
    getStore().executions.unshift(structuredClone(record));
    if (getStore().executions.length > 200) {
      getStore().executions.length = 200;
    }
  }

  async listExecutionsByProject(projectId: string): Promise<AgentExecutionRecord[]> {
    return getStore()
      .executions.filter((e) => e.projectId === projectId)
      .map((e) => structuredClone(e));
  }

  async getActivityStats(): Promise<AgentActivityStats> {
    const jobs = [...getStore().jobs.values()];
    const running = jobs.filter(
      (j) => j.state !== 'COMPLETED' && j.state !== 'FAILED',
    );
    const completed = jobs.filter((j) => j.state === 'COMPLETED');
    const recent = completed.slice(0, 5);
    const durations = completed
      .map((j) => j.durationMs)
      .filter((d): d is number => d !== null);
    const avgDurationMs =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    return {
      runningCount: running.length,
      recentCompleted: completed.length,
      avgDurationMs,
      recentJobs: jobs
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, 5)
        .map((j) => structuredClone(j)),
    };
  }
}

export const knowledgeStore = new MockKnowledgeStore();

export function isQueueProcessing(): boolean {
  return getStore().processing;
}

export function setQueueProcessing(value: boolean): void {
  getStore().processing = value;
}
