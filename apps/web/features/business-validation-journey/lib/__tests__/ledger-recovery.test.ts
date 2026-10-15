import { describe, expect, it, vi } from 'vitest';

import { countedExecutionIds } from '../analysis-acceptance';
import { canonicalExecution, type AnalysisExecutionRequest } from '../execution-contract';
import { LEDGER_POLICY, type ExecutionLedgerEntry } from '../execution-ledger';
import { attachFounderSource } from '../founder-source';
import { startJourney } from '../journey-engine';
import { JUDGMENT_TEXT, TEST_HYPOTHESIS_INTAKE } from '../journey-types';
import {
  armSimulatedWriteFailure,
  createSimulatedLedgerLog,
  foldLedgerLog,
  proposeCrashRecovery,
  recordAcceptance,
  recordFailure,
  recordRecovery,
  recordRegistration,
  recordResponse,
  recordSlot,
  RECOVERY_SCENARIOS,
  SIMULATION_ASSURANCE,
  type LedgerLogRecord,
  type SimulatedLedgerLog,
} from '../ledger-recovery';

const NOW = '2026-10-15T05:40:00.000Z';
const LATER = '2026-10-15T05:50:00.000Z';
const SOURCE = '물류본부 발주 담당자가 주문 화면과 배송 화면이 따로라 누락이 생긴다고 말했다';
const EXCERPT = '주문 화면과 배송 화면이 따로';
const PROBLEM_CLAIM = '문제 가설은 발주와 배송이 나뉜다는 원문과 맞는다.';

function started() {
  const result = startJourney(TEST_HYPOTHESIS_INTAKE, 'test_hypothesis');
  if (!result.ok) throw new Error('start failed');
  return result.state;
}

function withSource() {
  const result = attachFounderSource(started(), {
    text: SOURCE,
    hypothesisIds: ['h-problem'],
    causeId: 'cause-support',
    now: NOW,
  });
  const record = result.state.sourceRecords[0];
  if (!record) throw new Error('source missing');
  return { state: result.state, sourceId: record.id };
}

function request(
  side: 'gemini' | 'gpt',
  sourceId: string | null,
  patch: Partial<AnalysisExecutionRequest> = {},
): AnalysisExecutionRequest {
  return canonicalExecution(side, {
    executionId: side === 'gemini' ? 'exec-gemini-1' : 'exec-gpt-1',
    status: 'succeeded',
    inputSnapshot: {
      snapshotId: side === 'gemini' ? 'snap-gemini-1' : 'snap-gpt-1',
      answerIds: ['ans-1'],
      evidenceIds: [sourceId ?? 'evidence-missing'],
      hypothesisIds: ['h-problem'],
      causeIds: ['cause-support'],
    },
    claim: PROBLEM_CLAIM,
    support: EXCERPT,
    counter: null,
    uncertainty: '지불 의사는 이 문장에 없다.',
    citedExcerpt: EXCERPT,
    capturedSourceId: sourceId,
    ...patch,
  });
}

function expectSimulation(result: { storeKind: string; restartedProcess: boolean; durableVerified: boolean }) {
  expect(result.storeKind).toBe('in_memory_simulation');
  expect(result.restartedProcess).toBe(false);
  expect(result.durableVerified).toBe(false);
  expect(SIMULATION_ASSURANCE.durableVerified).toBe(false);
  expect(SIMULATION_ASSURANCE.restartedProcess).toBe(false);
}

function entryRecords(log: SimulatedLedgerLog) {
  return log.records.filter((record): record is Extract<LedgerLogRecord, { type: 'entry' }> => record.type === 'entry');
}

