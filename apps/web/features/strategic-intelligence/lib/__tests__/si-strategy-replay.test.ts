import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { FounderAnswerAct } from '@repo/types/domain/strategic-intelligence';
import { describe, expect, it } from 'vitest';

import {
  applyFounderAnswer,
  createProjectLedger,
  questionHash,
  selectNextAction,
  type JudgmentLedger,
} from '../si-judgment-contract';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../');
const REPLAY_PATH = resolve(ROOT, 'docs/evidence/ALABOM/AI-PM/PR197-CPO-STRATEGY-FIT-REPLAY.json');
const OUT_PATH = resolve(ROOT, 'docs/evidence/ALABOM/AI-PM/PR197-CPO-SI-CAUSE-RECOVERY-REPLAY.json');
const STAGE_CLAIM = /단계를 .+에서 .+로 바꾼다|유일한 단계 변화/;

type OldTurn = {
  step: number;
  founderAnswer: string;
  answerKind: string;
  appliesToGap: string;
  shown?: { questionText?: string };
};

type ReplayFile = {
  scenarios: Record<string, Record<string, { turns: OldTurn[] }>>;
};

type Spine = { customer: string; problem: string; business: string };

type ColumnFailure = { row: string; column: '장부' | '판단' | '다음'; detail: string };

function quote(text: string): string {
  const match = text.match(/「([^」]+)」/);
  if (!match?.[1]) throw new Error(`quote missing: ${text}`);
  return match[1];
}

function spineFor(replay: ReplayFile, scenarioId: string): Spine {
  const branches = replay.scenarios[scenarioId];
  if (!branches) throw new Error(`missing ${scenarioId}`);
  const confirm = branches.confirm?.turns;
  if (!confirm) throw new Error(`missing confirm ${scenarioId}`);
  const problemTurn = confirm.find((turn) => turn.appliesToGap === 'problemJtbd');
  const businessTurn = confirm.find((turn) => turn.appliesToGap === 'businessOneLiner');
  if (!problemTurn?.shown?.questionText || !confirm[0]?.shown?.questionText) throw new Error(`spine missing ${scenarioId}`);
  let business = businessTurn?.shown?.questionText ? quote(businessTurn.shown.questionText) : '';
  if (!business) {
    const revenue = Object.values(branches)
      .flatMap((branch) => branch.turns)
      .find((turn) => turn.appliesToGap === 'revenueModel');
    business = revenue?.founderAnswer.replace(/^수익:\s*/, '') || '월 구독';
  }
  return {
    customer: quote(confirm[0].shown.questionText),
    problem: quote(problemTurn.shown.questionText),
    business,
  };
}

function targetFor(gap: string): string {
  if (gap === 'customerPersona') return 'h-customer';
  if (gap === 'problemJtbd') return 'h-problem';
  if (gap === 'payer') return 'h-payer';
  if (gap === 'marketChannel') return 'h-channel';
  if (gap === 'businessOneLiner' || gap === 'revenueModel') return 'h-business-model';
  if (gap === 'alternativesCompetitors') return 'h-market';
  return 'h-customer';
}

function actFor(branchId: string, turn: OldTurn, hypothesisId: string): FounderAnswerAct {
  if (branchId === 'unknown' && turn.answerKind === 'unknown') return { kind: 'unknown', targetHypothesisId: hypothesisId };
  if (branchId === 'paymentYes' && turn.appliesToGap === 'validationTestability') {
    return { kind: 'payment_claim', proposition: turn.founderAnswer, targetHypothesisId: 'h-business-model' };
  }
  if (branchId === 'paymentNone' && turn.appliesToGap === 'validationTestability') {
    return { kind: 'absence_claim', proposition: turn.founderAnswer, targetHypothesisId: 'h-business-model' };
  }
  if (branchId === 'revise' && turn.appliesToGap === 'customerPersona') {
    return { kind: 'replace', nextStatement: turn.founderAnswer, proposition: turn.founderAnswer, targetHypothesisId: 'h-customer' };
  }
  return { kind: 'affirm', proposition: turn.founderAnswer, targetHypothesisId: targetFor(turn.appliesToGap) };
}

