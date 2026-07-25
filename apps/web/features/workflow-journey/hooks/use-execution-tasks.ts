'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_EXECUTION_TASKS,
  getExecutionProgress,
  getExecutionTasks,
  toggleExecutionTask,
  type ExecutionTask,
  type ExecutionTaskKey,
} from '../lib/journey-execution-store';

export function useExecutionTasks() {
  const [tasks, setTasks] = useState<ExecutionTask[]>(DEFAULT_EXECUTION_TASKS);

  useEffect(() => {
    setTasks(getExecutionTasks());

    function sync() {
      setTasks(getExecutionTasks());
    }

    window.addEventListener('launchlens:execution-tasks', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('launchlens:execution-tasks', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((key: ExecutionTaskKey) => {
    const next = toggleExecutionTask(key);
    setTasks(next);
    return next;
  }, []);

  return {
    tasks,
    toggle,
    progress: getExecutionProgress(tasks),
  };
}
