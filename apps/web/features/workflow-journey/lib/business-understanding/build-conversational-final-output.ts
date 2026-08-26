/**
 * ALABOM v2 — Final conversational output from Living Understanding State.
 * Summary + Detail + Evidence — not a form dump.
 */

import type { LivingClaim, LivingUnderstandingState } from './living-understanding-state';

export type FinalOutputSection = {
  id: string;
  title: string;
  summary: string;
  detail: string;
  evidence: string[];
};

export type ConversationalFinalOutput = {
  coveragePercent: number;
  judgmentSummary: string;
  sections: FinalOutputSection[];
};

const SECTION_KEYS: Array<{ id: string; title: string; keys: string[] }> = [
  {
    id: 'understanding',
    title: '사업 이해',
    keys: ['businessOneLiner', 'categoryScope', 'solution'],
  },
  {
    id: 'customer_problem',
    title: '고객 · 문제',
    keys: ['customerPersona', 'payer', 'problemJtbd', 'problemFrequencySeverity'],
  },
  {
    id: 'competition',
    title: '경쟁 · 차별화',
    keys: [
      'alternativesCompetitors',
      'differentiationHypothesis',
      'differentiationVsAlternatives',
    ],
  },
  {
    id: 'market_model',
    title: '시장 · 수익',
    keys: ['marketChannel', 'marketSizeEvidence', 'revenueModel', 'pricingHint'],
  },
  {
    id: 'judgment',
    title: '현재 판단',
    keys: ['currentJudgment', 'topRisks', 'nextAction', 'validationTestability'],
  },
];

function claimByKey(claims: LivingClaim[], key: string): LivingClaim | undefined {
  return claims.find((c) => c.fieldKey === key);
}

function formatClaim(claim: LivingClaim | undefined): string | null {
  if (!claim?.value?.trim() || claim.status === 'unknown') return null;
  return claim.value.trim();
}

/** Build founder-facing final output from Living State SoT. */
export function buildConversationalFinalOutput(
  living: LivingUnderstandingState,
): ConversationalFinalOutput {
  const sections: FinalOutputSection[] = [];

  for (const section of SECTION_KEYS) {
    const filled = section.keys
      .map((key) => claimByKey(living.claims, key))
      .filter((c): c is LivingClaim => Boolean(c && formatClaim(c)));

    if (filled.length === 0) continue;

    const summary = filled
      .slice(0, 2)
      .map((c) => formatClaim(c))
      .filter(Boolean)
      .join(' · ');

    const detail = filled
      .map((c) => `${c.fieldKey}: ${formatClaim(c)} (${c.status})`)
      .join('\n');

    const evidence = filled.flatMap((c) =>
      c.evidence.map((e) => `[${e.kind}] ${e.excerpt}`).slice(0, 2),
    );

    sections.push({
      id: section.id,
      title: section.title,
      summary: summary || living.judgmentSummary,
      detail,
      evidence: evidence.slice(0, 6),
    });
  }

  if (sections.length === 0) {
    sections.push({
      id: 'understanding',
      title: '사업 이해',
      summary: living.judgmentSummary,
      detail: `사업: ${living.spine.business}\n고객: ${living.spine.customer}\n문제: ${living.spine.problem}`,
      evidence: [],
    });
  }

  return {
    coveragePercent: living.coveragePercent,
    judgmentSummary: living.judgmentSummary,
    sections,
  };
}
