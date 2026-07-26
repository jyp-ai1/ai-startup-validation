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

const INTERVIEW_QUESTIONS_BY_GAP: Record<string, string[]> = {
  customer: [
    'What problem costs you the most time today?',
    'What would you pay to solve it?',
    'Who else on your team feels this pain?',
    'What did you try before?',
    'Would you refer a peer if this worked?',
  ],
  pricing: [
    'Are you happy with current pricing?',
    'Is trust more important than price?',
    'Monthly vs annual preference?',
    'What triggers paid conversion?',
    'Who would you refer?',
  ],
  competitor: [
    'What alternative do you use today?',
    'Biggest gap vs competitors?',
    'Our one differentiation point?',
    'Switching cost estimate?',
    'Why stay with us in 6 months?',
  ],
};

export class MockPlannerProvider implements PlannerProviderPort {
  readonly id = 'mock' as const;

  async plan(context: AgentProjectContext, research: ResearchOutput): Promise<PlannerOutput> {
    const weak = research.findings
      .filter((f) => f.confidence < 65)
      .map((f) => f.domain)
      .sort((a, b) => (GOAL_RESEARCH_PRIORITY[a] ?? 99) - (GOAL_RESEARCH_PRIORITY[b] ?? 99));

    const missingDomains = weak.length > 0 ? weak : (['customer'] as const);
    const primaryGap = missingDomains[0] ?? 'customer';

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

    const primaryAction =
      primaryGap === 'customer'
        ? `Complete 3 customer interviews for ${context.projectTitle}`
        : primaryGap === 'pricing'
          ? 'Run 5 pricing validation interviews'
          : primaryGap === 'competitor'
            ? 'Build competitive matrix + differentiation one-pager'
            : 'Validate market size with 3 founder interviews';

    const todayActions: PlannerOutput['todayActions'] = [
      {
        id: 'today-1',
        title: primaryAction,
        etaMinutes: primaryGap === 'customer' ? 45 : 30,
        goImpact: 22,
        priority: 'P0',
      },
      {
        id: 'today-2',
        title: 'Log evidence and update Confidence breakdown',
        etaMinutes: 10,
        goImpact: 3,
        priority: 'P1',
      },
      {
        id: 'today-3',
        title:
          primaryGap === 'competitor'
            ? 'Scan competitor pricing changes since yesterday'
            : 'Review AI Morning Brief business deltas',
        etaMinutes: 15,
        goImpact: 4,
        priority: 'P1',
      },
    ];

    const gapQuestions =
      INTERVIEW_QUESTIONS_BY_GAP[primaryGap] ?? INTERVIEW_QUESTIONS_BY_GAP.customer!;

    const morningBrief = `Good morning. ${context.projectTitle}: ${missingDomains.includes('customer') ? 'VOC depth is the bottleneck' : `Strengthen ${primaryGap} evidence`}. AI prepared ${gapQuestions.length} interview questions (~${todayActions[0]!.etaMinutes} min). Completing today's P0 raises GO probability +${todayActions[0]!.goImpact}%.`;

    return {
      researchOrder,
      missingDomains: [...new Set(missingDomains)],
      agentSequence,
      rationale:
        missingDomains.includes('customer')
          ? `${context.projectTitle}: prioritize customer validation before scaling research breadth.`
          : `Strengthen ${missingDomains[0] ?? 'market'} evidence, then re-run decision.`,
      morningBrief,
      todayActions,
      completedAt: new Date().toISOString(),
      providerId: this.id,
    };
  }
}

export const mockPlannerProvider = new MockPlannerProvider();
