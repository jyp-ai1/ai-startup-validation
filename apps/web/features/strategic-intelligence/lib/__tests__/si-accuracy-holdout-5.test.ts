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
} from './score-si-accuracy-holdout-5';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-accuracy-holdout-5.json',
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
const PRIOR_BATCH = '#139+#140+#141+#142+#143';

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
    id: 'optician_churn',
    type: '안경점',
    stake: '이탈',
    normal: `동네 안경점은 두 번째 구매 이탈이 33%입니다.
기존 대안은 문자 할인 쿠폰입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `안경 맞추고 다시 안 옵니다.`,
    rich: `동네 안경점은 두 번째 구매 이탈이 33%입니다.
기존 대안은 문자 할인 쿠폰입니다.
아직 출시되지 않았고 매출은 없습니다.
원장이 도수 카드만 서랍에 넣습니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 이탈이 33%에서 17%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 이탈이 17%에서 32%로 늘었다.',
    held: '다음 기간에도 이탈이 17%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '이탈은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'appliance_return',
    type: '가전 렌탈',
    stake: '반품률',
    normal: `소형가전 렌탈은 첫 달 반품률이 21%입니다.
기존 대안은 설치 기사 방문 설명입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `렌탈 받고 바로 돌려보냅니다.`,
    rich: `소형가전 렌탈은 첫 달 반품률이 21%입니다.
기존 대안은 설치 기사 방문 설명입니다.
아직 출시되지 않았고 매출은 없습니다.
상담원이 필터 교체만 전화로 안내합니다.`,
    full: '결제 후보 4명이 월 구독을 결제했고 반품률이 21%에서 10%로 줄었다.',
    partial: '결제 후보 4명이 월 구독을 결제했다.',
    worse: '다음 기간에 반품률이 10%에서 20%로 늘었다.',
    held: '다음 기간에도 반품률이 10%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '반품률은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'tire_match',
    type: '타이어',
    stake: '미스매치',
    normal: `로컬 타이어샵은 차종-규격 미스매치가 14%입니다.
기존 대안은 차종 수첩 대조입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `규격이 안 맞아 다시 주문합니다.`,
    rich: `로컬 타이어샵은 차종-규격 미스매치가 14%입니다.
기존 대안은 차종 수첩 대조입니다.
아직 출시되지 않았고 매출은 없습니다.
직원이 감으로 사이즈를 집습니다.`,
    full: '결제 후보 2명이 월 구독을 결제했고 미스매치가 14%에서 6%로 줄었다.',
    partial: '결제 후보 2명이 월 구독을 결제했다.',
    worse: '다음 기간에 미스매치가 6%에서 13%로 늘었다.',
    held: '다음 기간에도 미스매치가 6%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '미스매치는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'hanok_noshow',
    type: '한옥스테이',
    stake: '노쇼',
    normal: `한옥스테이는 주말 예약 노쇼가 26%입니다.
기존 대안은 예약금 없는 전화 확인입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `예약하고 당일에 안 옵니다.`,
    rich: `한옥스테이는 주말 예약 노쇼가 26%입니다.
기존 대안은 예약금 없는 전화 확인입니다.
아직 출시되지 않았고 매출은 없습니다.
주인이 전날 카톡으로 입실을 묻습니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 노쇼가 26%에서 12%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 노쇼가 12%에서 25%로 늘었다.',
    held: '다음 기간에도 노쇼가 12%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '노쇼는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'ceramic_churn',
    type: '도예 공방',
    stake: '이탈',
    normal: `도예 원데이 클래스는 두 번째 수업 이탈이 41%입니다.
기존 대안은 수강 후 쿠폰 문자입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `한 번 만들고 다시 안 옵니다.`,
    rich: `도예 원데이 클래스는 두 번째 수업 이탈이 41%입니다.
기존 대안은 수강 후 쿠폰 문자입니다.
아직 출시되지 않았고 매출은 없습니다.
강사가 완성 사진만 인스타에 올립니다.`,
    full: '결제 후보 4명이 월 구독을 결제했고 이탈이 41%에서 23%로 줄었다.',
    partial: '결제 후보 4명이 월 구독을 결제했다.',
    worse: '다음 기간에 이탈이 23%에서 40%로 늘었다.',
    held: '다음 기간에도 이탈이 23%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '이탈은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'brew_mismatch',
    type: '수제맥주',
    stake: '불일치',
    normal: `탭룸 양조장은 레시피-맛 불일치가 15%입니다.
