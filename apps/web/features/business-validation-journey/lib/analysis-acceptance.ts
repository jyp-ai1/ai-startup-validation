import {
  applyCitationTrace,
  type CitationCheck,
  type CitationTrace,
  type StoredSource,
} from './citation-reconciliation';
import type { AnalysisPacket } from './cross-review-contract';
import { readSource } from './founder-source';
import type {
  AnalysisAcceptanceRecord,
  AnalysisHypothesisEffect,
  AnalysisProviderSlot,
  HypothesisStance,
  JourneyState,
} from './journey-types';

export function acceptAnalysisResults(
  state: JourneyState,
  gemini: AnalysisPacket | null,
  gpt: AnalysisPacket | null,
  input: { now: string; sources?: StoredSource[] },
): { state: JourneyState; acceptance: AnalysisAcceptanceRecord; trace: CitationTrace } {
  const traced = applyCitationTrace(state, gemini, gpt, input.sources);
  const acceptance = buildAcceptance(state, gemini, gpt, traced.trace, input.now);
  return {
    trace: traced.trace,
    acceptance,
    state: {
      ...traced.state,
      judgmentText: state.judgmentText,
      judgmentStatus: 'judgment_deferred',
      hypothesisJudgments: state.hypothesisJudgments,
      sourceRecords: state.sourceRecords,
      researchStatus: 'research_not_run',
      counterReviewStatus: 'counter_review_not_run',
      analysisAcceptances: [...(state.analysisAcceptances ?? []), acceptance],
    },
  };
}

export function acceptanceSummary(records: AnalysisAcceptanceRecord[] | undefined): string {
  if (!records?.length) {
    return '분석 수용 기록 없음. 실행 결과가 없어 원문·가설·판단 사유를 연결하지 않는다.';
  }
  return records
    .map((record) => {
      const slots = [record.gemini, record.gpt]
        .map(
          (slot) =>
            `${slot.side} ${slot.executionId} ${slot.analysisStatus} ${slot.sourceCheck} ${slot.claimBearing}`,
        )
        .join(', ');
      const causes = record.causeIds.join(', ') || '없음';
      const kind = record.disposition === 'duplicate_delivery' ? '재전달' : '수용';
      return `${kind} ${record.id}. 교차 ${record.comparison}. 판단 변경 ${record.judgmentChanged}. 원인 ${causes}. ${slots}. ${record.reason}`;
    })
    .join(' ');
}

function buildAcceptance(
  state: JourneyState,
  gemini: AnalysisPacket | null,
  gpt: AnalysisPacket | null,
  trace: CitationTrace,
  now: string,
): AnalysisAcceptanceRecord {
  const prior = state.analysisAcceptances ?? [];
  const seen = indexExecutions(prior);
  const geminiSlot = slotFor('gemini', gemini, trace.citations[0], state);
  const gptSlot = slotFor('gpt', gpt, trace.citations[1], state);
  geminiSlot.replayed = isReplay(gemini, seen.gemini);
  gptSlot.replayed = isReplay(gpt, seen.gpt);
  const slots = [geminiSlot, gptSlot];
  const realSlots = slots.filter((slot) => slot.analysisStatus !== 'absent');
  const disposition = realSlots.length > 0 && realSlots.every((slot) => slot.replayed) ? 'duplicate_delivery' : 'recorded';
  const hypothesisEffects = effectsFor(state, slots);
  const causeIds = causeIdsFor(state, slots, hypothesisEffects);
  const conflictsWithExecutionIds = conflictsWith(prior, slots);
  const sourceIds = (state.sourceRecords ?? []).map((record) => record.id);
  return {
    id: `accept-${prior.length + 1}-${geminiSlot.executionId}-${gptSlot.executionId}`,
    receivedAt: now,
    disposition,
    gemini: geminiSlot,
    gpt: gptSlot,
    comparison: trace.review.outcome,
    verifiedFact: false,
    businessJudgment: 'preserved',
    judgmentChanged: false,
    judgmentStatus: 'judgment_deferred',
    previousJudgmentText: state.judgmentText,
    nextJudgmentText: state.judgmentText,
    causeIds,
    conflictsWithExecutionIds,
    reason: acceptanceReason(causeIds, slots, disposition, conflictsWithExecutionIds),
    hypothesisEffects,
    sourceIds,
  };
}

