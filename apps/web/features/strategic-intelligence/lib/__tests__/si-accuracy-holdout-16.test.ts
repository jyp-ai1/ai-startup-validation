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
} from './score-si-accuracy-holdout-16';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-accuracy-holdout-16.json',
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
const PRIOR_BATCH = '#139+#140+#141+#142+#143+#144+#145+#146+#147+#148+#149+#150+#151+#152+#153+#154';

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
  biz('kalguksu_churn', '칼국수', '이탈', '칼국수집', 29, '스탬프 카드', '한 번 먹고 다시 안 옵니다.', '사장이 단골 이름을 수첩에 적습니다.', 3, 14),
  biz('naengmyeon_churn', '냉면', '이탈', '냉면집', 28, '스탬프 카드', '한 번 먹고 다시 안 옵니다.', '사장이 신메뉴만 칠판에 적습니다.', 3, 14),
  biz('seolleong_churn', '설렁탕', '이탈', '설렁탕집', 26, '쿠폰 도장 카드', '한 번 먹고 끊습니다.', '사장이 단골만 수첩에 적습니다.', 3, 13),
  biz('dakgalbi_noshow', '닭갈비', '노쇼', '닭갈비집', 22, '예약금 없는 전화 예약', '자리 잡고 안 옵니다.', '사장이 전날 카톡으로 확인합니다.', 3, 10),
  biz('buffet_noshow', '뷔페', '노쇼', '동네 뷔페', 24, '예약금 없는 전화 예약', '예약하고 자리에 없습니다.', '데스크가 전날 카톡으로 확인합니다.', 4, 11),
  biz('cinema_noshow', '영화관', '노쇼', '동네 영화관', 19, '하루 전 문자', '예매하고 안 옵니다.', '데스크가 아침에 전화로 확인합니다.', 3, 8),
  biz('tattoo_churn', '타투', '이탈', '타투샵', 35, '명함 할인 쿠폰', '한 번 받고 다시 안 옵니다.', '작가가 다음 예약만 수첩에 적습니다.', 2, 18),
  biz('hanbok_match', '한복대여', '미스매치', '한복 대여점', 17, '치수 수첩 대조', '옷 사이즈가 자주 안 맞습니다.', '직원이 감으로 품을 고릅니다.', 3, 7),
  biz('sink_match', '싱크대', '미스매치', '싱크대 시공팀', 16, '현장 줄자 측정', '재단 크기가 자주 안 맞습니다.', '기사가 싱크대를 눈대중으로 잽니다.', 2, 7),
  biz('kick_omit', '킥보드', '누락', '킥보드 대여점', 13, '수기 대여 장부', '헬멧이 빠진 채로 나갑니다.', '직원이 바쁠 때 점검을 건너뜁니다.', 3, 5),
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
    title: 'accuracy-batch-holdout-16',
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

describe('S.I. holdout-16 Accuracy Batch — measure only', () => {
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
