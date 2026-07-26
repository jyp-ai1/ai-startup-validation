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
    '대표님이 가장 시간을 많이 쓰는 업무는 무엇인가요?',
    '이 문제를 해결하려면 얼마까지 지불하실 의향이 있나요?',
    '팀에서 같은 고민을 하는 사람이 더 있나요?',
    '그 전에 어떤 방법을 시도해 보셨나요?',
    '효과가 있다면 주변에 추천하실 의향이 있나요?',
  ],
  pricing: [
    '현재 가격에 만족하시나요?',
    '가격보다 신뢰가 더 중요한가요?',
    '월 구독과 연 구독 중 선호는 무엇인가요?',
    '유료 전환을 결정하는 계기는 무엇인가요?',
    '주변에 추천하실 의향이 있나요?',
  ],
  competitor: [
    '지금 사용 중인 대안은 무엇인가요?',
    '경쟁사 대비 가장 큰 공백은 무엇인가요?',
    '우리의 핵심 차별점은 무엇인가요?',
    '전환 비용은 어느 정도로 보시나요?',
    '6개월 뒤에도 우리를 선택하실 이유는 무엇인가요?',
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
