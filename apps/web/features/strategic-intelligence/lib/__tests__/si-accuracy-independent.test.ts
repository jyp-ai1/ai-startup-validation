import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { classifyFounderEvidenceClass } from '../classify-founder-evidence';
import { decideSiValidationAsk } from '../decide-si-validation-ask';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import {
  axisOf,
  isGenericSpoken,
  scoreScene,
  type SceneId,
  type Snap,
} from './score-si-accuracy-independent';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-accuracy-independent.json',
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
const PRIOR_FACTORY =
  '#139–#193 factory 10×15 street-food/activity clones — not used as answer keys';

type Biz = {
  id: string;
  type: string;
  domain: string;
  stake: string;
  knownStakeNoun: boolean;
  normal: string;
  revenueDoc: string;
  plan: string;
  partial: string;
  full: string;
  worse: string;
  conflict: string;
  held: string;
  repeatZero: string;
};

const BUSINESSES: Biz[] = [
  {
    id: 'coldchain_3pl',
    type: '냉동물류 IoT',
    domain: 'B2B 3PL 센서',
    stake: '온도 초과',
    knownStakeNoun: false,
    normal: `수도권 냉동탑차 30대를 운용하는 3PL은 종이 온도기록지로 관리해서 하절기 온도 초과가 주 14건입니다.
기존 대안은 종이 온도기록지와 기사 수기 보고입니다.
아직 출시되지 않았고 매출은 없습니다.
결제자는 물류사 운영팀장입니다.`,
    revenueDoc: `수도권 냉동탑차 30대를 운용하는 3PL은 종이 온도기록지로 관리해서 하절기 온도 초과가 주 14건입니다.
기존 대안은 종이 온도기록지와 기사 수기 보고입니다.
이번 달 유료 결제 3건으로 매출 420만원이 있다. 재구매는 확인되지 않았다.
결제자는 물류사 운영팀장입니다.`,
    plan: '물류사 두 곳에 유료 파일럿을 제안할 생각인데 아직 아무도 결제하지 않았다.',
    partial: '물류사 2곳이 월 구독을 결제했다.',
    full: '물류사 2곳이 월 구독을 결제했고 온도 초과가 주 14건에서 4건으로 줄었다.',
    worse: '다음 주에 온도 초과가 4건에서 13건으로 늘었다.',
    conflict: '온도 초과는 줄지 않았고 결제는 취소됐다.',
    held: '다음 기간에도 온도 초과가 4건으로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
  },
  {
    id: 'dental_lab_match',
    type: '치과기공 매칭',
    domain: '헬스케어 마켓플레이스',
    stake: '재작업',
    knownStakeNoun: false,
    normal: `개인 치과 40곳은 전화로 기공소를 돌려 보철 재작업이 월 19%입니다.
기존 대안은 원장이 아는 기공소에 전화하는 방식입니다.
아직 출시되지 않았고 매출은 없습니다.
결제자는 치과 원장입니다.`,
    revenueDoc: `개인 치과 40곳은 전화로 기공소를 돌려 보철 재작업이 월 19%입니다.
기존 대안은 원장이 아는 기공소에 전화하는 방식입니다.
이번 달 유료 결제 4건으로 매출 360만원이 있다. 재구매는 확인되지 않았다.
결제자는 치과 원장입니다.`,
    plan: '원장 세 명에게 유료 매칭을 제안할 의향은 있지만 아직 실제 결제는 없다.',
    partial: '치과 3곳이 월 구독을 결제했다.',
    full: '치과 3곳이 월 구독을 결제했고 재작업이 19%에서 8%로 줄었다.',
    worse: '다음 달에 재작업이 8%에서 18%로 늘었다.',
    conflict: '재작업은 줄지 않았고 결제는 취소됐다.',
    held: '다음 기간에도 재작업이 8%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    repeatZero: '재구매는 0건이다. 결제한 치과 중 다음 달에도 다시 결제한 곳은 없다.',
  },
  {
    id: 'excavator_idle',
    type: '굴착기 단기렌탈',
    domain: '중고 건설장비',
    stake: '공회',
    knownStakeNoun: false,
    normal: `지방 토목 사장은 월단위 대기업 렌탈을 써서 굴착기 공회가 42%입니다.
기존 대안은 대기업 렌탈의 월단위 강제 계약입니다.
아직 출시되지 않았고 매출은 없습니다.
결제자는 소규모 토목 사장입니다.`,
    revenueDoc: `지방 토목 사장은 월단위 대기업 렌탈을 써서 굴착기 공회가 42%입니다.
기존 대안은 대기업 렌탈의 월단위 강제 계약입니다.
이번 달 단기 렌탈 결제 5건으로 매출 1800만원이 있다. 재구매는 확인되지 않았다.
결제자는 소규모 토목 사장입니다.`,
    plan: '토목 사장에게 일단위 렌탈을 권할 생각은 있지만 아직 아무도 결제하지 않았다.',
    partial: '토목 사장 2명이 단기 렌탈을 결제했다.',
    full: '토목 사장 2명이 단기 렌탈을 결제했고 공회가 42%에서 17%로 줄었다.',
    worse: '다음 기간에 공회가 17%에서 39%로 늘었다.',
    conflict: '공회는 줄지 않았고 결제는 취소됐다.',
    held: '다음 기간에도 공회가 17%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    repeatZero: '재구매는 0건이다. 렌탈을 끝난 사장 중 두 번째 장비를 다시 빌린 사람은 없다.',
  },
  {
    id: 'trial_noshow',
    type: '임상 피험자 모집',
    domain: 'CRO 헬스케어',
    stake: '노쇼',
    knownStakeNoun: true,
    normal: `국내 CRO는 병원 게시판으로 피험자를 모아 스크리닝 방문 노쇼가 31%입니다.
기존 대안은 병원 게시판과 간호사 전화 독촉입니다.
아직 출시되지 않았고 매출은 없습니다.
결제자는 CRO 프로젝트 매니저입니다.`,
    revenueDoc: `국내 CRO는 병원 게시판으로 피험자를 모아 스크리닝 방문 노쇼가 31%입니다.
기존 대안은 병원 게시판과 간호사 전화 독촉입니다.
이번 달 유료 파일럿 2건으로 매출 900만원이 있다. 재구매는 확인되지 않았다.
결제자는 CRO 프로젝트 매니저입니다.`,
    plan: 'CRO 두 팀에 유료 모집을 제안하려고 검토 중인데 아직 아무도 결제하지 않았다.',
    partial: 'CRO 2곳이 월 구독을 결제했다.',
    full: 'CRO 2곳이 월 구독을 결제했고 노쇼가 31%에서 12%로 줄었다.',
    worse: '다음 기간에 노쇼가 12%에서 29%로 늘었다.',
    conflict: '노쇼는 줄지 않았고 결제는 취소됐다.',
    held: '다음 기간에도 노쇼가 12%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    repeatZero: '재구매는 0건이다. 파일럿을 끝난 CRO 중 다음 시험에도 다시 결제한 곳은 없다.',
  },
  {
    id: 'bunker_delay',
    type: '선박 급유 중개',
    domain: '해운 B2B',
    stake: '급유 지연',
    knownStakeNoun: false,
    normal: `연근해 선사는 항만 전화 중개로 급유를 잡아 급유 지연이 출항 건당 18%입니다.
기존 대안은 항만 급유업자 전화 중개입니다.
아직 출시되지 않았고 매출은 없습니다.
결제자는 선사 운항팀입니다.`,
    revenueDoc: `연근해 선사는 항만 전화 중개로 급유를 잡아 급유 지연이 출항 건당 18%입니다.
기존 대안은 항만 급유업자 전화 중개입니다.
이번 달 중개 수수료 결제 6건으로 매출 2400만원이 있다. 재구매는 확인되지 않았다.
결제자는 선사 운항팀입니다.`,
    plan: '선사 운항팀에 중개 수수료를 받을 생각은 있지만 아직 실제 결제는 없다.',
    partial: '선사 2곳이 중개 수수료를 결제했다.',
    full: '선사 2곳이 중개 수수료를 결제했고 급유 지연이 18%에서 7%로 줄었다.',
    worse: '다음 기간에 급유 지연이 7%에서 17%로 늘었다.',
    conflict: '급유 지연은 줄지 않았고 결제는 취소됐다.',
    held: '다음 기간에도 급유 지연이 7%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    repeatZero: '재구매는 0건이다. 한 번 중개받은 선사 중 다음 출항에도 다시 결제한 곳은 없다.',
  },
  {
    id: 'print_tolerance',
    type: '산업 3D 수탁',
    domain: '제조 수탁',
    stake: '치수 불량',
    knownStakeNoun: false,
    normal: `중소 설비보전팀은 해외 수탁 6주로 Spare part를 뽑아 치수 불량이 22%입니다.
기존 대안은 해외 수탁 3D 프린팅 6주 리드타임입니다.
아직 출시되지 않았고 매출은 없습니다.
결제자는 공장 보전팀장입니다.`,
    revenueDoc: `중소 설비보전팀은 해외 수탁 6주로 Spare part를 뽑아 치수 불량이 22%입니다.
기존 대안은 해외 수탁 3D 프린팅 6주 리드타임입니다.
이번 달 수탁 결제 3건으로 매출 1500만원이 있다. 재구매는 확인되지 않았다.
결제자는 공장 보전팀장입니다.`,
    plan: '보전팀장에게 국내 수탁을 제안할 의향은 있지만 아직 아무도 결제하지 않았다.',
    partial: '공장 2곳이 수탁 비용을 결제했다.',
    full: '공장 2곳이 수탁 비용을 결제했고 치수 불량이 22%에서 6%로 줄었다.',
    worse: '다음 기간에 치수 불량이 6%에서 21%로 늘었다.',
    conflict: '치수 불량은 줄지 않았고 결제는 취소됐다.',
    held: '다음 기간에도 치수 불량이 6%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    repeatZero: '재구매는 0건이다. 한 번 맡긴 공장 중 두 번째 부품을 다시 결제한 곳은 없다.',
  },
  {
    id: 'meal_leftover',
    type: '학교급식 잔반',
    domain: '공공 급식',
    stake: '잔반',
    knownStakeNoun: false,
    normal: `광역시 초등 급식은 전날 눈대중 식수로 잔반이 1인당 28%입니다.
기존 대안은 영양사가 전날 눈대중으로 식수를 정하는 방식입니다.
아직 출시되지 않았고 매출은 없습니다.
결제자는 교육청 급식담당입니다.`,
    revenueDoc: `광역시 초등 급식은 전날 눈대중 식수로 잔반이 1인당 28%입니다.
기존 대안은 영양사가 전날 눈대중으로 식수를 정하는 방식입니다.
이번 달 유료 파일럿 2개 학교로 매출 220만원이 있다. 재구매는 확인되지 않았다.
결제자는 교육청 급식담당입니다.`,
    plan: '교육청에 유료 식수 예측을 제안하려고 생각 중이지만 아직 아무도 결제하지 않았다.',
    partial: '학교 2곳이 월 구독을 결제했다.',
    full: '학교 2곳이 월 구독을 결제했고 잔반이 28%에서 11%로 줄었다.',
    worse: '다음 기간에 잔반이 11%에서 27%로 늘었다.',
    conflict: '잔반은 줄지 않았고 결제는 취소됐다.',
    held: '다음 기간에도 잔반이 11%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    repeatZero: '재구매는 0건이다. 파일럿 학교 중 다음 학기에도 다시 결제한 곳은 없다.',
  },
  {
    id: 'remit_mismatch',
    type: '소상공인 해외송금',
    domain: '핀테크 B2B',
    stake: '불일치',
    knownStakeNoun: true,
    normal: `수출 소상공인은 은행 전신환으로 대금 회수할 때 송금 불일치가 건당 16%입니다.
기존 대안은 시중은행 전신환과 수기 대사입니다.
아직 출시되지 않았고 매출은 없습니다.
결제자는 무역 소상공인 대표입니다.`,
    revenueDoc: `수출 소상공인은 은행 전신환으로 대금 회수할 때 송금 불일치가 건당 16%입니다.
기존 대안은 시중은행 전신환과 수기 대사입니다.
이번 달 송금 수수료 결제 8건으로 매출 96만원이 있다. 재구매는 확인되지 않았다.
결제자는 무역 소상공인 대표입니다.`,
    plan: '수출 대표에게 수수료를 받을 생각은 있지만 아직 실제 결제는 없다.',
    partial: '수출 대표 3명이 송금 수수료를 결제했다.',
    full: '수출 대표 3명이 송금 수수료를 결제했고 불일치가 16%에서 5%로 줄었다.',
    worse: '다음 기간에 불일치가 5%에서 15%로 늘었다.',
    conflict: '불일치는 줄지 않았고 결제는 취소됐다.',
    held: '다음 기간에도 불일치가 5%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    repeatZero: '재구매는 0건이다. 한 번 송금한 대표 중 다음 대금에도 다시 결제한 사람은 없다.',
  },
];

