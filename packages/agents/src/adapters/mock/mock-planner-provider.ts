import type { PlannerProviderPort } from '../../ports';
import type { AgentProjectContext } from '../../types';
import type { PlannerOutput, ResearchOutput } from '../../types/contracts';

const GOAL_RESEARCH_PRIORITY: Record<string, number> = {
  market: 1,
  customer: 2,
  competitor: 3,
  trend: 4,
  pricing: 5,
  government: 6,
  investment: 7,
};

export class MockPlannerProvider implements PlannerProviderPort {
  readonly id = 'mock' as const;

  async plan(context: AgentProjectContext, research: ResearchOutput): Promise<PlannerOutput> {
    const weak = research.findings
      .filter((f) => f.confidence < 65)
      .map((f) => f.domain)
      .sort((a, b) => (GOAL_RESEARCH_PRIORITY[a] ?? 99) - (GOAL_RESEARCH_PRIORITY[b] ?? 99));

    const missingDomains = weak.length > 0 ? weak : (['customer'] as const);

    const researchOrder = [...research.findings]
      .sort((a, b) => a.confidence - b.confidence)
      .map((f, index) => ({
        domain: f.domain,
        priority: index + 1,
        reason:
          f.confidence < 60
            ? `Low confidence (${f.confidence}%) — investigate first`
            : `Validate ${f.domain} before GO`,
      }));

    const agentSequence = ['research', 'planner', 'strategy', 'decision', 'execution'] as const;

    return {
      researchOrder,
      missingDomains: [...new Set(missingDomains)],
      agentSequence,
      rationale:
        missingDomains.includes('customer')
          ? `${context.projectTitle}: prioritize customer validation before scaling research breadth.`
          : `Strengthen ${missingDomains[0] ?? 'market'} evidence, then re-run decision.`,
      completedAt: new Date().toISOString(),
      providerId: this.id,
    };
  }
}

export const mockPlannerProvider = new MockPlannerProvider();
