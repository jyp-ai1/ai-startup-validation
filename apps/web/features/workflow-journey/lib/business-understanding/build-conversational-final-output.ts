/**
 * ALABOM Core v4 — Final conversational output from Living Understanding State.
 * Structured Confirmed / Inferred / Evidence / Needs check — not score-only GO.
 */

import type { LivingClaim, LivingUnderstandingState } from './living-understanding-state';

export type FinalClaimStatusLabel = 'Confirmed' | 'Inferred' | 'Unknown' | 'Conflict' | 'Needs check';

export type FinalOutputClaimRow = {
  domain: string;
  value: string | null;
  status: FinalClaimStatusLabel;
  evidence: string[];
};

export type FinalOutputSection = {
  id: string;
  title: string;
  summary: string;
  detail: string;
  evidence: string[];
  claims: FinalOutputClaimRow[];
};

export type ConversationalFinalOutput = {
  coveragePercent: number;
  judgmentSummary: string;
  /** Founder-facing closeout line — not "GO 74" alone */
  closeoutLabel: string;
  sections: FinalOutputSection[];
  claimRows: FinalOutputClaimRow[];
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
    id: 'capability_risk',
    title: '역량 · 리스크 · 검증',
    keys: [
      'executionConstraints',
      'topRisks',
      'validationTestability',
      'evidenceStrengthSummary',
    ],
  },
  {
    id: 'judgment',
    title: '현재 판단',
    keys: ['currentJudgment', 'nextAction'],
  },
];

const DOMAIN_TITLE: Record<string, string> = {
  businessOneLiner: '사업',
  categoryScope: '카테고리',
  solution: '솔루션',
  customerPersona: '고객',
  payer: '지불자',
  problemJtbd: '문제',
  problemFrequencySeverity: '문제 빈도·심각도',
  alternativesCompetitors: '경쟁·대안',
  differentiationHypothesis: '차별 가설',
  differentiationVsAlternatives: '차별화',
  marketChannel: '채널',
  marketSizeEvidence: '시장 근거',
  revenueModel: '수익',
  pricingHint: '가격',
  executionConstraints: '역량·제약',
  topRisks: '리스크',
  validationTestability: '검증 필요',
  evidenceStrengthSummary: '근거 강도',
  currentJudgment: '판단',
  nextAction: '다음 행동',
};

function claimByKey(claims: LivingClaim[], key: string): LivingClaim | undefined {
  return claims.find((c) => c.fieldKey === key);
}

function statusLabel(claim: LivingClaim): FinalClaimStatusLabel {
  if (claim.status === 'confirmed') return 'Confirmed';
  if (claim.status === 'contradiction') return 'Conflict';
  if (claim.status === 'inferred') return 'Inferred';
  if (claim.status === 'known') return 'Inferred';
  if (claim.value) return 'Needs check';
  return 'Unknown';
}

function toClaimRow(claim: LivingClaim): FinalOutputClaimRow {
  return {
    domain: DOMAIN_TITLE[claim.fieldKey] ?? claim.fieldKey,
    value: claim.value,
    status: statusLabel(claim),
    evidence: claim.evidence.map((e) => `[${e.kind}] ${e.excerpt}`).slice(0, 3),
  };
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
  const claimRows: FinalOutputClaimRow[] = [];

  for (const section of SECTION_KEYS) {
    const sectionClaims = section.keys
      .map((key) => claimByKey(living.claims, key))
      .filter((c): c is LivingClaim => Boolean(c));

    const rows = sectionClaims.map(toClaimRow);
    claimRows.push(...rows);

    const filled = sectionClaims.filter((c) => formatClaim(c));
    if (filled.length === 0 && rows.every((r) => r.status === 'Unknown')) {
      // Still surface section with Needs-check rows for structured final
      sections.push({
        id: section.id,
        title: section.title,
        summary: '아직 확인되지 않음',
        detail: rows.map((r) => `${r.domain}: ${r.status}`).join('\n'),
        evidence: [],
        claims: rows,
      });
      continue;
    }

    const summary =
      filled
        .slice(0, 2)
        .map((c) => formatClaim(c))
        .filter(Boolean)
        .join(' · ') || '부분 확인';

    const detail = rows
      .map((r) => `${r.domain}: ${r.value ?? '—'} (${r.status})`)
      .join('\n');

    const evidence = rows.flatMap((r) => r.evidence).slice(0, 6);

    sections.push({
      id: section.id,
      title: section.title,
      summary,
      detail,
      evidence,
      claims: rows,
    });
  }

  if (sections.length === 0) {
    sections.push({
      id: 'understanding',
      title: '사업 이해',
      summary: living.judgmentSummary,
      detail: `사업: ${living.spine.business}\n고객: ${living.spine.customer}\n문제: ${living.spine.problem}`,
      evidence: [],
      claims: [],
    });
  }

  const uncertainCount = claimRows.filter(
    (r) => r.status === 'Unknown' || r.status === 'Needs check' || r.status === 'Conflict',
  ).length;

  return {
    coveragePercent: living.coveragePercent,
    judgmentSummary: living.judgmentSummary,
    closeoutLabel:
      uncertainCount > 0
        ? `1차 사업성 검토 완료 — 불확실/검증 필요 ${uncertainCount}항목 남음 (커버리지 ${living.coveragePercent}%)`
        : `1차 사업성 검토 완료 — 핵심 이해 정리됨 (커버리지 ${living.coveragePercent}%)`,
    sections,
    claimRows,
  };
}
