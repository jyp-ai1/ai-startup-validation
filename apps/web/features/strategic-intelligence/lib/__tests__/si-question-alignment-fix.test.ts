import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { presentSiAiPmQuestion } from '../present-si-ai-pm-question';
import { getSiCalibrationCase } from '../si-calibration-cases';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { scoreSpokenAlignment } from './score-si-question-alignment-holdout';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-question-alignment-fix.json',
);
const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);
const ASK_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../decide-si-validation-ask.ts'),
  'utf8',
);

const PRODUCTION_SHA = 'dea7cb1916cfbd4e6f8c54a86e6da920ed708bd2';

const UNNAMED_REPEAT = {
  ledger: `지방 세무 사무소는 신고 마감을 수기로 처리해 어렵습니다.
기존 대안은 범용 ERP입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  fieldops: `현장 점검 코디는 일정 조율을 메신저로 해서 불편합니다.
기존 대안은 Slack 리마인더입니다.
아직 출시되지 않았고 매출은 없습니다.`,
} as const;

const UNNAMED_NEXT = {
  omission: `물류 센터는 출고 전 검수에서 누락이 14%에 달합니다.
기존 대안은 SAP 기본 검수 화면입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  load: `고객지원 팀은 티켓 부하가 41% 수준으로 몰립니다.
기존 대안은 Zendesk 매크로입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  mismatch: `중고 거래 카탈로그는 사진-실물 미스매치가 22%입니다.
기존 대안은 Notion 검수 체크리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  inconsistency: `병원 청구 팀은 코드 불일치가 19%에 달합니다.
기존 대안은 EHR 기본 청구 모듈입니다.
아직 출시되지 않았고 매출은 없습니다.`,
} as const;

function afterAnswer(title: string | undefined, documentText: string, answer: string) {
  return resolveSiJourneyIntegration({
    title,
    businessDocument: documentText,
    founderAnswer: answer,
  }).current;
}