const WRONG_AXIS = '최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.';

const SCENES: SceneId[] = [
  'normal',
  'plan_intent',
  'partial',
  'full',
  'negative',
  'conflict',
  'revenue_no_repeat',
  'wrong_axis',
  'closed_reask',
];

function snapOf(document: string, answer?: string): Snap {
  const view = resolveSiJourneyIntegration({
    title: 'accuracy-batch-independent',
    businessDocument: document,
    founderAnswer: answer,
  });
  const j = view.current.judgment;
  const q = view.current.question;
  const ask = decideSiValidationAsk(j);
  return {
    verdictId: j.verdictId,
    stageId: j.stageId,
    judgment: j.judgment,
    whyPossible: j.whyPossible,
    whyFail: j.whyFail,
    strengths: j.strengths,
    risks: j.risks,
    evidenceClasses: j.evidenceMap.map((item) => item.evidenceClass),
    criticalUnknown: j.criticalUnknown,
    decisionChangingEvidence: j.decisionChangingEvidence,
    validationPriority: j.validationPriority,
    whyAsking: q.whyAsking,
    questionText: q.questionText,
    askKind: ask.kind,
    evidenceClass:
      view.current.update?.addedEvidence[0]?.evidenceClass ??
      (answer ? classifyFounderEvidenceClass(answer) : null),
  };
}

