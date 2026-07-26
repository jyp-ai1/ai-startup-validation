import type {
  AgentDecisionResult,
  AgentProjectContext,
  GrowthRoadmap,
  KnowledgeRef,
  LearningSignal,
  FounderMemorySnapshot,
  MentorProfile,
  ResearchResult,
} from '../../types';
import type {
  GrowthProviderPort,
  KnowledgeProviderPort,
  LearningProviderPort,
  MemoryProviderPort,
  MentorProviderPort,
} from '../../ports';

const MEMORY_QUESTIONS: Record<string, string[]> = {
  'Customer interviews (VOC 3+)': [
    'What problem costs you the most time today?',
    'What would you pay to solve it?',
    'Who else on your team feels this pain?',
    'What did you try before?',
    'Would you refer a peer if this worked?',
  ],
  'Pricing validation interviews': [
    'Are you happy with current pricing?',
    'Is trust more important than price?',
    'Monthly vs annual preference?',
    'What triggers paid conversion?',
    'Who would you refer?',
  ],
  'Competitor differentiation evidence': [
    'What alternative do you use today?',
    'Biggest gap vs competitors?',
    'Our one differentiation point?',
    'Switching cost estimate?',
    'Why stay with us in 6 months?',
  ],
};

export class MockGrowthProvider implements GrowthProviderPort {
  readonly id = 'mock' as const;

  async roadmap(_context: AgentProjectContext, decision: AgentDecisionResult): Promise<GrowthRoadmap> {
    const go = decision.verdict === 'GO';
    return {
      milestones: [
        { id: 'm1', phase: 'mvp', title: 'MVP scope lock + build', etaWeeks: 2 },
        { id: 'm2', phase: 'landing', title: 'Landing + waitlist', etaWeeks: 3 },
        { id: 'm3', phase: 'marketing', title: 'Founder community launch', etaWeeks: 4 },
        { id: 'm4', phase: 'interview', title: '10 ICP interviews', etaWeeks: go ? 2 : 4 },
        { id: 'm5', phase: 'funding', title: 'Seed deck + IR prep', etaWeeks: 8 },
        { id: 'm6', phase: 'government', title: 'Grant application pack', etaWeeks: 6 },
      ],
      providerId: this.id,
    };
  }
}

export class MockMemoryProvider implements MemoryProviderPort {
  readonly id = 'mock' as const;

  async snapshot(_context: AgentProjectContext, decision: AgentDecisionResult): Promise<FounderMemorySnapshot> {
    const topGap = decision.missingData[0] ?? 'Execution consistency';
    const questions = MEMORY_QUESTIONS[topGap] ?? MEMORY_QUESTIONS['Customer interviews (VOC 3+)']!;

    return {
      lastDecision: decision.verdict,
      topGap,
      completedActions: ['Goal selected', 'AI Research run', 'Strategy synthesized'],
      weekInsight: 'Last week: stronger on market research than customer interviews.',
      recallInsight: `Last week ${topGap} was insufficient. This week AI prioritizes closing that gap first.`,
      generatedAction: {
        actionTitle: decision.intelligence?.nextActionTitle ?? decision.nextAction.title,
        questions,
        etaMinutes: decision.nextAction.etaMinutes,
      },
    };
  }
}

export class MockMentorProvider implements MentorProviderPort {
  readonly id = 'mock' as const;

  async coach(_context: AgentProjectContext, decision: AgentDecisionResult): Promise<MentorProfile> {
    return {
      note:
        decision.verdict === 'GO'
          ? 'You have enough signal to execute — narrow scope and ship MVP in 2 weeks.'
          : 'Before investor meetings, finish pricing validation. Speed without evidence will hurt trust.',
      founderStrength: 'Clear vision and fast iteration',
      founderGap: decision.missingData[0] ?? 'Execution consistency',
      coachingFocus: decision.nextAction.title,
    };
  }
}

export class MockKnowledgeProvider implements KnowledgeProviderPort {
  readonly id = 'mock' as const;

  async retrieve(context: AgentProjectContext, research: ResearchResult): Promise<KnowledgeRef[]> {
    const industry = context.industry ?? 'SaaS';
    const weakDomain = research?.findings
      .filter((f) => f.confidence < 65)
      .sort((a, b) => a.confidence - b.confidence)[0]?.domain;

    return [
      { id: 'k1', category: 'framework', title: 'Lean validation playbook', relevance: 92 },
      {
        id: 'k2',
        category: 'vc',
        title: `Seed-stage ${industry} benchmarks`,
        relevance: weakDomain === 'investment' ? 90 : 78,
      },
      { id: 'k3', category: 'government', title: 'K-Startup & TIPS programs', relevance: 85 },
      { id: 'k4', category: 'startup_case', title: 'Founder OS category comparables', relevance: 88 },
      {
        id: 'k5',
        category: 'market',
        title: `${industry} market sizing guide`,
        relevance: weakDomain === 'market' ? 95 : 80,
      },
    ];
  }
}

export class MockLearningProvider implements LearningProviderPort {
  readonly id = 'mock' as const;

  async extract(_context: AgentProjectContext, decision: AgentDecisionResult): Promise<LearningSignal[]> {
    const vocWeight = decision.verdict === 'HOLD' ? 0.92 : 0.35;
    return [
      {
        signal: `verdict_${decision.verdict.toLowerCase()}`,
        weight: 1,
        recommendation: 'Prioritize VOC when HOLD — 78% of successful founders complete 3+ interviews',
        successRate: 0.78,
        ignoreRate: 0.22,
      },
      {
        signal: 'voc_gap_when_hold',
        weight: vocWeight,
        recommendation: 'Send prepared interview questions — reduces procrastination 40%',
        successRate: 0.65,
        ignoreRate: 0.35,
      },
      {
        signal: 'research_before_decision',
        weight: 0.85,
        recommendation: 'Run full pipeline before GO — reduces false GO by 31%',
        successRate: 0.69,
        ignoreRate: 0.15,
      },
    ];
  }
}

export const mockGrowthProvider = new MockGrowthProvider();
export const mockMemoryProvider = new MockMemoryProvider();
export const mockMentorProvider = new MockMentorProvider();
export const mockKnowledgeProvider = new MockKnowledgeProvider();
export const mockLearningProvider = new MockLearningProvider();
