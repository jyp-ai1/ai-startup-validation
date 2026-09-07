/**
 * DAY 8-I P0 FIX-8 — Canonical current judgment state (not sentence storage).
 * Each dimension holds one current conclusion + evidence[] + sourceTurns[] + status.
 */

import {
  CEO_JUDGMENT_DIMENSION_LABELS,
  type CeoJudgmentDimension,
  type CeoJudgmentDimensionId,
  type CeoJudgmentState,
} from './ai-pm-ceo-judgment-dimensions';
import {
  applyEvidenceToDimension,
  type JudgmentEvidenceRecord,
} from './ai-pm-judgment-evidence-model';
import { renderProblemStructuredReview } from './ai-pm-judgment-structured-review';
import { isSemanticCopy } from './ai-pm-judgment-target-binding';
import { isAiPmJudgmentFix9V1Active } from './ai-pm-judgment-fix9-v1';
import { isAiPmJudgmentFix10V1Active } from './ai-pm-judgment-fix10-v1';
import { extractProblemPrimaryText } from './ai-pm-judgment-problem-primary';
import {
  inferenceStatusReason,
  resolveCustomerJudgmentStatus,
} from './ai-pm-judgment-trust-policy';

export const CUSTOMER_CHANGE_CLAIM_LABEL = '고객에게 달라질 것으로 보는 점';

export type CustomerChangeProvenance = {
  claim: string;
  status: 'needs_check';
  sourceTurnIndex: number | null;
  validation: 'pending';
  evidenceType: 'hypothesis' | 'expectation' | 'fact';
};

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/** True when incoming customer evidence narrows an established broader customer definition. */
export function isNarrowingCustomerEvidence(priorSummary: string, incoming: string): boolean {
  const prior = normalizeText(priorSummary);
  const next = normalizeText(incoming);
  if (!prior || !next || prior === next) return false;
  if (isSemanticCopy(prior, next)) return false;

  const priorHasBreadth = /반찬|꽃집|사장|포함|주\s*고객|등/.test(prior);
  const nextIsSegmentOnly =
    /^(?:소규모\s*)?(?:양조장|반찬가게|꽃집)(?:이|가|은|는)?$/.test(next) ||
    (next.length <= 12 && /양조장|반찬|꽃집/.test(next) && !/포함|사장|주\s*고객/.test(next));

  if (priorHasBreadth && nextIsSegmentOnly) return true;

  const priorFlat = prior.replace(/[^\p{L}\p{N}]/gu, '');
  const nextFlat = next.replace(/[^\p{L}\p{N}]/gu, '');
  if (priorFlat.includes(nextFlat) && priorFlat.length > nextFlat.length + 6) return true;

  return false;
}

function summarizeCustomerCorrection(answer: string): string {
  const trimmed = answer.trim();
  if (/반찬|꽃집/.test(trimmed) && /포함|만이\s*아니라/.test(trimmed)) {
    return '양조장, 반찬가게, 꽃집 포함';
  }
  if (/포함/.test(trimmed)) return clip(trimmed);
  return clip(trimmed);
}

function clip(text: string, max = 120): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function recordKey(r: JudgmentEvidenceRecord): string {
  return `${r.role}:${r.span.trim()}:${r.meaning.trim()}`;
}

function upsertRecord(
  records: JudgmentEvidenceRecord[],
  incoming: JudgmentEvidenceRecord,
): JudgmentEvidenceRecord[] {
  const withoutDup = records.filter((r) => !isSemanticCopy(r.span, incoming.span));
  if (incoming.role === 'primary') {
    return [incoming, ...withoutDup.filter((r) => r.role !== 'primary')];
  }
  if (withoutDup.some((r) => recordKey(r) === recordKey(incoming))) return withoutDup;
  return [...withoutDup, incoming];
}

