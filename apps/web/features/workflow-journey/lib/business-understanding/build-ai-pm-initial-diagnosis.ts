import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import { buildAiPmScoreNarrative } from '../build-ai-pm-score-narrative';
import { buildDiscoveryItems } from './discovery-summary';
import {
  estimatePrioritySeverity,
  resolveAiPmPriorityIssue,
} from './resolve-ai-pm-priority-issue';
import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';
import { isWorkspaceDocumentAnalyzable } from './workspace-document-eligibility';

export const AI_PM_READING_STEP_IDS = [
  'founder',
  'problem',
  'customer',
  'market',
  'competitor',
  'businessModel',
  'risk',
  'investorView',
] as const;

export type AiPmReadingStepId = (typeof AI_PM_READING_STEP_IDS)[number];

export type AiPmReadingStep = {
  id: AiPmReadingStepId;
  detail: string | null;
  confirmed: boolean;
};

export type AiPmReadingInsight = {
  afterStepIndex: number;
  template: 'phraseMarketCheck' | 'domainCompare' | 'buyerUserSplit';
  phrase?: string;
  domain?: string;
};

export type AiPmInitialDiagnosis = {
  sufficientInput: boolean;
  readingSteps: AiPmReadingStep[];
  insights: AiPmReadingInsight[];
  confidencePercent: number | null;
  readSummaryIds: AiPmReadingStepId[];
  topRiskIssueIds: AiPmLoopIssueId[];
  primaryIssueId: AiPmLoopIssueId | null;
  issueQueue: AiPmLoopIssueId[];
};

function truncateDetail(value: string | null | undefined, max = 56): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function extractHighlightPhrase(understanding: BusinessUnderstanding): string | null {
  const fromProblem =
    understanding.problem.confirmedExpressions?.[0] ??
    understanding.problem.value ??
    understanding.business.confirmedExpressions?.[0];
  return truncateDetail(fromProblem, 28);
}

function inferDomainLabel(
  understanding: BusinessUnderstanding,
  entities?: LaunchLensDomainContext | null,
): string | null {
  const business =
    entities?.business.name ??
    entities?.business.value ??
    understanding.business.value ??
    understanding.solution.value;
  return truncateDetail(business, 20);
}

function buildReadingSteps(
  understanding: BusinessUnderstanding,
  entities?: LaunchLensDomainContext | null,
): AiPmReadingStep[] {
  const discovery = buildDiscoveryItems(understanding, entities);
  const discoveryById = Object.fromEntries(discovery.map((item) => [item.id, item]));

  const customerDetail =
    understanding.customerMentions.length > 0
      ? understanding.customerMentions.map((m) => m.label).join(' · ')
      : (discoveryById.customer?.detail ?? understanding.customer.value);

  const riskDetail =
    understanding.customer.missingLine ??
    understanding.problem.missingLine ??
    understanding.revenue.missingLine ??
    null;

  return [
    {
      id: 'founder',
      detail: truncateDetail(understanding.founder.value ?? discoveryById.founder?.detail),
      confirmed: understanding.founder.status === 'document',
    },
    {
      id: 'problem',
      detail: truncateDetail(understanding.problem.value ?? understanding.problem.confirmedExpressions?.join(' · ')),
      confirmed: understanding.problem.status === 'document' || understanding.problem.status === 'needs_confirmation',
    },
    {
      id: 'customer',
      detail: truncateDetail(customerDetail),
      confirmed:
        understanding.customerMentions.length > 0 ||
        understanding.customer.status !== 'unknown',
    },
    {
      id: 'market',
      detail: truncateDetail(entities?.market.value ?? understanding.problem.value),
      confirmed: entities?.market.basis === 'document' || Boolean(entities?.market.value),
    },
    {
      id: 'competitor',
      detail: truncateDetail(entities?.competitor.value),
      confirmed: entities?.competitor.basis === 'document' || Boolean(entities?.competitor.value),
    },
    {
      id: 'businessModel',
      detail: truncateDetail(understanding.revenue.value),
      confirmed: understanding.revenue.status === 'document' || understanding.revenue.status === 'needs_confirmation',
    },
    {
      id: 'risk',
      detail: truncateDetail(riskDetail),
      confirmed: Boolean(riskDetail),
    },
    {
      id: 'investorView',
      detail: truncateDetail(
        [understanding.business.value, understanding.founder.value].filter(Boolean).join(' · ') ||
          understanding.business.value,
      ),
      confirmed: understanding.business.status === 'document',
    },
  ];
}

function buildReadingInsights(
  understanding: BusinessUnderstanding,
  entities?: LaunchLensDomainContext | null,
): AiPmReadingInsight[] {
  const insights: AiPmReadingInsight[] = [];
  const phrase = extractHighlightPhrase(understanding);
  const domain = inferDomainLabel(understanding, entities);

  if (phrase) {
    insights.push({ afterStepIndex: 2, template: 'phraseMarketCheck', phrase });
  }

  if (domain) {
    insights.push({ afterStepIndex: 4, template: 'domainCompare', domain });
  }

  if (
    understanding.customer.status === 'needs_confirmation' ||
    understanding.customerMentions.length >= 2 ||
    understanding.customer.missingLine
  ) {
    insights.push({ afterStepIndex: 5, template: 'buyerUserSplit' });
  }

  return insights;
}

function rankIssueQueue(understanding: BusinessUnderstanding): AiPmLoopIssueId[] {
  const issueIds: AiPmLoopIssueId[] = [
    'customer_definition',
    'problem_definition',
    'bm_design',
    'competitor_analysis',
    'market_validation',
  ];

  return [...issueIds].sort(
    (a, b) => estimatePrioritySeverity(understanding, b) - estimatePrioritySeverity(understanding, a),
  );
}

function rankTopRisks(understanding: BusinessUnderstanding): AiPmLoopIssueId[] {
  return rankIssueQueue(understanding).slice(0, 3);
}

/** Document-derived initial diagnosis — drives reading UX and first-question framing. */
export function buildAiPmInitialDiagnosis(
  understanding: BusinessUnderstanding,
  entities?: LaunchLensDomainContext | null,
  documentText?: string | null,
): AiPmInitialDiagnosis {
  const sufficientInput = isWorkspaceDocumentAnalyzable(documentText);
  const issueQueue = rankIssueQueue(understanding);
  const readingSteps = buildReadingSteps(understanding, entities);

  if (!sufficientInput) {
    return {
      sufficientInput: false,
      readingSteps,
      insights: [],
      confidencePercent: null,
      readSummaryIds: [],
      topRiskIssueIds: [],
      primaryIssueId: null,
      issueQueue,
    };
  }

  const narrative = buildAiPmScoreNarrative(understanding, 0);
  const confidencePercent = narrative?.score.total ?? 62;
  const primaryIssueId = resolveAiPmPriorityIssue(understanding);

  return {
    sufficientInput: true,
    readingSteps,
    insights: buildReadingInsights(understanding, entities),
    confidencePercent,
    readSummaryIds: [...AI_PM_READING_STEP_IDS],
    topRiskIssueIds: rankTopRisks(understanding),
    primaryIssueId,
    issueQueue,
  };
}
