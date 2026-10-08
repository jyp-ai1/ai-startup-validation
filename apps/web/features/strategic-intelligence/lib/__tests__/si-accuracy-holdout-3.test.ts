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
} from './score-si-accuracy-holdout-3';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-accuracy-holdout-3.json',
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
const PRIOR_BATCH = '#139+#140+#141';

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
    id: 'pharmacy_omit',
    type: '약국',
    stake: '누락',
    normal: `동네 약국은 처방전 조제 누락이 11%입니다.
기존 대안은 종이 처방전 재확인입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `약 조제가 빠지는 경우가 있습니다.`,
    rich: `동네 약국은 처방전 조제 누락이 11%입니다.
기존 대안은 종이 처방전 재확인입니다.
아직 출시되지 않았고 매출은 없습니다.
약사가 바쁜 시간엔 약봉투만 봅니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 누락이 11%에서 4%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 누락이 4%에서 10%로 늘었다.',
    held: '다음 기간에도 누락이 4%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '누락은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'carshare_noshow',
    type: '카셰어링',
    stake: '노쇼',
    normal: `단지 카셰어링은 예약 후 노쇼가 23%입니다.
기존 대안은 출발 전 문자 리마인드입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `예약하고 차를 안 가져갑니다.`,
    rich: `단지 카셰어링은 예약 후 노쇼가 23%입니다.
기존 대안은 출발 전 문자 리마인드입니다.
아직 출시되지 않았고 매출은 없습니다.
운영자가 앱 푸시로 한 번 더 알립니다.`,
    full: '결제 후보 5명이 월 구독을 결제했고 노쇼가 23%에서 12%로 줄었다.',
    partial: '결제 후보 5명이 월 구독을 결제했다.',
    worse: '다음 기간에 노쇼가 12%에서 22%로 늘었다.',
    held: '다음 기간에도 노쇼가 12%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '노쇼는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'webtoon_churn',
    type: '웹툰/콘텐츠',
    stake: '이탈',
    normal: `연재 웹툰 스튜디오는 유료 회차 이탈이 44%입니다.
기존 대안은 무료 회차 연장입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `유료 회차에서 독자가 끊깁니다.`,
    rich: `연재 웹툰 스튜디오는 유료 회차 이탈이 44%입니다.
기존 대안은 무료 회차 연장입니다.
아직 출시되지 않았고 매출은 없습니다.
작가가 댓글로 다음 화를 예고합니다.`,
    full: '결제 후보 6명이 월 구독을 결제했고 이탈이 44%에서 28%로 줄었다.',
    partial: '결제 후보 6명이 월 구독을 결제했다.',
    worse: '다음 기간에 이탈이 28%에서 43%로 늘었다.',
    held: '다음 기간에도 이탈이 28%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '이탈은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'tax_mismatch',
    type: '회계/세무',
    stake: '불일치',
    normal: `소형 세무사무소는 증빙-신고 불일치가 17%입니다.
기존 대안은 엑셀 증빙 대조입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `세금 신고 숫자가 자주 안 맞습니다.`,
    rich: `소형 세무사무소는 증빙-신고 불일치가 17%입니다.
기존 대안은 엑셀 증빙 대조입니다.
아직 출시되지 않았고 매출은 없습니다.
수습이 영수증을 폴더에 모아둡니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 불일치가 17%에서 7%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 불일치가 7%에서 16%로 늘었다.',
    held: '다음 기간에도 불일치가 7%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '불일치는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'build_match',
    type: '건설',
    stake: '미스매치',
    normal: `소형 인테리어 시공사는 견적-현장 미스매치가 21%입니다.
기존 대안은 현장 미팅 수첩입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `견적과 현장이 자주 어긋납니다.`,
    rich: `소형 인테리어 시공사는 견적-현장 미스매치가 21%입니다.
기존 대안은 현장 미팅 수첩입니다.
아직 출시되지 않았고 매출은 없습니다.
현장소장이 사진 몇 장만 카톡으로 보냅니다.`,
    full: '결제 후보 2명이 월 구독을 결제했고 미스매치가 21%에서 10%로 줄었다.',
    partial: '결제 후보 2명이 월 구독을 결제했다.',
    worse: '다음 기간에 미스매치가 10%에서 20%로 늘었다.',
    held: '다음 기간에도 미스매치가 10%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '미스매치는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'office_churn',
    type: '공유오피스',
    stake: '이탈',
    normal: `소형 공유오피스는 세 달 내 좌석 이탈이 32%입니다.
