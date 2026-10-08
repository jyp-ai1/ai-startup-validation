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
} from './score-si-accuracy-holdout-4';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-accuracy-holdout-4.json',
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
const PRIOR_BATCH = '#139+#140+#141+#142';

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
    id: 'dental_noshow',
    type: '치과',
    stake: '노쇼',
    normal: `동네 치과는 스케일링 예약 노쇼가 24%입니다.
기존 대안은 하루 전 문자 안내입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `예약하고 안 오는 환자가 많습니다.`,
    rich: `동네 치과는 스케일링 예약 노쇼가 24%입니다.
기존 대안은 하루 전 문자 안내입니다.
아직 출시되지 않았고 매출은 없습니다.
데스크가 아침에 전화를 한 번 더 겁니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 노쇼가 24%에서 11%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 노쇼가 11%에서 23%로 늘었다.',
    held: '다음 기간에도 노쇼가 11%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '노쇼는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'warehouse_omit',
    type: '물류창고',
    stake: '누락',
    normal: `3PL 창고는 출고 전 품목 누락이 12%입니다.
기존 대안은 피킹 리스트 수기 대조입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `출고 상자에 품목이 빠집니다.`,
    rich: `3PL 창고는 출고 전 품목 누락이 12%입니다.
기존 대안은 피킹 리스트 수기 대조입니다.
아직 출시되지 않았고 매출은 없습니다.
피크 시간에는 바코드 없이 눈으로 집어 담습니다.`,
    full: '결제 후보 4명이 월 구독을 결제했고 누락이 12%에서 5%로 줄었다.',
    partial: '결제 후보 4명이 월 구독을 결제했다.',
    worse: '다음 기간에 누락이 5%에서 11%로 늘었다.',
    held: '다음 기간에도 누락이 5%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '누락은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'luxury_return',
    type: '중고명품',
    stake: '반품률',
    normal: `빈티지 명품 셀렉트샵은 검수 후 반품률이 16%입니다.
기존 대안은 사진 몇 장과 상태 메모입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `받고 나서 자주 돌려보냅니다.`,
    rich: `빈티지 명품 셀렉트샵은 검수 후 반품률이 16%입니다.
기존 대안은 사진 몇 장과 상태 메모입니다.
아직 출시되지 않았고 매출은 없습니다.
직원이 스크래치를 카톡으로만 설명합니다.`,
    full: '결제 후보 2명이 월 구독을 결제했고 반품률이 16%에서 7%로 줄었다.',
    partial: '결제 후보 2명이 월 구독을 결제했다.',
    worse: '다음 기간에 반품률이 7%에서 15%로 늘었다.',
    held: '다음 기간에도 반품률이 7%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '반품률은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'camp_noshow',
    type: '캠핑',
    stake: '노쇼',
    normal: `글램핑장은 주말 예약 노쇼가 29%입니다.
기존 대안은 예약금 없는 전화 예약입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `자리 예약하고 당일에 안 옵니다.`,
    rich: `글램핑장은 주말 예약 노쇼가 29%입니다.
기존 대안은 예약금 없는 전화 예약입니다.
아직 출시되지 않았고 매출은 없습니다.
사장이 전날 카톡으로 입실 시간을 묻습니다.`,
    full: '결제 후보 5명이 월 구독을 결제했고 노쇼가 29%에서 14%로 줄었다.',
    partial: '결제 후보 5명이 월 구독을 결제했다.',
    worse: '다음 기간에 노쇼가 14%에서 28%로 늘었다.',
    held: '다음 기간에도 노쇼가 14%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '노쇼는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'florist_churn',
    type: '꽃집',
    stake: '이탈',
    normal: `정기 꽃구독은 세 번째 박스 이탈이 38%입니다.
기존 대안은 카카오톡 주간 안내입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `꽃을 두어 번 받고 끊습니다.`,
    rich: `정기 꽃구독은 세 번째 박스 이탈이 38%입니다.
기존 대안은 카카오톡 주간 안내입니다.
아직 출시되지 않았고 매출은 없습니다.
플로리스트가 품종만 바꿔 보냅니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 이탈이 38%에서 21%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 이탈이 21%에서 37%로 늘었다.',
    held: '다음 기간에도 이탈이 21%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '이탈은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'l10n_mismatch',
    type: '번역',
    stake: '불일치',
    normal: `앱 로컬라이즈 팀은 용어 불일치가 18%입니다.