describe('Question Alignment Fix — CU axis preserved in spoken question', () => {
  it('does not brand-branch, rewrite the analyzer, or add a persist SoT', () => {
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}\n${ASK_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function pickCriticalUnknown/);
    expect(ANALYZER_SRC).toMatch(/function decideStage/);
    expect(ASK_SRC).toMatch(/function detectSiValidationKind/);
    expect(PRESENTER_SRC).toMatch(/stakeFromAsk\(ask\.criticalUnknown\)/);
    expect(PRESENTER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
  });

  it('does not weave a DCE boilerplate stake onto a repeatability CU', () => {
    const question = presentSiAiPmQuestion({
      kind: 'repeat_loop',
      criticalUnknown:
        '현재 강점이 반복 가능한 사업으로 이어지는가. 1회 성과가 반복되지 않으면 사업화 판단을 유지할 수 없다.',
      decisionChangingEvidence:
        '반복 구매·재사용 또는 이탈 없는 두 번째 거래 데이터. 이 데이터가 있으면 판단을 유지·상향하고, 없으면 1회성으로 내린다.',
      validationPriority: '이미 구매한 고객의 두 번째 행동을 확인한다.',
      source: 'si-v1',
    });
    expect(question.kind).toBe('repeat_loop');
    expect(question.questionText).toMatch(/두 번째 행동|재구매|재판매/);
    expect(question.questionText).not.toMatch(/이탈 수치/);
    expect(question.questionText).not.toMatch(/no-show|반품률/);
  });

  it('still weaves a stake that is the CU object on paid conversion', () => {
    const question = presentSiAiPmQuestion({
      kind: 'paid_conversion',
      criticalUnknown:
        '결제 후보가 유료로 썼을 때 문서가 수치화한 no-show 수치가 실제로 줄어드는가. 지불만 있고 그 지표가 그대로면 유료 전환으로 판단을 확정할 수 없다.',
      decisionChangingEvidence: '유료 파일럿 1건과 no-show 전후 비교. EMR 대비 문서가 주장한 차별이 그 지표에서 보이는지도 같이 본다.',
      validationPriority: '가장 가까운 결제 후보에게 유료 제안을 하고, 문서가 적은 no-show의 전후를 한 번 잰다.',
      source: 'si-v1',
    });
    expect(question.questionText).toMatch(/no-show/);
    expect(question.questionText).toMatch(/EMR/);
  });

  it('keeps unnamed repeatability CUs on the second-action axis', () => {
    const rows = Object.entries(UNNAMED_REPEAT).map(([id, documentText]) => {
      const view = afterAnswer(
        undefined,
        documentText,
        '결제 후보 3명이 월 구독을 결제했고 유료 전환 2건이 발생했다.',
      );
      const spoken = scoreSpokenAlignment({
        verdictId: view.judgment.verdictId,
        stageId: view.judgment.stageId,
        judgment: view.judgment.judgment,
        criticalUnknown: view.judgment.criticalUnknown,
        decisionChangingEvidence: view.judgment.decisionChangingEvidence,
        validationPriority: view.judgment.validationPriority,
        question: view.question.questionText,
        kind: view.question.kind,
        evidenceClass: view.update?.addedEvidence[0]?.evidenceClass ?? null,
      });
      return {
        id,
        cu: view.judgment.criticalUnknown,
        kind: view.question.kind,
        question: view.question.questionText,
        spoken: spoken.score,
      };
    });
    for (const row of rows) {
      expect(row.cu).toMatch(/반복 가능/);
      expect(row.question).toMatch(/두 번째 행동|재구매|재판매/);
      expect(row.question).not.toMatch(/이탈 수치/);
      expect(row.spoken).toBe('PASS');
    }
  });

  it('keeps LMULM and RIDM repeatability questions off 이탈 after promotion', () => {
    const lmulm = getSiCalibrationCase('lmulm');
    const ridm = getSiCalibrationCase('ridm');
    const l = afterAnswer(
      lmulm.title,
      lmulm.documentText,
      '최근 구매자 60명 중 18명이 실제 재판매를 등록했고 7건이 거래됐다.',
    );
    const r = afterAnswer(
      ridm.title,
      ridm.documentText,
      '결제자 2명이 분기 구독을 결제했고 감정 기록 직무를 이 제품으로 대체했다.',
    );
    for (const view of [l, r]) {
      expect(view.judgment.criticalUnknown).toMatch(/반복 가능/);
      expect(view.question.questionText).toMatch(/두 번째 행동|재구매|재판매/);
      expect(view.question.questionText).not.toMatch(/이탈 수치/);
    }
  });

  it('leaves Pattern A next-CU generic asks unchanged', () => {
    const clinic = getSiCalibrationCase('clinicflow');
    const fit = getSiCalibrationCase('fitbridge');
    const clinicView = afterAnswer(
      clinic.title,
      clinic.documentText,
      '결제 후보 3명이 연 계약을 결제했고 no-show가 22%에서 12%로 줄었다.',
    );
    const fitView = afterAnswer(
      fit.title,
      fit.documentText,
      '결제 후보 5명이 위젯 구독을 결제했고 반품률이 38%에서 29%로 줄었다.',
    );
    const omission = afterAnswer(
      undefined,
      UNNAMED_NEXT.omission,
      '결제 후보 3명이 월 구독을 결제했고 누락이 14%에서 6%로 줄었다.',
    );
    const load = afterAnswer(
      undefined,
      UNNAMED_NEXT.load,
      '결제 후보 4명이 연 계약을 결제했고 부하가 41%에서 19%로 줄었다.',
    );
    for (const view of [clinicView, fitView, omission, load]) {
      expect(view.judgment.criticalUnknown).toMatch(/다음 고객|다음 기간/);
      expect(view.question.kind).toBe('generic');
      expect(view.question.questionText).toMatch(/지금 판단을 바꾸려면 실제 행동 증거/);
    }
  });

  it('keeps the 주인집 control on the segment question', () => {
    const juinjip = getSiCalibrationCase('juinjip');
    const view = afterAnswer(
      juinjip.title,
      juinjip.documentText,
      '결제자 5명이 실제로 월 마케팅비를 결제했고 쓰는 사람이 아니라 그 결제자가 돈을 냈다.',
    );
    expect(view.judgment.criticalUnknown).toMatch(/세그먼트/);
    expect(view.question.kind).toBe('segment_proof');
    expect(view.question.questionText).toMatch(/고객 그룹/);
  });

  it('records the post-fix holdout spoken scores', () => {
    const lmulm = getSiCalibrationCase('lmulm');
    const ridm = getSiCalibrationCase('ridm');
    const clinic = getSiCalibrationCase('clinicflow');
    const fit = getSiCalibrationCase('fitbridge');
    const juinjip = getSiCalibrationCase('juinjip');
    const cases = [
      {
        id: 'unnamed_ledger',
        view: afterAnswer(
          undefined,
          UNNAMED_REPEAT.ledger,
          '결제 후보 3명이 월 구독을 결제했고 유료 전환 2건이 발생했다.',
        ),
      },
      {
        id: 'unnamed_fieldops',
        view: afterAnswer(
          undefined,
          UNNAMED_REPEAT.fieldops,
          '결제 후보 1명이 분기 구독을 결제했고 유료 전환 1건이 발생했다.',
        ),
      },
      {
        id: 'lmulm_alt',
        view: afterAnswer(
          lmulm.title,
          lmulm.documentText,
          '최근 구매자 60명 중 18명이 실제 재판매를 등록했고 7건이 거래됐다.',
        ),
      },
      {
        id: 'ridm_alt',
        view: afterAnswer(
          ridm.title,
          ridm.documentText,
          '결제자 2명이 분기 구독을 결제했고 감정 기록 직무를 이 제품으로 대체했다.',
        ),
      },
      {
        id: 'unnamed_omission',
        view: afterAnswer(
          undefined,
          UNNAMED_NEXT.omission,
          '결제 후보 3명이 월 구독을 결제했고 누락이 14%에서 6%로 줄었다.',
        ),
      },
      {
        id: 'unnamed_load',
        view: afterAnswer(
          undefined,
          UNNAMED_NEXT.load,
          '결제 후보 4명이 연 계약을 결제했고 부하가 41%에서 19%로 줄었다.',
        ),
      },
      {
        id: 'unnamed_mismatch',
        view: afterAnswer(
          undefined,
          UNNAMED_NEXT.mismatch,
          '결제 후보 2명이 구독을 결제했고 미스매치가 22%에서 10%로 줄었다.',
        ),
      },
      {
        id: 'unnamed_inconsistency',
        view: afterAnswer(
          undefined,
          UNNAMED_NEXT.inconsistency,
          '결제 후보 6명이 월 구독을 결제했고 불일치가 19%에서 8%로 줄었다.',
        ),
      },
      {
        id: 'clinicflow_alt',
        view: afterAnswer(
          clinic.title,
          clinic.documentText,
          '결제 후보 3명이 연 계약을 결제했고 no-show가 22%에서 12%로 줄었다.',
        ),
      },
      {
        id: 'fitbridge_alt',
        view: afterAnswer(
          fit.title,
          fit.documentText,
          '결제 후보 5명이 위젯 구독을 결제했고 반품률이 38%에서 29%로 줄었다.',
        ),
      },
      {
        id: 'juinjip_alt',
        view: afterAnswer(
          juinjip.title,
          juinjip.documentText,
          '결제자 5명이 실제로 월 마케팅비를 결제했고 쓰는 사람이 아니라 그 결제자가 돈을 냈다.',
        ),
      },
    ];
    const rows = cases.map(({ id, view }) => {
      const spoken = scoreSpokenAlignment({
        verdictId: view.judgment.verdictId,
        stageId: view.judgment.stageId,
        judgment: view.judgment.judgment,
        criticalUnknown: view.judgment.criticalUnknown,
        decisionChangingEvidence: view.judgment.decisionChangingEvidence,
        validationPriority: view.judgment.validationPriority,
        question: view.question.questionText,
        kind: view.question.kind,
        evidenceClass: view.update?.addedEvidence[0]?.evidenceClass ?? null,
      });
      return {
        id,
        cu: view.judgment.criticalUnknown,
        kind: view.question.kind,
        question: view.question.questionText,
        spoken: spoken.score,
        failure: spoken.failure,
      };
    });
    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify(
        {
          productionSha: PRODUCTION_SHA,
          scenarioCount: rows.length,
          spokenCounts: {
            PASS: rows.filter((row) => row.spoken === 'PASS').length,
            PARTIAL: rows.filter((row) => row.spoken === 'PARTIAL').length,
            FAIL: rows.filter((row) => row.spoken === 'FAIL').length,
          },
          rows,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    const patternB = rows.filter((row) =>
      ['unnamed_ledger', 'unnamed_fieldops', 'lmulm_alt', 'ridm_alt'].includes(row.id),
    );
    const patternA = rows.filter((row) =>
      [
        'unnamed_omission',
        'unnamed_load',
        'unnamed_mismatch',
        'unnamed_inconsistency',
        'clinicflow_alt',
        'fitbridge_alt',
      ].includes(row.id),
    );
    expect(patternB).toHaveLength(4);
    expect(patternA).toHaveLength(6);
    expect(patternB.every((row) => row.spoken === 'PASS')).toBe(true);
    expect(patternA.every((row) => row.spoken === 'PARTIAL')).toBe(true);
    expect(rows.find((row) => row.id === 'juinjip_alt')?.spoken).toBe('PASS');
    expect(rows.every((row) => row.spoken !== 'FAIL')).toBe(true);
  });
});
