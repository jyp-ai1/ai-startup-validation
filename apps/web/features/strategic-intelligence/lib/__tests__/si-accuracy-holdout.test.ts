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
} from './score-si-accuracy-holdout';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-accuracy-holdout.json',
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
const PRIOR_BATCH = '#139';

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
    id: 'academy_attendance',
    type: '교육/학원',
    stake: '이탈',
    normal: `동네 수학 학원은 등록 첫 달 이탈이 28%입니다.
기존 대안은 출석부 수기 체크입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `학원 등록 후 금방 그만둡니다.`,
    rich: `동네 수학 학원은 등록 첫 달 이탈이 28%입니다.
기존 대안은 출석부 수기 체크입니다.
아직 출시되지 않았고 매출은 없습니다.
학부모는 진도만 카톡으로 받습니다.`,
    full: '결제 후보 3명이 월 수강료를 결제했고 이탈이 28%에서 15%로 줄었다.',
    partial: '결제 후보 3명이 월 수강료를 결제했다.',
    worse: '다음 기간에 이탈이 15%에서 27%로 늘었다.',
    held: '다음 기간에도 이탈이 15%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '이탈은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'fitness_renewal',
    type: '피트니스',
    stake: '이탈',
    normal: `소규모 피트니스 센터는 3개월 회원 이탈이 41%입니다.
기존 대안은 카운터 재등록 안내입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `헬스장 회원이 금방 나갑니다.`,
    rich: `소규모 피트니스 센터는 3개월 회원 이탈이 41%입니다.
기존 대안은 카운터 재등록 안내입니다.
아직 출시되지 않았고 매출은 없습니다.
트레이너가 수기로 출석을 적습니다.`,
    full: '결제 후보 4명이 월 구독을 결제했고 이탈이 41%에서 22%로 줄었다.',
    partial: '결제 후보 4명이 월 구독을 결제했다.',
    worse: '다음 기간에 이탈이 22%에서 40%로 늘었다.',
    held: '다음 기간에도 이탈이 22%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '이탈은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'broker_close',
    type: '부동산 중개',
    stake: '미스매치',
    normal: `소형 중개 사무소는 매물-수요 미스매치가 33%입니다.
기존 대안은 네이버 매물 복사입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `매물과 손님이 잘 안 맞습니다.`,
    rich: `소형 중개 사무소는 매물-수요 미스매치가 33%입니다.
기존 대안은 네이버 매물 복사입니다.
아직 출시되지 않았고 매출은 없습니다.
공인중개사가 엑셀로 희망 조건을 적습니다.`,
    full: '결제 후보 2명이 월 구독을 결제했고 미스매치가 33%에서 18%로 줄었다.',
    partial: '결제 후보 2명이 월 구독을 결제했다.',
    worse: '다음 기간에 미스매치가 18%에서 32%로 늘었다.',
    held: '다음 기간에도 미스매치가 18%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '미스매치는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'restaurant_return',
    type: '음식점',
    stake: '이탈',
    normal: `점심 식당은 단골 이탈이 25%입니다.
기존 대안은 스탬프 카드입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `손님이 다시 안 옵니다.`,
    rich: `점심 식당은 단골 이탈이 25%입니다.
기존 대안은 스탬프 카드입니다.
아직 출시되지 않았고 매출은 없습니다.
사장이 단골 이름을 수첩에 적습니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 이탈이 25%에서 12%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 이탈이 12%에서 24%로 늘었다.',
    held: '다음 기간에도 이탈이 12%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '이탈은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'factory_defect',
    type: '제조',
    stake: '불일치',
    normal: `소형 부품 공장은 출고 전 불일치가 16%입니다.
기존 대안은 검사 체크리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `불량 부품이 나갑니다.`,
    rich: `소형 부품 공장은 출고 전 불일치가 16%입니다.
기존 대안은 검사 체크리스트입니다.
아직 출시되지 않았고 매출은 없습니다.
야간 라인은 샘플만 집어봅니다.`,
    full: '결제 후보 5명이 월 구독을 결제했고 불일치가 16%에서 7%로 줄었다.',
    partial: '결제 후보 5명이 월 구독을 결제했다.',
    worse: '다음 기간에 불일치가 7%에서 15%로 늘었다.',
    held: '다음 기간에도 불일치가 7%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '불일치는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'lastmile_delay',
    type: '라스트마일',
    stake: '누락',
    normal: `같은 날 배송팀은 도착 전 누락이 13%입니다.
기존 대안은 기사 전화 확인입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `배송이 빠집니다.`,
    rich: `같은 날 배송팀은 도착 전 누락이 13%입니다.