function inferRelatedFromRecords(records: JudgmentEvidenceRecord[]): string[] {
  const related: string[] = [];
  for (const r of records) {
    if (r.role === 'primary') continue;
    const text = `${r.span} ${r.meaning}`;
    if (/10%|심각/.test(text)) {
      const full = normalizeText(r.span.length >= r.meaning.length ? r.span : r.meaning);
      if (!related.some((x) => /10%|심각/.test(x))) related.push(full);
      continue;
    }
    if (/배송\s*누락/.test(text) && !related.includes('배송 누락')) related.push('배송 누락');
    if (/엑셀|카카오|카톡/.test(text) && !related.includes('엑셀/카카오톡 관리')) {
      related.push('엑셀/카카오톡 관리');
    }
    if (/분리\s*관리|따로\s*관리/.test(text) && !related.includes('주문·배송 분리 관리')) {
      related.push('주문·배송 분리 관리');
    }
    if (/놓치|재주문/.test(text) && !related.some((x) => /놓치|재주문/.test(x))) {
      related.push(normalizeText(r.meaning || r.span));
    }
  }
  return related.slice(0, 4);
}

function rebuildProblemSummary(
  primary: string,
  related: string[],
): string {
  const lines = [`PRIMARY: ${primary}`];
  if (related.length > 0) {
    lines.push('RELATED:');
    for (const r of related) lines.push(`- ${r}`);
  }
  return lines.join('\n');
}

/** Merge problem dimension without string append — evidence records are canonical. */
export function mergeCanonicalProblem(
  prior: CeoJudgmentDimension,
  input: {
    conclusion: string;
    evidence: string;
    meaning: string;
    sourceTurnIndex?: number;
    isSeverity?: boolean;
  },
): CeoJudgmentDimension {
  const span = input.evidence.trim();
  const meaning = input.meaning.trim() || input.conclusion.trim();

  let records = [...(prior.evidenceRecords ?? [])];
  const hasPrimary = records.some((r) => r.role === 'primary');

  if (!hasPrimary) {
    records = upsertRecord(records, {
      span,
      meaning: input.conclusion.trim() || meaning,
      role: 'primary',
      sourceTurnIndex: input.sourceTurnIndex,
    });
  } else if (input.isSeverity || /10%|심각/.test(span)) {
    records = upsertRecord(records, {
      span,
      meaning,
      role: 'related',
      sourceTurnIndex: input.sourceTurnIndex,
    });
  } else if (!records.some((r) => isSemanticCopy(r.span, span) || isSemanticCopy(r.meaning, meaning))) {
    records = upsertRecord(records, {
      span,
      meaning,
      role: 'related',
      sourceTurnIndex: input.sourceTurnIndex,
    });
  }

  const primary = records.find((r) => r.role === 'primary');
  const primaryConclusion = prior.correctionApplied
    ? prior.currentConclusion ?? primary?.meaning ?? input.conclusion
    : clip((primary?.meaning ?? input.conclusion).split(/\s*·\s*/)[0] ?? input.conclusion);

  const related = inferRelatedFromRecords(records.filter((r) => r.role !== 'primary'));
  const summary = rebuildProblemSummary(primaryConclusion, related);

  return applyEvidenceToDimension(
    {
      ...prior,
      label: CEO_JUDGMENT_DIMENSION_LABELS.problem,
      status: prior.status === 'unknown' ? 'needs_check' : prior.status,
      statusReason: 'CEO 답변 evidence — canonical problem state',
      evidenceRecords: records,
    },
    {
      conclusion: primaryConclusion,
      summary,
      records,
      sourceTurnIndex: input.sourceTurnIndex,
    },
  );
}

