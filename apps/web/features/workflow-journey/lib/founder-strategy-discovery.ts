import { loadProjectRegistration } from '../components/project-registration-panel';
import { loadFounderInformation } from './founder-information-store';
import { loadFounderMicroAnswers } from './founder-micro-interaction-store';

export type StrategyDiscoveryInsight = {
  id: string;
  titleKey: string;
  bodyKey: string;
  bodyParams?: Record<string, string | number>;
};

function inferB2b(idea: string, customer?: string): boolean {
  const haystack = `${idea} ${customer ?? ''}`.toLowerCase();
  return (
    haystack.includes('b2b') ||
    haystack.includes('기업') ||
    haystack.includes('saas') ||
    haystack.includes('팀') ||
    haystack.includes('enterprise')
  );
}

export function buildStrategyDiscoveryInsights(): StrategyDiscoveryInsight[] {
  const registration = loadProjectRegistration();
  const info = loadFounderInformation();
  const micro = loadFounderMicroAnswers();
  const idea = registration?.ideaOneLiner ?? '';
  const customerLabel = info.customer ?? micro.targetCustomer ?? '';

  const insights: StrategyDiscoveryInsight[] = [
    {
      id: 'market_landscape',
      titleKey: 'marketLandscape',
      bodyKey: inferB2b(idea, customerLabel) ? 'marketLandscapeB2b' : 'marketLandscapeB2c',
      bodyParams: { count: 14 },
    },
    {
      id: 'pricing',
      titleKey: 'pricing',
      bodyKey: 'pricingRecommendation',
      bodyParams: { avg: '19,000', recommended: '14,900' },
    },
    {
      id: 'differentiation',
      titleKey: 'differentiation',
      bodyKey: 'differentiationRecommendation',
    },
  ];

  return insights;
}