기존 대안은 스프레드시트 용어집입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `같은 단어가 화면마다 다릅니다.`,
    rich: `앱 로컬라이즈 팀은 용어 불일치가 18%입니다.
기존 대안은 스프레드시트 용어집입니다.
아직 출시되지 않았고 매출은 없습니다.
프리랜서가 파일마다 다른 표현을 씁니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 불일치가 18%에서 8%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 불일치가 8%에서 17%로 늘었다.',
    held: '다음 기간에도 불일치가 8%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '불일치는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'drone_match',
    type: '드론 촬영',
    stake: '미스매치',
    normal: `현장 드론 촬영은 의뢰-결과 미스매치가 22%입니다.
기존 대안은 카톡 레퍼런스 이미지입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `찍은 구도가 요청과 자주 다릅니다.`,
    rich: `현장 드론 촬영은 의뢰-결과 미스매치가 22%입니다.
기존 대안은 카톡 레퍼런스 이미지입니다.
아직 출시되지 않았고 매출은 없습니다.
조종사가 현장에서 감으로 고도를 정합니다.`,
    full: '결제 후보 2명이 월 구독을 결제했고 미스매치가 22%에서 9%로 줄었다.',
    partial: '결제 후보 2명이 월 구독을 결제했다.',
    worse: '다음 기간에 미스매치가 9%에서 21%로 늘었다.',
    held: '다음 기간에도 미스매치가 9%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '미스매치는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'roaster_churn',
    type: '커피 로스터리',
    stake: '이탈',
    normal: `원두 구독은 두 번째 달 이탈이 35%입니다.
기존 대안은 매달 같은 블렌드 발송입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `원두를 한두 번 받고 끊습니다.`,
    rich: `원두 구독은 두 번째 달 이탈이 35%입니다.
기존 대안은 매달 같은 블렌드 발송입니다.
아직 출시되지 않았고 매출은 없습니다.
로스터가 메모 한 줄로 추출 팁을 넣습니다.`,
    full: '결제 후보 4명이 월 구독을 결제했고 이탈이 35%에서 19%로 줄었다.',
    partial: '결제 후보 4명이 월 구독을 결제했다.',
    worse: '다음 기간에 이탈이 19%에서 34%로 늘었다.',
    held: '다음 기간에도 이탈이 19%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '이탈은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'move_omit',
    type: '이사',
    stake: '누락',
    normal: `소형 이사팀은 도착 후 물품 누락이 9%입니다.
기존 대안은 박스 수 수기 체크입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `옮기다 짐이 빠집니다.`,
    rich: `소형 이사팀은 도착 후 물품 누락이 9%입니다.
기존 대안은 박스 수 수기 체크입니다.
아직 출시되지 않았고 매출은 없습니다.
기사들이 라벨 없이 박스를 쌓습니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 누락이 9%에서 3%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 누락이 3%에서 8%로 늘었다.',
    held: '다음 기간에도 누락이 3%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '누락은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'access_load',
    type: '출입보안',
    stake: '부하',
    normal: `소형 오피스 빌딩은 출근 피크 출입 부하 초과가 26%입니다.
기존 대안은 경비실 수기 방문증입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `출근 때 출입 줄이 깁니다.`,
    rich: `소형 오피스 빌딩은 출근 피크 출입 부하 초과가 26%입니다.
기존 대안은 경비실 수기 방문증입니다.
아직 출시되지 않았고 매출은 없습니다.
경비가 카드 오류를 무전으로 처리합니다.`,
    full: '결제 후보 2명이 월 구독을 결제했고 부하 초과가 26%에서 12%로 줄었다.',
    partial: '결제 후보 2명이 월 구독을 결제했다.',
    worse: '다음 기간에 부하 초과가 12%에서 25%로 늘었다.',
    held: '다음 기간에도 부하 초과가 12%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
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
    title: 'accuracy-batch-holdout-4',
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

describe('S.I. holdout-4 Accuracy Batch — measure only', () => {
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