/** Single current customer conclusion — replace only on explicit correction. */
export function mergeCanonicalCustomer(
  prior: CeoJudgmentDimension,
  input: {
    conclusion: string;
    evidence: string;
    sourceTurnIndex?: number;
    isCorrection?: boolean;
    fullAnswer?: string;
    fromInference?: boolean;
  },
): CeoJudgmentDimension {
  const conclusion = input.isCorrection && isAiPmJudgmentFix9V1Active()
    ? summarizeCustomerCorrection(input.fullAnswer ?? input.evidence)
    : input.conclusion;
  const evidence = input.evidence.trim();

  if (
    isAiPmJudgmentFix9V1Active() &&
    !input.isCorrection &&
    prior.summary.trim() &&
    isNarrowingCustomerEvidence(prior.summary, conclusion)
  ) {
    const supporting: JudgmentEvidenceRecord = {
      span: evidence,
      meaning: conclusion,
      role: 'supporting',
      sourceTurnIndex: input.sourceTurnIndex,
    };
    const records = upsertRecord(prior.evidenceRecords ?? [], supporting);
    return applyEvidenceToDimension(
      {
        ...prior,
        label: CEO_JUDGMENT_DIMENSION_LABELS.customer,
        status: prior.status === 'unknown' ? 'clear' : prior.status,
        evidenceRecords: records,
      },
      {
        conclusion: prior.currentConclusion ?? prior.summary,
        summary: prior.summary,
        records: [supporting],
        sourceTurnIndex: input.sourceTurnIndex,
      },
    );
  }

  const record: JudgmentEvidenceRecord = {
    span: evidence,
    meaning: conclusion,
    role: 'primary',
    sourceTurnIndex: input.sourceTurnIndex,
  };
  const records = input.isCorrection
    ? [record]
    : prior.evidenceRecords?.length
      ? prior.evidenceRecords
      : [record];

  if (isAiPmJudgmentFix10V1Active()) {
    const resolved = resolveCustomerJudgmentStatus({
      conclusion,
      fromInference: input.fromInference,
      isCorrection: input.isCorrection,
    });
    const statusReason =
      resolved.knowledgeSource === 'ai_inference'
        ? inferenceStatusReason('customer')
        : resolved.status === 'clear'
          ? input.isCorrection
            ? 'CEO가 고객 정의를 수정함'
            : 'CEO가 직접 확인함'
          : 'CEO 답변 — 추가 확인 필요';

    return applyEvidenceToDimension(
      {
        ...prior,
        label: CEO_JUDGMENT_DIMENSION_LABELS.customer,
        status: resolved.status,
        statusReason,
        knowledgeSource: resolved.knowledgeSource,
        correctionApplied: input.isCorrection ?? prior.correctionApplied,
        evidenceRecords: records,
      },
      {
        conclusion,
        summary: clip(conclusion),
        records: input.isCorrection ? [record] : records,
        sourceTurnIndex: input.sourceTurnIndex,
        correctionApplied: input.isCorrection ?? prior.correctionApplied,
      },
    );
  }

  return applyEvidenceToDimension(
    {
      ...prior,
      label: CEO_JUDGMENT_DIMENSION_LABELS.customer,
      status: 'clear',
      statusReason: input.isCorrection ? 'CEO가 고객 정의를 수정함' : 'CEO 답변에 구체적으로 나타남',
      correctionApplied: input.isCorrection ?? prior.correctionApplied,
      evidenceRecords: records,
    },
    {
      conclusion,
      summary: clip(conclusion),
      records: input.isCorrection ? [record] : records,
      sourceTurnIndex: input.sourceTurnIndex,
      correctionApplied: input.isCorrection ?? prior.correctionApplied,
    },
  );
}

/** Customer change — claim/hypothesis only; never promote to clear without validation. */
export function mergeCanonicalCustomerChange(
  prior: CeoJudgmentDimension,
  input: {
    conclusion: string;
    evidence: string;
    sourceTurnIndex?: number;
    evidenceType?: 'fact' | 'hypothesis' | 'expectation';
  },
): CeoJudgmentDimension {
  const isClaim =
    input.evidenceType === 'hypothesis' ||
    input.evidenceType === 'expectation' ||
    prior.evidenceType === 'hypothesis' ||
    prior.evidenceType === 'expectation';

  const record: JudgmentEvidenceRecord = {
    span: input.evidence,
    meaning: input.conclusion,
    role: 'primary',
    sourceTurnIndex: input.sourceTurnIndex,
  };

  const records = upsertRecord(prior.evidenceRecords ?? [], record);
  const evidenceType = input.evidenceType ?? prior.evidenceType ?? (isClaim ? 'expectation' : 'fact');

  return applyEvidenceToDimension(
    {
      ...prior,
      label: CUSTOMER_CHANGE_CLAIM_LABEL,
      status: 'needs_check',
      statusReason:
        evidenceType === 'hypothesis'
          ? 'CEO 가설 — 아직 검증되지 않음'
          : evidenceType === 'expectation'
            ? 'CEO 기대효과 — 아직 검증되지 않음'
            : 'CEO 주장 — 아직 검증되지 않음',
      evidenceType,
      evidenceRecords: records,
    },
    {
      conclusion: input.conclusion,
      summary: clip(input.conclusion),
      records: [record],
      sourceTurnIndex: input.sourceTurnIndex,
    },
  );
}

