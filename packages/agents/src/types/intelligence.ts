/**
 * Eight Intelligence layers — Founder Success Loop.
 * Cursor grows these via existing Agent engines + Provider swap.
 * Do NOT add Journey screens to grow intelligence.
 */

export type IntelligenceLayer =
  | 'founder'
  | 'business'
  | 'strategic'
  | 'execution'
  | 'learning'
  | 'product'
  | 'knowledge'
  | 'network';

/** Maps intelligence layer → primary Agent responsibility */
export const INTELLIGENCE_AGENT_MAP: Record<
  IntelligenceLayer,
  ReadonlyArray<
    'research' | 'planner' | 'strategy' | 'decision' | 'execution' | 'memory' | 'mentor' | 'learning' | 'growth' | 'knowledge'
  >
> = {
  founder: ['memory', 'mentor', 'learning'],
  business: ['research', 'knowledge'],
  strategic: ['strategy', 'decision', 'growth'],
  execution: ['planner', 'execution', 'growth'],
  learning: ['learning', 'planner'],
  product: ['learning'],
  knowledge: ['knowledge', 'research'],
  network: ['learning'],
};

/** Gate question — every implementation must pass */
export const FOUNDER_SUCCESS_GATE =
  'Does this increase Founder business success probability?' as const;

export type FounderProfileSignals = {
  industry?: string;
  goalId: string;
  locale: string;
  procrastinationHints?: ReadonlyArray<'voc' | 'market' | 'competitor' | 'pricing' | 'grants'>;
  preferredExplanation?: 'numbers' | 'story' | 'checklist';
};

export type BusinessDelta = {
  since: string;
  competitor?: string;
  market?: string;
  investment?: string;
  government?: string;
  summary: string;
};

export type StrategicHorizon = {
  horizon: 'now' | '3mo' | '6mo' | '1yr';
  headline: string;
  confidence: number;
};

export type LearningPattern = {
  domain: 'voc' | 'market' | 'competitor' | 'grants';
  completionRate: number;
  recommendation: string;
};

export type CohortInsight = {
  segment: string;
  sampleSize: number;
  insight: string;
  goProbabilityLift: number;
};
