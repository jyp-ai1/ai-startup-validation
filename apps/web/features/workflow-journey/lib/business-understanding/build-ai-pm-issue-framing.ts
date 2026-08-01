import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';

import type { AiPmInitialDiagnosis } from './build-ai-pm-initial-diagnosis';
import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';

export type AiPmIssueFraming = {
  documentPhrase: string | null;
  riskRank: number | null;
};

function truncate(value: string | null | undefined, max = 32): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

/** Document-derived phrase for issue-specific hypothesis copy. */
export function buildAiPmIssueFraming(
  understanding: BusinessUnderstanding,
  issueId: AiPmLoopIssueId,
  diagnosis: AiPmInitialDiagnosis,
): AiPmIssueFraming {
  const riskRank = diagnosis.topRiskIssueIds.indexOf(issueId);
  const rank = riskRank >= 0 ? riskRank + 1 : null;

  switch (issueId) {
    case 'customer_definition':
      return {
        documentPhrase:
          truncate(understanding.customerMentions[0]?.label) ??
          truncate(understanding.customer.value) ??
          truncate(understanding.customer.confirmedExpressions?.[0]),
        riskRank: rank,
      };
    case 'problem_definition':
      return {
        documentPhrase:
          truncate(understanding.problem.confirmedExpressions?.[0]) ??
          truncate(understanding.problem.value),
        riskRank: rank,
      };
    case 'bm_design':
      return {
        documentPhrase:
          truncate(understanding.revenue.value) ??
          truncate(understanding.revenue.confirmedExpressions?.[0]),
        riskRank: rank,
      };
    case 'competitor_analysis':
      return {
        documentPhrase: truncate(understanding.solution.value),
        riskRank: rank,
      };
    case 'market_validation':
      return {
        documentPhrase:
          truncate(understanding.business.value) ??
          truncate(understanding.problem.value),
        riskRank: rank,
      };
    default:
      return { documentPhrase: null, riskRank: rank };
  }
}