기존 대안은 기사 전화 확인입니다.
아직 출시되지 않았고 매출은 없습니다.
피크 시간에는 수기 주소만 봅니다.`,
    full: '결제 후보 4명이 월 구독을 결제했고 누락이 13%에서 5%로 줄었다.',
    partial: '결제 후보 4명이 월 구독을 결제했다.',
    worse: '다음 기간에 누락이 5%에서 14%로 늘었다.',
    held: '다음 기간에도 누락이 5%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '누락은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'media_churn',
    type: '구독 미디어',
    stake: '이탈',
    normal: `뉴스레터 구독 서비스는 두 번째 달 이탈이 46%입니다.
기존 대안은 일괄 메일발송입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `구독자가 금방 해지합니다.`,
    rich: `뉴스레터 구독 서비스는 두 번째 달 이탈이 46%입니다.
기존 대안은 일괄 메일발송입니다.
아직 출시되지 않았고 매출은 없습니다.
편집장이 제목을 감으로 고칩니다.`,
    full: '결제 후보 6명이 월 구독을 결제했고 이탈이 46%에서 29%로 줄었다.',
    partial: '결제 후보 6명이 월 구독을 결제했다.',
    worse: '다음 기간에 이탈이 29%에서 45%로 늘었다.',
    held: '다음 기간에도 이탈이 29%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '이탈은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'freelance_match',
    type: '프리랜서 마켓',
    stake: '미스매치',
    normal: `디자인 외주 매칭은 요청-포트폴리오 미스매치가 31%입니다.
기존 대안은 카페 구인글입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `외주 매칭이 자주 빗나갑니다.`,
    rich: `디자인 외주 매칭은 요청-포트폴리오 미스매치가 31%입니다.
기존 대안은 카페 구인글입니다.
아직 출시되지 않았고 매출은 없습니다.
운영자가 카톡으로 사람을 붙입니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 미스매치가 31%에서 17%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 미스매치가 17%에서 30%로 늘었다.',
    held: '다음 기간에도 미스매치가 17%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '미스매치는 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'petcare_repeat',
    type: '펫케어',
    stake: '반품률',
    normal: `맞춤 사료 구독은 첫 상자 반품률이 27%입니다.
기존 대안은 대형마트 사료입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `사료를 받고 많이 돌려보냅니다.`,
    rich: `맞춤 사료 구독은 첫 상자 반품률이 27%입니다.
기존 대안은 대형마트 사료입니다.
아직 출시되지 않았고 매출은 없습니다.
상담원이 품종만 듣고 추천합니다.`,
    full: '결제 후보 4명이 월 구독을 결제했고 반품률이 27%에서 14%로 줄었다.',
    partial: '결제 후보 4명이 월 구독을 결제했다.',
    worse: '다음 기간에 반품률이 14%에서 26%로 늘었다.',
    held: '다음 기간에도 반품률이 14%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    deny: '실제로 결제한 고객은 없었다.',
    conflict: '반품률은 줄지 않았고 결제는 취소됐다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  },
  {
    id: 'home_clean',
    type: '홈서비스',
    stake: '이탈',
    normal: `정기 청소 서비스는 두 번째 방문 이탈이 34%입니다.
기존 대안은 일회성 콜청소입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    thin: `청소를 한 번 받고 끊습니다.`,
    rich: `정기 청소 서비스는 두 번째 방문 이탈이 34%입니다.
기존 대안은 일회성 콜청소입니다.
아직 출시되지 않았고 매출은 없습니다.
매니저가 카톡으로 시간을 잡습니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 이탈이 34%에서 19%로 줄었다.',
    partial: '결제 후보 3명이 월 구독을 결제했다.',
    worse: '다음 기간에 이탈이 19%에서 33%로 늘었다.',
    held: '다음 기간에도 이탈이 19%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
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
    title: 'accuracy-batch-holdout',
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

describe('S.I. holdout Accuracy Batch — measure only', () => {
  it('does not change analyzer, presenter, classifier, or brand-branch', () => {
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}\n${CLASSIFY_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
    expect(PRESENTER_SRC).toMatch(/NEXT_PERIOD_QUESTION/);
  });

  it('records 10 holdout types × 15 scenes without touching #139', () => {
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