function play(item: Biz, scene: SceneId): { t0: Snap; snap: Snap; answer: string | null } {
  const t0 = snapOf(item.normal);
  if (scene === 'normal') return { t0, snap: t0, answer: null };
  if (scene === 'plan_intent') return { t0, snap: snapOf(item.normal, item.plan), answer: item.plan };
  if (scene === 'partial') return { t0, snap: snapOf(item.normal, item.partial), answer: item.partial };
  if (scene === 'full') return { t0, snap: snapOf(item.normal, item.full), answer: item.full };
  if (scene === 'revenue_no_repeat') {
    return {
      t0: snapOf(item.revenueDoc),
      snap: snapOf(item.revenueDoc, item.repeatZero),
      answer: item.repeatZero,
    };
  }
  const withFull = appendFounderEvidenceToDocument(item.normal, item.full);
  if (scene === 'negative') {
    return { t0: snapOf(item.normal, item.full), snap: snapOf(withFull, item.worse), answer: item.worse };
  }
  if (scene === 'conflict') {
    return { t0: snapOf(item.normal, item.full), snap: snapOf(withFull, item.conflict), answer: item.conflict };
  }
  if (scene === 'wrong_axis') {
    return { t0: snapOf(item.normal, item.full), snap: snapOf(withFull, WRONG_AXIS), answer: WRONG_AXIS };
  }
  const withHeld = appendFounderEvidenceToDocument(withFull, item.held);
  return { t0: snapOf(withFull, item.held), snap: snapOf(withHeld, item.held), answer: item.held };
}

