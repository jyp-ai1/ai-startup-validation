import { createStrategyPlatform, type StrategyPipelineResult } from '@repo/agents';

import { resolveAgentProviderId } from './config';

let platform: ReturnType<typeof createStrategyPlatform> | null = null;

export function getStrategyPlatform() {
  if (!platform) {
    platform = createStrategyPlatform(resolveAgentProviderId());
  }
  return platform;
}

export type { StrategyPipelineResult };
