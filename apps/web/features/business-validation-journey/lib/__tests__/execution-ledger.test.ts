import { describe, expect, it, vi } from 'vitest';

import { countedExecutionIds } from '../analysis-acceptance';
import { canonicalExecution, type AnalysisExecutionRequest } from '../execution-contract';
import {
  acceptExecution,
  emptyLedger,
  failExecution,
  LEDGER_POLICY,
  LEDGER_SCREEN_EMPTY,
  markExecutionUnconfirmed,
  receiveExecutionResponse,
  redactLedgerEntry,
  registerExecution,
  startExecution,
} from '../execution-ledger';
import { attachFounderSource } from '../founder-source';
import { startJourney } from '../journey-engine';
import { JUDGMENT_TEXT, TEST_HYPOTHESIS_INTAKE } from '../journey-types';

const NOW = '2026-10-15T05:20:00.000Z';
const LATER = '2026-10-15T05:30:00.000Z';
const SOURCE = '물류본부 발주 담당자가 주문 화면과 배송 화면이 따로라 누락이 생긴다고 말했다';
const EXCERPT = '주문 화면과 배송 화면이 따로';
const DENY = '이미 한 화면이라 문제가 없다';
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

function open(side: 'gemini' | 'gpt', sourceId: string | null, patch: Partial<AnalysisExecutionRequest> = {}, approval = false) {
  const registered = registerExecution(emptyLedger(), request(side, sourceId, patch), NOW, { retryApproval: approval });
  const startedCall = startExecution(registered.ledger, registered.entry.executionId, NOW);
  return { registered, startedCall };
}

