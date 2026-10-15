import { describe, expect, it, vi } from 'vitest';

import { canonicalExecution, type AnalysisExecutionRequest } from '../execution-contract';
import { attachFounderSource } from '../founder-source';
import { startJourney } from '../journey-engine';
import { JUDGMENT_TEXT, TEST_HYPOTHESIS_INTAKE } from '../journey-types';
import {
  acceptanceAlignment,
  acceptanceCounts,
  armCommitFailure,
  billableSendCount,
  commitStoredAcceptance,
  COST_APPROVAL,
  createApprovalStore,
  dropAcceptedPhase,
  dropSeals,
  operationalLog,
  replayEvent,
  RESTART_VERIFICATION_PLAN,
  SOURCE_RETENTION_POLICY,
  STORAGE_COMPARISON,
  STORAGE_RECOMMENDATION,
  storedAcceptanceCount,
} from '../ledger-storage-contract';
import {
  createSimulatedLedgerLog,
  foldLedgerLog,
  recordFailure,
  recordRecovery,
  recordRegistration,
  recordResponse,
  recordSlot,
} from '../ledger-recovery';

const NOW = '2026-10-15T05:40:00.000Z';
const LATER = '2026-10-15T05:55:00.000Z';
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

function request(sourceId: string | null, patch: Partial<AnalysisExecutionRequest> = {}): AnalysisExecutionRequest {
  return canonicalExecution('gemini', {
    executionId: 'exec-gemini-1',
    status: 'succeeded',
    inputSnapshot: {
      snapshotId: 'snap-gemini-1',
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

function readyStore(sourceId: string) {
  const registered = recordRegistration(createSimulatedLedgerLog(), request(sourceId), NOW);
  const opened = recordSlot(registered.log, 'exec-gemini-1', NOW);
  const stored = recordResponse(opened.log, 'exec-gemini-1', request(sourceId), NOW);
  return { registered, opened, stored, store: createApprovalStore(stored.log) };
}

describe('server ledger storage approval contract', () => {
  it('recommends an append-only log and leaves restart checks unrun', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network must stay closed'));
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    expect(STORAGE_RECOMMENDATION.choice).toBe('append_only_event_log');
    expect(STORAGE_RECOMMENDATION.implemented).toBe(false);
    expect(STORAGE_RECOMMENDATION.note).toContain('트랜잭션');
    expect(STORAGE_COMPARISON.find((item) => item.recommended)?.id).toBe('append_only_event_log');
    expect(STORAGE_COMPARISON.find((item) => item.id === 'conditional_row_update')?.recommended).toBe(false);
    expect(RESTART_VERIFICATION_PLAN.map((item) => item.id)).toEqual([
      'restart_after_event',
      'interrupt_in_progress',
      'interrupt_before_acceptance',
      'redelivery_after_acceptance',
      'write_failure_and_partial',
      'failure_then_success_same_id',
      'recover_unconfirmed',
    ]);
    expect(RESTART_VERIFICATION_PLAN.every((item) => item.executed === false)).toBe(true);
    expect(RESTART_VERIFICATION_PLAN.every((item) => item.diskVerified === false)).toBe(true);
    expect(RESTART_VERIFICATION_PLAN.every((item) => item.processRestartVerified === false)).toBe(true);
    expect(COST_APPROVAL.billWhen).toBe('persisted_network_called_true');
    expect(COST_APPROVAL.outputTokenCap).toBe(1024);
    expect(COST_APPROVAL.priceStatus).toBe('unconfirmed');
    expect(COST_APPROVAL.unconfirmedRetry).toBe(false);
    expect(SOURCE_RETENTION_POLICY.implemented).toBe(false);
    expect(SOURCE_RETENTION_POLICY.logRedactionIsNotStorageSecurity).toBe(true);
    expect(SOURCE_RETENTION_POLICY.status).toBe('proposal');
  });

  it('writes the accepted phase and the acceptance seal together or not at all', () => {
    const { state, sourceId } = withSource();
    const { store } = readyStore(sourceId);
    const blocked = commitStoredAcceptance(armCommitFailure(store, 1), state, 'exec-gemini-1', LATER);
    const committed = commitStoredAcceptance(store, state, 'exec-gemini-1', LATER);
    const replayed = commitStoredAcceptance(committed.store, committed.state, 'exec-gemini-1', LATER);
    const acceptEvent = committed.store.log.records.at(-1);

    expect(blocked.persisted).toBe(false);
    expect(blocked.accepted).toBe(false);
    expect(blocked.state).toBe(state);
    expect(blocked.store.log.records).toBe(store.log.records);
    expect(blocked.store.seals).toBe(store.seals);
    expect(blocked.diskVerified).toBe(false);
    expect(blocked.processRestartVerified).toBe(false);
    expect(committed.accepted).toBe(true);
    expect(committed.alignment).toBe('aligned');
    expect(committed.store.seals).toHaveLength(1);
    expect(committed.store.seals[0]?.acceptanceId).toBe(committed.state.analysisAcceptances[0]?.id);
    expect(committed.store.seals[0]?.verifiedFact).toBe(false);
    expect(committed.store.seals[0]?.judgmentChanged).toBe(false);
    expect(committed.state.hypothesisJudgments).toBe(state.hypothesisJudgments);
    expect(committed.state.judgmentText).toBe(JUDGMENT_TEXT);
    expect(storedAcceptanceCount(committed.state)).toEqual(['exec-gemini-1']);
    expect(replayed.wrote).toBe(false);
    expect(replayed.store).toBe(committed.store);
    expect(replayed.state).toBe(committed.state);
    expect(acceptEvent && replayEvent(committed.store, acceptEvent).store).toBe(committed.store);
    expect(replayEvent(committed.store, acceptEvent!).wrote).toBe(false);
    expect(acceptanceCounts(dropSeals(committed.store), 'exec-gemini-1')).toBe(false);
    expect(acceptanceAlignment(dropSeals(committed.store), 'exec-gemini-1')).toBe('phase_without_seal');
    expect(acceptanceAlignment(dropAcceptedPhase(committed.store, 'exec-gemini-1'), 'exec-gemini-1')).toBe('seal_without_phase');
    expect(acceptanceCounts(dropAcceptedPhase(committed.store, 'exec-gemini-1'), 'exec-gemini-1')).toBe(false);
  });

  it('keeps the first failure and does not bill a slot that was not sent', () => {
    const { sourceId } = withSource();
    const opened = recordSlot(
      recordRegistration(createSimulatedLedgerLog(), request(sourceId, { status: 'failed', claim: null }), NOW).log,
      'exec-gemini-1',
      NOW,
    );
    const failed = recordFailure(opened.log, 'exec-gemini-1', '제공자가 오류를 반환했다.', LATER);
    const failedEvent = failed.log.records.filter((record) => record.type === 'entry').at(-1);
    const replayed = recordResponse(failed.log, 'exec-gemini-1', request(sourceId), LATER);
    const store = createApprovalStore(replayed.log);
    const slotEntry = opened.log.records.filter((record) => record.type === 'entry').at(-1);
    const succeededEntry = recordRegistration(createSimulatedLedgerLog(), request(sourceId), NOW).log.records[0];
    if (!slotEntry || slotEntry.type !== 'entry' || !failedEvent || failedEvent.type !== 'entry' || succeededEntry?.type !== 'entry') {
      throw new Error('event missing');
    }
    const sent = createApprovalStore(
      createSimulatedLedgerLog([
        {
          type: 'entry',
          eventId: 'evt-sent',
          at: LATER,
          entry: { ...slotEntry.entry, phase: 'unconfirmed', networkCalled: true, unconfirmedReason: '전송 후 응답이 없다.' },
        },
      ]),
    );
    const logLine = operationalLog(succeededEntry.entry, true);

    expect(foldLedgerLog(store.log).entries[0]?.phase).toBe('failed');
    expect(foldLedgerLog(store.log).entries[0]).toBe(failedEvent.entry);
    expect(billableSendCount(store)).toBe(0);
    expect(slotEntry.entry.callsOpened).toBe(1);
    expect(slotEntry.entry.networkCalled).toBe(false);
    expect(billableSendCount(sent)).toBe(1);
    expect(sent.log.records[0] && sent.log.records[0].type === 'entry' && sent.log.records[0].entry.phase).toBe('unconfirmed');
    expect(JSON.stringify(logLine)).not.toContain(PROBLEM_CLAIM);
    expect(JSON.stringify(logLine)).not.toContain(EXCERPT);
    expect(JSON.stringify(logLine)).not.toContain(SOURCE);
    expect(Object.keys(logLine)).toEqual(['executionId', 'providerId', 'phase', 'callsOpened', 'networkCalled', 'persisted']);
    expect(SOURCE_RETENTION_POLICY.erasure).toContain('제안값');
    expect(SOURCE_RETENTION_POLICY.keys).toBe('server_only_not_in_ledger');
  });

  it('ignores an out-of-order acceptance and does not reopen an unconfirmed execution', () => {
    const { state, sourceId } = withSource();
    const { registered, opened, store } = readyStore(sourceId);
    const committed = commitStoredAcceptance(store, state, 'exec-gemini-1', LATER);
    const acceptedEntry = committed.store.log.records.filter((record) => record.type === 'entry').at(-1);
    if (!acceptedEntry || acceptedEntry.type !== 'entry') throw new Error('accepted event missing');
    const early = replayEvent(createApprovalStore(registered.log), {
      ...acceptedEntry,
      eventId: 'evt-early-accept',
    });
    const recovered = recordRecovery(opened.log, LATER);
    const again = recordRecovery(recovered.log, LATER);
    const blocked = recordSlot(
      recordRegistration(recovered.log, request(sourceId, { executionId: 'exec-gemini-2' }), LATER).log,
      'exec-gemini-2',
      LATER,
    );

    expect(early.wrote).toBe(true);
    expect(foldLedgerLog(early.store.log).entries[0]?.phase).toBe('registered');
    expect(acceptanceAlignment(early.store, 'exec-gemini-1')).toBe('absent');
    expect(registered.log.records[0]).toBe(early.store.log.records[0]);
    expect(recovered.ledger.entries.map((entry) => entry.executionId)).toEqual(['exec-gemini-1']);
    expect(again.wrote).toBe(false);
    expect(again.ledger.entries.map((entry) => entry.executionId)).toEqual(recovered.ledger.entries.map((entry) => entry.executionId));
    expect(blocked.opened).toBe(false);
    expect(blocked.ledger.notices.at(-1)?.kind).toBe('retry_refused');
    expect(billableSendCount(createApprovalStore(recovered.log))).toBe(0);
  });
});
