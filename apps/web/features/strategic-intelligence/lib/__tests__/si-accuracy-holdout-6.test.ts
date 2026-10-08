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
} from './score-si-accuracy-holdout-6';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-accuracy-holdout-6.json',
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
const PRIOR_BATCH = '#139+#140+#141+#142+#143+#144';

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
    id: 'bike_mismatch',
    type: '자전거샵',
    stake: '불일치',
    normal: `동네 자전거샵은 피팅-프레임 불일치가 17%입니다.
기존 대안은 줄자 수기 측정입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `사이즈가 안 맞아 다시 조립합니다.`,
    rich: `동네 자전거샵은 피팅-프레임 불일치가 17%입니다.
기존 대안은 줄자 수기 측정입니다.
아직 출시되지 않았고 매출은 없습니다.
직원이 감으로 스템 길이를 고릅니다.`,
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
    id: 'paint_match',
    type: '페인트',
    stake: '미스매치',
    normal: `인테리어 페인트팀은 색상 미스매치가 20%입니다.
기존 대안은 칩 샘플 대조입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `칠한 색이 샘플과 자주 다릅니다.`,
    rich: `인테리어 페인트팀은 색상 미스매치가 20%입니다.
기존 대안은 칩 샘플 대조입니다.
아직 출시되지 않았고 매출은 없습니다.
작업자가 조색을 감으로 맞춥니다.`,
    full: '결제 후보 2명이 월 구독을 결제했고 미스매치가 20%에서 9%로 줄었다.',
    partial: '결제 후보 2명이 월 구독을 결제했다.',
    worse: '다음 기간에 미스매치가 9%에서 19%로 늘었다.',
    held: '다음 기간에도 미스매치가 9%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '미스매치는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'screenbaseball_churn',
    type: '스크린야구',
    stake: '이탈',
    normal: `스크린야구장은 두 번째 방문 이탈이 34%입니다.
기존 대안은 쿠폰 문자입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `한 번 치고 다시 안 옵니다.`,
    rich: `스크린야구장은 두 번째 방문 이탈이 34%입니다.
기존 대안은 쿠폰 문자입니다.
아직 출시되지 않았고 매출은 없습니다.
매니저가 타율만 종이에 적습니다.`,
    full: '결제 후보 4명이 월 구독을 결제했고 이탈이 34%에서 18%로 줄었다.',
    partial: '결제 후보 4명이 월 구독을 결제했다.',
    worse: '다음 기간에 이탈이 18%에서 33%로 늘었다.',
    held: '다음 기간에도 이탈이 18%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '이탈은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'usedphone_return',
    type: '중고폰',
    stake: '반품률',
    normal: `중고폰 매장은 검수 후 반품률이 18%입니다.
기존 대안은 외관 사진 몇 장입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `받고 나서 자주 돌려보냅니다.`,
    rich: `중고폰 매장은 검수 후 반품률이 18%입니다.
기존 대안은 외관 사진 몇 장입니다.
아직 출시되지 않았고 매출은 없습니다.
직원이 배터리만 대충 봅니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 반품률이 18%에서 8%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 반품률이 8%에서 17%로 늘었다.',
    held: '다음 기간에도 반품률이 8%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '반품률은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'carwash_churn',
    type: '세차',
    stake: '이탈',
    normal: `예약 세차장은 두 번째 방문 이탈이 31%입니다.
기존 대안은 스탬프 카드입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `세차하고 다시 안 옵니다.`,
    rich: `예약 세차장은 두 번째 방문 이탈이 31%입니다.
기존 대안은 스탬프 카드입니다.
아직 출시되지 않았고 매출은 없습니다.
사장이 카톡으로 빈 시간을 알립니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 이탈이 31%에서 16%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 이탈이 16%에서 30%로 늘었다.',
    held: '다음 기간에도 이탈이 16%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '이탈은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'lunchbox_omit',
    type: '도시락',
    stake: '누락',
    normal: `사무실 도시락은 배송 품목 누락이 11%입니다.