describe('execution ledger before a live model call', () => {
  it('registers a call before any network and does not price it', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network must stay closed'));
    const { sourceId } = withSource();
    const registered = registerExecution(emptyLedger(), request('gemini', sourceId), NOW);
    const startedCall = startExecution(registered.ledger, 'exec-gemini-1', NOW);

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    expect(registered.entry.phase).toBe('registered');
    expect(registered.entry.callsOpened).toBe(0);
    expect(registered.entry.networkCalled).toBe(false);
    expect(startedCall.opened).toBe(true);
    expect(startedCall.entry?.phase).toBe('in_progress');
    expect(startedCall.entry?.callsOpened).toBe(1);
    expect(startedCall.entry?.networkCalled).toBe(false);
    expect(startedCall.entry?.autoRetry).toBe(false);
    expect(LEDGER_POLICY.autoRetry).toBe(false);
    expect(LEDGER_POLICY.priceStatus).toBe('unconfirmed');
    expect(LEDGER_POLICY.geminiMaxCalls).toBe(1);
    expect(LEDGER_POLICY.gptMaxCalls).toBe(1);
    expect(LEDGER_POLICY.additionalCallOnFailure).toBe(false);
    expect(LEDGER_POLICY.additionalCallOnUnconfirmed).toBe(false);
    expect(LEDGER_POLICY.priceMethod).toContain('요금표 확인 전');
    expect(redactLedgerEntry(startedCall.entry!)).toEqual({
      executionId: 'exec-gemini-1',
      providerId: 'openrouter',
      phase: 'in_progress',
      callsOpened: 1,
      networkCalled: false,
    });
  });

  it('keeps the first failure when the same execution id is redelivered as success', () => {
    const { state, sourceId } = withSource();
    const opened = open('gemini', sourceId, { status: 'failed', claim: null });
    const failed = failExecution(opened.startedCall.ledger, 'exec-gemini-1', '제공자가 오류를 반환했다.', LATER);
    const redelivered = receiveExecutionResponse(
      failed.ledger,
      'exec-gemini-1',
      request('gemini', sourceId, { status: 'succeeded', claim: PROBLEM_CLAIM }),
      LATER,
    );

    expect(redelivered.entry).toBe(failed.entry);
    expect(failed.entry?.phase).toBe('failed');
    expect(failed.entry?.failureReason).toContain('오류');
    expect(failed.entry?.response).toBeNull();
    expect(redelivered.ledger.notices.at(-1)?.kind).toBe('duplicate_delivery');
    expect(state.judgmentText).toBe(JUDGMENT_TEXT);
    expect(state.hypothesisJudgments[0]?.stance).toBe('supported');
    expect(openedCallsOf(redelivered.ledger, 'openrouter')).toBe(1);
  });

  it('refuses an automatic retry and allows a new execution id only with approval', () => {
    const { sourceId } = withSource();
    const failed = failExecution(open('gemini', sourceId, { status: 'failed', claim: null }).startedCall.ledger, 'exec-gemini-1', '오류', LATER);
    const retry = registerExecution(failed.ledger, request('gemini', sourceId, { executionId: 'exec-gemini-2' }), LATER);
    const blocked = startExecution(retry.ledger, 'exec-gemini-2', LATER);
    const approved = registerExecution(
      failed.ledger,
      request('gemini', sourceId, { executionId: 'exec-gemini-2' }),
      LATER,
      { retryApproval: true },
    );
    const opened = startExecution(approved.ledger, 'exec-gemini-2', LATER);

    expect(blocked.opened).toBe(false);
    expect(blocked.entry?.phase).toBe('registered');
    expect(blocked.entry?.callsOpened).toBe(0);
    expect(blocked.ledger.notices.at(-1)?.kind).toBe('retry_refused');
    expect(failed.entry && blocked.ledger.entries[0]).toBe(failed.entry);
    expect(opened.opened).toBe(true);
    expect(opened.entry?.networkCalled).toBe(false);
    expect(opened.ledger.entries[0]).toBe(failed.entry);
    expect(opened.ledger.entries[0]?.phase).toBe('failed');
  });

  it('keeps a received response when acceptance has not run and does not call again', () => {
    const { state, sourceId } = withSource();
    const received = receiveExecutionResponse(
      open('gemini', sourceId).startedCall.ledger,
      'exec-gemini-1',
      request('gemini', sourceId),
      LATER,
    );
    const beforeAccept = received.entry;
    const interrupted = acceptExecution(state, received.ledger, 'exec-other', LATER);

    expect(beforeAccept?.phase).toBe('response_received');
    expect(beforeAccept?.response?.claim).toBe(PROBLEM_CLAIM);
    expect(beforeAccept?.callsOpened).toBe(1);
    expect(beforeAccept?.networkCalled).toBe(false);
    expect(state.analysisAcceptances).toEqual([]);
    expect(state.judgmentText).toBe(JUDGMENT_TEXT);
    expect(interrupted.accepted).toBe(false);
    expect(interrupted.state).toBe(state);
    expect(received.entry).toBe(beforeAccept);

    const accepted = acceptExecution(state, received.ledger, 'exec-gemini-1', LATER);
    const duplicate = acceptExecution(accepted.state, accepted.ledger, 'exec-gemini-1', LATER);

    expect(accepted.accepted).toBe(true);
    expect(accepted.entry?.phase).toBe('accepted');
    expect(accepted.state.analysisAcceptances).toHaveLength(1);
    expect(accepted.state.analysisAcceptances[0]?.verifiedFact).toBe(false);
    expect(accepted.state.analysisAcceptances[0]?.judgmentChanged).toBe(false);
    expect(accepted.state.hypothesisJudgments).toBe(state.hypothesisJudgments);
    expect(accepted.state.judgmentText).toBe(JUDGMENT_TEXT);
    expect(duplicate.accepted).toBe(false);
    expect(duplicate.state).toBe(accepted.state);
    expect(duplicate.ledger.entries.find((entry) => entry.executionId === 'exec-gemini-1')).toBe(accepted.entry);
    expect(countedExecutionIds(duplicate.state.analysisAcceptances)).toEqual(['exec-gemini-1']);
  });

  it('stores an unconfirmed interruption apart from an explicit failure', () => {
    const { sourceId } = withSource();
    const lost = markExecutionUnconfirmed(
      open('gemini', sourceId).startedCall.ledger,
      'exec-gemini-1',
      '응답이 기록되기 전에 서버가 중단되었다.',
      LATER,
    );
    const failed = failExecution(open('gpt', sourceId).startedCall.ledger, 'exec-gpt-1', '제공자가 거절했다.', LATER);
    const retry = startExecution(
      registerExecution(lost.ledger, request('gemini', sourceId, { executionId: 'exec-gemini-2' }), LATER).ledger,
      'exec-gemini-2',
      LATER,
    );
    const journey = withSource().state;
    const acceptedLost = acceptExecution(journey, lost.ledger, 'exec-gemini-1', LATER);
    const mismatched = receiveExecutionResponse(
      open('gemini', sourceId).startedCall.ledger,
      'exec-gemini-1',
      request('gemini', sourceId, { executionId: 'exec-other' }),
      LATER,
    );

    expect(lost.entry?.phase).toBe('unconfirmed');
    expect(lost.entry?.failureReason).toBeNull();
    expect(lost.entry?.unconfirmedReason).toContain('중단');
    expect(failed.entry?.phase).toBe('failed');
    expect(lost.entry?.phase).not.toBe(failed.entry?.phase);
    expect(retry.opened).toBe(false);
    expect(retry.ledger.notices.at(-1)?.kind).toBe('retry_refused');
    expect(lost.ledger.entries[0]).toBe(lost.entry);
    expect(acceptedLost.accepted).toBe(false);
    expect(acceptedLost.state).toBe(journey);
    expect(acceptedLost.ledger.notices.at(-1)?.kind).toBe('phase_refused');
    expect(mismatched.stored).toBe(false);
    expect(mismatched.entry?.phase).toBe('in_progress');
    expect(mismatched.entry?.response).toBeNull();
    expect(mismatched.ledger.notices.at(-1)?.kind).toBe('response_mismatch');
  });

  it('preserves both providers when their responses are accepted in either order', () => {
    const { state, sourceId } = withSource();
    const gemini = receiveExecutionResponse(open('gemini', sourceId).startedCall.ledger, 'exec-gemini-1', request('gemini', sourceId), NOW);
    const both = receiveExecutionResponse(
      registerExecution(gemini.ledger, request('gpt', sourceId), NOW).ledger,
      'exec-gpt-1',
      request('gpt', sourceId),
      NOW,
    );
    const gptStarted = startExecution(registerExecution(gemini.ledger, request('gpt', sourceId), NOW).ledger, 'exec-gpt-1', NOW);
    const ready = receiveExecutionResponse(gptStarted.ledger, 'exec-gpt-1', request('gpt', sourceId), NOW);
    const gptFirst = acceptExecution(state, ready.ledger, 'exec-gpt-1', LATER);
    const geminiSecond = acceptExecution(gptFirst.state, gptFirst.ledger, 'exec-gemini-1', LATER);
    const geminiFirst = acceptExecution(state, gemini.ledger, 'exec-gemini-1', LATER);

    expect(both.stored).toBe(false);
    expect(geminiSecond.accepted).toBe(true);
    expect(geminiSecond.ledger.entries.map((entry) => entry.phase)).toEqual(['accepted', 'accepted']);
    expect(countedExecutionIds(geminiSecond.state.analysisAcceptances)).toEqual(['exec-gpt-1', 'exec-gemini-1']);
    expect(geminiSecond.state.hypothesisJudgments).toBe(state.hypothesisJudgments);
    expect(geminiSecond.state.judgmentStatus).toBe('judgment_deferred');
    expect(geminiFirst.accepted).toBe(true);
    expect(countedExecutionIds(geminiFirst.state.analysisAcceptances)).toEqual(['exec-gemini-1']);
    expect(geminiFirst.state.hypothesisJudgments).toBe(state.hypothesisJudgments);
    expect(geminiFirst.state.judgmentText).toBe(JUDGMENT_TEXT);
  });

  it('does not let an accepted analysis replace the source transition', () => {
    const { state, sourceId } = withSource();
    const received = receiveExecutionResponse(
      open('gemini', sourceId, { claim: DENY, support: DENY, citedExcerpt: DENY }).startedCall.ledger,
      'exec-gemini-1',
      request('gemini', sourceId, { claim: DENY, support: DENY, citedExcerpt: DENY }),
      LATER,
    );
    const accepted = acceptExecution(state, received.ledger, 'exec-gemini-1', LATER);
    const pasted = attachFounderSource(accepted.state, {
      text: DENY,
      hypothesisIds: ['h-problem'],
      causeId: 'cause-deny',
      now: LATER,
    });

    expect(accepted.state.hypothesisJudgments).toBe(state.hypothesisJudgments);
    expect(accepted.state.hypothesisJudgments[0]?.stance).toBe('supported');
    expect(accepted.state.analysisAcceptances[0]?.verifiedFact).toBe(false);
    expect(accepted.state.judgmentText).toBe(JUDGMENT_TEXT);
    expect(pasted.state.hypothesisJudgments[0]?.stance).toBe('held');
    expect(pasted.state.hypothesisJudgments[0]?.causeId).toBe('cause-deny');
    expect(pasted.state.analysisAcceptances[0]).toBe(accepted.state.analysisAcceptances[0]);
    expect(accepted.entry?.response?.claim).toBe(DENY);
    expect(pasted.state.sourceRecords.map((record) => record.causeId)).toEqual(['cause-support', 'cause-deny']);
    expect(pasted.state.judgmentText).toBe(JUDGMENT_TEXT);
    expect(pasted.state.researchStatus).toBe('research_not_run');
  });

  it('shows an empty ledger on the live screen', () => {
    expect(LEDGER_SCREEN_EMPTY).toContain('호출을 열지 않았다');
    expect(LEDGER_SCREEN_EMPTY).toContain('자동 재호출은 하지 않는다');
  });
});

function openedCallsOf(ledger: ReturnType<typeof emptyLedger>, providerId: string) {
  return ledger.entries.filter((entry) => entry.providerId === providerId && entry.callsOpened === 1).length;
}
