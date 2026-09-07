/**
 * DAY 8-I P0 FIX-6/7 — Problem priority correction (true replace, not append).
 */

import {
  CEO_JUDGMENT_DIMENSION_LABELS,
  type CeoJudgmentDimension,
} from './ai-pm-ceo-judgment-dimensions';
import {
  applyEvidenceToDimension,
  type JudgmentEvidenceRecord,
} from './ai-pm-judgment-evidence-model';
import { isAiPmJudgmentFix7V1Active } from './ai-pm-judgment-fix7-v1';
import { isAiPmJudgmentFix8V1Active } from './ai-pm-judgment-fix8-v1';
import { isAiPmJudgmentFix9V1Active } from './ai-pm-judgment-fix9-v1';

const PRIORITY_CORRECTION_RE =
  /(?:사실\s*)?(?:문제(?:는|가)?\s*)?(?:.+?)(?:보다|보다는)\s*(.+?)(?:이|가)\s*더\s*(?:큽|중요|심각)/i;

export type ProblemPriorityCorrection = {
  primaryProblem: string;
  relatedProblems: string[];
  evidence: string;
  fullEvidence: string;
  meaning: string;
};

function clip(text: string, max = 120): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

/** Detect CEO reprioritizing problems: "A보다 B가 더 큽니다". */
export function isProblemPriorityCorrection(answer: string): boolean {
  return PRIORITY_CORRECTION_RE.test(answer.trim());
}

function inferRelatedFromPrior(prior: CeoJudgmentDimension): string[] {
  const related: string[] = [];
  const records = prior.evidenceRecords ?? [];
  if (records.length > 0) {
    for (const r of records) {
      if (r.role === 'primary') continue;
      const text = `${r.span} ${r.meaning}`;
      if (/배송\s*누락/.test(text) && !related.includes('배송 누락')) related.push('배송 누락');
      if (/엑셀|카카오|카톡/.test(text) && !related.includes('엑셀/카카오톡 관리')) {
        related.push('엑셀/카카오톡 관리');
      }
      if (/분리|따로/.test(text) && !related.includes('주문·배송 분리 관리')) {
        related.push('주문·배송 분리 관리');
      }
      if (/10%|심각/.test(text) && !related.some((x) => /10%|심각/.test(x))) {
        related.push(r.meaning || r.span);
      }
    }
    if (related.length > 0) return related;
  }
  const text = `${prior.summary} ${prior.currentConclusion ?? ''}`;
  if (/배송\s*누락/.test(text)) related.push('배송 누락');
  if (/엑셀|카카오|카톡/.test(text)) related.push('엑셀/카카오톡 관리');
  return related;
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

  const relatedProblems: string[] = [];
  if (/배송\s*누락/.test(trimmed)) relatedProblems.push('배송 누락');

  const meaning = isAiPmJudgmentFix8V1Active()
    ? '주문 확인 시간이 배송 누락보다 더 큼'
    : primaryProblem;

  return {
    primaryProblem,
    relatedProblems,
    evidence: clip(trimmed),
    fullEvidence: trimmed,
    meaning,
  };
}

function renderProblemSummary(primary: string, related: string[]): string {
  const lines = [`PRIMARY: ${primary}`];
  if (related.length > 0) {
    lines.push('RELATED:');
    for (const r of related) lines.push(`- ${r}`);
  }
  return lines.join('\n');
}

function preservePriorRelatedRecords(prior: CeoJudgmentDimension): JudgmentEvidenceRecord[] {
  return (prior.evidenceRecords ?? [])
    .filter((r) => r.role !== 'primary')
    .map((r) => ({ ...r, role: 'related' as const }));
}

/** Merge priority correction — replaces PRIMARY, preserves prior RELATED evidence (FIX-9). */
export function mergeProblemPriorityCorrection(
  prior: CeoJudgmentDimension,
  correction: ProblemPriorityCorrection,
  sourceTurnIndex?: number,
  fullAnswer?: string,
): CeoJudgmentDimension {
  const evidenceSpan = fullAnswer?.trim() || correction.fullEvidence || correction.evidence;

  const relatedSet = new Set<string>();
  for (const r of correction.relatedProblems) relatedSet.add(r);
  for (const r of inferRelatedFromPrior(prior)) relatedSet.add(r);
  if (correction.relatedProblems.includes('배송 누락')) relatedSet.add('배송 누락');

  const related = [...relatedSet].slice(0, 4);

  const records: JudgmentEvidenceRecord[] = [
    {
      span: evidenceSpan,
      meaning: correction.primaryProblem,
      role: 'primary',
      sourceTurnIndex,
    },
  ];

  if (isAiPmJudgmentFix9V1Active()) {
    for (const preserved of preservePriorRelatedRecords(prior)) {
      if (!records.some((r) => r.span.trim() === preserved.span.trim())) {
        records.push(preserved);
      }
    }
  }

  for (const item of related) {
    if (records.some((r) => r.meaning.includes(item) || r.span.includes(item))) continue;
    records.push({
      span: item,
      meaning: item,
      role: 'related',
      sourceTurnIndex,
    });
  }

  const summary = isAiPmJudgmentFix7V1Active() || isAiPmJudgmentFix8V1Active()
    ? renderProblemSummary(correction.primaryProblem, [
        ...related,
        ...records
          .filter((r) => r.role === 'related' && /10%|심각/.test(`${r.span} ${r.meaning}`))
          .map((r) => r.meaning || r.span),
      ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4))
    : clip([correction.primaryProblem, ...related.map((r) => `${r}은(는) 관련 문제`)].join(' · '));

  return applyEvidenceToDimension(
    {
      ...prior,
      label: CEO_JUDGMENT_DIMENSION_LABELS.problem,
      status: 'clear',
      statusReason: 'CEO가 문제 우선순위를 수정함',
      evidenceRecords: records,
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