기존 대안은 수기 주문 장부입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `반찬이 빠진 채로 도착합니다.`,
    rich: `사무실 도시락은 배송 품목 누락이 11%입니다.
기존 대안은 수기 주문 장부입니다.
아직 출시되지 않았고 매출은 없습니다.
포장 직원이 감으로 수량을 맞춥니다.`,
    full: '결제 후보 5명이 월 구독을 결제했고 누락이 11%에서 4%로 줄었다.',
    partial: '결제 후보 5명이 월 구독을 결제했다.',
    worse: '다음 기간에 누락이 4%에서 10%로 늘었다.',
    held: '다음 기간에도 누락이 4%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '누락은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'studyroom_churn',
    type: '독서실',
    stake: '이탈',
    normal: `스터디 독서실은 한 달 좌석 이탈이 29%입니다.
기존 대안은 자리 추첨 칠판입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `등록하고 금방 안 나옵니다.`,
    rich: `스터디 독서실은 한 달 좌석 이탈이 29%입니다.
기존 대안은 자리 추첨 칠판입니다.
아직 출시되지 않았고 매출은 없습니다.
원장이 출석만 수첩에 적습니다.`,
    full: '결제 후보 4명이 월 구독을 결제했고 이탈이 29%에서 14%로 줄었다.',
    partial: '결제 후보 4명이 월 구독을 결제했다.',
    worse: '다음 기간에 이탈이 14%에서 28%로 늘었다.',
    held: '다음 기간에도 이탈이 14%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '이탈은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'karaoke_load',
    type: '코인노래방',
    stake: '부하',
    normal: `코인노래방은 금요 피크 부하 초과가 27%입니다.
기존 대안은 문 앞 대기줄입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `주말에 방이 모자랍니다.`,
    rich: `코인노래방은 금요 피크 부하 초과가 27%입니다.
기존 대안은 문 앞 대기줄입니다.
아직 출시되지 않았고 매출은 없습니다.
알바가 남은 방을 큰 소리로 외칩니다.`,
    full: '결제 후보 2명이 월 구독을 결제했고 부하 초과가 27%에서 13%로 줄었다.',
    partial: '결제 후보 2명이 월 구독을 결제했다.',
    worse: '다음 기간에 부하 초과가 13%에서 26%로 늘었다.',
    held: '다음 기간에도 부하 초과가 13%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '부하 초과는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'butcher_mismatch',
    type: '정육점',
    stake: '불일치',
    normal: `동네 정육점은 주문 부위 불일치가 12%입니다.
기존 대안은 수기 주문서입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `시킨 부위와 다른 고기가 갑니다.`,
    rich: `동네 정육점은 주문 부위 불일치가 12%입니다.
기존 대안은 수기 주문서입니다.
아직 출시되지 않았고 매출은 없습니다.
직원이 바쁠 때 감으로 두께를 썹니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 불일치가 12%에서 5%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 불일치가 5%에서 11%로 늘었다.',
    held: '다음 기간에도 불일치가 5%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '불일치는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'bakery_noshow',
    type: '베이커리',
    stake: '노쇼',
    normal: `예약 베이커리는 케이크 픽업 노쇼가 16%입니다.
기존 대안은 하루 전 문자입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `예약하고 찾아가지 않습니다.`,
    rich: `예약 베이커리는 케이크 픽업 노쇼가 16%입니다.
기존 대안은 하루 전 문자입니다.
아직 출시되지 않았고 매출은 없습니다.
사장이 아침에 전화로 한 번 더 확인합니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 노쇼가 16%에서 7%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 노쇼가 7%에서 15%로 늘었다.',
    held: '다음 기간에도 노쇼가 7%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '노쇼는 줄지 않았고 결제는 취소됐다.',
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
    title: 'accuracy-batch-holdout-6',
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

describe('S.I. holdout-6 Accuracy Batch — measure only', () => {
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
