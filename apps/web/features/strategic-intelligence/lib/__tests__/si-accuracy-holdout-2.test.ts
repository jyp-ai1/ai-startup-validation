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
  type SceneId,
  type Snap,
} from './score-si-accuracy-holdout-2';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-accuracy-holdout-2.json',
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
const PRIOR_BATCH = '#139+#140';

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
    id: 'insurer_claim',
    type: '보험',
    stake: '누락',
    normal: `소형 손해보험 대리점은 청구 서류 누락이 22%입니다.
기존 대안은 팩스 체크리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `보험 청구 서류가 빠집니다.`,
    rich: `소형 손해보험 대리점은 청구 서류 누락이 22%입니다.
기존 대안은 팩스 체크리스트입니다.
아직 출시되지 않았고 매출은 없습니다.
담당자가 카톡으로 빠진 서류를 물어봅니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 누락이 22%에서 11%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 누락이 11%에서 21%로 늘었다.',
    held: '다음 기간에도 누락이 11%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '누락은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'farm_grade',
    type: '농업',
    stake: '불일치',
    normal: `계약재배 농가는 출하 등급 불일치가 19%입니다.
기존 대안은 산지 상자 육안 선별입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `출하 등급이 자주 어긋납니다.`,
    rich: `계약재배 농가는 출하 등급 불일치가 19%입니다.
기존 대안은 산지 상자 육안 선별입니다.
아직 출시되지 않았고 매출은 없습니다.
선별장은 바쁜 날 샘플만 집어봅니다.`,
    full: '결제 후보 4명이 월 구독을 결제했고 불일치가 19%에서 8%로 줄었다.',
    partial: '결제 후보 4명이 월 구독을 결제했다.',
    worse: '다음 기간에 불일치가 8%에서 18%로 늘었다.',
    held: '다음 기간에도 불일치가 8%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '불일치는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'law_retain',
    type: '법률 서비스',
    stake: '이탈',
    normal: `개인 회생 법률사무소는 상담 후 수임 이탈이 37%입니다.
기존 대안은 상담 녹취 수첩입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `상담만 하고 수임을 안 합니다.`,
    rich: `개인 회생 법률사무소는 상담 후 수임 이탈이 37%입니다.
기존 대안은 상담 녹취 수첩입니다.
아직 출시되지 않았고 매출은 없습니다.
사무장이 전화로 진행 상황을 전합니다.`,
    full: '결제 후보 2명이 월 구독을 결제했고 이탈이 37%에서 21%로 줄었다.',
    partial: '결제 후보 2명이 월 구독을 결제했다.',
    worse: '다음 기간에 이탈이 21%에서 36%로 늘었다.',
    held: '다음 기간에도 이탈이 21%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '이탈은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'daycare_wait',
    type: '보육',
    stake: '미스매치',
    normal: `소형 어린이집은 대기-반배정 미스매치가 29%입니다.
기존 대안은 카톡 대기명단입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `대기 아이와 빈 반이 안 맞습니다.`,
    rich: `소형 어린이집은 대기-반배정 미스매치가 29%입니다.
기존 대안은 카톡 대기명단입니다.
아직 출시되지 않았고 매출은 없습니다.
원장이 엑셀로 연령을 맞춥니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 미스매치가 29%에서 14%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 미스매치가 14%에서 28%로 늘었다.',
    held: '다음 기간에도 미스매치가 14%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '미스매치는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'hotel_noshow',
    type: '호텔/숙박',
    stake: '노쇼',
    normal: `소형 비즈니스호텔은 당일 노쇼가 18%입니다.
기존 대안은 예약 전화 재확인입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `예약하고 안 오는 손님이 많습니다.`,
    rich: `소형 비즈니스호텔은 당일 노쇼가 18%입니다.
