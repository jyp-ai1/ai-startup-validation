import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  commitFounderStatement,
  createSeedLedger,
  questionHash,
  selectNextAction,
  type JudgmentLedger,
} from '../si-judgment-contract';

const FROZEN = '현재 대화만으로는 사업에 대한 1차 판단을 내리기 어렵습니다';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../');
const REPLAY_PATH = resolve(ROOT, 'docs/evidence/ALABOM/AI-PM/PR197-CPO-STRATEGY-FIT-REPLAY.json');
const OUT_PATH = resolve(ROOT, 'docs/evidence/ALABOM/AI-PM/PR197-CPO-SI-STRATEGY-REPLAY.json');

type OldTurn = {
  step: number;
  founderAnswer: string;
  answerKind: string;
  appliesToGap: string;
  shown?: { questionText?: string };
  after?: { judgment?: { conclusion?: string } };
};

type ReplayFile = {
  scenarios: Record<string, Record<string, { turns: OldTurn[] }>>;
};

function snapshot(ledger: JudgmentLedger) {
  return {
    judgment: ledger.judgment,
    stageId: ledger.stageId,
    verdictId: ledger.verdictId,
    reviewCompletion: ledger.reviewCompletion,
    runStatus: ledger.runStatus,
    criticalUnknownHypothesisId: ledger.criticalUnknownHypothesisId,
    headCommitId: ledger.headCommitId,
    pairBroken: ledger.pairBroken,
    hypotheses: Object.fromEntries(
      Object.entries(ledger.hypotheses).map(([id, item]) => [
        id,
        { outcome: item.outcome, evidenceClass: item.evidenceClass, statement: item.statement, alreadyKnown: item.alreadyKnown },
      ]),
    ),
    bindings: ledger.bindings.map((item) => ({
      id: item.id,
      hypothesisId: item.hypothesisId,
      evidenceClass: item.evidenceClass,
      classReason: item.classReason,
      proposition: item.proposition,
    })),
  };
}

function decisionView(ledger: JudgmentLedger) {
  const decision = selectNextAction(ledger);
  return {
    hypothesisId: decision.hypothesisId,
    prompt: decision.prompt,
    priorityReason: decision.priorityReason,
    tieBreak: decision.tieBreak,
    selectedId: decision.selectedId,
    questionHash: questionHash(decision),
    eliminated: decision.eliminated,
  };
}

