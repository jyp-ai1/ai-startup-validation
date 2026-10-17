import { applyEvidenceTransition, emptyJudgment } from './judgment-transition';
import type {
  FounderSourceRecord,
  HypothesisJudgment,
  HypothesisStance,
  JourneyState,
} from './journey-types';

export const UNREVIEWED_HYPOTHESIS = '이 가설은 아직 원문으로 재평가하지 않았다.';

export const NOT_ESTABLISHED = ['지불 의사', '구매', '반복 사용', '확장'] as const;

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
  const reading = readSource(text);
  const prior = state.hypothesisJudgments ?? [];
  const effects = hypothesisIds.map((hypothesisId) =>
    effectFor(hypothesisId, reading, prior.find((item) => item.hypothesisId === hypothesisId), causeId),
  );
  const primary = effects.find((item) => item.effect === 'held') ?? effects.find((item) => item.effect === 'revised') ?? effects[0];
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
      : primary?.reason ?? '원문을 연결했다. 사업성 판단 유보를 유지한다.',
    effect: duplicate ? 'unchanged' : primary?.effect ?? 'unchanged',
    hypothesisBefore: primary?.before ?? UNREVIEWED_HYPOTHESIS,
    hypothesisAfter: duplicate ? primary?.before ?? UNREVIEWED_HYPOTHESIS : primary?.after ?? UNREVIEWED_HYPOTHESIS,
    stance: duplicate ? primary?.previousStance ?? 'unreviewed' : primary?.stance ?? 'unreviewed',
    notEstablished: [...NOT_ESTABLISHED],
  };
  const sourceRecords = duplicate ? (state.sourceRecords ?? []) : [...(state.sourceRecords ?? []), record];
  const hypothesisJudgments = duplicate ? prior : mergeJudgments(prior, effects, record.id, causeId);

  return {
    state: {
      ...state,
      sourceRecords,
      hypothesisJudgments,
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

type Reading = 'support_problem' | 'contradict_problem' | 'none';

export function readSource(text: string): Reading {
  if (/문제는 없|문제가 없|이미 한 화면|이미 한곳|해당하지 않|발생하지 않/.test(text)) {
    return 'contradict_problem';
  }
  if (/(발주|배송|주문)/.test(text) && /(따로|누락|혼선|불편|문제)/.test(text)) return 'support_problem';
  return 'none';
}

function effectFor(
  hypothesisId: string,
  reading: Reading,
  previous: HypothesisJudgment | undefined,
  causeId: string,
): {
  hypothesisId: string;
  effect: FounderSourceRecord['effect'];
  stance: HypothesisStance;
  previousStance: HypothesisStance;
  before: string;
  after: string;
  reason: string;
} {
  const before = previous?.after ?? UNREVIEWED_HYPOTHESIS;
  const previousStance = previous?.stance ?? 'unreviewed';
  if (hypothesisId !== 'h-problem' || reading === 'none') {
    return {
      hypothesisId,
      effect: 'unchanged',
      stance: previousStance,
      previousStance,
      before,
      after: before,
      reason:
        reading === 'none'
          ? '이 원문은 기존 판단을 바꿀 근거가 아니다. 사업성 판단 유보를 유지한다.'
          : '이 원문은 문제 서술이다. 지불 의사, 구매, 반복 사용, 확장은 검증하지 않는다. 사업성 판단 유보를 유지한다.',
    };
  }

  const nextStance: HypothesisStance = reading === 'support_problem' ? 'supported' : 'contradicted';
  const conflict =
    (previousStance === 'supported' && nextStance === 'contradicted') ||
    (previousStance === 'contradicted' && nextStance === 'supported');
  if (conflict) {
    return {
      hypothesisId,
      effect: 'held',
      stance: 'held',
      previousStance,
      before,
      after: `문제 가설은 기존 원문과 원인 ${causeId}가 충돌한다. 사업 결론은 확정하지 않고 유보한다.`,
      reason: `문제 가설의 원문이 충돌한다. 원인 ${causeId}. 지불 의사, 구매, 반복 사용, 확장은 검증하지 않는다. 사업성 판단 유보를 유지한다.`,
    };
  }
  const verb = nextStance === 'supported' ? '지지한다' : '어긋난다';
  return {
    hypothesisId,
    effect: 'revised',
    stance: nextStance,
    previousStance,
    before,
    after: `문제 가설은 원인 ${causeId}의 원문이 ${verb}. 사업 전체의 결론은 확정하지 않는다.`,
    reason: `문제 가설만 재평가했다. 원인 ${causeId}. 지불 의사, 구매, 반복 사용, 확장은 검증하지 않는다. 사업성 판단 유보를 유지한다.`,
  };
}

function mergeJudgments(
  prior: HypothesisJudgment[],
  effects: ReturnType<typeof effectFor>[],
  sourceId: string,
  causeId: string,
): HypothesisJudgment[] {
  const next = [...prior];
  for (const effect of effects) {
    if (effect.effect === 'unchanged') continue;
    const judgment: HypothesisJudgment = {
      hypothesisId: effect.hypothesisId,
      before: effect.before,
      after: effect.after,
      stance: effect.stance,
      causeId,
      sourceId,
      reason: effect.reason,
      verifiedFact: false,
      notEstablished: [...NOT_ESTABLISHED],
    };
    const index = next.findIndex((item) => item.hypothesisId === effect.hypothesisId);
    if (index >= 0) next[index] = judgment;
    else next.push(judgment);
  }
  return next;
}

function missingFields(text: string, causeId: string, hypothesisIds: string[]): string[] {
  const missing: string[] = [];
  if (!text) missing.push('원문');
  if (!causeId) missing.push('원인 ID');
  if (hypothesisIds.length === 0) missing.push('관련 가설');
  return missing;
}