기존 대안은 매니저 커피챗입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `좌석을 쓰다 금방 나갑니다.`,
    rich: `소형 공유오피스는 세 달 내 좌석 이탈이 32%입니다.
기존 대안은 매니저 커피챗입니다.
아직 출시되지 않았고 매출은 없습니다.
커뮤니티 매니저가 슬랙으로 행사를 알립니다.`,
    full: '결제 후보 4명이 월 구독을 결제했고 이탈이 32%에서 18%로 줄었다.',
    partial: '결제 후보 4명이 월 구독을 결제했다.',
    worse: '다음 기간에 이탈이 18%에서 31%로 늘었다.',
    held: '다음 기간에도 이탈이 18%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '이탈은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'seafood_omit',
    type: '수산물 도매',
    stake: '누락',
    normal: `새벽 수산 도매는 주문 품목 누락이 15%입니다.
기존 대안은 수기 발주 장부입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `주문한 생선이 빠집니다.`,
    rich: `새벽 수산 도매는 주문 품목 누락이 15%입니다.
기존 대안은 수기 발주 장부입니다.
아직 출시되지 않았고 매출은 없습니다.
경매 후 직원이 상자만 세어 올립니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 누락이 15%에서 6%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 누락이 6%에서 14%로 늘었다.',
    held: '다음 기간에도 누락이 6%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '누락은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'cafe_noshow',
    type: '보드게임 카페',
    stake: '노쇼',
    normal: `보드게임 카페는 주말 예약 노쇼가 27%입니다.
기존 대안은 예약금 없는 전화 예약입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `자리 예약하고 안 옵니다.`,
    rich: `보드게임 카페는 주말 예약 노쇼가 27%입니다.
기존 대안은 예약금 없는 전화 예약입니다.
아직 출시되지 않았고 매출은 없습니다.
직원이 한 시간 전 문자를 보냅니다.`,
    full: '결제 후보 4명이 월 구독을 결제했고 노쇼가 27%에서 13%로 줄었다.',
    partial: '결제 후보 4명이 월 구독을 결제했다.',
    worse: '다음 기간에 노쇼가 13%에서 26%로 늘었다.',
    held: '다음 기간에도 노쇼가 13%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '노쇼는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'laundry_return',
    type: '세탁',
    stake: '반품률',
    normal: `수거 세탁 서비스는 얼룩 클레임 반품률이 19%입니다.
기존 대안은 인수증 수기 작성입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `세탁 후 다시 보내는 건이 많습니다.`,
    rich: `수거 세탁 서비스는 얼룩 클레임 반품률이 19%입니다.
기존 대안은 인수증 수기 작성입니다.
아직 출시되지 않았고 매출은 없습니다.
기사가 사진 없이 가방만 받아갑니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 반품률이 19%에서 8%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 반품률이 8%에서 18%로 늘었다.',
    held: '다음 기간에도 반품률이 8%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '반품률은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'parking_load',
    type: '주차장',
    stake: '부하',
    normal: `단지 주차장은 퇴근 피크 부하 초과가 28%입니다.
기존 대안은 경비실 수기 안내입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `퇴근 때 주차 자리가 모자랍니다.`,
    rich: `단지 주차장은 퇴근 피크 부하 초과가 28%입니다.
기존 대안은 경비실 수기 안내입니다.
아직 출시되지 않았고 매출은 없습니다.
경비원이 무전으로 빈 자리를 찾습니다.`,
    full: '결제 후보 2명이 월 구독을 결제했고 부하 초과가 28%에서 14%로 줄었다.',
    partial: '결제 후보 2명이 월 구독을 결제했다.',
    worse: '다음 기간에 부하 초과가 14%에서 27%로 늘었다.',
    held: '다음 기간에도 부하 초과가 14%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '부하 초과는 줄지 않았고 결제는 취소됐다.',
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
    title: 'accuracy-batch-holdout-3',
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

describe('S.I. holdout-3 Accuracy Batch — measure only', () => {
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
