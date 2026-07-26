import type { AgentDecisionResult, AgentProjectContext, ExecutionPlan } from '../../types';
import type { ExecutionProviderPort } from '../../ports';

export class MockExecutionProvider implements ExecutionProviderPort {
  readonly id = 'mock' as const;

  async plan(context: AgentProjectContext, decision: AgentDecisionResult): Promise<ExecutionPlan> {
    const { nextAction } = decision;
    const tasks: ExecutionPlan['tasks'] = [
      {
        id: 'today-primary',
        horizon: 'today',
        title: nextAction.title,
        priority: nextAction.priority,
        etaMinutes: nextAction.etaMinutes,
        confidenceImpact: nextAction.confidenceGain,
      },
      {
        id: 'today-evidence',
        horizon: 'today',
        title: 'Log evidence and update Confidence breakdown',
        priority: 'P1',
        etaMinutes: 10,
        confidenceImpact: 3,
      },
      {
        id: 'week-strategy',
        horizon: 'week',
        title:
          decision.verdict === 'GO'
            ? 'Define MVP scope and launch checklist'
            : 'Complete market + customer validation sprint',
        priority: 'P0',
        etaMinutes: 180,
        confidenceImpact: 12,
      },
      {
        id: 'week-competitor',
        horizon: 'week',
        title: 'Competitive matrix + differentiation one-pager',
        priority: 'P1',
        etaMinutes: 90,
        confidenceImpact: 8,
      },
      {
        id: 'month-growth',
        horizon: 'month',
        title:
          decision.verdict === 'GO'
            ? 'Beta launch + first 10 founder interviews'
            : 'Pricing validation + grant application prep',
        priority: 'P1',
        etaMinutes: 480,
        confidenceImpact: 15,
      },
    ];

    return {
      tasks,
      completedAt: new Date().toISOString(),
      providerId: this.id,
    };
  }
}

export const mockExecutionProvider = new MockExecutionProvider();
