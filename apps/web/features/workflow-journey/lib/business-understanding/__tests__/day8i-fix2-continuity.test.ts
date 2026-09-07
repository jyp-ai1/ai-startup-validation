import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import {
  runDay8iConversation,
  DAY8I_30_TURN_SCENARIO,
} from '../day8i-conversation-harness';
import { runAllCpoChecks } from '../day8i-cpo-r-extended-checks';
import { buildCeoJudgmentStateWithTrace } from '../ai-pm-judgment-aggregation';
import { applyAnswerToJudgment } from '../ai-pm-judgment-aggregation';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import {
  clearProjectConsultingState,
  loadProjectConsultingState,
  recordProjectSnapshot,
  restoreProjectConsultingContext,
} from '../project-consulting-store';
import { findSnapshotById } from '../project-consulting-state';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  saveAiPmLoopState,
} from '../workspace-ai-pm-loop-store';
import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import { applyWorkspaceSnapshotToCache } from '@/features/workspace/lib/apply-workspace-snapshot';
import { buildWorkspacePersistedSnapshot } from '@/features/workspace/lib/sync-workspace-persistence';

function stubSessionStorage() {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  };
  vi.stubGlobal('sessionStorage', sessionStorage);
  vi.stubGlobal('window', { sessionStorage });
}

describe('DAY 8-I P0 FIX-2 — State/Trace + Continuity', () => {
  beforeEach(() => {
    stubSessionStorage();
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('P0-1 Turn 07 — customer repeat produces customer-only trace', () => {
    const doc = `# SaaS\n\n대상: 소규모 양조장`;
    const understanding = buildBusinessUnderstanding(doc)!;
    let prior = emptyCeoJudgmentState(0);
    prior = applyAnswerToJudgment({
      prior,
      answer: '소규모 양조장과 반찬가게 사장님이 주 고객입니다.',
      targetGap: 'customerPersona',
    });

    const turns = [
      {
        issueId: 'customer_definition' as const,
        answer: '소규모 양조장과 반찬가게 사장님이 주 고객입니다.',
        appliedAt: 't7',
        targetGap: 'customerPersona',
        askedQuestionText: '누구를 위한 서비스인가요?',
      },
    ];

    const { state, traceEntries } = buildCeoJudgmentStateWithTrace({
      living: buildLivingUnderstandingState({
        documentText: doc,
        understanding,
        turns,
        memory: null,
      }),
      turns,
      prior,
      beforeState: prior,
      answer: turns[0]!.answer,
    });

    expect(state.dimensions.customer.summary).toMatch(/양조|반찬/);
    expect(traceEntries.every((e) => e.affectedDimension !== 'problem')).toBe(true);
  });

  it('P0-2 — no meaningful gap terminates ask (no consecutive repeat)', () => {
    const result = runDay8iConversation({ projectId: 'fix2-nogap' });
    expect(result.noGapTerminations.length).toBeGreaterThan(0);
    expect(result.consecutiveRepeats.length).toBe(0);
    expect(result.repeatedNextQuestions.length).toBe(0);
    const turn7 = result.turns[6];
    expect(turn7?.trace?.dimensionEntries.some((e) => e.affectedDimension === 'problem')).toBe(
      false,
    );
    clearAiPmLoopState('fix2-nogap');
    clearProjectConsultingState('fix2-nogap');
  });

  it('Today → Next Week — project state restores from DB snapshot', () => {
    const projectId = 'fix2-continuity';
    runDay8iConversation({
      projectId,
      steps: DAY8I_30_TURN_SCENARIO.slice(0, 8),
    });

    const loopBefore = loadAiPmLoopState(projectId);
    const consultingBefore = loadProjectConsultingState(projectId);
    expect(loopBefore.turns.length).toBeGreaterThanOrEqual(8);
    expect(consultingBefore.snapshots.length).toBeGreaterThan(0);

    const dbSnapshot = buildWorkspacePersistedSnapshot(projectId);
    clearAiPmLoopState(projectId);
    clearProjectConsultingState(projectId);

    applyWorkspaceSnapshotToCache(projectId, dbSnapshot);

    const loopAfter = loadAiPmLoopState(projectId);
    const consultingAfter = loadProjectConsultingState(projectId);
    const { canResume, judgment } = restoreProjectConsultingContext({
      projectId,
      loop: loopAfter,
      documentText: dbSnapshot.documentText,
    });

    expect(loopAfter.turns.length).toBe(loopBefore.turns.length);
    expect(consultingAfter.snapshots.length).toBe(consultingBefore.snapshots.length);
    expect(canResume).toBe(true);
    expect(judgment?.dimensions.customer.summary.length).toBeGreaterThan(0);

    clearAiPmLoopState(projectId);
    clearProjectConsultingState(projectId);
  });

  it('Snapshot A/B — past snapshot immutable after CEO correction', () => {
    const projectId = 'fix2-snap-ab';
    const doc = `# SaaS\n\n서비스`;
    saveAiPmLoopState(
      {
        version: 1,
        phase: 'answer',
        turns: [],
        currentIssueId: 'problem_definition',
        readingCompleted: true,
        dismissedReadAck: true,
        ceoJudgment: applyAnswerToJudgment({
          prior: emptyCeoJudgmentState(0),
          answer: '배송 누락',
          targetGap: 'problemJtbd',
        }),
      },
      projectId,
    );

    recordProjectSnapshot({
      projectId,
      trigger: 'JUDGMENT_UPDATED',
      loop: loadAiPmLoopState(projectId),
      documentText: doc,
    });
    const snapAId = loadProjectConsultingState(projectId).snapshots[0]!.snapshotId;

    saveAiPmLoopState(
      {
        ...loadAiPmLoopState(projectId),
        ceoJudgment: applyAnswerToJudgment({
          prior: emptyCeoJudgmentState(1),
          answer: '주문 확인 시간이 더 큼',
          targetGap: 'problemJtbd',
        }),
      },
      projectId,
    );
    recordProjectSnapshot({
      projectId,
      trigger: 'CEO_CORRECTED',
      loop: loadAiPmLoopState(projectId),
      documentText: doc,
    });

    const consulting = loadProjectConsultingState(projectId);
    const snapA = findSnapshotById(consulting, snapAId)!;
    const snapB = consulting.snapshots[consulting.snapshots.length - 1]!;

    expect(snapA.judgment?.dimensions.problem.summary).toMatch(/배송/);
    expect(snapB.judgment?.dimensions.problem.summary).toMatch(/확인|시간/);
    expect(snapA.judgment?.dimensions.problem.summary).not.toBe(
      snapB.judgment?.dimensions.problem.summary,
    );

    clearAiPmLoopState(projectId);
    clearProjectConsultingState(projectId);
  });

  it('CPO-R1~R25 extended checks', () => {
    const checks = runAllCpoChecks();
    expect(checks.length).toBeGreaterThanOrEqual(25);
    const failed = checks.filter((c) => c.verdict === 'FAIL');
    if (failed.length > 0) {
      console.log(
        'Failed checks:',
        failed.map((f) => `${f.id}: ${f.rationale}`),
      );
    }
    expect(failed.length).toBe(0);
  }, 180_000);
});