describe('S.I. independent Accuracy Batch — unseen businesses, measure only', () => {
  it('does not change analyzer, presenter, classifier, or brand-branch', () => {
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}\n${CLASSIFY_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
    expect(PRESENTER_SRC).toMatch(/NEXT_PERIOD_QUESTION/);
  });

  it('records 8 unseen business types × required failure-induction scenes without copying factory dumps', () => {
    const rows = BUSINESSES.flatMap((item) =>
      SCENES.map((scene) => {
        const played = play(item, scene);
        const scored = scoreScene({
          scene,
          stake: item.stake,
          knownStakeNoun: item.knownStakeNoun,
          t0: played.t0,
          snap: played.snap,
        });
        return {
          id: `${item.id}_${scene}`,
          businessType: item.type,
          domain: item.domain,
          stake: item.stake,
          knownStakeNoun: item.knownStakeNoun,
          scene,
          initialJudgment: played.t0.judgment,
          initialVerdict: played.t0.verdictId,
          initialStage: played.t0.stageId,
          initialEvidenceClasses: played.t0.evidenceClasses,
          whyPossible: played.snap.whyPossible,
          whyFail: played.snap.whyFail,
          strengths: played.snap.strengths,
          risks: played.snap.risks,
          cu: played.snap.criticalUnknown,
          dce: played.snap.decisionChangingEvidence,
          validationPriority: played.snap.validationPriority,
          askKind: played.snap.askKind,
          question: played.snap.questionText,
          founderAnswer: played.answer,
          evidence: played.snap.evidenceClass,
          evidenceClasses: played.snap.evidenceClasses,
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
    const failureByBusiness: Record<string, Record<string, number>> = {};
    for (const row of rows) {
      if (row.failureType !== 'none') {
        failureCluster[row.failureType] = (failureCluster[row.failureType] ?? 0) + 1;
        const byType = failureByBusiness[row.failureType] ?? {};
        byType[row.businessType] = (byType[row.businessType] ?? 0) + 1;
        failureByBusiness[row.failureType] = byType;
      }
    }
    const types = [...new Set(rows.map((row) => row.businessType))];
    const genericAfterFull = rows.filter((row) => row.scene === 'full' && row.generic).length;
    const dvFail = count('decisionValue').FAIL;
    const structuralNames = [
      'generic_after_promotion',
      'stale_cu',
      'over_promote_on_plan',
      'validated_on_intent',
      'axis_drift',
      'over_promote_on_partial',
      'stake_blind_overfit',
      'revenue_as_viability',
      'missed_downgrade',
    ];
    const structural = Object.entries(failureCluster).filter(([type, n]) => {
      if (!structuralNames.includes(type) || n < 3) return false;
      const businesses = Object.keys(failureByBusiness[type] ?? {});
      return businesses.length >= 3;
    });
    const fixGate = structural.length > 0 && dvFail >= 3 ? 'CANDIDATE' : 'HOLD';

    const t0Paid = rows.filter((row) => row.scene === 'normal' && row.askKind === 'paid_conversion');
    const crossBusinessAxis = {
      paidConversionBusinesses: t0Paid.length,
      spokenResale: t0Paid.filter((row) => axisOf(row.question) === 'resale').length,
      spokenPaid: t0Paid.filter((row) => axisOf(row.question) === 'paid_conversion').length,
      spokenOther: t0Paid.filter((row) => !['paid_conversion', 'resale'].includes(axisOf(row.question))).length,
    };

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify(
        {
          productionSha: PRODUCTION_SHA,
          priorFactory: PRIOR_FACTORY,
          production: 'UNCHANGED',
          merge: 'HOLD',
          preview: 'UNVERIFIED',
          ceoFounderTest: 'HOLD',
          cpoApproval: 'NOT_SELF',
          fixGate,
          frozenDraft: { pr: 139, sha: '0c362c7' },
          businessTypeCount: types.length,
          scenarioCount: rows.length,
          knownStakeNounTypes: BUSINESSES.filter((item) => item.knownStakeNoun).map((item) => item.type),
          unseenStakeNounTypes: BUSINESSES.filter((item) => !item.knownStakeNoun).map((item) => item.type),
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
          failureByBusiness,
          crossBusinessAxis,
          rows,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    expect(types).toHaveLength(8);
    expect(rows).toHaveLength(72);
    expect(genericAfterFull).toBe(0);
    expect(PRODUCTION_SHA).toBe('0b465226516e1a4f3eb9ce2087f8bca2c2c091da');
  });
});