기존 대안은 배치 노트 수기 기록입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `같은 맥주인데 맛이 자주 다릅니다.`,
    rich: `탭룸 양조장은 레시피-맛 불일치가 15%입니다.
기존 대안은 배치 노트 수기 기록입니다.
아직 출시되지 않았고 매출은 없습니다.
브루어가 온도를 감으로 맞춥니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 불일치가 15%에서 6%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 불일치가 6%에서 14%로 늘었다.',
    held: '다음 기간에도 불일치가 6%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '불일치는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'photo_noshow',
    type: '사진관',
    stake: '노쇼',
    normal: `가족 사진관은 주말 촬영 노쇼가 22%입니다.
기존 대안은 하루 전 문자 리마인드입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `촬영 예약하고 안 옵니다.`,
    rich: `가족 사진관은 주말 촬영 노쇼가 22%입니다.
기존 대안은 하루 전 문자 리마인드입니다.
아직 출시되지 않았고 매출은 없습니다.
실장이 의상 안내만 카톡으로 보냅니다.`,
    full: '결제 후보 2명이 월 구독을 결제했고 노쇼가 22%에서 9%로 줄었다.',
    partial: '결제 후보 2명이 월 구독을 결제했다.',
    worse: '다음 기간에 노쇼가 9%에서 21%로 늘었다.',
    held: '다음 기간에도 노쇼가 9%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '노쇼는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'golf_churn',
    type: '골프연습장',
    stake: '이탈',
    normal: `실내 골프연습장은 세 달 회원 이탈이 36%입니다.
기존 대안은 레슨 쿠폰 안내입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `등록하고 금방 안 나옵니다.`,
    rich: `실내 골프연습장은 세 달 회원 이탈이 36%입니다.
기존 대안은 레슨 쿠폰 안내입니다.
아직 출시되지 않았고 매출은 없습니다.
프로가 수첩으로 스윙만 적습니다.`,
    full: '결제 후보 5명이 월 구독을 결제했고 이탈이 36%에서 20%로 줄었다.',
    partial: '결제 후보 5명이 월 구독을 결제했다.',
    worse: '다음 기간에 이탈이 20%에서 35%로 늘었다.',
    held: '다음 기간에도 이탈이 20%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '이탈은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'kids_noshow',
    type: '키즈카페',
    stake: '노쇼',
    normal: `키즈카페는 생일파티 예약 노쇼가 19%입니다.
기존 대안은 예약금 없는 전화 예약입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `파티 예약하고 안 옵니다.`,
    rich: `키즈카페는 생일파티 예약 노쇼가 19%입니다.
기존 대안은 예약금 없는 전화 예약입니다.
아직 출시되지 않았고 매출은 없습니다.
매니저가 케이크 메뉴만 카톡으로 보냅니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 노쇼가 19%에서 8%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 노쇼가 8%에서 18%로 늘었다.',
    held: '다음 기간에도 노쇼가 8%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '노쇼는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'repair_omit',
    type: '컴퓨터수리',
    stake: '누락',
    normal: `동네 컴퓨터수리점은 부품 주문 누락이 13%입니다.
기존 대안은 수기 접수 장부입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `주문한 부품이 빠집니다.`,
    rich: `동네 컴퓨터수리점은 부품 주문 누락이 13%입니다.
기존 대안은 수기 접수 장부입니다.
아직 출시되지 않았고 매출은 없습니다.
기사가 모델명을 대충 적습니다.`,
    full: '결제 후보 2명이 월 구독을 결제했고 누락이 13%에서 5%로 줄었다.',
    partial: '결제 후보 2명이 월 구독을 결제했다.',
    worse: '다음 기간에 누락이 5%에서 12%로 늘었다.',
    held: '다음 기간에도 누락이 5%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '누락은 줄지 않았고 결제는 취소됐다.',
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
    title: 'accuracy-batch-holdout-5',
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

describe('S.I. holdout-5 Accuracy Batch — measure only', () => {
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
