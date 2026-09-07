/**
 * DAY 8-I P0 FIX-6 — Problem priority correction (replace primary, demote prior).
 */

import {
  CEO_JUDGMENT_DIMENSION_LABELS,
  type CeoJudgmentDimension,
} from './ai-pm-ceo-judgment-dimensions';
import {
  applyEvidenceToDimension,
  type JudgmentEvidenceRecord,
} from './ai-pm-judgment-evidence-model';
import { isSemanticCopy } from './ai-pm-judgment-target-binding';

const PRIORITY_CORRECTION_RE =
  /(?:사실\s*)?(?:문제(?:는|가)?\s*)?(?:.+?)(?:보다|보다는)\s*(.+?)(?:이|가)\s*더\s*(?:큽|중요|심각)/i;

const DEMOTED_PROBLEM_RE = /(.+?)(?:보다|보다는)\s*(?:주문\s*확인|확인\s*시간|배송\s*누락|[^,.;]{2,24})/i;

export type ProblemPriorityCorrection = {
  primaryProblem: string;
  relatedProblem?: string;
  evidence: string;
  meaning: string;
};

function clip(text: string, max = 96): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

/** Detect CEO reprioritizing problems: "A보다 B가 더 큽니다". */
export function isProblemPriorityCorrection(answer: string): boolean {
  return PRIORITY_CORRECTION_RE.test(answer.trim());
}

/** Extract priority correction meaning from CEO answer (T22). */
export function extractProblemPriorityCorrection(answer: string): ProblemPriorityCorrection | null {
  const trimmed = answer.trim();
  const m = trimmed.match(PRIORITY_CORRECTION_RE);
  if (!m) return null;

  const primaryRaw = m[1]?.trim() ?? '';
  const primaryProblem = /확인\s*시간|주문\s*확인/.test(primaryRaw)
    ? '주문 확인 시간이 핵심 문제'
    : clip(`${primaryRaw}이(가) 핵심 문제`);

  let relatedProblem: string | undefined;
  const demoted = trimmed.match(/(?:배송\s*누락|[^,.;]{2,20})(?:보다|보다는)/i)?.[0];
  if (demoted) {
    relatedProblem = demoted.replace(/(?:보다|보다는)\s*$/, '').trim();
    if (/배송\s*누락/.test(relatedProblem)) relatedProblem = '배송 누락';
  } else if (/배송\s*누락/.test(trimmed)) {
    relatedProblem = '배송 누락';
  }

  const evidenceMatch = trimmed.match(/(?:주문\s*확인\s*시간[^,.;]{0,16}|확인\s*시간[^,.;]{0,16}).*?(?:더\s*큽|더\s*큼|더\s*중요)/i);
  const evidence = clip(evidenceMatch?.[0]?.trim() || primaryRaw || trimmed, 48);

  return {
    primaryProblem,
    relatedProblem,
    evidence,
    meaning: primaryProblem,
  };
}

function priorRelatedFacts(prior: CeoJudgmentDimension): string[] {
  const fromRecords = (prior.evidenceRecords ?? [])
    .filter((r) => r.role !== 'primary')
    .map((r) => r.meaning || r.span);
  if (fromRecords.length > 0) return fromRecords;

  return prior.summary
    .replace(/…$/, '')
    .split(/\s*·\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);
}

/** Merge priority correction — primary replaces, prior facts become related. */
export function mergeProblemPriorityCorrection(
  prior: CeoJudgmentDimension,
  correction: ProblemPriorityCorrection,
  sourceTurnIndex?: number,
): CeoJudgmentDimension {
  const records: JudgmentEvidenceRecord[] = [
    {
      span: correction.evidence,
      meaning: correction.primaryProblem,
      role: 'primary',
      sourceTurnIndex,
    },
  ];

  const related = correction.relatedProblem?.trim();
  if (related) {
    records.push({
      span: related,
      meaning: `${related}은(는) 관련 문제`,
      role: 'related',
      sourceTurnIndex,
    });
  }

  for (const fact of priorRelatedFacts(prior)) {
    if (isSemanticCopy(fact, correction.primaryProblem)) continue;
    if (related && isSemanticCopy(fact, related)) continue;
    if (/핵심\s*문제/.test(fact)) continue;
    records.push({
      span: fact,
      meaning: fact,
      role: 'supporting',
    });
  }

  const relatedParts = records
    .filter((r) => r.role === 'related')
    .map((r) => `${r.span}은(는) 관련 문제`);
  const supporting = records
    .filter((r) => r.role === 'supporting')
    .map((r) => r.meaning)
    .slice(0, 3);

  const summaryParts = [correction.primaryProblem, ...relatedParts, ...supporting];
  const summary = clip(summaryParts.join(' · '));

  return applyEvidenceToDimension(
    {
      ...prior,
      label: CEO_JUDGMENT_DIMENSION_LABELS.problem,
      status: 'clear',
      statusReason: 'CEO가 문제 우선순위를 수정함',
    },
    {
      conclusion: correction.primaryProblem,
      summary,
      records,
      sourceTurnIndex,
      correctionApplied: true,
    },
  );
}
