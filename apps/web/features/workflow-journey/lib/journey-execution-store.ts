'use client';

export type ExecutionTaskKey = 'market' | 'voc' | 'mvp' | 'pricing' | 'grant';

export type ExecutionTask = {
  key: ExecutionTaskKey;
  done: boolean;
};

const STORAGE_KEY = 'launchlens:execution-tasks';

export const DEFAULT_EXECUTION_TASKS: ExecutionTask[] = [
  { key: 'market', done: true },
  { key: 'voc', done: false },
  { key: 'mvp', done: false },
  { key: 'pricing', done: false },
  { key: 'grant', done: false },
];

function readTasks(): ExecutionTask[] {
  if (typeof window === 'undefined') return DEFAULT_EXECUTION_TASKS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_EXECUTION_TASKS;
    const parsed = JSON.parse(raw) as ExecutionTask[];
    if (!Array.isArray(parsed)) return DEFAULT_EXECUTION_TASKS;
    return DEFAULT_EXECUTION_TASKS.map((task) => {
      const saved = parsed.find((item) => item.key === task.key);
      return saved ? { ...task, done: Boolean(saved.done) } : task;
    });
  } catch {
    return DEFAULT_EXECUTION_TASKS;
  }
}

export function getExecutionTasks(): ExecutionTask[] {
  return readTasks();
}

export function toggleExecutionTask(key: ExecutionTaskKey): ExecutionTask[] {
  const next = readTasks().map((task) =>
    task.key === key ? { ...task, done: !task.done } : task,
  );
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('launchlens:execution-tasks'));
  }
  return next;
}

export function getExecutionProgress(tasks: ExecutionTask[]): {
  done: number;
  total: number;
  percent: number;
  nextKey: ExecutionTaskKey | null;
} {
  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const nextKey = tasks.find((t) => !t.done)?.key ?? null;
  return { done, total, percent, nextKey };
}
