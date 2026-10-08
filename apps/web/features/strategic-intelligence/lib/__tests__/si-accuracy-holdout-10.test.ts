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
} from './score-si-accuracy-holdout-10';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-accuracy-holdout-10.json',
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
const PRIOR_BATCH = '#139+#140+#141+#142+#143+#144+#145+#146+#147+#148';

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

function biz(
  id: string,
  type: string,
  stake: string,
  subject: string,
  pct: number,
  alt: string,
  thin: string,
  richExtra: string,
  fullN: number,
  down: number,
): Biz {
  return {
    id,
    type,
    stake,
    normal: `${subject}는 ${stake}가 ${pct}%입니다.\n기존 대안은 ${alt}입니다.\n아직 출시되지 않았고 매출은 없습니다.`,
    thin,
    rich: `${subject}는 ${stake}가 ${pct}%입니다.\n기존 대안은 ${alt}입니다.\n아직 출시되지 않았고 매출은 없습니다.\n${richExtra}`,
    full: `결제 후보 ${fullN}명이 월 구독을 결제했고 ${stake}가 ${pct}%에서 ${down}%로 줄었다.`,
    partial: `결제 후보 ${fullN}명이 월 구독을 결제했다.`,
    worse: `다음 기간에 ${stake}가 ${down}%에서 ${pct - 1}%로 늘었다.`,
    held: `다음 기간에도 ${stake}가 ${down}%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.`,
    deny: '실제로 결제한 고객은 없었다.',
    conflict: `${stake}는 줄지 않았고 결제는 취소됐다.`,
    repeatZero: '재구매는 0건이다. 최근 구매자 중 아무도 다시 결제하지 않았다.',
    repeatOk: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
  };
}

const BUSINESSES: Biz[] = [
  biz('jimjilbang_churn', '찜질방', '이탈', '동네 찜질방', 31, '쿠폰 도장 카드', '한 번 오고 끊습니다.', '데스크가 락커만 수첩에 적습니다.', 3, 16),
  biz('sauna_churn', '사우나', '이탈', '사우나', 28, '월회원 종이 명단', '등록하고 금방 안 옵니다.', '사장이 빈 락커를 눈으로 셉니다.', 3, 14),
  biz('baduk_churn', '바둑카페', '이탈', '바둑카페', 34, '시간권 종이 카드', '한 판 두고 다시 안 옵니다.', '사장이 급수만 칠판에 적습니다.', 2, 18),
  biz('lego_return', '레고샵', '반품률', '레고 전문점', 16, '박스 봉인 육안 확인', '받고 자주 돌려보냅니다.', '직원이 구성품을 세지 않습니다.', 3, 7),
  biz('wreath_noshow', '화환', '노쇼', '화환 가게', 21, '전화 주문 수기 장부', '예약하고 자리에 없습니다.', '기사가 전날 카톡으로 확인합니다.', 3, 10),
  biz('daeri_noshow', '대리운전', '노쇼', '대리운전 팀', 19, '콜 수기 배차', '호출하고 취소를 반복합니다.', '기사가 도착 전 전화로 확인합니다.', 4, 8),
  biz('storage_churn', '셀프스토리지', '이탈', '셀프스토리지', 26, '계약서 종이 보관', '한 달 쓰고 비웁니다.', '관리인이 만기만 달력에 적습니다.', 2, 12),
  biz('honey_mismatch', '양봉', '불일치', '양봉 농가', 15, '수확 수첩 기록', '당도가 견적과 다릅니다.', '농가주가 채밀 시점을 감으로 정합니다.', 2, 6),
  biz('dog_groom_noshow', '애견미용', '노쇼', '애견미용실', 27, '하루 전 문자', '예약하고 안 옵니다.', '실장이 아침에 전화로 확인합니다.', 3, 13),
  biz('dance_churn', '무용학원', '이탈', '무용학원', 39, '수강 쿠폰 문자', '한 달 듣고 끊습니다.', '원장이 출석만 수첩에 적습니다.', 3, 21),
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
    title: 'accuracy-batch-holdout-10',
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

function play(item: Biz, scene: SceneId): { t0: Snap; snap: Snap; answer: string | null } {
  const t0 = snapOf(item.normal);
  if (scene === 't0') return { t0, snap: t0, answer: null };
  if (scene === 'thin') return { t0, snap: snapOf(item.thin), answer: null };
  if (scene === 'rich') return { t0, snap: snapOf(item.rich), answer: null };
  if (scene === 'plan') return { t0, snap: snapOf(item.normal, PLAN), answer: PLAN };
  if (scene === 'full') return { t0, snap: snapOf(item.normal, item.full), answer: item.full };
  if (scene === 'partial') return { t0, snap: snapOf(item.normal, item.partial), answer: item.partial };
  if (scene === 'vague') return { t0, snap: snapOf(item.normal, VAGUE), answer: VAGUE };
  if (scene === 'hype') return { t0, snap: snapOf(item.normal, HYPE), answer: HYPE };
  const withFull = appendFounderEvidenceToDocument(item.normal, item.full);
  if (scene === 'worse') return { t0: snapOf(item.normal, item.full), snap: snapOf(withFull, item.worse), answer: item.worse };
  if (scene === 'deny') return { t0: snapOf(item.normal, item.full), snap: snapOf(withFull, item.deny), answer: item.deny };
  if (scene === 'conflict') {
    return { t0: snapOf(item.normal, item.full), snap: snapOf(withFull, item.conflict), answer: item.conflict };
  }
  if (scene === 'wrong_axis') {
    return { t0: snapOf(item.normal, item.full), snap: snapOf(withFull, WRONG_AXIS), answer: WRONG_AXIS };
  }
  if (scene === 'repeat_answer') {
    return { t0: snapOf(item.normal, item.full), snap: snapOf(withFull, item.full), answer: item.full };
  }
  const withHeld = appendFounderEvidenceToDocument(withFull, item.held);
  if (scene === 'repeat_zero') {
    return { t0: snapOf(withFull, item.held), snap: snapOf(withHeld, item.repeatZero), answer: item.repeatZero };
  }
  return { t0: snapOf(withFull, item.held), snap: snapOf(withHeld, item.repeatOk), answer: item.repeatOk };
}

describe('S.I. holdout-10 Accuracy Batch — measure only', () => {
  it('does not change analyzer, presenter, classifier, or brand-branch', () => {
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}\n${CLASSIFY_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
    expect(PRESENTER_SRC).toMatch(/NEXT_PERIOD_QUESTION/);
  });

  it('records 10 more holdout types × 15 scenes without touching #139', () => {
    const rows = BUSINESSES.flatMap((item) =>
      SCENES.map((scene) => {
        const played = play(item, scene);
        const scored = scoreScene({ scene, stake: item.stake, t0: played.t0, snap: played.snap });
        return {
          id: `${item.id}_${scene}`,
          businessType: item.type,
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