기존 대안은 예약 전화 재확인입니다.
아직 출시되지 않았고 매출은 없습니다.
프론트가 전날 밤에 문자를 보냅니다.`,
    full: '결제 후보 5명이 월 구독을 결제했고 노쇼가 18%에서 9%로 줄었다.',
    partial: '결제 후보 5명이 월 구독을 결제했다.',
    worse: '다음 기간에 노쇼가 9%에서 17%로 늘었다.',
    held: '다음 기간에도 노쇼가 9%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '노쇼는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'usedcar_return',
    type: '중고차',
    stake: '반품률',
    normal: `단지 중고차 매매는 인도 후 반품률이 14%입니다.
기존 대안은 상태 설명서 수기 작성입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `차를 받고 자주 돌려보냅니다.`,
    rich: `단지 중고차 매매는 인도 후 반품률이 14%입니다.
기존 대안은 상태 설명서 수기 작성입니다.
아직 출시되지 않았고 매출은 없습니다.
딜러가 사진 몇 장만 카톡으로 보냅니다.`,
    full: '결제 후보 2명이 월 구독을 결제했고 반품률이 14%에서 6%로 줄었다.',
    partial: '결제 후보 2명이 월 구독을 결제했다.',
    worse: '다음 기간에 반품률이 6%에서 13%로 늘었다.',
    held: '다음 기간에도 반품률이 6%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '반품률은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'solar_load',
    type: '에너지/태양광',
    stake: '부하',
    normal: `지붕 태양광 시공사는 예측 대비 부하 오차가 24%입니다.
기존 대안은 엑셀 발전량 추정입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `발전량 예측이 자주 빗나갑니다.`,
    rich: `지붕 태양광 시공사는 예측 대비 부하 오차가 24%입니다.
기존 대안은 엑셀 발전량 추정입니다.
아직 출시되지 않았고 매출은 없습니다.
현장 기사가 계절 감으로 용량을 고릅니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 부하 오차가 24%에서 12%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 부하 오차가 12%에서 23%로 늘었다.',
    held: '다음 기간에도 부하 오차가 12%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '부하 오차는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'wedding_noshow',
    type: '웨딩',
    stake: '노쇼',
    normal: `스몰웨딩 스튜디오는 상담 예약 노쇼가 31%입니다.
기존 대안은 하루 전 전화 확인입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `상담 예약하고 안 옵니다.`,
    rich: `스몰웨딩 스튜디오는 상담 예약 노쇼가 31%입니다.
기존 대안은 하루 전 전화 확인입니다.
아직 출시되지 않았고 매출은 없습니다.
플래너가 카톡으로 일정을 다시 묻습니다.`,
    full: '결제 후보 4명이 월 구독을 결제했고 노쇼가 31%에서 16%로 줄었다.',
    partial: '결제 후보 4명이 월 구독을 결제했다.',
    worse: '다음 기간에 노쇼가 16%에서 30%로 늘었다.',
    held: '다음 기간에도 노쇼가 16%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '노쇼는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'eldercare_churn',
    type: '노인케어',
    stake: '이탈',
    normal: `방문요양 센터는 두 달 내 이용 이탈이 26%입니다.
기존 대안은 보호자 전화 안부입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `요양을 시작하다 금방 끊습니다.`,
    rich: `방문요양 센터는 두 달 내 이용 이탈이 26%입니다.
기존 대안은 보호자 전화 안부입니다.
아직 출시되지 않았고 매출은 없습니다.
사회복지사가 수첩으로 방문 기록을 적습니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 이탈이 26%에서 13%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 이탈이 13%에서 25%로 늘었다.',
    held: '다음 기간에도 이탈이 13%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '이탈은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'salon_return',
    type: '뷰티 살롱',
    stake: '이탈',
    normal: `동네 헤어샵은 두 번째 방문 이탈이 39%입니다.
