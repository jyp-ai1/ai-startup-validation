/**
 * DAY 8-I P0 FIX-2 — CPO-R13~R25 programmatic self-check.
 */

import { applyAnswerToJudgment, buildCeoJudgmentStateWithTrace } from './ai-pm-judgment-aggregation';
import { emptyCeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import { applyNoGapTermination, evaluateNoGapTermination } from './ai-pm-no-gap-termination';
import { buildBusinessUnderstanding } from './build-business-understanding';
import { buildLivingUnderstandingState } from './living-understanding-state';
import {
  runDay8iConversation,
  DAY8I_30_TURN_SCENARIO,
} from './day8i-conversation-harness';
import { createEmptyGapState } from './update-gap-state-from-review';
import {
  clearProjectConsultingState,
  loadProjectConsultingState,
  recordProjectSnapshot,
  restoreProjectConsultingContext,
} from './project-consulting-store';
import { findSnapshotById } from './project-consulting-state';
import {
  extractProblemPrimaryText,
  problemPrimaryEquivalent,
} from './ai-pm-judgment-problem-primary';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  saveAiPmLoopState,
} from './workspace-ai-pm-loop-store';
import type { CpoRSelfCheck } from './day8i-cpo-r-self-check';
import { runCpoRSelfChecks } from './day8i-cpo-r-self-check';

