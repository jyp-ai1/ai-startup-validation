import type { StrategyPipelineResult } from '@repo/agents';

const STORAGE_KEY = 'll_agent_pipeline_result';

export function saveAgentPipelineResult(result: StrategyPipelineResult): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
}

export function loadAgentPipelineResult(): StrategyPipelineResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StrategyPipelineResult;
  } catch {
    return null;
  }
}

export function clearAgentPipelineResult(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}