export function countedExecutionIds(records: AnalysisAcceptanceRecord[] | undefined): string[] {
  const ids: string[] = [];
  for (const record of records ?? []) {
    if (record.disposition === 'duplicate_delivery') continue;
    for (const slot of [record.gemini, record.gpt]) {
      if (slot.replayed || slot.analysisStatus === 'absent' || slot.analysisStatus === 'not_run') continue;
      if (!ids.includes(slot.executionId)) ids.push(slot.executionId);
    }
  }
  return ids;
}

export function separateStages(state: JourneyState) {
  const records = state.analysisAcceptances ?? [];
  return {
    recorded: records.filter((record) => record.disposition === 'recorded'),
    duplicateDeliveries: records.filter((record) => record.disposition === 'duplicate_delivery'),
    countedExecutionIds: countedExecutionIds(records),
    hypothesisCauses: (state.hypothesisJudgments ?? []).map((item) => ({
      hypothesisId: item.hypothesisId,
      stance: item.stance,
      causeId: item.causeId,
      reason: item.reason,
      verifiedFact: item.verifiedFact,
    })),
    sourceCauses: (state.sourceRecords ?? []).map((record) => ({
      id: record.id,
      causeId: record.causeId,
      effect: record.effect,
      reason: record.reason,
      text: record.text,
    })),
    businessJudgment: state.judgmentStatus,
    judgmentText: state.judgmentText,
    verifiedFact: false as const,
    researchStatus: state.researchStatus,
    counterReviewStatus: state.counterReviewStatus,
  };
}

export function liveScreenStatus(state: JourneyState) {
  return {
    researchStatus: state.researchStatus,
    counterReviewStatus: state.counterReviewStatus,
    judgmentStatus: state.judgmentStatus,
    comparison: 'not_compared' as const,
    acceptanceCount: (state.analysisAcceptances ?? []).length,
    analysisCompleted: false as const,
  };
}

function slotFor(
  side: 'gemini' | 'gpt',
  packet: AnalysisPacket | null,
  check: CitationCheck | undefined,
  state: JourneyState,
): AnalysisProviderSlot {
  const sourceCheck = check?.sourceCheck ?? 'uncheckable';
  const claimBearing = check?.claimBearing ?? 'unassessed';
  return {
    side,
    executionId: packet?.executionId ?? check?.executionId ?? `${side}-absent`,
    providerId: packet?.providerId ?? null,
    modelId: packet?.modelId ?? null,
    endpoint: packet?.endpoint ?? null,
    purpose: packet?.purpose ?? null,
    analysisStatus: packet?.status ?? 'absent',
    claim: packet?.claim ?? null,
    support: packet?.support ?? null,
    counter: packet?.counter ?? null,
    uncertainty: packet?.uncertainty ?? null,
    citedExcerpt: packet?.citedExcerpt ?? null,
    capturedSourceId: packet?.capturedSourceId ?? null,
    sourceCheck,
    claimBearing,
    hypothesisIds: packet?.hypothesisIds ?? [],
    verifiedFact: false,
    sourceConflict: conflictFor(packet, sourceCheck, claimBearing, state),
    replayed: false,
    reason: check?.reason ?? '분석 결과가 없다. 실패와 구분한다. 출처 확인으로 세지 않는다.',
  };
}

function conflictFor(
  packet: AnalysisPacket | null,
  sourceCheck: AnalysisProviderSlot['sourceCheck'],
  claimBearing: AnalysisProviderSlot['claimBearing'],
  state: JourneyState,
): AnalysisProviderSlot['sourceConflict'] {
  if (!packet || packet.status !== 'succeeded' || !packet.claim) return 'none';
  const reading = readSource(packet.claim);
  if (reading === 'none') return 'none';
  const opposes = packet.hypothesisIds.some((hypothesisId) => {
    const judgment = (state.hypothesisJudgments ?? []).find((item) => item.hypothesisId === hypothesisId);
    if (!judgment) return false;
    if (judgment.stance === 'held') return true;
    if (judgment.stance === 'supported' && reading === 'contradict_problem') return true;
    if (judgment.stance === 'contradicted' && reading === 'support_problem') return true;
    return false;
  });
  if (!opposes) return 'none';
  if (sourceCheck === 'matched' && claimBearing === 'grounded') return 'preserved';
  return 'not_established';
}