describe('simulated ledger recovery contract', () => {
  it('lists seven recovery scenarios and does not call the network', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network must stay closed'));
    const { sourceId } = withSource();
    const registered = recordRegistration(createSimulatedLedgerLog(), request('gemini', sourceId), NOW);
    const opened = recordSlot(registered.log, 'exec-gemini-1', NOW);
    const recovered = recordRecovery(opened.log, LATER);

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    expect(RECOVERY_SCENARIOS.map((item) => item.id)).toEqual([
      'registered_before_call',
      'slot_without_confirmed_send',
      'response_before_acceptance',
      'accepted_redelivery',
      'store_write_failure',
      'provider_arrival_order',
      'duplicate_execution_id',
    ]);
    expect(RECOVERY_SCENARIOS.every((item) => item.automaticRetry === false)).toBe(true);
    expectSimulation(registered);
    expectSimulation(opened);
    expectSimulation(recovered);
    expect(LEDGER_POLICY.geminiMaxCalls).toBe(1);
    expect(LEDGER_POLICY.gptMaxCalls).toBe(1);
    expect(LEDGER_POLICY.outputTokenCap).toBe(1024);
    expect(LEDGER_POLICY.priceStatus).toBe('unconfirmed');
    expect(LEDGER_POLICY.autoRetry).toBe(false);
  });

  it('keeps a registration when recovery runs before a slot is opened', () => {
    const { sourceId } = withSource();
    const registered = recordRegistration(createSimulatedLedgerLog(), request('gemini', sourceId), NOW);
    const first = entryRecords(registered.log)[0];
    const recovered = recordRecovery(registered.log, LATER);
    const laterSlot = recordSlot(recovered.log, 'exec-gemini-1', LATER);

    expectSimulation(recovered);
    expect(recovered.wrote).toBe(false);
    expect(recovered.ledger.entries[0]?.phase).toBe('registered');
    expect(recovered.ledger.entries[0]?.callsOpened).toBe(0);
    expect(recovered.ledger.entries[0]?.networkCalled).toBe(false);
    expect(recovered.log.records[0]).toBe(first);
    expect(laterSlot.opened).toBe(true);
    expect(laterSlot.entry?.phase).toBe('in_progress');
    expect(laterSlot.entry?.networkCalled).toBe(false);
    expect(entryRecords(laterSlot.log)[0]).toBe(first);
  });

  it('marks an opened slot unconfirmed without treating the slot as a confirmed send', () => {
    const { state, sourceId } = withSource();
    const opened = recordSlot(recordRegistration(createSimulatedLedgerLog(), request('gemini', sourceId), NOW).log, 'exec-gemini-1', NOW);
    const slotEvent = entryRecords(opened.log).at(-1);
    const recovered = recordRecovery(opened.log, LATER);
    const retry = recordSlot(
      recordRegistration(recovered.log, request('gemini', sourceId, { executionId: 'exec-gemini-2' }), LATER).log,
      'exec-gemini-2',
      LATER,
    );

    expect(opened.entry?.callsOpened).toBe(1);
    expect(opened.entry?.networkCalled).toBe(false);
    expect(recovered.wrote).toBe(true);
    expect(recovered.proposed.entries[0]?.phase).toBe('unconfirmed');
    expect(recovered.ledger.entries[0]?.phase).toBe('unconfirmed');
    expect(recovered.ledger.entries[0]?.failureReason).toBeNull();
    expect(recovered.ledger.entries[0]?.callsOpened).toBe(1);
    expect(recovered.ledger.entries[0]?.networkCalled).toBe(false);
    expect(recovered.ledger.entries[0]?.unconfirmedReason).toContain('callsOpened는 HTTP 호출이 아니다');
    expect(slotEvent && entryRecords(recovered.log).find((record) => record.eventId === slotEvent.eventId)).toBe(slotEvent);
    expect(retry.opened).toBe(false);
    expect(retry.ledger.notices.at(-1)?.kind).toBe('retry_refused');
    expect(retry.ledger.entries.find((entry) => entry.executionId === 'exec-gemini-2')?.phase).toBe('registered');
    expect(retry.ledger.entries.find((entry) => entry.executionId === 'exec-gemini-2')?.callsOpened).toBe(0);
    expect(state.analysisAcceptances).toEqual([]);
    expect(state.hypothesisJudgments[0]?.stance).toBe('supported');
    expect(state.judgmentText).toBe(JUDGMENT_TEXT);
    expectSimulation(recovered);
  });

  it('preserves a confirmed-send flag and still refuses another call', () => {
    const { sourceId } = withSource();
    const registered = recordRegistration(createSimulatedLedgerLog(), request('gemini', sourceId), NOW);
    const opened = recordSlot(registered.log, 'exec-gemini-1', NOW);
    const sent = entryRecords(opened.log).at(-1);
    if (!sent) throw new Error('slot missing');
    const injected: ExecutionLedgerEntry = { ...sent.entry, networkCalled: true };
    const log = createSimulatedLedgerLog([
      ...opened.log.records.filter((record) => record !== sent),
      { ...sent, entry: injected },
    ]);
    const recovered = recordRecovery(log, LATER);
    const idsBefore = recovered.ledger.entries.map((entry) => entry.executionId);

    expect(recovered.ledger.entries[0]?.phase).toBe('unconfirmed');
    expect(recovered.ledger.entries[0]?.networkCalled).toBe(true);
    expect(recovered.ledger.entries[0]?.callsOpened).toBe(1);
    expect(recovered.ledger.entries[0]?.failureReason).toBeNull();
    expect(recovered.ledger.entries[0]?.unconfirmedReason).toContain('전송 기록은 있으나');
    expect(recordRecovery(recovered.log, LATER).ledger.entries.map((entry) => entry.executionId)).toEqual(idsBefore);
    expect(recordRecovery(recovered.log, LATER).wrote).toBe(false);
    expectSimulation(recovered);
  });

  it('accepts only a stored response body and does not accept during recovery', () => {
    const { state, sourceId } = withSource();
    const opened = recordSlot(recordRegistration(createSimulatedLedgerLog(), request('gemini', sourceId), NOW).log, 'exec-gemini-1', NOW);
    const stored = recordResponse(opened.log, 'exec-gemini-1', request('gemini', sourceId), NOW);
    const recovered = recordRecovery(stored.log, LATER);
    const accepted = recordAcceptance(recovered.log, state, 'exec-gemini-1', LATER);
    const duplicate = recordAcceptance(accepted.log, accepted.state, 'exec-gemini-1', LATER);

    expect(recovered.wrote).toBe(false);
    expect(recovered.ledger.entries[0]?.phase).toBe('response_received');
    expect(recovered.ledger.entries[0]?.response?.claim).toBe(PROBLEM_CLAIM);
    expect(state.analysisAcceptances).toEqual([]);
    expect(accepted.accepted).toBe(true);
    expect(accepted.state.analysisAcceptances).toHaveLength(1);
    expect(accepted.state.analysisAcceptances[0]?.verifiedFact).toBe(false);
    expect(accepted.state.analysisAcceptances[0]?.judgmentChanged).toBe(false);
    expect(accepted.state.hypothesisJudgments).toBe(state.hypothesisJudgments);
    expect(accepted.state.judgmentText).toBe(JUDGMENT_TEXT);
    expect(duplicate.accepted).toBe(false);
    expect(duplicate.state).toBe(accepted.state);
    expect(countedExecutionIds(duplicate.state.analysisAcceptances)).toEqual(['exec-gemini-1']);
    expect(duplicate.ledger.entries[0]?.phase).toBe('accepted');
    expectSimulation(accepted);
    expectSimulation(duplicate);
  });

  it('does not replace a failed record when the same execution id is replayed as success', () => {
    const { sourceId } = withSource();
    const opened = recordSlot(
      recordRegistration(createSimulatedLedgerLog(), request('gemini', sourceId, { status: 'failed', claim: null }), NOW).log,
      'exec-gemini-1',
      NOW,
    );
    const failed = recordFailure(opened.log, 'exec-gemini-1', '제공자가 오류를 반환했다.', LATER);
    const failedEvent = entryRecords(failed.log).at(-1);
    const replayed = recordResponse(failed.log, 'exec-gemini-1', request('gemini', sourceId), LATER);
    const illegal: LedgerLogRecord = {
      type: 'entry',
      eventId: 'evt-illegal',
      at: LATER,
      entry: {
        ...(failedEvent?.entry as ExecutionLedgerEntry),
        phase: 'response_received',
        response: request('gemini', sourceId),
        failureReason: null,
      },
    };
    const corrupted = createSimulatedLedgerLog([...failed.log.records, illegal]);
    const folded = foldLedgerLog(corrupted);

    expect(replayed.stored).toBe(false);
    expect(replayed.ledger.entries[0]?.phase).toBe('failed');
    expect(replayed.ledger.entries[0]?.response).toBeNull();
    expect(failedEvent && entryRecords(replayed.log).find((record) => record.eventId === failedEvent.eventId)).toBe(failedEvent);
    expect(folded.entries).toHaveLength(1);
    expect(folded.entries[0]).toBe(failedEvent?.entry);
    expect(folded.entries[0]?.phase).toBe('failed');
    expect(folded.notices.at(-1)?.kind).toBe('duplicate_found');
    expect(proposeCrashRecovery(folded, LATER).entries[0]?.phase).toBe('failed');
    expectSimulation(replayed);
  });

  it('leaves the previous simulated log in place when a write is rejected', () => {
    const { state, sourceId } = withSource();
    const registered = recordRegistration(createSimulatedLedgerLog(), request('gemini', sourceId), NOW);
    const blockedRegistration = recordRegistration(armSimulatedWriteFailure(createSimulatedLedgerLog(), 1), request('gemini', sourceId), NOW);
    const blockedSlot = recordSlot(armSimulatedWriteFailure(registered.log, 1), 'exec-gemini-1', NOW);
    const opened = recordSlot(registered.log, 'exec-gemini-1', NOW);
    const blockedResponse = recordResponse(armSimulatedWriteFailure(opened.log, 1), 'exec-gemini-1', request('gemini', sourceId), NOW);
    const stored = recordResponse(opened.log, 'exec-gemini-1', request('gemini', sourceId), NOW);
    const blockedAcceptance = recordAcceptance(armSimulatedWriteFailure(stored.log, 1), state, 'exec-gemini-1', LATER);
    const blockedRecovery = recordRecovery(armSimulatedWriteFailure(opened.log, 1), LATER);

    expect(blockedRegistration.persisted).toBe(false);
    expect(blockedRegistration.entry).toBeNull();
    expect(blockedRegistration.ledger.entries).toEqual([]);
    expect(blockedRegistration.log.records).toEqual([]);
    expect(blockedSlot.persisted).toBe(false);
    expect(blockedSlot.opened).toBe(false);
    expect(blockedSlot.reason).toContain('성공으로 보지 않는다');
    expect(blockedSlot.ledger.entries[0]?.phase).toBe('registered');
    expect(blockedSlot.ledger.entries[0]?.callsOpened).toBe(0);
    expect(blockedSlot.log.records).toBe(registered.log.records);
    expect(blockedResponse.persisted).toBe(false);
    expect(blockedResponse.stored).toBe(false);
    expect(blockedResponse.ledger.entries[0]?.response).toBeNull();
    expect(blockedResponse.ledger.entries[0]?.phase).toBe('in_progress');
    expect(blockedAcceptance.persisted).toBe(false);
    expect(blockedAcceptance.accepted).toBe(false);
    expect(blockedAcceptance.state).toBe(state);
    expect(blockedAcceptance.state.analysisAcceptances).toEqual([]);
    expect(blockedAcceptance.ledger.entries[0]?.phase).toBe('response_received');
    expect(blockedRecovery.persisted).toBe(false);
    expect(blockedRecovery.ledger.entries[0]?.phase).toBe('in_progress');
    expect(blockedRecovery.proposed.entries[0]?.phase).toBe('unconfirmed');
    expect(blockedRecovery.log.records).toBe(opened.log.records);
    expectSimulation(blockedSlot);
    expectSimulation(blockedRecovery);
  });

  it('keeps both providers when their stored responses are accepted in either order', () => {
    const { state, sourceId } = withSource();
    const gemini = recordResponse(
      recordSlot(recordRegistration(createSimulatedLedgerLog(), request('gemini', sourceId), NOW).log, 'exec-gemini-1', NOW).log,
      'exec-gemini-1',
      request('gemini', sourceId),
      NOW,
    );
    const both = recordResponse(
      recordSlot(recordRegistration(gemini.log, request('gpt', sourceId), NOW).log, 'exec-gpt-1', NOW).log,
      'exec-gpt-1',
      request('gpt', sourceId),
      NOW,
    );
    const recovered = recordRecovery(both.log, LATER);
    const gptFirst = recordAcceptance(recovered.log, state, 'exec-gpt-1', LATER);
    const geminiSecond = recordAcceptance(gptFirst.log, gptFirst.state, 'exec-gemini-1', LATER);
    const geminiOnly = recordAcceptance(gemini.log, state, 'exec-gemini-1', LATER);

    expect(recovered.wrote).toBe(false);
    expect(recovered.ledger.entries.map((entry) => entry.phase)).toEqual(['response_received', 'response_received']);
    expect(geminiSecond.ledger.entries.map((entry) => entry.phase)).toEqual(['accepted', 'accepted']);
    expect(countedExecutionIds(geminiSecond.state.analysisAcceptances)).toEqual(['exec-gpt-1', 'exec-gemini-1']);
    expect(geminiSecond.state.hypothesisJudgments).toBe(state.hypothesisJudgments);
    expect(geminiSecond.state.judgmentStatus).toBe('judgment_deferred');
    expect(geminiSecond.state.judgmentText).toBe(JUDGMENT_TEXT);
    expect(countedExecutionIds(geminiOnly.state.analysisAcceptances)).toEqual(['exec-gemini-1']);
    expect(geminiOnly.state.hypothesisJudgments).toBe(state.hypothesisJudgments);
    expect(geminiOnly.state.hypothesisJudgments[0]?.verifiedFact).toBe(false);
    expectSimulation(geminiSecond);
  });

  it('recovers two open slots together or leaves both untouched when the write is rejected', () => {
    const { sourceId } = withSource();
    const gemini = recordSlot(recordRegistration(createSimulatedLedgerLog(), request('gemini', sourceId), NOW).log, 'exec-gemini-1', NOW);
    const both = recordSlot(recordRegistration(gemini.log, request('gpt', sourceId), NOW).log, 'exec-gpt-1', NOW);
    const recovered = recordRecovery(both.log, LATER);
    const rejected = recordRecovery(armSimulatedWriteFailure(both.log, 1), LATER);

    expect(recovered.ledger.entries.map((entry) => entry.phase)).toEqual(['unconfirmed', 'unconfirmed']);
    expect(recovered.ledger.entries.map((entry) => entry.networkCalled)).toEqual([false, false]);
    expect(recovered.ledger.entries.map((entry) => entry.callsOpened)).toEqual([1, 1]);
    expect(rejected.persisted).toBe(false);
    expect(rejected.ledger.entries.map((entry) => entry.phase)).toEqual(['in_progress', 'in_progress']);
    expect(rejected.proposed.entries.map((entry) => entry.phase)).toEqual(['unconfirmed', 'unconfirmed']);
    expect(rejected.log.records).toBe(both.log.records);
    expectSimulation(recovered);
  });
});