기존 대안은 명함 할인 쿠폰입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `머리하고 다시 안 옵니다.`,
    rich: `동네 헤어샵은 두 번째 방문 이탈이 39%입니다.
기존 대안은 명함 할인 쿠폰입니다.
아직 출시되지 않았고 매출은 없습니다.
원장이 카톡으로 다음 염색 시기를 알립니다.`,
    full: '결제 후보 4명이 월 구독을 결제했고 이탈이 39%에서 20%로 줄었다.',
    partial: '결제 후보 4명이 월 구독을 결제했다.',
    worse: '다음 기간에 이탈이 20%에서 38%로 늘었다.',
    held: '다음 기간에도 이탈이 20%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '이탈은 줄지 않았고 결제는 취소됐다.',
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
    title: 'accuracy-batch-holdout-2',
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

function play(biz: Biz, scene: SceneId): { t0: Snap; snap: Snap; answer: string | null } {
  const t0 = snapOf(biz.normal);
  if (scene === 't0') return { t0, snap: t0, answer: null };
  if (scene === 'thin') return { t0, snap: snapOf(biz.thin), answer: null };
  if (scene === 'rich') return { t0, snap: snapOf(biz.rich), answer: null };
  if (scene === 'plan') return { t0, snap: snapOf(biz.normal, PLAN), answer: PLAN };
  if (scene === 'full') return { t0, snap: snapOf(biz.normal, biz.full), answer: biz.full };
  if (scene === 'partial') return { t0, snap: snapOf(biz.normal, biz.partial), answer: biz.partial };
  if (scene === 'vague') return { t0, snap: snapOf(biz.normal, VAGUE), answer: VAGUE };
  if (scene === 'hype') return { t0, snap: snapOf(biz.normal, HYPE), answer: HYPE };
  const withFull = appendFounderEvidenceToDocument(biz.normal, biz.full);
  if (scene === 'worse') return { t0: snapOf(biz.normal, biz.full), snap: snapOf(withFull, biz.worse), answer: biz.worse };
  if (scene === 'deny') return { t0: snapOf(biz.normal, biz.full), snap: snapOf(withFull, biz.deny), answer: biz.deny };
  if (scene === 'conflict') {
    return { t0: snapOf(biz.normal, biz.full), snap: snapOf(withFull, biz.conflict), answer: biz.conflict };
  }
  if (scene === 'wrong_axis') {
    return { t0: snapOf(biz.normal, biz.full), snap: snapOf(withFull, WRONG_AXIS), answer: WRONG_AXIS };
  }
  if (scene === 'repeat_answer') {
    return { t0: snapOf(biz.normal, biz.full), snap: snapOf(withFull, biz.full), answer: biz.full };
  }
  const withHeld = appendFounderEvidenceToDocument(withFull, biz.held);
  if (scene === 'repeat_zero') {
    return { t0: snapOf(withFull, biz.held), snap: snapOf(withHeld, biz.repeatZero), answer: biz.repeatZero };
  }
  return { t0: snapOf(withFull, biz.held), snap: snapOf(withHeld, biz.repeatOk), answer: biz.repeatOk };
}

describe('S.I. holdout-2 Accuracy Batch — measure only', () => {
  it('does not change analyzer, presenter, classifier, or brand-branch', () => {
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}\n${CLASSIFY_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
    expect(PRESENTER_SRC).toMatch(/NEXT_PERIOD_QUESTION/);
  });

  it('records 10 more holdout types × 15 scenes without touching #139', () => {
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
    const dvFail = count('decisionValue').FAIL;
    const structural = Object.entries(failureCluster).filter(
      ([type, n]) =>
        n >= 3 &&
        ['generic_after_promotion', 'stale_cu', 'over_promote_on_plan', 'validated_on_intent', 'axis_drift'].includes(
          type,
        ),
    );
    const fixGate = structural.length > 0 && dvFail >= 3 ? 'CANDIDATE' : 'HOLD';

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify(
        {
          productionSha: PRODUCTION_SHA,
          priorBatch: PRIOR_BATCH,
          production: 'UNCHANGED',
          merge: 'HOLD',
          fixGate,
          frozenDraft: { pr: 139, sha: '0c362c7' },
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
  });
});
