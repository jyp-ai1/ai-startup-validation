import { spawnSync } from 'node:child_process';
import { mkdtempSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { canonicalExecution, type AnalysisExecutionRequest } from '../execution-contract';
import { acceptExecution, failExecution, receiveExecutionResponse, type ExecutionLedgerEntry } from '../execution-ledger';
import { attachFounderSource } from '../founder-source';
import { startJourney } from '../journey-engine';
import { JUDGMENT_TEXT, TEST_HYPOTHESIS_INTAKE } from '../journey-types';
import { DISK_PRIVACY_REVIEW, journeyAfterDiskCommit, PUBLISHED_PRIVACY_BODY } from '../ledger-disk-store';
import {
  createSimulatedLedgerLog,
  foldLedgerLog,
  recordRegistration,
  recordSlot,
} from '../ledger-recovery';
import type { AcceptanceSeal } from '../ledger-storage-contract';

const ESBUILD = '/workspace/node_modules/.pnpm/esbuild@0.28.1/node_modules/esbuild/bin/esbuild';
const WORKER = join(import.meta.dirname, '../ledger-disk-worker.ts');
const NOW = '2026-10-15T06:00:00.000Z';
const LATER = '2026-10-15T06:10:00.000Z';
const SOURCE = '물류본부 발주 담당자가 주문 화면과 배송 화면이 따로라 누락이 생긴다고 말했다';
const EXCERPT = '주문 화면과 배송 화면이 따로';
const PROBLEM_CLAIM = '문제 가설은 발주와 배송이 나뉜다는 원문과 맞는다.';
const CRASH_MARKER = 'crash-secret-must-not-remain';

type Child = {
  status: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  pid: number | null;
  json: {
    pid: number;
    outcome: { wrote?: boolean; persisted?: boolean; reason?: string | null };
    view: {
      kind: string;
      memoryFixture: boolean;
      productionDatabase: boolean;
      eventCount: number;
      eventIds: string[];
      executionIds: string[];
      phases: Array<{
        executionId: string;
        phase: string;
        callsOpened: number;
        networkCalled: boolean;
        failureReason: string | null;
        unconfirmedReason: string | null;
        claim: string | null;
      }>;
      sealCount: number;
      alignments: Array<{ executionId: string; alignment: string; counted: boolean }>;
      billableSendCount: number;
      logs: Array<Record<string, unknown>>;
      journeyMutated: boolean;
    };
  } | null;
};

const report: Array<Record<string, unknown>> = [];
let workerBundle = '';

function bundleWorker() {
  const outfile = join(mkdtempSync(join(tmpdir(), 'ledger-worker-')), 'worker.mjs');
  const result = spawnSync(
    ESBUILD,
    [WORKER, '--bundle', '--platform=node', '--format=esm', `--outfile=${outfile}`, '--external:node:sqlite'],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  workerBundle = outfile;
}

function freshFile() {
  return join(mkdtempSync(join(tmpdir(), 'ledger-disk-')), 'ledger.sqlite');
}

function call(file: string, command: string, payload?: unknown): Child {
  const encoded = Buffer.from(JSON.stringify(payload ?? {})).toString('base64url');
  const result = spawnSync(process.execPath, [workerBundle, file, command, encoded], {
    encoding: 'utf8',
    env: { ...process.env, LEDGER_DISK_WORKER: '1', NODE_NO_WARNINGS: '1' },
  });
  if (command === 'crash') {
    return { status: result.status, signal: result.signal, stdout: result.stdout, stderr: result.stderr, pid: null, json: null };
  }
  if (result.status !== 0) throw new Error(`${command} failed ${result.status}\n${result.stderr}\n${result.stdout}`);
  const json = JSON.parse(result.stdout) as Child['json'];
  expect(result.stderr).not.toContain(SOURCE);
  expect(result.stderr).not.toContain(PROBLEM_CLAIM);
  expect(result.stderr).not.toContain(CRASH_MARKER);
  return { status: result.status, signal: result.signal, stdout: result.stdout, stderr: result.stderr, pid: json?.pid ?? null, json };
}

function request(sourceId: string, patch: Partial<AnalysisExecutionRequest> = {}): AnalysisExecutionRequest {
  return canonicalExecution('gemini', {
    executionId: 'exec-gemini-1',
    status: 'succeeded',
    inputSnapshot: {
      snapshotId: 'snap-gemini-1',
      answerIds: ['ans-1'],
      evidenceIds: [sourceId],
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

function withSource() {
  const started = startJourney(TEST_HYPOTHESIS_INTAKE, 'test_hypothesis');
  if (!started.ok) throw new Error('start failed');
  const attached = attachFounderSource(started.state, {
    text: SOURCE,
    hypothesisIds: ['h-problem'],
    causeId: 'cause-support',
    now: NOW,
  });
  const sourceId = attached.state.sourceRecords[0]?.id;
  if (!sourceId) throw new Error('source missing');
  return { state: attached.state, sourceId };
}

function mustEntry(entry: ExecutionLedgerEntry | null | undefined, label: string) {
  if (!entry) throw new Error(label);
  return entry;
}

describe('sqlite ledger restart', () => {
  it('restarts a real sqlite file across separate processes', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network must stay closed'));
    bundleWorker();
    const { state, sourceId } = withSource();
    const registered = mustEntry(recordRegistration(createSimulatedLedgerLog(), request(sourceId), NOW).entry, 'registered');
    const opened = recordSlot(recordRegistration(createSimulatedLedgerLog(), request(sourceId), NOW).log, 'exec-gemini-1', NOW);
    const slot = mustEntry(opened.entry, 'slot');
    const responseLog = receiveExecutionResponse(foldLedgerLog(opened.log), 'exec-gemini-1', request(sourceId), NOW);
    const response = mustEntry(responseLog.entry, 'response');
    const failedSlot = recordSlot(
      recordRegistration(createSimulatedLedgerLog(), request(sourceId, { status: 'failed', claim: null }), NOW).log,
      'exec-gemini-1',
      NOW,
    );
    const failed = mustEntry(
      failExecution(foldLedgerLog(failedSlot.log), 'exec-gemini-1', '제공자가 오류를 반환했다.', LATER).entry,
      'failed',
    );
    const accepted = acceptExecution(state, responseLog.ledger, 'exec-gemini-1', LATER);
    const acceptedEntry = mustEntry(accepted.entry, 'accepted');
    const seal: AcceptanceSeal = {
      commitId: 'commit-exec-gemini-1',
      eventId: 'evt-accept',
      acceptanceId: accepted.state.analysisAcceptances[0]?.id ?? '',
      executionId: 'exec-gemini-1',
      verifiedFact: false,
      judgmentChanged: false,
      at: LATER,
    };
    expect(seal.acceptanceId).not.toBe('');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();

    const restartFile = freshFile();
    const restartWriter = call(restartFile, 'append', { eventId: 'evt-reg', entry: registered, at: NOW });
    const restartReader = call(restartFile, 'recover', { now: LATER });
    expect(restartWriter.pid).not.toBe(restartReader.pid);
    expect(restartReader.json?.view.kind).toBe('sqlite_file');
    expect(restartReader.json?.view.memoryFixture).toBe(false);
    expect(restartReader.json?.view.productionDatabase).toBe(false);
    expect(restartReader.json?.outcome.wrote).toBe(false);
    expect(restartReader.json?.view.phases[0]).toMatchObject({
      phase: 'registered',
      callsOpened: 0,
      networkCalled: false,
    });
    expect(statSync(restartFile).mode & 0o777).toBe(0o600);
    report.push({ id: 'restart_after_event', writerPid: restartWriter.pid, readerPid: restartReader.pid, phase: 'registered' });

    const progressFile = freshFile();
    call(progressFile, 'append', { eventId: 'evt-reg', entry: registered, at: NOW });
    call(progressFile, 'append', { eventId: 'evt-slot', entry: slot, at: NOW });
    const progressed = call(progressFile, 'recover', { now: LATER });
    const progressedAgain = call(progressFile, 'recover', { now: LATER });
    expect(progressed.pid).not.toBe(progressedAgain.pid);
    expect(progressed.json?.view.phases[0]).toMatchObject({
      phase: 'unconfirmed',
      callsOpened: 1,
      networkCalled: false,
    });
    expect(progressed.json?.view.phases[0]?.unconfirmedReason).toContain('전송 여부는 기록되지 않았다');
    expect(progressed.json?.view.billableSendCount).toBe(0);
    expect(progressedAgain.json?.outcome.wrote).toBe(false);
    expect(progressedAgain.json?.view.eventCount).toBe(progressed.json?.view.eventCount);
    expect(progressedAgain.json?.view.executionIds).toEqual(['exec-gemini-1']);
    report.push({
      id: 'interrupt_in_progress',
      writerPid: progressed.pid,
      readerPid: progressedAgain.pid,
      eventCount: progressedAgain.json?.view.eventCount,
    });

    const responseFile = freshFile();
    call(responseFile, 'append', { eventId: 'evt-reg', entry: registered, at: NOW });
    call(responseFile, 'append', { eventId: 'evt-slot', entry: slot, at: NOW });
    const responseWriter = call(responseFile, 'append', { eventId: 'evt-response', entry: response, at: NOW });
    const responseReader = call(responseFile, 'recover', { now: LATER });
    expect(responseWriter.pid).not.toBe(responseReader.pid);
    expect(responseReader.json?.outcome.wrote).toBe(false);
    expect(responseReader.json?.view.phases[0]?.phase).toBe('response_received');
    expect(responseReader.json?.view.phases[0]?.claim).toBe(PROBLEM_CLAIM);
    expect(responseReader.json?.view.sealCount).toBe(0);
    expect(responseReader.json?.view.alignments[0]).toMatchObject({ alignment: 'absent', counted: false });
    expect(responseReader.json?.view.journeyMutated).toBe(false);
    report.push({ id: 'interrupt_before_acceptance', writerPid: responseWriter.pid, readerPid: responseReader.pid });

    const acceptFile = freshFile();
    call(acceptFile, 'append', { eventId: 'evt-reg', entry: registered, at: NOW });
    call(acceptFile, 'append', { eventId: 'evt-slot', entry: slot, at: NOW });
    call(acceptFile, 'append', { eventId: 'evt-response', entry: response, at: NOW });
    const acceptWriter = call(acceptFile, 'commit', { eventId: 'evt-accept', entry: acceptedEntry, seal });
    const acceptReader = call(acceptFile, 'commit', { eventId: 'evt-accept', entry: acceptedEntry, seal });
    const kept = journeyAfterDiskCommit(state, accepted.state, acceptWriter.json?.outcome.persisted === true);
    const unchanged = journeyAfterDiskCommit(state, accepted.state, false);
    expect(acceptWriter.pid).not.toBe(acceptReader.pid);
    expect(acceptWriter.json?.outcome.persisted).toBe(true);
    expect(acceptReader.json?.outcome.wrote).toBe(false);
    expect(acceptReader.json?.view.eventCount).toBe(acceptWriter.json?.view.eventCount);
    expect(acceptReader.json?.view.sealCount).toBe(1);
    expect(acceptReader.json?.view.alignments[0]).toMatchObject({ alignment: 'aligned', counted: true });
    expect(kept.hypothesisJudgments).toBe(state.hypothesisJudgments);
    expect(kept.judgmentText).toBe(JUDGMENT_TEXT);
    expect(kept.analysisAcceptances[0]?.verifiedFact).toBe(false);
    expect(unchanged).toBe(state);
    expect(acceptReader.json?.view.journeyMutated).toBe(false);
    report.push({
      id: 'redelivery_after_acceptance',
      writerPid: acceptWriter.pid,
      readerPid: acceptReader.pid,
      eventCount: acceptReader.json?.view.eventCount,
      sealCount: 1,
    });

    const crashFile = freshFile();
    const crashed = call(crashFile, 'crash', {
      eventId: 'evt-crash',
      entry: { ...registered, request: { ...registered.request, claim: CRASH_MARKER } },
      at: NOW,
    });
    const crashReader = call(crashFile, 'read');
    expect(crashed.signal).toBe('SIGKILL');
    expect(crashReader.pid).not.toBe(null);
    expect(crashReader.json?.view.eventCount).toBe(0);
    expect(crashReader.stdout).not.toContain(CRASH_MARKER);
    const thrownFile = freshFile();
    const thrown = call(thrownFile, 'commit', { eventId: 'evt-accept', entry: acceptedEntry, seal, fault: 'throw_before_commit' });
    const thrownReader = call(thrownFile, 'read');
    expect(thrown.json?.outcome.persisted).toBe(false);
    expect(thrownReader.json?.view.eventCount).toBe(0);
    expect(thrownReader.json?.view.sealCount).toBe(0);
    expect(journeyAfterDiskCommit(state, accepted.state, false)).toBe(state);
    const phaseOnly = freshFile();
    call(phaseOnly, 'corrupt-phase', { eventId: 'evt-accept', entry: acceptedEntry, at: LATER });
    const phaseReader = call(phaseOnly, 'read');
    expect(phaseReader.json?.view.alignments[0]).toMatchObject({ alignment: 'phase_without_seal', counted: false });
    const sealOnly = freshFile();
    call(sealOnly, 'corrupt-seal', { seal });
    const sealReader = call(sealOnly, 'read');
    expect(sealReader.json?.view.alignments[0]).toMatchObject({ alignment: 'seal_without_phase', counted: false });
    report.push({
      id: 'write_failure_and_partial',
      crashSignal: crashed.signal,
      readerPid: crashReader.pid,
      thrownPersisted: false,
      partialCounted: false,
    });

    const failureFile = freshFile();
    const failureWriter = call(failureFile, 'append', { eventId: 'evt-fail', entry: failed, at: LATER });
    call(failureFile, 'append', {
      eventId: 'evt-success-same-id',
      entry: { ...failed, phase: 'response_received', response: request(sourceId), failureReason: null },
      at: LATER,
    });
    const failureReader = call(failureFile, 'read');
    expect(failureWriter.pid).not.toBe(failureReader.pid);
    expect(failureReader.json?.view.eventIds).toEqual(['evt-fail', 'evt-success-same-id']);
    expect(failureReader.json?.view.phases[0]).toMatchObject({ phase: 'failed', claim: null });
    expect(failureReader.json?.view.phases[0]?.failureReason).toContain('오류');
    report.push({ id: 'failure_then_success_same_id', writerPid: failureWriter.pid, readerPid: failureReader.pid });

    const unconfirmedFile = freshFile();
    call(unconfirmedFile, 'append', { eventId: 'evt-reg', entry: registered, at: NOW });
    call(unconfirmedFile, 'append', { eventId: 'evt-slot', entry: slot, at: NOW });
    const recovered = call(unconfirmedFile, 'recover', { now: LATER });
    const recoveredAgain = call(unconfirmedFile, 'recover', { now: LATER });
    const retry = call(unconfirmedFile, 'append', {
      eventId: 'evt-retry',
      entry: { ...slot, executionId: 'exec-gemini-2', retryApproval: false },
      at: LATER,
    });
    expect(recovered.pid).not.toBe(recoveredAgain.pid);
    expect(recoveredAgain.json?.outcome.wrote).toBe(false);
    expect(recoveredAgain.json?.view.executionIds).toEqual(['exec-gemini-1']);
    expect(retry.json?.outcome).toMatchObject({ wrote: false, reason: 'retry_refused' });
    expect(retry.json?.view.executionIds).toEqual(['exec-gemini-1']);
    expect(retry.json?.view.billableSendCount).toBe(0);
    report.push({ id: 'recover_unconfirmed', writerPid: recovered.pid, readerPid: retry.pid, retry: 'refused' });

    expect(DISK_PRIVACY_REVIEW.publishedNamesErasureDays).toBe(false);
    expect(DISK_PRIVACY_REVIEW.proposedErasureDaysStatus).toBe('unconfirmed');
    expect(DISK_PRIVACY_REVIEW.erasureImplemented).toBe(false);
    expect(DISK_PRIVACY_REVIEW.routeMounted).toBe(false);
    expect(DISK_PRIVACY_REVIEW.keyAdded).toBe(false);
    expect(PUBLISHED_PRIVACY_BODY).not.toContain('30');
    expect(report.map((item) => item.id)).toEqual([
      'restart_after_event',
      'interrupt_in_progress',
      'interrupt_before_acceptance',
      'redelivery_after_acceptance',
      'write_failure_and_partial',
      'failure_then_success_same_id',
      'recover_unconfirmed',
    ]);
    writeFileSync('/tmp/ledger-restart-evidence.json', JSON.stringify({ node: process.version, report }, null, 2));
  }, 60000);
});
