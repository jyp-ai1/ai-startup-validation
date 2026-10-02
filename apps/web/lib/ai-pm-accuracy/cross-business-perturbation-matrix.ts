/**
 * Sprint 2 — 15 business × 10 perturbation single-turn probes (Layer A search).
 * Question order not scored; structural invariants per perturbation.
 */

import type { GoldenTurnExpect } from './golden-scenarios';
import type { InputPerturbationType } from './input-perturbation-types';
import type { AiPmLoopIssueId } from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-types';

export type CrossBusinessMatrixCell = {
  perturbation: InputPerturbationType;
  askedGapId: string;
  askedIssueId: AiPmLoopIssueId;
  askedQuestionText: string;
  userAnswer: string;
  expect: GoldenTurnExpect;
  /** Primary Sprint 2 types this cell is designed to detect */
  detectsTypes: string[];
};

const CUSTOMER_Q = '이 서비스를 가장 필요로 하는 구체 고객은 누구인가요?';

/** Perturbation definitions — business-agnostic user text (matrix runs per biz document context). */
export const CROSS_BUSINESS_PERTURBATION_CELLS: CrossBusinessMatrixCell[] = [
  {
    perturbation: 'normal',
    askedGapId: 'customerPersona',
    askedIssueId: 'customer_definition',
    askedQuestionText: CUSTOMER_Q,
    userAnswer: '핵심 고객은 명확한 직군과 규모를 가진 사용자이며 파일럿 중입니다.',
    expect: { gapCompleteness: { customerPersona: 'CLOSED' } },
    detectsTypes: [],
  },
  {
    perturbation: 'sparse',
    askedGapId: 'customerPersona',
    askedIssueId: 'customer_definition',
    askedQuestionText: CUSTOMER_Q,
    userAnswer: '중소기업입니다.',
    expect: { gapCompleteness: { customerPersona: 'PARTIAL' } },
    detectsTypes: [],
  },
  {
    perturbation: 'verbose',
    askedGapId: 'customerPersona',
    askedIssueId: 'customer_definition',
    askedQuestionText: CUSTOMER_Q,
    userAnswer:
      '저희는 여러 채널에서 들어온 리드 중에서도 특히 운영팀과 대표가 동시에 고민하는 부분이 있고, 결국 핵심 고객은 10~50명 규모 팀의 의사결정자입니다.',
    expect: { gapCompleteness: { customerPersona: 'CLOSED' } },
    detectsTypes: ['F13_MULTI_FACT_LOSS'],
  },
  {
    perturbation: 'multi_fact',
    askedGapId: 'problemJtbd',
    askedIssueId: 'problem_definition',
    askedQuestionText: '고객이 가장 크게 겪는 문제는 무엇인가요?',
    userAnswer: '대표가 구매하고 직원이 매일 사용하며 지금은 엑셀로 관리합니다.',
    expect: {
      factChecks: [
        { key: 'problem', valueIncludes: ['엑셀'] },
      ],
    },
    detectsTypes: ['F13_MULTI_FACT_LOSS', 'F03_PAYER_USER_CONFUSION'],
  },
  {
    perturbation: 'off_slot',
    askedGapId: 'customerPersona',
    askedIssueId: 'customer_definition',
    askedQuestionText: CUSTOMER_Q,
    userAnswer: '월 매출 3천만원이고 경쟁사는 배달앱입니다.',
    expect: {
      factChecks: [
        { key: 'revenue', valueIncludes: ['3천'], evidenceClass: 'FACT' },
        { key: 'competitor', valueIncludes: ['배달'], evidenceClass: 'FACT', valueExcludes: ['3천', '매출'] },
      ],
      gapCompleteness: { customerPersona: 'OPEN', revenueModel: 'PARTIAL' },
    },
    detectsTypes: ['F07_OPEN_GAP_MISSED', 'F10_OFF_SLOT_MISHANDLING', 'F01_CUSTOMER_POLLUTION'],
  },
  {
    perturbation: 'contradiction',
    askedGapId: 'customerPersona',
    askedIssueId: 'customer_definition',
    askedQuestionText: CUSTOMER_Q,
    userAnswer: 'B2C 개인 사용자입니다.',
    expect: { gapCompleteness: { customerPersona: 'CLOSED' } },
    detectsTypes: [],
  },
  {
    perturbation: 'unsupported_claim',
    askedGapId: 'differentiationVsAlternatives',
    askedIssueId: 'competitor_analysis',
    askedQuestionText: '경쟁 대비 차별점은 무엇인가요?',
    userAnswer: '시장 100조이고 무조건 1위가 될 압도적 기술입니다.',
    expect: {
      factChecks: [{ key: 'differentiation', evidenceClassNot: 'FACT' }],
      gapCompleteness: { differentiationVsAlternatives: 'PARTIAL' },
    },
    detectsTypes: ['F14_UNSUPPORTED_CLAIM_ACCEPTANCE'],
  },
  {
    perturbation: 'uncertainty',
    askedGapId: 'pricingHint',
    askedIssueId: 'bm_design',
    askedQuestionText: '가격·요금에 대한 신호가 있나요?',
    userAnswer: '아마 고객들이 월 구독료를 낼 것 같지만 아직 검증은 없습니다.',
    expect: {
      factChecks: [{ key: 'revenue', evidenceClassNot: 'FACT' }],
      gapCompleteness: { pricingHint: 'PARTIAL' },
    },
    detectsTypes: ['F04_FACT_ASSUMPTION_CONFUSION', 'F05_INFERENCE_AS_FACT'],
  },
  {
    perturbation: 'correction',
    askedGapId: 'customerPersona',
    askedIssueId: 'customer_definition',
    askedQuestionText: CUSTOMER_Q,
    userAnswer: '아까 답변을 수정할게요. 실제 고객은 대기업 IT팀이 아니라 중소 제조사입니다.',
    expect: { gapCompleteness: { customerPersona: 'CLOSED' } },
    detectsTypes: ['F12_CORRECTION_ROLLBACK'],
  },
  {
    perturbation: 'refusal',
    askedGapId: 'validationAssumptions',
    askedIssueId: 'market_validation',
    askedQuestionText: '핵심 가설을 검증한 실험이 있나요?',
    userAnswer: '아직 없습니다. 모르겠습니다.',
    expect: {},
    detectsTypes: [],
  },
  {
    perturbation: 'repeated',
    askedGapId: 'customerPersona',
    askedIssueId: 'customer_definition',
    askedQuestionText: CUSTOMER_Q,
    userAnswer: '아까 말씀드렸듯이 동일한 고객층입니다.',
    expect: { nextMustNotTargetGap: 'customerPersona' },
    detectsTypes: ['F09_REPEATED_QUESTION'],
  },
];
