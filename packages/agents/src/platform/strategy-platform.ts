import { Logger } from '@repo/core/logger';
import { BaseService } from '@repo/core/service';

import { resolveAgentProviders } from '../adapters/registry';
import type { StrategyPipelineRequest, StrategyPipelineResult } from '../types';
import { DecisionEngine } from '../engines/decision-engine';
import { ExecutionEngine } from '../engines/execution-engine';
import { ResearchEngine } from '../engines/research-engine';
import { StrategyEngine } from '../engines/strategy-engine';

/**
 * StrategyPlatform — orchestrates the full AI agent pipeline:
 * Research → Strategy → Decision → Execution → Growth/Memory/Mentor/Knowledge/Learning
 *
 * Replace mock providers via resolveAgentProviders() without changing this orchestrator.
 */
export class StrategyPlatform extends BaseService {
  private readonly researchEngine: ResearchEngine;
  private readonly strategyEngine: StrategyEngine;
  private readonly decisionEngine: DecisionEngine;
  private readonly executionEngine: ExecutionEngine;

  constructor(providerId: StrategyPipelineRequest['providerId'] = 'mock') {
    super(new Logger({ namespace: 'StrategyPlatform' }));
    const id = providerId ?? 'mock';
    this.researchEngine = new ResearchEngine(id);
    this.strategyEngine = new StrategyEngine(id);
    this.decisionEngine = new DecisionEngine(id);
    this.executionEngine = new ExecutionEngine(id);
  }

  async run(request: StrategyPipelineRequest): Promise<StrategyPipelineResult> {
    const providerId = request.providerId ?? 'mock';
    const { project } = request;
    const runId = `run-${project.projectId}-${Date.now()}`;

    this.logInfo('StrategyPlatform.run.start', { runId, projectId: project.projectId });

    const providers = resolveAgentProviders(providerId);

    const research = await this.researchEngine.run(project);
    const strategy = await this.strategyEngine.synthesize(project, research);
    const decision = await this.decisionEngine.decide(project, research, strategy);
    const execution = await this.executionEngine.plan(project, decision);

    const [growth, memory, mentor, knowledge, learning] = await Promise.all([
      providers.growth.roadmap(project, decision),
      providers.memory.snapshot(project, decision),
      providers.mentor.coach(project, decision),
      providers.knowledge.retrieve(project, research),
      providers.learning.extract(project, decision),
    ]);

    const result: StrategyPipelineResult = {
      runId,
      project,
      research,
      strategy,
      decision,
      execution,
      growth,
      memory,
      mentor,
      knowledge,
      learning,
      completedAt: new Date().toISOString(),
    };

    this.logInfo('StrategyPlatform.run.complete', {
      runId,
      verdict: decision.verdict,
      confidence: decision.confidence,
    });

    return result;
  }
}

export function createStrategyPlatform(providerId?: StrategyPipelineRequest['providerId']) {
  return new StrategyPlatform(providerId);
}
