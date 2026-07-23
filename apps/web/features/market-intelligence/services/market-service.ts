import type { DecisionInput } from '@/features/decision/services/decision-types';
import type { StartupProject } from '@repo/types/validation';

import { marketEngine } from './market-engine';
import type { MarketAnalysisInput, MarketAnalysisResult } from './market-types';

function localeToCountry(locale: string): string | null {
  switch (locale) {
    case 'ko':
      return 'KR';
    case 'ja':
      return 'JP';
    case 'zh-CN':
    case 'zh-TW':
      return 'CN';
    default:
      return 'US';
  }
}

export function decisionInputToMarketInput(
  input: DecisionInput,
  project: Pick<
    StartupProject,
    'industry' | 'targetCustomer' | 'status'
  >,
): MarketAnalysisInput {
  return {
    projectId: input.projectId,
    projectTitle: input.projectTitle,
    projectType: input.projectType,
    industry: project.industry,
    country: localeToCountry(input.locale),
    targetMarket: project.targetCustomer ?? null,
    stage: project.status,
    locale: input.locale,
    research: input.research,
    evidence: input.evidence,
    voc: input.voc,
    competitors: input.competitors,
    grants: input.grants,
  };
}

export async function runMarketAnalysis(
  input: MarketAnalysisInput,
): Promise<MarketAnalysisResult> {
  return marketEngine.analyze(input);
}

export async function runMarketAnalysisForDecision(
  decisionInput: DecisionInput,
  project: Pick<StartupProject, 'industry' | 'targetCustomer' | 'status'>,
): Promise<MarketAnalysisResult> {
  return runMarketAnalysis(decisionInputToMarketInput(decisionInput, project));
}
