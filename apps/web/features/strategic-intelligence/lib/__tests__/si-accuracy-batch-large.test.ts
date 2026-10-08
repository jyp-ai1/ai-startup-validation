import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { classifyFounderEvidenceClass } from '../classify-founder-evidence';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import {
  isGenericSpoken,
  scoreScene,
  type FailureType,
  type SceneId,
  type Snap,
} from './score-si-accuracy-batch-large';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-accuracy-batch-large.json',
);
const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);
const CLASSIFY_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../classify-founder-evidence.ts'),
  'utf8',
);

const PRODUCTION_SHA = '0b465226516e1a4f3eb9ce2087f8bca2c2c091da';

type Biz = {
  id: string;
  type: string;
  stake: string;
  normal: string;
  thin: string;
  rich: string;
  full: string;
  partial: string;
  worse: string;
  held: string;
  deny: string;
  conflict: string;
  repeatZero: string;
  repeatOk: string;
};

const BUSINESSES: Biz[] = [
  {
    id: 'saas_onboarding',
    type: 'SaaS/구독',
    stake: '이탈',
    normal: `B2B 온보딩 툴은 첫 달 이탈이 37%입니다.
기존 대안은 스프레드시트 체크리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `온보딩 이탈이 높습니다.`,
    rich: `B2B 온보딩 툴은 첫 달 이탈이 37%입니다.
기존 대안은 스프레드시트와 CRM 기본 알림입니다.
아직 출시되지 않았고 매출은 없습니다.
담당자는 주 2회 수기 체크리스트로 온보딩합니다.`,
    full: '결제 후보 4명이 월 구독을 결제했고 이탈이 37%에서 21%로 줄었다.',
    partial: '결제 후보 4명이 월 구독을 결제했다.',
    worse: '다음 기간에 이탈이 21%에서 36%로 늘었다.',
    held: '다음 기간에도 이탈이 21%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '이탈은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'b2b_logistics',
    type: 'B2B',
    stake: '누락',
    normal: `물류 센터는 출고 전 검수에서 누락이 14%에 달합니다.
기존 대안은 SAP 기본 검수 화면입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `출고 누락이 있습니다.`,
    rich: `물류 센터는 출고 전 검수에서 누락이 14%에 달합니다.
기존 대안은 SAP 기본 검수 화면입니다.
아직 출시되지 않았고 매출은 없습니다.
야간 교대는 수기 인수인계를 남깁니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 누락이 14%에서 6%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 누락이 6%에서 18%로 늘었다.',
    held: '다음 기간에도 누락이 6%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '누락은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'b2c_apparel',
    type: 'B2C',
    stake: '반품률',
    normal: `D2C 의류 브랜드는 사이즈 불일치로 반품률 32%를 겪습니다.
기존 대안은 글로벌 핏 위젯입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `사이즈 때문에 반품이 많습니다.`,
    rich: `D2C 의류 브랜드는 사이즈 불일치로 반품률 32%를 겪습니다.
기존 대안은 글로벌 핏 위젯입니다.
아직 출시되지 않았고 매출은 없습니다.
고객은 측정 없이 사이즈를 고릅니다.`,
    full: '결제 후보 2명이 월 구독을 결제했고 반품률이 32%에서 20%로 줄었다.',
    partial: '결제 후보 2명이 월 구독을 결제했다.',
    worse: '다음 기간에 반품률이 20%에서 34%로 늘었다.',
    held: '다음 기간에도 반품률이 20%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '반품률은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'platform_resale',
    type: '플랫폼',
    stake: '재판매',
    normal: `한정판 문구를 산 구매자가 이후 C2C로 재판매하는 모델입니다.
1차 판매 매출이 있다.
C2C 재판매가 반복적으로 발생하는지는 확인되지 않았다.`,
    thin: `산 사람이 다시 팔 수 있는 구조입니다.`,
    rich: `한정판 문구를 산 구매자가 이후 C2C로 재판매하는 모델입니다.
1차 판매 매출이 있다.
C2C 재판매가 반복적으로 발생하는지는 확인되지 않았다.
재구매·재판매 등록·2차 거래 데이터는 아직 없다.`,
    full: '최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.',
    partial: '1차 한정판이 20개 더 팔렸다.',
    worse: '재판매는 멈췄고 재구매는 0건이다.',
    held: '다음 기간에도 1차 판매가 유지됐다.',
    deny: '실제 재판매는 발생하지 않았다.',
    conflict: '재판매 등록은 없었고 1차 판매만 있다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 등록하지 않았다.',
    repeatOk: '최근 구매자 40명 중 12명이 다시 재판매를 등록했고 5건이 거래됐다.',
  },
  {
    id: 'commerce_catalog',
    type: '커머스',
    stake: '미스매치',
    normal: `중고 거래 카탈로그는 사진-실물 미스매치가 22%입니다.
기존 대안은 검수 체크리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `사진과 실물이 다릅니다.`,
    rich: `중고 거래 카탈로그는 사진-실물 미스매치가 22%입니다.
기존 대안은 검수 체크리스트입니다.
아직 출시되지 않았고 매출은 없습니다.
판매자는 사진 한 장만 올립니다.`,
    full: '결제 후보 2명이 구독을 결제했고 미스매치가 22%에서 10%로 줄었다.',
    partial: '결제 후보 2명이 구독을 결제했다.',
    worse: '다음 기간에 미스매치가 10%에서 21%로 늘었다.',
    held: '다음 기간에도 미스매치가 10%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '미스매치는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'offline_clinic',
    type: '오프라인 서비스',
    stake: 'no-show',
    normal: `동네 의원은 예약 no-show가 22%입니다.
기존 대안은 전화 리마인더입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `예약하고 안 오는 환자가 있습니다.`,
    rich: `동네 의원은 예약 no-show가 22%입니다.
기존 대안은 전화 리마인더입니다.
아직 출시되지 않았고 매출은 없습니다.
접수 데스크가 전날 저녁에만 전화를 겁니다.`,
    full: '결제 후보 3명이 연 계약을 결제했고 no-show가 22%에서 12%로 줄었다.',
    partial: '결제 후보 3명이 연 계약을 결제했다.',
    worse: '다음 기간에 no-show가 12%에서 24%로 늘었다.',
    held: '다음 기간에도 no-show가 12%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: 'no-show는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'hospital_billing',
    type: '의료/병원',
    stake: '불일치',
    normal: `병원 청구 팀은 코드 불일치가 19%에 달합니다.
기존 대안은 EHR 기본 청구 모듈입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `청구 코드가 자주 틀립니다.`,
    rich: `병원 청구 팀은 코드 불일치가 19%에 달합니다.
기존 대안은 EHR 기본 청구 모듈입니다.
아직 출시되지 않았고 매출은 없습니다.
심사 담당자가 엑셀로 코드를 맞춥니다.`,
    full: '결제 후보 6명이 월 구독을 결제했고 불일치가 19%에서 8%로 줄었다.',
    partial: '결제 후보 6명이 월 구독을 결제했다.',
    worse: '다음 기간에 불일치가 8%에서 17%로 늘었다.',
    held: '다음 기간에도 불일치가 8%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '불일치는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'tourism_brewery',
    type: '관광/지역',
    stake: '직무',
    normal: `영세 양조장의 온라인 마케팅을 연결하는 사업입니다.
사용자는 전통주 체험을 원하는 관광객이고, 실제 비용을 내는 구매자는 양조장 대표가 될 것으로 봅니다.
아직 출시되지 않았고 매출은 없습니다.
양조장 대표가 마케팅비를 낼 의향인지도 확인되지 않았습니다.`,
    thin: `양조장을 관광객에게 알리려고 합니다.`,
    rich: `영세 양조장의 온라인 마케팅을 연결하는 사업입니다.
사용자는 전통주 체험을 원하는 관광객이고, 실제 비용을 내는 구매자는 양조장 대표가 될 것으로 봅니다.
아직 출시되지 않았고 매출은 없습니다.
각 양조장은 인스타그램에 직접 올립니다.`,
    full: '결제자 3명이 실제로 마케팅비를 결제했고 쓰는 사람이 아니라 그 결제자가 돈을 냈다.',
    partial: '관광객 4명이 예약했다.',
    worse: '결제자는 모두 거절했고 아무도 마케팅비를 내지 않았다.',
    held: '다음 기간에도 결제자 3명이 마케팅비를 유지했다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '쓰는 사람은 있지만 돈을 낸 대표는 없었다.',
    repeatZero: '두 번째 계약은 0건이다. 관광 수요도 반복되지 않았다.',
    repeatOk: '이미 유료로 전환한 고객 외에 두 번째 계약 1건과 반복 관광 수요가 있다.',
  },
  {
    id: 'ai_companion',
    type: 'AI 서비스',
    stake: '직무',
    normal: `감정과 기억을 함께 다루는 AI 컴패니언입니다.
아직 유료 고객과 결제자는 확인되지 않았습니다.
어떤 직무를 대체하는 제품인지도 검증되지 않았습니다.`,
    thin: `대화하는 AI를 만들려고 합니다.`,
    rich: `감정과 기억을 함께 다루는 AI 컴패니언입니다.
아직 유료 고객과 결제자는 확인되지 않았습니다.
어떤 직무를 대체하는 제품인지도 검증되지 않았습니다.
웹 콘셉트는 공개되어 있습니다.`,
    full: '결제자 1명이 실제로 월 구독을 결제했고 감정 기록 직무를 이 제품으로 대체했다.',
    partial: '무료 사용자 12명이 대화를 시작했다.',
    worse: '결제 1건은 취소됐고 직무 대체는 확인되지 않았다.',
    held: '다음 기간에도 그 결제자가 구독을 유지했다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '직무를 대체한 사람은 없고 결제도 없었다.',
    repeatZero: '재결제는 0건이다. 두 번째 사용도 없다.',
    repeatOk: '이미 결제한 고객이 다음 주기에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'marketplace_support',
    type: '마켓플레이스',
    stake: '부하',
    normal: `고객지원 팀은 티켓 부하가 41% 수준으로 몰립니다.
기존 대안은 매크로 콘솔입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `지원 티켓이 너무 많습니다.`,
    rich: `고객지원 팀은 티켓 부하가 41% 수준으로 몰립니다.
기존 대안은 매크로 콘솔입니다.
아직 출시되지 않았고 매출은 없습니다.
주말 대기열이 평일의 두 배입니다.`,
    full: '결제 후보 4명이 연 계약을 결제했고 부하가 41%에서 19%로 줄었다.',
    partial: '결제 후보 4명이 연 계약을 결제했다.',
    worse: '다음 기간에 부하가 19%에서 38%로 늘었다.',
    held: '다음 기간에도 부하가 19%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '부하는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
];

const PLAN = '유료 제안을 생각하고 있지만 아직 아무도 결제하지 않았다.';
const VAGUE = '잘 되고 있는 것 같다.';
const HYPE = '이미 시장에서 검증됐고 지금 바로 사업화해도 된다.';
const WRONG_AXIS = '최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.';

const SCENES: SceneId[] = [
  't0',
  'thin',
  'rich',
  'plan',
  'full',
  'partial',
  'worse',
  'deny',
  'conflict',
  'repeat_zero',
  'repeat_ok',
  'wrong_axis',
  'repeat_answer',
  'vague',
  'hype',
];

function snapOf(document: string, answer?: string): Snap {
  const view = resolveSiJourneyIntegration({
    title: 'accuracy-batch-large',
    businessDocument: document,
    founderAnswer: answer,
  });
  const j = view.current.judgment;
  const q = view.current.question;
  return {
    verdictId: j.verdictId,
    stageId: j.stageId,
    judgment: j.judgment,
    criticalUnknown: j.criticalUnknown,
    decisionChangingEvidence: j.decisionChangingEvidence,
    validationPriority: j.validationPriority,
    whyAsking: q.whyAsking,
    questionText: q.questionText,
    evidenceClass:
      view.current.update?.addedEvidence[0]?.evidenceClass ??
      (answer ? classifyFounderEvidenceClass(answer) : null),
  };
}

function play(biz: Biz, scene: SceneId): {
  t0: Snap;
  snap: Snap;
  answer: string | null;
  docKind: 'normal' | 'thin' | 'rich';
} {
  const t0 = snapOf(biz.normal);
  if (scene === 't0') return { t0, snap: t0, answer: null, docKind: 'normal' };
  if (scene === 'thin') return { t0, snap: snapOf(biz.thin), answer: null, docKind: 'thin' };
  if (scene === 'rich') return { t0, snap: snapOf(biz.rich), answer: null, docKind: 'rich' };
  if (scene === 'plan') return { t0, snap: snapOf(biz.normal, PLAN), answer: PLAN, docKind: 'normal' };
  if (scene === 'full') return { t0, snap: snapOf(biz.normal, biz.full), answer: biz.full, docKind: 'normal' };
  if (scene === 'partial') return { t0, snap: snapOf(biz.normal, biz.partial), answer: biz.partial, docKind: 'normal' };
  if (scene === 'vague') return { t0, snap: snapOf(biz.normal, VAGUE), answer: VAGUE, docKind: 'normal' };
  if (scene === 'hype') return { t0, snap: snapOf(biz.normal, HYPE), answer: HYPE, docKind: 'normal' };

  const withFull = appendFounderEvidenceToDocument(biz.normal, biz.full);
  if (scene === 'worse') return { t0: snapOf(biz.normal, biz.full), snap: snapOf(withFull, biz.worse), answer: biz.worse, docKind: 'normal' };
  if (scene === 'deny') return { t0: snapOf(biz.normal, biz.full), snap: snapOf(withFull, biz.deny), answer: biz.deny, docKind: 'normal' };
  if (scene === 'conflict') return { t0: snapOf(biz.normal, biz.full), snap: snapOf(withFull, biz.conflict), answer: biz.conflict, docKind: 'normal' };
  if (scene === 'wrong_axis') return { t0: snapOf(biz.normal, biz.full), snap: snapOf(withFull, WRONG_AXIS), answer: WRONG_AXIS, docKind: 'normal' };
  if (scene === 'repeat_answer') return { t0: snapOf(biz.normal, biz.full), snap: snapOf(withFull, biz.full), answer: biz.full, docKind: 'normal' };

  const withHeld = appendFounderEvidenceToDocument(withFull, biz.held);
  if (scene === 'repeat_zero') {
    return { t0: snapOf(withFull, biz.held), snap: snapOf(withHeld, biz.repeatZero), answer: biz.repeatZero, docKind: 'normal' };
  }
  return { t0: snapOf(withFull, biz.held), snap: snapOf(withHeld, biz.repeatOk), answer: biz.repeatOk, docKind: 'normal' };
}

describe('S.I. large Accuracy Batch — measure only', () => {
  it('does not change analyzer, presenter, classifier, or brand-branch', () => {
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}\n${CLASSIFY_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
    expect(ANALYZER_SRC).toMatch(/function pickCriticalUnknown/);
    expect(PRESENTER_SRC).toMatch(/NEXT_PERIOD_QUESTION/);
  });

  it('records 10 business types × 15 scenes on the judgment chain', () => {
    const rows = BUSINESSES.flatMap((biz) =>
      SCENES.map((scene) => {
        const played = play(biz, scene);
        const scored = scoreScene({ scene, stake: biz.stake, t0: played.t0, snap: played.snap });
        return {
          id: `${biz.id}_${scene}`,
          businessType: biz.type,
          scene,
          initialJudgment: played.t0.judgment,
          cu: played.snap.criticalUnknown,
          dce: played.snap.decisionChangingEvidence,
          question: played.snap.questionText,
          founderAnswer: played.answer,
          evidence: played.snap.evidenceClass,
          reJudgment: played.snap.judgment,
          nextCu: played.snap.criticalUnknown,
          nextQuestion: played.snap.questionText,
          whyAsking: played.snap.whyAsking,
          verdictId: played.snap.verdictId,
          stageId: played.snap.stageId,
          generic: isGenericSpoken(played.snap.questionText),
          founderDecisionValue: scored.axes.find((axis) => axis.id === 'decisionValue')?.score,
          failureType: scored.failureType,
          axes: Object.fromEntries(scored.axes.map((axis) => [axis.id, axis])),
          overall: scored.overall,
        };
      }),
    );

    const count = (axis: 'judgment' | 'evidence' | 'cu' | 'questionAlignment' | 'decisionValue') => ({
      PASS: rows.filter((row) => row.axes[axis]?.score === 'PASS').length,
      PARTIAL: rows.filter((row) => row.axes[axis]?.score === 'PARTIAL').length,
      FAIL: rows.filter((row) => row.axes[axis]?.score === 'FAIL').length,
    });
    const failureCluster: Record<string, number> = {};
    for (const row of rows) {
      if (row.failureType !== 'none') {
        failureCluster[row.failureType] = (failureCluster[row.failureType] ?? 0) + 1;
      }
    }
    const types = [...new Set(rows.map((row) => row.businessType))];
    const genericAfterFull = rows.filter((row) => row.scene === 'full' && row.generic).length;
    const structuralRepeats = Object.entries(failureCluster).filter(([, n]) => n >= 3);
    const dvHurt = count('decisionValue').FAIL;
    const fixGate =
      structuralRepeats.some(([type]) =>
        ['generic_after_promotion', 'stale_cu', 'over_promote_on_plan', 'validated_on_intent', 'axis_drift'].includes(
          type,
        ),
      ) && dvHurt >= 3
        ? 'CANDIDATE'
        : 'HOLD';

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify(
        {
          productionSha: PRODUCTION_SHA,
          production: 'UNCHANGED',
          merge: 'HOLD',
          fixGate,
          businessTypeCount: types.length,
          scenarioCount: rows.length,
          counts: {
            judgment: count('judgment'),
            evidence: count('evidence'),
            cu: count('cu'),
            questionAlignment: count('questionAlignment'),
            decisionValue: count('decisionValue'),
            overall: {
              PASS: rows.filter((row) => row.overall === 'PASS').length,
              PARTIAL: rows.filter((row) => row.overall === 'PARTIAL').length,
              FAIL: rows.filter((row) => row.overall === 'FAIL').length,
            },
          },
          genericAfterFull,
          failureCluster,
          rows,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    expect(types).toHaveLength(10);
    expect(rows).toHaveLength(150);
    expect(genericAfterFull).toBe(0);
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}`).toMatch(/function decideVerdict/);
  });
});