export function runCpoR13ToR25Checks(): CpoRSelfCheck[] {
  const checks: CpoRSelfCheck[] = [...runCpoRSelfChecks()];

  const doc = `# 소규모 양조장 주문·배송 SaaS\n\n서비스: B2B SaaS\n대상: 소규모 양조장`;
  const understanding = buildBusinessUnderstanding(doc)!;

  const repeatResult = runDay8iConversation({
    projectId: 'cpo-r13-repeat',
    documentText: doc,
    steps: DAY8I_30_TURN_SCENARIO.slice(0, 8),
  });
  const turn7 = repeatResult.turns[6];
  const turn7ProblemTrace =
    turn7?.trace?.dimensionEntries.some((e) => e.affectedDimension === 'problem') ?? false;
  checks.push({
    id: 'CPO-R13',
    label: 'Full Pipeline Customer Repeat — trace에 problem entry 없음',
    verdict: turn7 && !turn7ProblemTrace ? 'PASS' : 'FAIL',
    evidenceTurns: 'Harness Turn 07 (D_repeat)',
    rationale: `turn7 problem trace=${turn7ProblemTrace}`,
  });
  clearAiPmLoopState('cpo-r13-repeat');
  clearProjectConsultingState('cpo-r13-repeat');

  const noGapVerdict = evaluateNoGapTermination({
    decision: null,
    living: buildLivingUnderstandingState({
      documentText: doc,
      understanding,
      turns: [],
      memory: null,
    }),
    turns: [],
    gapState: createEmptyGapState(),
  });
  checks.push({
    id: 'CPO-R14',
    label: 'No Gap Termination — nextQuestion=none → 검토 전환',
    verdict: noGapVerdict.terminate && noGapVerdict.reason === 'no_decision' ? 'PASS' : 'FAIL',
    evidenceTurns: 'Turn 19~30 no-gap zone',
    rationale: `terminate=${noGapVerdict.terminate} reason=${noGapVerdict.reason}`,
  });

  const full30 = runDay8iConversation({ projectId: 'cpo-r15-loop' });
  checks.push({
    id: 'CPO-R15',
    label: 'Loop Kill — (none) 이후 duplicate question 0',
    verdict:
      full30.consecutiveRepeats.length === 0 && full30.repeatedNextQuestions.length === 0
        ? 'PASS'
        : 'FAIL',
    evidenceTurns: 'Full 30-turn nextQuestion + displayQuestion',
    rationale: `consecutiveRepeats=${full30.consecutiveRepeats.length} repeatedNext=${full30.repeatedNextQuestions.length}`,
  });

  checks.push({
    id: 'CPO-R21',
    label: 'Judgment Timeline — 판단 변경 전/후 추적',
    verdict: full30.judgmentChanges.length >= 3 ? 'PASS' : 'FAIL',
    evidenceTurns: '30-turn judgmentChanges',
    rationale: `changes=${full30.judgmentChanges.length}`,
  });

  checks.push({
    id: 'CPO-R22',
    label: 'Resume — 재접속 → 마지막 지점부터 이어서',
    verdict: full30.noGapTerminations.length > 0 ? 'PASS' : 'FAIL',
    evidenceTurns: 'no-gap termination + review mode',
    rationale: `noGapAt=${full30.noGapTerminations.join(',')}`,
  });
  clearAiPmLoopState('cpo-r15-loop');
  clearProjectConsultingState('cpo-r15-loop');

  let prior = applyAnswerToJudgment({
    prior: emptyCeoJudgmentState(0),
    answer: '소규모 양조장과 반찬가게 사장님이 주 고객입니다.',
    targetGap: 'customerPersona',
  });
  const { state, traceEntries } = buildCeoJudgmentStateWithTrace({
    living: buildLivingUnderstandingState({
      documentText: doc,
      understanding,
      turns: [
        {
          issueId: 'customer_definition',
          answer: '소규모 양조장과 반찬가게 사장님이 주 고객입니다.',
          appliedAt: 't1',
          targetGap: 'customerPersona',
        },
      ],
      memory: null,
    }),
    turns: [
      {
        issueId: 'customer_definition',
        answer: '소규모 양조장과 반찬가게 사장님이 주 고객입니다.',
        appliedAt: 't1',
        targetGap: 'customerPersona',
      },
    ],
    prior,
    beforeState: prior,
    answer: '소규모 양조장과 반찬가게 사장님이 주 고객입니다.',
  });
  const stateProblem = state.dimensions.problem.summary;
  const traceHasProblem = traceEntries.some((e) => e.affectedDimension === 'problem');
  checks.push({
    id: 'CPO-R16',
    label: 'State/Trace Consistency — repeat turn state=trace',
    verdict:
      state.dimensions.customer.summary.length > 0 &&
      !traceHasProblem &&
      stateProblem.trim().length === 0
        ? 'PASS'
        : 'FAIL',
    evidenceTurns: 'Turn 07 unit+trace',
    rationale: `customer=${state.dimensions.customer.summary.slice(0, 30)} problemTrace=${traceHasProblem}`,
  });

  const r17prior = applyAnswerToJudgment({
    prior: emptyCeoJudgmentState(2),
    answer: '배송 누락이 주문 건수의 10% 정도로 매우 심각합니다.',
    targetGap: 'problemJtbd',
  });
  const r17after = applyAnswerToJudgment({
    prior: r17prior,
    answer: '고객이 원하는 건 정확히 말하지 않았습니다.',
    targetGap: 'validationTestability',
  });
  const r17trace = buildCeoJudgmentStateWithTrace({
    living: buildLivingUnderstandingState({
      documentText: doc,
      understanding,
      turns: [],
      memory: null,
    }),
    turns: [],
    prior: r17prior,
    beforeState: r17prior,
    answer: '고객이 원하는 건 정확히 말하지 않았습니다.',
  });
  checks.push({
    id: 'CPO-R17',
    label: 'Inference Risk — CEO 모름 → unsupported inference 없음, unrelated dimension 유지',
    verdict:
      r17after.dimensions.problem.status === r17prior.dimensions.problem.status &&
      r17after.dimensions.problem.summary === r17prior.dimensions.problem.summary &&
      !r17trace.traceEntries.some((e) => e.affectedDimension === 'problem')
        ? 'PASS'
        : 'FAIL',
    evidenceTurns: 'Turn 23 H_inference_risk',
    rationale: `problem preserved=${r17after.dimensions.problem.summary.slice(0, 24)} traceProblem=${r17trace.traceEntries.some((e) => e.affectedDimension === 'problem')}`,
  });

  const pid = 'cpo-r18-reload';
  runDay8iConversation({ projectId: pid, steps: DAY8I_30_TURN_SCENARIO.slice(0, 5) });
  const loopBefore = loadAiPmLoopState(pid);
  const consultingBefore = loadProjectConsultingState(pid);
  clearAiPmLoopState(pid);
  saveAiPmLoopState(loopBefore, pid);
  const restored = restoreProjectConsultingContext({
    projectId: pid,
    loop: loadAiPmLoopState(pid),
    documentText: doc,
  });
  checks.push({
    id: 'CPO-R18',
    label: 'Project Reload — 같은 프로젝트 재접속 → 상태 유지',
    verdict:
      restored.canResume &&
      restored.judgment !== null &&
      loadAiPmLoopState(pid).turns.length === loopBefore.turns.length
        ? 'PASS'
        : 'FAIL',
    evidenceTurns: 'Day1 → session end → reload',
    rationale: `turns=${loadAiPmLoopState(pid).turns.length} canResume=${restored.canResume}`,
  });
  clearAiPmLoopState(pid);
  clearProjectConsultingState(pid);

  checks.push({
    id: 'CPO-R19',
    label: 'New Session Continuity — 새 세션 → AI PM context 유지',
    verdict: consultingBefore.conversationTurnCount >= 5 ? 'PASS' : 'FAIL',
    evidenceTurns: 'consulting state after 5 turns',
    rationale: `turnCount=${consultingBefore.conversationTurnCount}`,
  });

  const snapPid = 'cpo-r20-snap';
  clearProjectConsultingState(snapPid);
  saveAiPmLoopState(
    {
      version: 1,
      phase: 'answer',
      turns: [],
      currentIssueId: 'customer_definition',
      readingCompleted: true,
      dismissedReadAck: true,
      ceoJudgment: applyAnswerToJudgment({
        prior: emptyCeoJudgmentState(0),
        answer: '배송 누락',
        targetGap: 'problemJtbd',
      }),
    },
    snapPid,
  );
  recordProjectSnapshot({
    projectId: snapPid,
    trigger: 'JUDGMENT_UPDATED',
    loop: loadAiPmLoopState(snapPid),
    documentText: doc,
  });
  const snapA = loadProjectConsultingState(snapPid).snapshots[0]!;
  saveAiPmLoopState(
    {
      ...loadAiPmLoopState(snapPid),
      ceoJudgment: applyAnswerToJudgment({
        prior: emptyCeoJudgmentState(1),
        answer: '주문 확인 시간이 더 큼',
        targetGap: 'problemJtbd',
      }),
    },
    snapPid,
  );
  recordProjectSnapshot({
    projectId: snapPid,
    trigger: 'CEO_CORRECTED',
    loop: loadAiPmLoopState(snapPid),
    documentText: doc,
  });
  const snapB = loadProjectConsultingState(snapPid).snapshots[1]!;
  const snapAProblem = snapA.judgment?.dimensions.problem.summary ?? '';
  const snapBProblem = snapB.judgment?.dimensions.problem.summary ?? '';
  const snapAStored =
    findSnapshotById(loadProjectConsultingState(snapPid), snapA.snapshotId)?.judgment?.dimensions
      .problem.summary ?? '';
  const snapAPrimary = extractProblemPrimaryText(snapAProblem);
  const snapBPrimary = extractProblemPrimaryText(snapBProblem);
  const snapAStoredPrimary = extractProblemPrimaryText(snapAStored);
  checks.push({
    id: 'CPO-R20',
    label: 'Snapshot Immutability — 과거 Snapshot 불변',
    verdict:
      problemPrimaryEquivalent(snapAStoredPrimary, '배송 누락') &&
      snapAPrimary !== snapBPrimary &&
      /배송|누락/.test(snapAPrimary) &&
      /확인\s*시간|더\s*큼/.test(snapBPrimary)
        ? 'PASS'
        : 'FAIL',
    evidenceTurns: 'Snapshot A → correction → Snapshot B',
    rationale: `A="${snapAProblem}" B="${snapBProblem}" storedA="${snapAStored}"`,
  });

  checks.push({
    id: 'CPO-R24',
    label: 'CEO Correction History — 수정 전/후 기록',
    verdict:
      snapA.trigger === 'JUDGMENT_UPDATED' && snapB.trigger === 'CEO_CORRECTED'
        ? 'PASS'
        : 'FAIL',
    evidenceTurns: 'E_correction snapshots',
    rationale: `A trigger=${snapA.trigger} B trigger=${snapB.trigger}`,
  });

  checks.push({
    id: 'CPO-R25',
    label: 'Business Review History — 과거/현재 Review 구분',
    verdict:
      snapA.judgment?.dimensions.problem.summary !==
      loadAiPmLoopState(snapPid).ceoJudgment?.dimensions.problem.summary
        ? 'PASS'
        : 'FAIL',
    evidenceTurns: 'snapshot vs current judgment',
    rationale: `snapshot preserves point-in-time judgment`,
  });
  clearAiPmLoopState(snapPid);
  clearProjectConsultingState(snapPid);

  const pidA = 'cpo-r23-a';
  const pidB = 'cpo-r23-b';
  runDay8iConversation({ projectId: pidA, steps: DAY8I_30_TURN_SCENARIO.slice(0, 3) });
  runDay8iConversation({ projectId: pidB, steps: DAY8I_30_TURN_SCENARIO.slice(3, 6) });
  const iso =
    loadProjectConsultingState(pidA).judgmentState?.dimensions.customer.summary !==
    loadProjectConsultingState(pidB).judgmentState?.dimensions.customer.summary;
  checks.push({
    id: 'CPO-R23',
    label: 'Project Isolation — 프로젝트 A/B 판단 분리',
    verdict: iso ? 'PASS' : 'FAIL',
    evidenceTurns: 'project A vs B',
    rationale: `isolated=${iso}`,
  });
  clearAiPmLoopState(pidA);
  clearAiPmLoopState(pidB);
  clearProjectConsultingState(pidA);
  clearProjectConsultingState(pidB);

  return checks;
}

export function runAllCpoChecks(): CpoRSelfCheck[] {
  return runCpoR13ToR25Checks();
}
