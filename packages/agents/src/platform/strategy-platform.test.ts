import { describe, expect, it } from 'vitest';

import { createStrategyPlatform } from '../platform/strategy-platform';

describe('StrategyPlatform', () => {
  it('runs full mock pipeline: research → planner → strategy → decision → execution', async () => {
    const platform = createStrategyPlatform('mock');
    const result = await platform.run({
      project: {
        projectId: 'proj-test',
        projectTitle: 'LaunchLens',
        ideaSummary: 'AI Strategy PM for founders',
        goalId: 'business-viability',
        industry: 'SaaS',
        locale: 'ko',
      },
    });

    expect(result.research.findings.length).toBe(7);
    expect(result.plan.agentSequence).toContain('planner');
    expect(result.plan.researchOrder.length).toBeGreaterThan(0);
    expect(result.strategy.swot.strengths.length).toBeGreaterThan(0);
    expect(['GO', 'HOLD', 'PIVOT', 'NO_GO']).toContain(result.decision.verdict);
    expect(result.execution.tasks.length).toBeGreaterThan(0);
    expect(result.growth.milestones.length).toBe(6);
    expect(result.memory.weekInsight).toBeTruthy();
    expect(result.mentor.note).toBeTruthy();
    expect(result.knowledge.length).toBeGreaterThan(0);
    expect(result.growth.metrics?.successScore).toBeGreaterThan(0);
    expect(result.founderOs?.morningBrief).toBeTruthy();
    expect(result.founderOs?.todayActions.length).toBeGreaterThan(0);
    expect(result.decision.intelligence?.why).toBeTruthy();
  });
});
