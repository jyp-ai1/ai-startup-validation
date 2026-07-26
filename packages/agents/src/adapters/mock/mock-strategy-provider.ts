import type { AgentProjectContext, ResearchResult, StrategyResult } from '../../types';
import type { StrategyProviderPort } from '../../ports';

export class MockStrategyProvider implements StrategyProviderPort {
  readonly id = 'mock' as const;

  async synthesize(context: AgentProjectContext, research: ResearchResult): Promise<StrategyResult> {
    const customerFinding = research.findings.find((f) => f.domain === 'customer');
    const marketFinding = research.findings.find((f) => f.domain === 'market');

    return {
      swot: {
        strengths: [
          'AI-native strategy operating loop',
          'Founder-first daily PM experience',
          `${context.goalId} goal alignment`,
        ],
        weaknesses: [
          'Limited real VOC depth',
          customerFinding && customerFinding.confidence < 65
            ? 'Customer validation incomplete'
            : 'Pricing not validated',
        ],
        opportunities: [
          marketFinding?.summary ?? 'Growing founder OS category',
          'Government grant fit identified',
          'Differentiation vs generic AI chat tools',
        ],
        threats: [
          'Incumbent strategy SaaS adding AI features',
          'Founder churn if AI feels like mock UI only',
        ],
      },
      businessModel: 'B2B SaaS — AI Strategy PM subscription with workspace + execution loop',
      marketSize: {
        tam: '$4.2B global startup validation & strategy tools',
        sam: '$680M AI-native founder platforms',
        som: '$42M Korea + English early-stage founders',
      },
      icp: 'Pre-seed to Series A founders validating ideas in 30 days with AI co-founder',
      risks: [
        'VOC depth below GO threshold',
        'Competitive positioning not fully evidenced',
        'Real intelligence gap vs platform polish',
      ],
      opportunities: [
        'First mover in AI Project OS category',
        'Grant + IR path after GO',
        'Learning loop improves next project strategy',
      ],
      completedAt: new Date().toISOString(),
      providerId: this.id,
    };
  }
}

export const mockStrategyProvider = new MockStrategyProvider();
