import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import { pickSiIntegrationAnswer } from '../si-integration-answers';
import { getSiCalibrationCase } from '../si-calibration-cases';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { presentSiAiPmQuestion } from '../present-si-ai-pm-question';
import { decideSiValidationAsk } from '../decide-si-validation-ask';
import { analyzeStrategicIntelligence } from '../analyze-strategic-intelligence';
import { classifyFollowupFailures, scoreFounderFourTuple } from './score-si-decision-quality-followup';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-decision-quality-followup.json',
);
const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);

const CASE_IDS = ['clinicflow', 'fitbridge'] as const;
const SCENARIO_IDS = [
  'full_dce',
  'partial_dce',
  'unmet_dce',
  'additional_evidence',
  'ambiguous',
] as const;

const LOCKED_QUESTIONS = {
  juinjip:
    '쓰는 사람과 돈을 내는 사람이 같습니까? 결제자 한 명이 이 문제를 비용으로 해결할 이유가 있다면 그 이유를 알려주세요. 아직 확인 전이면 모른다고 답해도 됩니다.',
  lmulm:
    '최근 실제로 구매한 고객 중에서, 재판매 등록·거래 체결·재구매처럼 두 번째 행동이 일어난 경우가 있습니까? 있다면 규모(명 또는 건)를 알려주세요. 아직 없다면 계획만 있다고 답해도 됩니다.',
  ridm:
    '이 제품을 쓰며 돈을 내는 사람은 누구이고, 그 사람이 어떤 일을 이 제품으로 대신합니까? 실제 지불이 있으면 그 사람과 이유를 한 쌍으로 알려주세요. 아직이면 가설이라고 답해도 됩니다.',
} as const;

const PAYMENT_ONLY = pickSiIntegrationAnswer('paid_conversion', 'validated');
const INTENT_ONLY = pickSiIntegrationAnswer('paid_conversion', 'intent');
const AMBIGUOUS = '몇 곳이 관심 있는 것 같고 지표도 조금 좋아진 느낌입니다.';
const EXTRA_PAYMENT =
  '기존 유료 고객 2건이 다음 달에도 월 구독을 결제했고 같은 기능을 두 번째로 유료로 사용했다.';

type ScenarioId = (typeof SCENARIO_IDS)[number];

function snapshotJudgment(input: {
  verdictId: string;
  stageId: string;
  judgment: string;
  criticalUnknown: string;
  decisionChangingEvidence: string;
  validationPriority: string;
}) {
  return {
    verdictId: input.verdictId,
    stageId: input.stageId,
    judgment: input.judgment,
    criticalUnknown: input.criticalUnknown,
    decisionChangingEvidence: input.decisionChangingEvidence,
    validationPriority: input.validationPriority,
  };
}

function stakeFromUnknown(criticalUnknown: string): { noun: string; from: string; to: string } {
  if (/no-show|노쇼/i.test(criticalUnknown)) return { noun: 'no-show', from: '18%', to: '9%' };
  if (/반품/.test(criticalUnknown)) return { noun: '반품률', from: '32%', to: '20%' };
  return { noun: '수치화된 문제 지표', from: '20%', to: '10%' };
}

function answersFor(scenarioId: ScenarioId, criticalUnknown: string): string[] {
  const stake = stakeFromUnknown(criticalUnknown);
  if (scenarioId === 'full_dce') {
    return [
      `결제 후보 2명이 월 구독을 결제했고 ${stake.noun}가 ${stake.from}에서 ${stake.to}로 줄었다.`,
    ];
  }
  if (scenarioId === 'partial_dce') return [PAYMENT_ONLY];
  if (scenarioId === 'unmet_dce') return [INTENT_ONLY];
  if (scenarioId === 'additional_evidence') return [PAYMENT_ONLY, EXTRA_PAYMENT];
  return [AMBIGUOUS];
}