describe('pure SI strategy replay of b17161ec', () => {
  it('replays 30 branches and writes the observed trace', () => {
    const replay = JSON.parse(readFileSync(REPLAY_PATH, 'utf8')) as ReplayFile;
    const branches = [];
    for (const [scenarioId, branchMap] of Object.entries(replay.scenarios)) {
      for (const [branchId, branch] of Object.entries(branchMap)) {
        const spine = {
          business: branch.turns[0] ? '' : '',
          customer: '',
          problem: '',
        };
        const firstQuestion = branch.turns[0]?.shown?.questionText ?? '';
        const customerMatch = firstQuestion.match(/「([^」]+)」/);
        spine.customer = customerMatch?.[1] ?? '';
        const problemTurn = branch.turns.find((turn) => turn.appliesToGap === 'problemJtbd');
        const problemMatch = problemTurn?.shown?.questionText?.match(/「([^」]+)」/);
        spine.problem = problemMatch?.[1] ?? '';
        const businessTurn = branch.turns.find((turn) => turn.appliesToGap === 'businessOneLiner');
        const businessMatch = businessTurn?.shown?.questionText?.match(/「([^」]+)」/);
        spine.business = businessMatch?.[1] ?? (scenarioId === 'S1' ? '소상공인 배송 SaaS · B2B' : '');

        let ledger = createSeedLedger();
        const seed = snapshot(ledger);
        const turns = [];
        for (const turn of branch.turns) {
          const before = snapshot(ledger);
          const beforeDecision = decisionView(ledger);
          const headBefore = ledger.headCommitId;
          ledger = commitFounderStatement(ledger, { proposition: turn.founderAnswer });
          let afterDecision: ReturnType<typeof decisionView> | null = null;
          let decisionError: string | null = null;
          try {
            afterDecision = decisionView(ledger);
          } catch (error) {
            decisionError = error instanceof Error ? error.message : String(error);
          }
          turns.push({
            step: turn.step,
            answerKind: turn.answerKind,
            appliesToGap: turn.appliesToGap,
            founderAnswer: turn.founderAnswer,
            oldScreenQuestion: turn.shown?.questionText ?? '',
            oldConclusion: turn.after?.judgment?.conclusion ?? '',
            answerApplied: ledger.headCommitId !== headBefore,
            before,
            beforeDecision,
            after: snapshot(ledger),
            afterDecision,
            decisionError,
          });
        }
        branches.push({ scenarioId, branchId, spine, seedCustomer: seed.hypotheses['h-customer']?.statement, seedProblem: seed.hypotheses['h-problem']?.statement, turns });
      }
    }

    const classified = branches.map((branch) => {
      const texts = branch.turns.flatMap((turn) => [
        turn.after.judgment,
        turn.after.whyPossible ?? '',
        turn.afterDecision?.prompt ?? '',
        turn.afterDecision?.priorityReason ?? '',
      ]);
      const blob = texts.join('\n');
      const customerToken = branch.spine.customer.slice(0, 8);
      const problemToken = branch.spine.problem.slice(0, 10);
      const mentionsCustomer = customerToken.length > 0 && blob.includes(customerToken);
      const mentionsProblem = problemToken.length > 0 && blob.includes(problemToken);
      const frozenAppears = branch.turns.some((turn) => turn.after.judgment.includes(FROZEN) || (turn.afterDecision?.prompt ?? '').includes(FROZEN));
      const judgmentMoved = branch.turns.some((turn) => turn.before.judgment !== turn.after.judgment);
      const stageMoved = branch.turns.some((turn) => turn.before.stageId !== turn.after.stageId);
      const absenceFactOnOther = branch.turns.some((turn) =>
        turn.after.bindings.some(
          (item) =>
            item.proposition.includes('아직 실제 결제·사용 증거는 없습니다') &&
            item.evidenceClass === 'FACT' &&
            (item.hypothesisId === 'h-problem' || item.hypothesisId === 'h-market'),
        ),
      );
      const unknownTurn = branch.turns.find((turn) => turn.founderAnswer.includes('모르겠'));
      const unknownRepeats = unknownTurn
        ? unknownTurn.afterDecision?.questionHash === unknownTurn.beforeDecision.questionHash
        : false;
      const reviseTurn = branch.branchId === 'revise' ? branch.turns[0] : undefined;
      const reviseSelectsOldProblem = reviseTurn
        ? (reviseTurn.afterDecision?.prompt ?? '').includes(branch.spine.problem) ||
          reviseTurn.afterDecision?.hypothesisId === 'h-problem'
        : false;
      const seedMatchesScenario = branch.seedCustomer.includes(customerToken);
      const channelRepeatAfterJudgment = branch.turns.some(
        (turn, index) =>
          index > 0 &&
          turn.afterDecision?.hypothesisId === 'h-channel' &&
          turn.afterDecision.questionHash === turn.beforeDecision.questionHash &&
          turn.before.judgment === turn.after.judgment,
      );
      const logisticsRevision =
        branch.branchId === 'revise' &&
        reviseTurn?.answerApplied === true &&
        reviseTurn.afterDecision?.hypothesisId === 'h-problem-logistics' &&
        !(reviseTurn.afterDecision?.prompt ?? '').includes(branch.spine.problem);
      const weakPaymentOnly =
        branch.branchId === 'paymentYes' &&
        seedMatchesScenario &&
        branch.turns.some(
          (turn) =>
            turn.after.bindings.some((item) => item.classReason === 'weak-payment' && item.evidenceClass === 'CLAIM') &&
            turn.after.stageId === turn.before.stageId &&
            turn.afterDecision?.hypothesisId === 'h-problem',
        ) &&
        !frozenAppears &&
        !channelRepeatAfterJudgment;
      const failure = {
        frozenSentenceAppears: frozenAppears,
        judgmentDidNotMove: !judgmentMoved,
        channelRepeatsWithoutJudgmentChange: channelRepeatAfterJudgment,
        reviseSelectsOldProblem,
        reviseIgnored: branch.branchId === 'revise' && reviseTurn?.answerApplied === false,
        absenceStoredAsFact: absenceFactOnOther,
        unknownRepeatsSameHash: unknownRepeats,
        screenMismatch: '판단 불가' as const,
      };
      let verdict: '개선' | '미개선' | '판단 불가' = '미개선';
      if (logisticsRevision || weakPaymentOnly) verdict = '개선';
      return {
        scenarioId: branch.scenarioId,
        branchId: branch.branchId,
        spine: branch.spine,
        seedCustomer: branch.seedCustomer,
        seedProblem: branch.seedProblem,
        seedMatchesScenario,
        mentionsCustomer,
        mentionsProblem,
        judgmentMoved,
        stageMoved,
        frozenAppears,
        verdict,
        failure,
        turns: branch.turns.map((turn) => ({
          step: turn.step,
          answerKind: turn.answerKind,
          appliesToGap: turn.appliesToGap,
          founderAnswer: turn.founderAnswer,
          answerApplied: turn.answerApplied,
          oldConclusion: turn.oldConclusion,
          oldScreenQuestion: turn.oldScreenQuestion,
          before: {
            judgment: turn.before.judgment,
            stageId: turn.before.stageId,
            verdictId: turn.before.verdictId,
            reviewCompletion: turn.before.reviewCompletion,
            runStatus: turn.before.runStatus,
          },
          after: {
            judgment: turn.after.judgment,
            stageId: turn.after.stageId,
            verdictId: turn.after.verdictId,
            reviewCompletion: turn.after.reviewCompletion,
            runStatus: turn.after.runStatus,
            criticalUnknownHypothesisId: turn.after.criticalUnknownHypothesisId,
          },
          beforeDecision: turn.beforeDecision,
          afterDecision: turn.afterDecision,
          decisionError: turn.decisionError,
          bindingDelta: turn.after.bindings
            .filter((item) => !turn.before.bindings.some((prior) => prior.id === item.id))
            .map((item) => ({ id: item.id, hypothesisId: item.hypothesisId, evidenceClass: item.evidenceClass, classReason: item.classReason })),
        })),
      };
    });

    const counts = classified.reduce<Record<string, number>>((acc, item) => {
      acc[item.verdict] = (acc[item.verdict] ?? 0) + 1;
      return acc;
    }, {});
    const payload = {
      moduleCommit: 'cce572f5',
      baselineReplay: 'b17161ec',
      command: 'pnpm --filter web exec vitest run features/strategic-intelligence/lib/__tests__/si-strategy-replay.test.ts',
      branchCount: classified.length,
      counts,
      branches: classified,
    };
    writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));
    expect(classified).toHaveLength(30);
    expect(counts['개선']! + counts['미개선']! + (counts['판단 불가'] ?? 0)).toBe(30);
  });
});
