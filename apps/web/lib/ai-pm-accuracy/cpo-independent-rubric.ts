/**
 * CPO 2-pass — independent review hints (NOT CTO auto-pass criteria).
 * CPO fills Expected/Verdict in CPO-ACCURACY-2PASS.md; divergences from CTO are first-class.
 */

export type CpoLayerFocus = 'L1_UNDERSTANDING' | 'L2_GAP' | 'L3_QUESTION';

export type CpoIndependentTurnRubric = {
  scenarioId: string;
  turn: number;
  layers: CpoLayerFocus[];
  /** What CPO should decide independently (plain language). */
  cpoReviewQuestions: string[];
  /** Known divergence risk vs CTO golden (if any). */
  ctoCpoDivergenceNote?: string;
};

export const CPO_INDEPENDENT_RUBRIC: CpoIndependentTurnRubric[] = [
  {
    scenarioId: 'golden-a-normal-input',
    turn: 1,
    layers: ['L1_UNDERSTANDING', 'L2_GAP', 'L3_QUESTION'],
    cpoReviewQuestions: [
      'customer에 “유입 부족” 등 사용자가 말하지 않은 문제 확대가 없는가?',
      'problem은 “SNS·홍보·시간”에 grounded 되었는가?',
      'customerPersona gap이 WHO 정보로 CLOSED 되었는가?',
    ],
    ctoCpoDivergenceNote:
      'CTO는 substring match; CPO는 raw 전체 문장을 customer value로 저장한 것 자체를 PARTIAL로 볼 수 있음.',
  },
  {
    scenarioId: 'golden-b-sparse',
    turn: 1,
    layers: ['L2_GAP', 'L3_QUESTION'],
    cpoReviewQuestions: [
      '“사람들”은 PARTIAL/OPEN이 맞는가?',
      '다음 질문이 customerPersona에 probe인가, 더 중요한 gap을 우회하지 않았는가?',
    ],
  },
  {
    scenarioId: 'golden-c-wrong-slot',
    turn: 1,
    layers: ['L1_UNDERSTANDING', 'L2_GAP', 'L3_QUESTION'],
    cpoReviewQuestions: [
      'customer slot에 매출/경쟁이 저장되지 않았는가?',
      '매출·경쟁은 적절 taxonomy/slot에만 반영되었는가?',
      'customerPersona는 OPEN 유지 + 재질문인가?',
    ],
  },
  {
    scenarioId: 'golden-d-contradiction',
    turn: 1,
    layers: ['L1_UNDERSTANDING', 'L2_GAP'],
    cpoReviewQuestions: ['소상공인 카페가 CLOSED 수준인가?'],
  },
  {
    scenarioId: 'golden-d-contradiction',
    turn: 2,
    layers: ['L1_UNDERSTANDING', 'L2_GAP', 'L3_QUESTION'],
    cpoReviewQuestions: [
      'customer CONTRADICTED(또는 CONFLICT) 처리되었는가?',
      '모순 해결 clarify/challenge 질문인가?',
    ],
  },
  {
    scenarioId: 'golden-e-no-repeat',
    turn: 2,
    layers: ['L2_GAP', 'L3_QUESTION'],
    cpoReviewQuestions: [
      'customerPersona CLOSED 후 다음 질문이 customer를 반복하지 않는가?',
      'problem 처리 후 customer state 보존되었는가?',
    ],
  },
  {
    scenarioId: 'golden-f-multi-slot',
    turn: 1,
    layers: ['L1_UNDERSTANDING', 'L2_GAP'],
    cpoReviewQuestions: [
      '한 utterance에서 customer/problem/revenue가 분리 추출되었는가 (전체 blob만 3번 저장 아님)?',
    ],
    ctoCpoDivergenceNote: 'CTO는 substring; CPO는 value normalization 엄격 적용 가능.',
  },
  {
    scenarioId: 'golden-g-overclaim',
    turn: 1,
    layers: ['L1_UNDERSTANDING'],
    cpoReviewQuestions: ['과장 주장이 FACT가 아닌 ASSUMPTION/INFERENCE인가?'],
  },
  {
    scenarioId: 'golden-h-wtp-assumption',
    turn: 1,
    layers: ['L1_UNDERSTANDING'],
    cpoReviewQuestions: ['“아마 낼 것 같다”가 validated WTP(FACT)로 저장되지 않았는가?'],
  },
];