function decisionView(ledger: JudgmentLedger) {
  const decision = selectNextAction(ledger);
  return decision;
}

describe('pure SI cause recovery replay', () => {
  it('checks ledger, judgment, and next action on all thirty branches', () => {
    const replay = JSON.parse(readFileSync(REPLAY_PATH, 'utf8')) as ReplayFile;
    const spines = Object.fromEntries(Object.keys(replay.scenarios).map((id) => [id, spineFor(replay, id)])) as Record<string, Spine>;
    const failures: ColumnFailure[] = [];
    const rows = [];

    for (const [scenarioId, branches] of Object.entries(replay.scenarios)) {
      const spine = spines[scenarioId];
      if (!spine) throw new Error(`spine ${scenarioId}`);
      const foreignCustomers = Object.entries(spines)
        .filter(([id, item]) => id !== scenarioId && item.customer !== spine.customer)
        .map(([, item]) => item.customer);
      for (const [branchId, branch] of Object.entries(branches)) {
        const row = `${scenarioId} ${branchId}`;
        let ledger = createProjectLedger({
          customerStatement: spine.customer,
          problemStatement: spine.problem,
          businessStatement: spine.business,
        });
        const turns = [];
        let previousHash = '';
        let previousJudgment = ledger.judgment;
        for (const turn of branch.turns) {
          const before = decisionView(ledger);
          const beforeStage = ledger.stageId;
          const beforeJudgment = ledger.judgment;
          const act = actFor(branchId, turn, before.hypothesisId);
          const applied = applyFounderAnswer(ledger, before, act);
          ledger = applied.ledger;
          let after: ReturnType<typeof decisionView> | null = null;
          let decisionError = '';
          try {
            after = decisionView(ledger);
          } catch (error) {
            decisionError = error instanceof Error ? error.message : String(error);
            failures.push({ row, column: '다음', detail: `${turn.step} select threw ${decisionError}` });
          }
          if (after && STAGE_CLAIM.test(after.priorityReason)) {
            const winner = (after.previews ?? []).filter((item) => item.candidateId === after?.selectedId);
            if (winner.every((item) => !item.stageChanged)) {
              failures.push({ row, column: '다음', detail: `${turn.step} stage claim without change: ${after.priorityReason}` });
            }
          }
          const hash = after ? questionHash(after) : '';
          if (after && hash === previousHash && ledger.judgment === previousJudgment && !applied.unchangedReason) {
            failures.push({ row, column: '다음', detail: `${turn.step} repeated ${hash} without a judgment change` });
          }
          if (act.kind === 'unknown' && after && questionHash(before) === hash) {
            failures.push({ row, column: '다음', detail: `${turn.step} unknown kept ${hash}` });
          }
          turns.push({
            step: turn.step,
            appliesToGap: turn.appliesToGap,
            act: act.kind,
            targetHypothesisId: applied.targetHypothesisId,
            judgment: ledger.judgment,
            stageId: ledger.stageId,
            verdictId: ledger.verdictId,
            selectedId: after?.selectedId ?? '',
            hypothesisId: after?.hypothesisId ?? '',
            prompt: after?.prompt ?? '',
            priorityReason: after?.priorityReason ?? '',
            tieBreak: after?.tieBreak ?? '',
            criticalUnknownHypothesisId: ledger.criticalUnknownHypothesisId,
            rankedIds: after?.candidates.map((item) => item.id) ?? [],
            judgmentChanged: ledger.judgment !== beforeJudgment,
            unchangedReason: applied.unchangedReason,
            stageBefore: beforeStage,
            judgmentBefore: beforeJudgment,
            customerClass: ledger.hypotheses['h-customer']?.evidenceClass ?? '',
            customerOutcome: ledger.hypotheses['h-customer']?.outcome ?? '',
            customerStatement: ledger.hypotheses['h-customer']?.statement ?? '',
            problemStatement: ledger.hypotheses['h-problem']?.statement ?? '',
            problemNextStatement: ledger.hypotheses['h-problem-next']?.statement ?? '',
          });
          previousHash = hash;
          previousJudgment = ledger.judgment;
        }

        const fail = (column: ColumnFailure['column'], detail: string) => failures.push({ row, column, detail });
        const turn = (step: number) => turns.find((item) => item.step === step);
        const customer = ledger.hypotheses['h-customer'];
        const problem = ledger.hypotheses['h-problem'];
        const payer = ledger.hypotheses['h-payer'];

        if (branchId === 'confirm') {
          const first = turn(0);
          const second = turn(1);
          const third = turn(2);
          if (ledger.hypotheses['h-customer']?.evidenceClass !== 'CLAIM' || ledger.hypotheses['h-customer']?.statement !== spine.customer) {
            fail('장부', `customer ${customer?.evidenceClass} ${customer?.statement}`);
          }
          if (ledger.hypotheses['h-problem']?.evidenceClass !== 'CLAIM' || ledger.hypotheses['h-problem']?.statement !== spine.problem) {
            fail('장부', `problem ${problem?.evidenceClass} ${problem?.statement}`);
          }
          if (payer?.evidenceClass !== 'CLAIM' || payer.statement !== branch.turns[2]?.founderAnswer) fail('장부', `payer ${payer?.statement}`);
          if (!first || first.hypothesisId !== 'h-problem' || !first.prompt.includes(spine.problem)) fail('다음', `after customer ${first?.hypothesisId} ${first?.prompt}`);
          if (!second || second.stageId !== 'S1' || !second.judgment.includes(spine.customer) || !second.judgment.includes(spine.problem)) {
            fail('판단', `after problem ${second?.stageId} ${second?.judgment}`);
          }
          if (!third || third.hypothesisId !== 'h-business-model' || third.tieBreak === 'stable-id') fail('다음', `after payer ${third?.hypothesisId} ${third?.tieBreak} ${third?.priorityReason}`);
          if (third?.priorityReason.includes('유일한 단계 변화')) fail('다음', third.priorityReason);
          for (const later of turns.slice(3)) {
            if (later.hypothesisId === 'h-channel') fail('다음', `channel selected at ${later.step}`);
          }
        }

        if (branchId === 'revise') {
          const first = turn(0);
          const successor = ledger.hypotheses['h-customer-next'];
          if (customer?.statement !== spine.customer || customer.outcome !== 'conflict_unresolved') fail('장부', `old customer ${customer?.statement} ${customer?.outcome}`);
          if (successor?.statement !== branch.turns[0]?.founderAnswer || successor.evidenceClass !== 'CLAIM') fail('장부', `successor ${successor?.statement} ${successor?.evidenceClass}`);
          if (ledger.hypotheses['h-problem-next']?.statement) fail('장부', `new problem copied ${ledger.hypotheses['h-problem-next']?.statement}`);
          if (!ledger.bindings.some((item) => item.id === 'b-customer-doc')) fail('장부', 'document binding dropped');
          if (!first?.judgment.includes(spine.customer) || !first.judgment.includes(branch.turns[0]?.founderAnswer ?? '') || !first.judgment.includes('철회')) {
            fail('판단', first?.judgment ?? '');
          }
          if (ledger.hypotheses['h-problem-next']?.pairedCustomerId !== 'h-customer-next') fail('장부', 'new problem is not paired to the new customer');
          if (!first || first.hypothesisId !== 'h-problem-next' || first.selectedId !== 'q-problem-next') {
            fail('다음', `${first?.selectedId} ${first?.hypothesisId}`);
          }
          if (!first.prompt.includes(branch.turns[0]?.founderAnswer ?? '') || first.prompt.includes(spine.problem)) {
            fail('다음', first.prompt);
          }
          if (!first.priorityReason.includes('q-problem-next') || !first.priorityReason.includes('판단 문장이 달라진다') || /단계를 .+에서 .+로 바꾼다/.test(first.priorityReason)) {
            fail('다음', first.priorityReason);
          }
          if (turns.some((item) => item.hypothesisId !== 'h-problem-next' || item.prompt.includes(spine.problem))) {
            fail('다음', 'revise left the new problem or asked the old problem');
          }
          for (const item of turns) {
            const splitAt = item.judgment.indexOf('과거 기록');
            const active = splitAt >= 0 ? item.judgment.slice(0, splitAt) : '';
            const history = splitAt >= 0 ? item.judgment.slice(splitAt) : '';
            if (!active.includes(branch.turns[0]?.founderAnswer ?? '') || active.includes(spine.problem) || !active.includes('활성 판단의 문제는 아직 확인되지 않았다')) {
              fail('판단', active || item.judgment);
            }
            if (!history.includes(spine.customer) || !history.includes(spine.problem) || !history.includes('이 문제는 이전 고객 짝에 속하며 활성 평가에서 제외되었다') || !history.includes('새 고객에 대한 판정이 아니다')) {
              fail('판단', history || item.judgment);
            }
            if (item.judgment.includes('어느 쪽도 작업 기준이 아니다')) fail('판단', item.judgment);
            if (item.criticalUnknownHypothesisId !== item.hypothesisId) fail('다음', `${item.criticalUnknownHypothesisId} ${item.hypothesisId}`);
          }
        }

        if (branchId === 'unknown') {
          const first = turn(0);
          if (first?.customerClass === 'CLAIM') fail('장부', `unknown promoted the customer to ${first.customerClass}`);
          if (!first?.judgment.includes('아직 확인되지 않았다') || !first.judgment.includes(spine.customer)) fail('판단', first?.judgment ?? '');
          const confirmed = turn(1);
          if (confirmed?.hypothesisId !== 'h-problem') fail('다음', `after later confirm ${confirmed?.hypothesisId}`);
        }

        if (branchId === 'paymentYes') {
          const paid = turn(1);
          const weak = ledger.bindings.find((item) => item.classReason === 'weak-payment');
          if (weak?.evidenceClass !== 'CLAIM' || weak.hypothesisId !== 'h-business-model') fail('장부', `weak ${weak?.evidenceClass} ${weak?.hypothesisId}`);
          if (ledger.bindings.some((item) => item.evidenceClass === 'FACT' || item.evidenceClass === 'VALIDATED')) fail('장부', 'payment became fact');
          if (!paid || paid.stageId !== paid.stageBefore) fail('장부', `stage moved ${paid?.stageBefore} ${paid?.stageId}`);
          if (!paid?.judgment.includes(branch.turns[1]?.founderAnswer ?? '') || !paid.judgment.includes('주체·금액·기록') || !paid.judgment.includes(spine.customer)) {
            fail('판단', paid?.judgment ?? '');
          }
          if (paid?.hypothesisId !== 'h-payer' || paid.selectedId !== 'q-payer' || paid.prompt.includes(spine.problem) || paid.prompt.includes('더 좁혀')) {
            fail('다음', `${paid?.selectedId} ${paid?.prompt}`);
          }
          if (!paid.prompt.includes('누구의 결제') || !paid.prompt.includes('금액과 거래 기록은 이 질문으로 생기지 않는다')) fail('다음', paid.prompt);
          if (!paid.priorityReason.includes('q-payer') || !paid.priorityReason.includes('u-payer') || !paid.priorityReason.includes('판단 문장이 달라진다') || !paid.priorityReason.includes('q-problem는 u-payer를 남긴다') || !paid.priorityReason.includes('단계 변화는 없다') || !paid.priorityReason.includes('사업 성과를 확정하지 않는다') || STAGE_CLAIM.test(paid.priorityReason)) {
            fail('다음', paid.priorityReason);
          }
          if (paid.rankedIds[0] !== 'q-payer' || !paid.rankedIds.includes('q-problem') || paid.rankedIds.indexOf('q-payer') > paid.rankedIds.indexOf('q-problem')) {
            fail('다음', paid.rankedIds.join(','));
          }
          if (paid.criticalUnknownHypothesisId !== 'h-payer') fail('다음', paid.criticalUnknownHypothesisId);
          if (paid.hypothesisId === 'h-customer' || paid.selectedId === 'v-business-model' || paid.selectedId === 'q-problem') fail('다음', 'repeated a known customer, the problem sentence, or the payment claim');
        }

        if (branchId === 'paymentNone') {
          const absent = turn(1);
          const binding = ledger.bindings.find((item) => item.classReason === 'absence');
          if (binding?.id !== 'b-absence' || binding.evidenceClass !== 'CLAIM' || binding.hypothesisId !== 'h-business-model') {
            fail('장부', `absence ${binding?.id} ${binding?.hypothesisId} ${binding?.evidenceClass}`);
          }
          if (ledger.hypotheses['h-problem']?.evidenceClass === 'FACT' || ledger.hypotheses['h-market']?.evidenceClass === 'FACT') fail('장부', 'absence copied');
          if (!absent?.judgment.includes('아직 실제 결제·사용 증거는 없습니다')) fail('판단', absent?.judgment ?? '');
          if (absent?.stageId !== absent.stageBefore) fail('장부', `stage moved ${absent?.stageBefore} ${absent?.stageId}`);
          if (absent?.hypothesisId !== 'h-business-model' || absent.selectedId !== 'v-business-model' || absent.prompt.includes(spine.problem) || absent.prompt.includes('누구의 결제') || absent.prompt.includes('더 좁혀')) {
            fail('다음', `${absent?.selectedId} ${absent?.prompt}`);
          }
          if (!absent.prompt.includes('문자 기록') || !absent.prompt.includes('기록이 생기지 않는다')) fail('다음', absent.prompt);
          if (!absent.priorityReason.includes('literal_unreviewed') || !absent.priorityReason.includes('conflict') || !absent.priorityReason.includes('기록이 생기지 않는다') || !absent.priorityReason.includes('필요한 증거') || STAGE_CLAIM.test(absent.priorityReason)) {
            fail('다음', absent.priorityReason);
          }
          if (absent.rankedIds[0] !== 'v-business-model' || !absent.rankedIds.includes('q-problem') || absent.rankedIds.indexOf('v-business-model') > absent.rankedIds.indexOf('q-problem')) {
            fail('다음', absent.rankedIds.join(','));
          }
          if (absent.criticalUnknownHypothesisId !== 'h-business-model') fail('다음', absent.criticalUnknownHypothesisId);
          if (absent.hypothesisId === 'h-customer' || absent.selectedId === 'q-problem') fail('다음', 'repeated a known customer or the problem sentence');
        }

        for (const item of turns) {
          for (const foreign of foreignCustomers) {
            if (item.judgment.includes(foreign)) fail('판단', `foreign ${foreign} at ${item.step}`);
          }
        }
        if (customer?.statement !== spine.customer && branchId !== 'revise') fail('장부', `customer drifted ${customer?.statement}`);

        rows.push({
          scenarioId,
          branchId,
          spine,
          passed: !failures.some((item) => item.row === row),
          screenMismatch: '판단 불가',
          turns,
        });
      }
    }

    const passed = rows.filter((item) => item.passed).length;
    writeFileSync(
      OUT_PATH,
      JSON.stringify(
        {
          sourceReplay: 'b17161ec',
          command: 'pnpm --filter web exec vitest run features/strategic-intelligence/lib/__tests__/si-judgment-contract.test.ts features/strategic-intelligence/lib/__tests__/si-strategy-replay.test.ts',
          branchCount: rows.length,
          passed,
          failed: rows.length - passed,
          failures,
          rows,
        },
        null,
        2,
      ),
    );
    expect(failures).toEqual([]);
  });
});
