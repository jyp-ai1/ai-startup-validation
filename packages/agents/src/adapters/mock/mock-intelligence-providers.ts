import type {
  AgentDecisionResult,
  AgentProjectContext,
  GrowthRoadmap,
  KnowledgeRef,
  LearningSignal,
  FounderMemorySnapshot,
  MentorProfile,
} from '../../types';
import type {
  GrowthProviderPort,
  KnowledgeProviderPort,
  LearningProviderPort,
  MemoryProviderPort,
  MentorProviderPort,
} from '../../ports';

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
    return {
      lastDecision: decision.verdict,
      topGap: decision.missingData[0] ?? 'None',
      completedActions: ['Goal selected', 'AI Research run', 'Strategy synthesized'],
      weekInsight: 'Last week: stronger on market research than customer interviews.',
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

  async retrieve(context: AgentProjectContext): Promise<KnowledgeRef[]> {
    return [
      { id: 'k1', category: 'framework', title: 'Lean validation playbook', relevance: 92 },
      { id: 'k2', category: 'vc', title: 'Seed-stage AI SaaS benchmarks', relevance: 78 },
      { id: 'k3', category: 'government', title: 'K-Startup & TIPS programs', relevance: 85 },
      { id: 'k4', category: 'startup_case', title: 'Founder OS category comparables', relevance: 88 },
      { id: 'k5', category: 'market', title: `${context.industry ?? 'SaaS'} market sizing guide`, relevance: 80 },
    ];
  }
}

export class MockLearningProvider implements LearningProviderPort {
  readonly id = 'mock' as const;

  async extract(_context: AgentProjectContext, decision: AgentDecisionResult): Promise<LearningSignal[]> {
    return [
      { signal: `verdict_${decision.verdict.toLowerCase()}`, weight: 1 },
      { signal: 'voc_gap_when_hold', weight: decision.verdict === 'HOLD' ? 0.9 : 0.2 },
      { signal: 'research_before_decision', weight: 0.85 },
    ];
  }
}

export const mockGrowthProvider = new MockGrowthProvider();
export const mockMemoryProvider = new MockMemoryProvider();
export const mockMentorProvider = new MockMentorProvider();
export const mockKnowledgeProvider = new MockKnowledgeProvider();
export const mockLearningProvider = new MockLearningProvider();