function runScenario(caseId: (typeof CASE_IDS)[number], scenarioId: ScenarioId) {
  const fixture = getSiCalibrationCase(caseId);
  const t0 = resolveSiJourneyIntegration({
    title: fixture.title,
    businessDocument: fixture.documentText,
  });
  const answers = answersFor(scenarioId, t0.firstJudgment.criticalUnknown);
  let document = fixture.documentText;
  const turns = [];
  let last = t0;
  for (const answer of answers) {
    const after = resolveSiJourneyIntegration({
      title: fixture.title,
      businessDocument: document,
      founderAnswer: answer,
    });
    turns.push({
      answer,
      evidenceClass: after.current.update?.addedEvidence[0]?.evidenceClass ?? null,
      judgment: snapshotJudgment(after.current.judgment),
      question: after.current.question.questionText,
      kind: after.current.question.kind,
      judgmentChanged: after.current.update?.judgmentChanged ?? false,
      criticalUnknownChanged: after.current.update?.criticalUnknownChanged ?? false,
      validationPriorityChanged: after.current.update?.validationPriorityChanged ?? false,
    });
    document = appendFounderEvidenceToDocument(document, answer);
    last = after;
  }
  const four = scoreFounderFourTuple(last.current.judgment);
  const dcePartialNamed = last.current.judgment.evidenceMap.some((item) =>
    /DCE는 부분/.test(item.text),
  );
  const failures = classifyFollowupFailures({
    scenarioId,
    verdictId: last.current.judgment.verdictId,
    stageId: last.current.judgment.stageId,
    criticalUnknown: last.current.judgment.criticalUnknown,
    dcePartialNamed,
    nextQuestion: last.current.question.questionText,
    axes: four.axes,
  });
  return {
    id: caseId,
    scenarioId,
    t0: {
      ...snapshotJudgment(t0.firstJudgment),
      question: t0.firstQuestion.questionText,
      kind: t0.firstQuestion.kind,
    },
    turns,
    tFinal: snapshotJudgment(last.current.judgment),
    nextQuestion: last.current.question.questionText,
    nextKind: last.current.question.kind,
    dcePartialNamed,
    founderFour: four,
    failures,
  };
}

describe('S.I. Decision Quality follow-up — measure on #104 baseline', () => {
  it('does not rewrite the engine, presenter, or question engine', () => {
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function dceStakeOpen/);
    expect(PRESENTER_SRC).toMatch(/QUESTION_BY_KIND/);
    expect(ANALYZER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
    expect(PRESENTER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
  });

  it.each(Object.keys(LOCKED_QUESTIONS) as Array<keyof typeof LOCKED_QUESTIONS>)(
    '%s spoken question stays locked on the #104 baseline',
    (id) => {
      const fixture = getSiCalibrationCase(id);
      const question = presentSiAiPmQuestion(
        decideSiValidationAsk(analyzeStrategicIntelligence({ documentText: fixture.documentText })),
      );
      expect(question.questionText).toBe(LOCKED_QUESTIONS[id]);
    },
  );

  it('records the ClinicFlow / FitBridge DCE matrix without opening a fix', () => {
    const rows = CASE_IDS.flatMap((id) => SCENARIO_IDS.map((scenarioId) => runScenario(id, scenarioId)));

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');

    expect(rows).toHaveLength(10);

    for (const row of rows) {
      expect(row.t0.kind).not.toBe('repeat_loop');
      expect(row.nextQuestion).not.toMatch(/재판매/);
      expect(row.failures).not.toContain('false_s3_promotion');
      expect(row.failures).not.toContain('resale_drift');
      expect(row.failures).not.toContain('partial_as_full_validated');
      expect(row.failures).not.toContain('unclear_judgment');
      expect(row.failures).not.toContain('unclear_unknown');
      expect(row.failures).not.toContain('unclear_dce');
      expect(row.failures).not.toContain('unclear_next_action');
    }

    const partials = rows.filter((row) => row.scenarioId === 'partial_dce');
    expect(partials).toHaveLength(2);
    for (const row of partials) {
      expect(row.tFinal.verdictId).toBe('judgment_deferred');
      expect(row.tFinal.stageId).not.toBe('S3');
      expect(row.tFinal.judgment).not.toMatch(/사업화 가능성이 높음/);
      expect(row.dcePartialNamed).toBe(true);
    }

    const full = rows.filter((row) => row.scenarioId === 'full_dce');
    expect(full.every((row) => row.tFinal.stageId === 'S3')).toBe(true);

    const fourClear = rows.filter((row) => row.founderFour.overall !== 'FAIL');
    expect(fourClear).toHaveLength(10);
  });
});