function effectsFor(state: JourneyState, slots: AnalysisProviderSlot[]): AnalysisHypothesisEffect[] {
  const ids = new Set<string>();
  for (const slot of slots) {
    if (slot.analysisStatus !== 'succeeded') continue;
    for (const hypothesisId of slot.hypothesisIds) ids.add(hypothesisId);
  }
  return [...ids].map((hypothesisId) => {
    const judgment = (state.hypothesisJudgments ?? []).find((item) => item.hypothesisId === hypothesisId);
    const stance: HypothesisStance | 'absent' = judgment?.stance ?? 'absent';
    return {
      hypothesisId,
      beforeStance: stance,
      afterStance: stance,
      changed: false,
      causeId: judgment?.causeId ?? null,
      reason: judgment
        ? `가설 ${hypothesisId}는 ${stance}로 유지한다. 원인 ${judgment.causeId}. 지불 의사, 구매, 반복 사용, 확장은 만들지 않는다.`
        : `가설 ${hypothesisId}의 판단 기록은 만들지 않는다.`,
    };
  });
}

function causeIdsFor(
  state: JourneyState,
  slots: AnalysisProviderSlot[],
  effects: AnalysisHypothesisEffect[],
): string[] {
  const ids = new Set<string>();
  for (const effect of effects) {
    if (effect.causeId) ids.add(effect.causeId);
  }
  for (const slot of slots) {
    const source = (state.sourceRecords ?? []).find((record) => record.id === slot.capturedSourceId);
    if (source) ids.add(source.causeId);
  }
  return [...ids];
}

function indexExecutions(records: AnalysisAcceptanceRecord[]) {
  const gemini = new Set<string>();
  const gpt = new Set<string>();
  for (const record of records) {
    if (record.disposition === 'duplicate_delivery') continue;
    collectExecution(gemini, record.gemini);
    collectExecution(gpt, record.gpt);
  }
  return { gemini, gpt };
}

function collectExecution(ids: Set<string>, slot: AnalysisProviderSlot) {
  if (slot.replayed || slot.analysisStatus === 'absent') return;
  ids.add(slot.executionId);
}

function isReplay(packet: AnalysisPacket | null, seen: Set<string>): boolean {
  if (!packet) return false;
  return seen.has(packet.executionId);
}

function conflictsWith(prior: AnalysisAcceptanceRecord[], slots: AnalysisProviderSlot[]): string[] {
  const ids: string[] = [];
  for (const slot of slots) {
    if (slot.replayed || slot.analysisStatus !== 'succeeded' || !slot.claim) continue;
    for (const record of prior) {
      if (record.disposition === 'duplicate_delivery') continue;
      for (const previous of [record.gemini, record.gpt]) {
        if (previous.replayed || previous.analysisStatus !== 'succeeded' || !previous.claim) continue;
        const overlap = slot.hypothesisIds.some((hypothesisId) => previous.hypothesisIds.includes(hypothesisId));
        if (!overlap || previous.claim.trim() === slot.claim.trim()) continue;
        if (!ids.includes(previous.executionId)) ids.push(previous.executionId);
      }
    }
  }
  return ids;
}

function acceptanceReason(
  causeIds: string[],
  slots: AnalysisProviderSlot[],
  disposition: AnalysisAcceptanceRecord['disposition'],
  conflictsWithExecutionIds: string[],
): string {
  if (disposition === 'duplicate_delivery') {
    const executions = slots
      .filter((slot) => slot.replayed)
      .map((slot) => slot.executionId)
      .join(', ');
    return `실행 ${executions}는 이미 기록되어 있다. 재전달을 새 분석으로 세지 않는다. 이전 기록과 사업 판단을 유지한다.`;
  }
  const causes = causeIds.join(', ') || '없음';
  const analysisConflict =
    conflictsWithExecutionIds.length > 0
      ? ` 기존 분석 ${conflictsWithExecutionIds.join(', ')}와 새 실행의 주장이 다르다. 양쪽 기록을 유지하고 어느 쪽도 채택하지 않는다.`
      : '';
  const conflicts = slots.filter((slot) => slot.sourceConflict === 'preserved');
  if (conflicts.length > 0) {
    const executions = conflicts.map((slot) => slot.executionId).join(', ');
    return `기존 원인 ${causes}의 원문과 분석 ${executions}의 주장이 충돌한다. 원문을 지우지 않고 한쪽을 고르지 않는다. 사업 판단은 유보한다.${analysisConflict}`;
  }
  const blocked = slots.filter((slot) => slot.sourceConflict === 'not_established');
  if (blocked.length > 0) {
    return `원인 ${causes}. 출처 대조가 끝나지 않았거나 발췌가 주장을 뒷받침하지 않는다. 주장을 반대 사실로 바꾸지 않는다. 사업 판단은 유보한다.${analysisConflict}`;
  }
  return `원인 ${causes}. 분석 결과를 기록했다. 가설 판단과 사업 판단을 바꾸지 않는다. 검증된 사실은 아니다.${analysisConflict}`;
}
