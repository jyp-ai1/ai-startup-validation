import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { classifyFounderEvidenceClass } from '../classify-founder-evidence';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import {
  scoreAfterFullDce,
  scoreGeneralizedHeld,
  scoreHeldOutcome,
  scorePlannedOutcome,
  scoreWorseOutcome,
  type ConversationActual,
} from './score-si-conversation-evidence';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-conversation-evidence.json',
);
const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const EVIDENCE_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), './score-si-conversation-evidence.ts'),
  'utf8',
);

const CODE_SHA = '71df6f90057e2b8123bfb79e331c9b46d978491b';

const OMISSION = `물류 센터는 출고 전 검수에서 누락이 14%에 달합니다.
기존 대안은 SAP 기본 검수 화면입니다.
아직 출시되지 않았고 매출은 없습니다.`;

const LOAD = `고객지원 팀은 티켓 부하가 41% 수준으로 몰립니다.
기존 대안은 Zendesk 매크로입니다.
아직 출시되지 않았고 매출은 없습니다.`;

const FULL_OMISSION = '결제 후보 3명이 월 구독을 결제했고 누락이 14%에서 6%로 줄었다.';
const HELD_OMISSION =
  '다음 기간에도 누락이 6%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.';
const WORSE_OMISSION = '다음 기간에 누락이 6%에서 18%로 늘었다.';
const PLAN_NEXT = '다음 기간 성과를 측정할 예정이다.';
const FULL_LOAD = '결제 후보 4명이 연 계약을 결제했고 부하가 41%에서 19%로 줄었다.';
const HELD_LOAD =
  '다음 기간에도 부하가 19%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.';

function actualOf(document: string, answer?: string): ConversationActual {
  const view = resolveSiJourneyIntegration({
    title: 'conversation-evidence',
    businessDocument: document,
    founderAnswer: answer,
  });
  const judgment = view.current.judgment;
  const question = view.current.question;
  const update = view.current.update;
  return {
    verdictId: judgment.verdictId,
    stageId: judgment.stageId,
    judgment: judgment.judgment,
    criticalUnknown: judgment.criticalUnknown,
    decisionChangingEvidence: judgment.decisionChangingEvidence,
    validationPriority: judgment.validationPriority,
    questionText: question.questionText,
    whyAsking: question.whyAsking,
    evidenceClass: update?.addedEvidence[0]?.evidenceClass ?? classifyFounderEvidenceClass(answer ?? ''),
    evidenceStrengthDelta: update?.evidenceStrengthDelta ?? null,
    criticalUnknownChanged: update?.criticalUnknownChanged ?? null,
  };
}

describe('Conversation Quality Evidence Batch — independent dump', () => {
  it('does not import the #128 self-scorer or brand-branch the referee', () => {
    expect(EVIDENCE_SRC).not.toMatch(/score-si-conversation-quality/);
    expect(EVIDENCE_SRC).not.toMatch(/next-period-outcome/);
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
    expect(`${ANALYZER_SRC}\n${EVIDENCE_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
  });

  it('dumps actual Founder-visible turns against the CPO 5-axis table', () => {
    const after22 = actualOf(OMISSION, FULL_OMISSION);
    const held = actualOf(appendFounderEvidenceToDocument(OMISSION, FULL_OMISSION), HELD_OMISSION);
    const worse = actualOf(appendFounderEvidenceToDocument(OMISSION, FULL_OMISSION), WORSE_OMISSION);
    const plan = actualOf(appendFounderEvidenceToDocument(OMISSION, FULL_OMISSION), PLAN_NEXT);
    const other = actualOf(appendFounderEvidenceToDocument(LOAD, FULL_LOAD), HELD_LOAD);

    const rows = [
      {
        id: 'after_2_2',
        metric: '누락',
        founderInput: FULL_OMISSION,
        expected:
          'S3 · CU=다음 고객/기간 · 질문이 그 CU를 붙잡음',
        actual: after22,
        referee: scoreAfterFullDce(after22),
      },
      {
        id: 'held_retires_cu',
        metric: '누락',
        founderInput: HELD_OMISSION,
        expected:
          '기존 next-period CU 퇴직 · 반복 가능 CU · 질문 변경 · VALIDATED 아님 · S3 유지',
        actual: held,
        previousQuestion: after22.questionText,
        referee: scoreHeldOutcome(after22, held),
      },
      {
        id: 'worse_does_not_retire',
        metric: '누락',
        founderInput: WORSE_OMISSION,
        expected: '악화를 유지 성공으로 퇴직시키지 않음',
        actual: worse,
        referee: scoreWorseOutcome(worse),
      },
      {
        id: 'plan_stays_claim',
        metric: '누락',
        founderInput: PLAN_NEXT,
        expected: 'CLAIM · 승격 없음 · next-period CU 유지',
        actual: plan,
        referee: scorePlannedOutcome(plan),
      },
      {
        id: 'generalized_metric',
        metric: '부하',
        founderInput: HELD_LOAD,
        expected: '다른 metric에서도 held → CU 퇴직 · S3 유지',
        actual: other,
        referee: scoreGeneralizedHeld(other),
      },
    ];

    const dump = {
      codeSha: CODE_SHA,
      measuredOn: CODE_SHA,
      rows,
    };
    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(dump, null, 2)}\n`, 'utf8');

    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.referee.score === 'PASS')).toBe(true);
    expect(held.questionText).not.toBe(after22.questionText);
  });
});
