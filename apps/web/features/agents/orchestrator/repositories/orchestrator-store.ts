import type { ExecutionCenterStats, ExecutionPlan } from '../services/orchestrator-types';

type StoreState = {
  plans: Map<string, ExecutionPlan>;
};

const STORE_KEY = '__launchlens_orchestrator_store__';

function getStore(): StoreState {
  const g = globalThis as typeof globalThis & { [STORE_KEY]?: StoreState };
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = { plans: new Map() };
  }
  return g[STORE_KEY]!;
}

export async function savePlan(plan: ExecutionPlan): Promise<void> {
  getStore().plans.set(plan.id, structuredClone(plan));
}

export async function updatePlan(plan: ExecutionPlan): Promise<void> {
  getStore().plans.set(plan.id, structuredClone(plan));
}

export async function getPlan(id: string): Promise<ExecutionPlan | null> {
  const plan = getStore().plans.get(id);
  return plan ? structuredClone(plan) : null;
}

export async function listPlansByProject(projectId: string): Promise<ExecutionPlan[]> {
  return [...getStore().plans.values()]
    .filter((p) => p.projectId === projectId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((p) => structuredClone(p));
}

export async function getLatestPlan(projectId: string): Promise<ExecutionPlan | null> {
  const plans = await listPlansByProject(projectId);
  return plans[0] ?? null;
}

export async function getExecutionCenterStats(): Promise<ExecutionCenterStats> {
  const plans = [...getStore().plans.values()];
  const running = plans.filter((p) => p.status === 'RUNNING');
  const runningTasks = running.reduce(
    (sum, p) => sum + p.nodes.filter((n) => n.status === 'RUNNING').length,
    0,
  );
  const queuedTasks = running.reduce(
    (sum, p) => sum + p.nodes.filter((n) => n.status === 'QUEUED').length,
    0,
  );
  const completed = plans.filter((p) => p.status === 'COMPLETED');
  const durations = completed
    .map((p) => p.totalDurationMs)
    .filter((d) => d > 0);
  const avgDurationMs =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

  return {
    activePlans: running.length + plans.filter((p) => p.status === 'WAITING').length,
    runningTasks,
    queuedTasks,
    completedPlans: completed.length,
    avgDurationMs,
    recentPlans: plans
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, 5)
      .map((p) => structuredClone(p)),
  };
}
