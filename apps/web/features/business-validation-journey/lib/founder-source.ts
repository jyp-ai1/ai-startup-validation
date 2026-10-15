import { applyEvidenceTransition, emptyJudgment } from './judgment-transition';
import type { FounderSourceRecord, JourneyState } from './journey-types';

export const SOURCE_HYPOTHESES = [
  { id: 'h-customer', label: '고객' },
  { id: 'h-problem', label: '문제' },
  { id: 'h-solution', label: '해결책' },
  { id: 'h-payer', label: '지불자' },
  { id: 'h-revenue', label: '수익' },
] as const;

export function sourceHash(text: string): string {
  let hash = 5381;
  for (const char of text.trim()) hash = (hash * 33) ^ char.charCodeAt(0);
  return `src-${(hash >>> 0).toString(16)}`;
}

export function attachFounderSource(
  state: JourneyState,
  input: { text: string; hypothesisIds: string[]; causeId: string; now: string },
): { state: JourneyState; missing: string[]; reason: string; transitionRan: boolean } {
  const text = input.text.trim();
  const causeId = input.causeId.trim();
  const hypothesisIds = [...new Set(input.hypothesisIds.filter(Boolean))];
  const missing = missingFields(text, causeId, hypothesisIds);
  if (missing.length > 0) {
    return {
      state,
      missing,
      reason: `빠진 항목: ${missing.join(', ')}. 판단 문장은 바꾸지 않는다.`,
      transitionRan: false,
    };
  }

  const pageHash = sourceHash(text);
  const existing = (state.sourceRecords ?? []).map((record) => ({
    id: record.causeId,
    url: `founder-paste:${record.id}`,
    excerpt: record.excerpt,
    pageHash: record.pageHash,
  }));
  const transition = applyEvidenceTransition({
    previous: emptyJudgment(state.judgmentText),
    captures: existing,
    capture: {
      id: causeId,
      url: `founder-paste:${causeId}`,
      excerpt: text.slice(0, 240),
      pageHash,
    },
    proposedText: state.judgmentText,
    affectedHypothesisIds: hypothesisIds,
    round: 1,
  });
  const duplicate = transition.execution === 'duplicate_evidence';
  const record: FounderSourceRecord = {
    id: `paste-${pageHash}`,
    sourceKind: 'founder_paste',
    text,
    excerpt: text.slice(0, 240),
    pageHash,
    hypothesisIds,
    causeId,
    receivedAt: input.now,
    previousJudgmentText: state.judgmentText,
    nextJudgmentText: state.judgmentText,
    judgmentStatus: 'judgment_deferred',
    verifiedFact: false,
    claimLabel: '창업자가 붙인 원문 · 검증된 사실 아님',
    relevance: 'unconfirmed',
    accepted: false,
    duplicate,
    reason: duplicate
      ? '같은 원문 해시다. 새 근거로 세지 않고 판단 유보를 유지한다.'
      : '원문과 원인 ID를 가설에 연결했다. 이 원문만으로는 판단 근거가 충분하지 않다. 판단 유보를 유지한다.',
  };
  const sourceRecords = duplicate ? (state.sourceRecords ?? []) : [...(state.sourceRecords ?? []), record];

  return {
    state: {
      ...state,
      sourceRecords,
      judgmentText: state.judgmentText,
      judgmentStatus: 'judgment_deferred',
      researchStatus: 'research_not_run',
      counterReviewStatus: 'counter_review_not_run',
    },
    missing: [],
    reason: record.reason,
    transitionRan: true,
  };
}

function missingFields(text: string, causeId: string, hypothesisIds: string[]): string[] {
  const missing: string[] = [];
  if (!text) missing.push('원문');
  if (!causeId) missing.push('원인 ID');
  if (hypothesisIds.length === 0) missing.push('관련 가설');
  return missing;
}