export function buildCustomerChangeProvenance(d: CeoJudgmentDimension): CustomerChangeProvenance | null {
  if (d.status === 'unknown' && !d.summary.trim() && !(d.evidenceRecords?.length)) return null;
  const primary = d.evidenceRecords?.find((r) => r.role === 'primary') ?? d.evidenceRecords?.[0];
  return {
    claim: d.currentConclusion ?? primary?.meaning ?? d.summary,
    status: 'needs_check',
    sourceTurnIndex: primary?.sourceTurnIndex ?? d.sourceTurns?.[0] ?? null,
    validation: 'pending',
    evidenceType:
      d.evidenceType === 'hypothesis' || d.evidenceType === 'expectation'
        ? d.evidenceType
        : 'expectation',
  };
}

/** Sync dimension display summary from canonical evidence — never re-combine strings. */
export function syncDimensionCanonicalDisplay(d: CeoJudgmentDimension): CeoJudgmentDimension {
  if (d.id === 'problem') {
    const primary = d.evidenceRecords?.find((r) => r.role === 'primary');
    if (!primary?.meaning?.trim() && !primary?.span?.trim() && d.status === 'unknown') {
      return { ...d, summary: '' };
    }
    const related = inferRelatedFromRecords(d.evidenceRecords ?? []);
    const conclusion = d.currentConclusion ?? primary?.meaning ?? extractProblemPrimaryText(d.summary);
    if (!conclusion.trim()) {
      return { ...d, summary: '' };
    }
    return {
      ...d,
      summary: rebuildProblemSummary(conclusion, related),
    };
  }
  if (d.id === 'customerChange') {
    const hasClaim =
      Boolean(d.summary.trim() || d.currentConclusion?.trim()) ||
      Boolean(d.evidenceRecords?.some((r) => r.span.trim() || r.meaning.trim()));
    if (!hasClaim) {
      return {
        ...d,
        label: CEO_JUDGMENT_DIMENSION_LABELS.customerChange,
        status: 'unknown',
        summary: '',
      };
    }
    return {
      ...d,
      label: CUSTOMER_CHANGE_CLAIM_LABEL,
      status: 'needs_check',
      summary: clip(d.currentConclusion ?? d.summary),
    };
  }
  if (d.id === 'solution' && (d.solutionLayers || d.summary.includes('- 접근:'))) {
    return d;
  }
  if (d.currentConclusion?.trim()) {
    return { ...d, summary: clip(d.currentConclusion) };
  }
  return d;
}

/** Apply canonical display sync across all dimensions in state. */
export function syncCanonicalJudgmentState(state: CeoJudgmentState): CeoJudgmentState {
  const ids: CeoJudgmentDimensionId[] = ['customer', 'problem', 'solution', 'customerChange'];
  const dimensions = { ...state.dimensions };
  for (const id of ids) {
    dimensions[id] = syncDimensionCanonicalDisplay(dimensions[id]);
  }
  return { ...state, dimensions };
}

/** True when problem has a primary evidence record (not empty canonical state). */
export function hasCanonicalProblemPrimary(d: CeoJudgmentDimension): boolean {
  return Boolean(
    d.evidenceRecords?.some((r) => r.role === 'primary' && (r.meaning.trim() || r.span.trim())),
  );
}

/** Problem display must not use accumulative · chains (FIX-8 gate). */
export function isAccumulativeProblemSummary(summary: string): boolean {
  if (/PRIMARY:/.test(summary)) return false;
  return summary.includes(' · ');
}

export function renderCanonicalProblemForReview(d: CeoJudgmentDimension): string {
  return renderProblemStructuredReview(syncDimensionCanonicalDisplay(d));
}
