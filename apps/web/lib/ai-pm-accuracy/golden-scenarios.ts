import type {
  ConversationFactKey,
  EvidenceClass,
  GapCompleteness,
  RecommendedAction,
} from '@repo/types/domain/answer-review';

import type { AiPmLoopIssueId } from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-types';
import type { AccuracyGateId } from './failure-taxonomy';

export type GoldenTurnExpect = {
  /** Gate 1 — extracted fact checks on this turn */
  factChecks?: Array<{
    key: ConversationFactKey;
    valueIncludes?: string[];
    valueExcludes?: string[];
    evidenceClass?: EvidenceClass;
    evidenceClassNot?: EvidenceClass;
  }>;
  /** Gate 2 — prior fact keys must still match */
  preserveFacts?: Partial<Record<ConversationFactKey, string>>;
  /** Gate 3/5 — gap completeness after turn */
  gapCompleteness?: Partial<Record<string, GapCompleteness>>;
  askedGapMustNotClose?: boolean;
  /** Gate 4 — next question must not target this closed gap */
  nextMustNotTargetGap?: string;
  nextTargetGap?: string;
  nextAction?: RecommendedAction;
  actionRationaleIncludes?: string[];
  hasContradictionOn?: ConversationFactKey;
  quality?: string;
};

export type GoldenTurn = {
  askedGapId: string;
  askedQuestionText: string;
  askedIssueId: AiPmLoopIssueId;
  userAnswer: string;
  expect: GoldenTurnExpect;
};

export type GoldenScenario = {
  id: string;
  letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
  label: string;
  purpose: string;
  gates: AccuracyGateId[];
  turns: GoldenTurn[];
};

export const GOLDEN_SCENARIOS: GoldenScenario[] = [
  {
    id: 'golden-a-normal-input',
    letter: 'A',
    label: '정상 사업 입력',
    purpose: 'Gate 1 — understanding without over-inference',
    gates: ['GATE_1_UNDERSTANDING'],
    turns: [
      {
        askedGapId: 'customerPersona',
        askedQuestionText: '이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?',
        askedIssueId: 'customer_definition',
        userAnswer:
          '우리 고객은 동네 음식점 사장님이고 SNS 홍보할 시간이 없습니다.',
        expect: {
          factChecks: [
            {
              key: 'customer',
              valueIncludes: ['음식점', '사장'],
              valueExcludes: ['유입', 'SNS', '홍보할'],
            },
            {
              key: 'problem',
              valueIncludes: ['SNS', '홍보', '시간'],
              valueExcludes: ['유입 부족', '음식점 사장'],
            },
          ],
          gapCompleteness: { customerPersona: 'CLOSED' },
        },
      },
    ],
  },
  {
    id: 'golden-b-sparse',
    letter: 'B',
    label: '정보 부족',
    purpose: 'Gap detection — PARTIAL/OPEN',
    gates: ['GATE_1_UNDERSTANDING', 'GATE_6_NEXT_QUESTION'],
    turns: [
      {
        askedGapId: 'customerPersona',
        askedQuestionText: '이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?',
        askedIssueId: 'customer_definition',
        userAnswer: '사람들',
        expect: {
          gapCompleteness: { customerPersona: 'PARTIAL' },
          nextTargetGap: 'customerPersona',
          nextAction: 'probe',
        },
      },
    ],
  },
  {
    id: 'golden-c-wrong-slot',
    letter: 'C',
    label: '엉뚱한 답변',
    purpose: 'Gate 3 — wrong-slot merge prevention',
    gates: ['GATE_3_WRONG_ANSWER', 'GATE_1_UNDERSTANDING'],
    turns: [
      {
        askedGapId: 'customerPersona',
        askedQuestionText: '이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?',
        askedIssueId: 'customer_definition',
        userAnswer: '현재 월 매출은 3천만원이고 경쟁사는 배달앱입니다.',
        expect: {
          askedGapMustNotClose: true,
          factChecks: [
            {
              key: 'customer',
              valueExcludes: ['3천', '배달'],
            },
            {
              key: 'competitor',
              valueIncludes: ['배달'],
              valueExcludes: ['3천', '매출'],
              evidenceClass: 'FACT',
            },
            {
              key: 'revenue',
              valueIncludes: ['3천'],
              valueExcludes: ['배달', '경쟁'],
              evidenceClass: 'FACT',
            },
          ],
          gapCompleteness: { customerPersona: 'OPEN', revenueModel: 'PARTIAL' },
          nextTargetGap: 'customerPersona',
          actionRationaleIncludes: ['관련 없'],
        },
      },
    ],
  },
  {
    id: 'golden-d-contradiction',
    letter: 'D',
    label: '모순 답변',
    purpose: 'Gate 5 — CONTRADICTED + clarify',
    gates: ['GATE_5_CONTRADICTION', 'GATE_2_PRESERVATION'],
    turns: [
      {
        askedGapId: 'customerPersona',
        askedQuestionText: '이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?',
        askedIssueId: 'customer_definition',
        userAnswer: '소상공인 카페 사장님입니다.',
        expect: {
          gapCompleteness: { customerPersona: 'CLOSED' },
          preserveFacts: { customer: '소상공인' },
        },
      },
      {
        askedGapId: 'customerPersona',
        askedQuestionText: '이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?',
        askedIssueId: 'customer_definition',
        userAnswer: '실제로는 대기업 IT 팀이 핵심 고객입니다.',
        expect: {
          hasContradictionOn: 'customer',
          gapCompleteness: { customerPersona: 'CONTRADICTED' },
          nextAction: 'clarify',
        },
      },
    ],
  },
  {
    id: 'golden-e-no-repeat',
    letter: 'E',
    label: '이미 답변한 정보',
    purpose: 'Gate 4 — no repeat on CLOSED gap',
    gates: ['GATE_4_REPEAT', 'GATE_2_PRESERVATION'],
    turns: [
      {
        askedGapId: 'customerPersona',
        askedQuestionText: '이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?',
        askedIssueId: 'customer_definition',
        userAnswer: '소규모 양조장입니다.',
        expect: {
          gapCompleteness: { customerPersona: 'CLOSED' },
        },
      },
      {
        askedGapId: 'problemJtbd',
        askedQuestionText: '지금 가장 크게 해결하려는 불편은 무엇인가요?',
        askedIssueId: 'problem_definition',
        userAnswer: '온라인 홍보가 어렵습니다.',
        expect: {
          preserveFacts: { customer: '양조장' },
          gapCompleteness: { problemJtbd: 'CLOSED' },
          nextMustNotTargetGap: 'customerPersona',
        },
      },
    ],
  },
  {
    id: 'golden-f-multi-slot',
    letter: 'F',
    label: '여러 정보 한 번에',
    purpose: 'Multi-slot extraction',
    gates: ['GATE_1_UNDERSTANDING', 'GATE_2_PRESERVATION'],
    turns: [
      {
        askedGapId: 'customerPersona',
        askedQuestionText: '이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?',
        askedIssueId: 'customer_definition',
        userAnswer:
          '고객은 소규모 양조장이고, 문제는 온라인 홍보 어려움이며, 가격은 월 10만원입니다.',
        expect: {
          factChecks: [
            { key: 'customer', valueIncludes: ['양조장'], valueExcludes: ['가격', '10만'] },
            { key: 'problem', valueIncludes: ['홍보'], valueExcludes: ['10만', '가격은'] },
            { key: 'revenue', valueIncludes: ['10'] },
          ],
        },
      },
    ],
  },
  {
    id: 'golden-g-overclaim',
    letter: 'G',
    label: '과장된 사업성 주장',
    purpose: 'Gate 7 — no FACT on unvalidated claim',
    gates: ['GATE_7_EVIDENCE'],
    turns: [
      {
        askedGapId: 'differentiationVsAlternatives',
        askedQuestionText: '경쟁 대비 이 서비스만의 차별점은 무엇인가요?',
        askedIssueId: 'competitor_analysis',
        userAnswer: '분명히 시장 1위가 될 수 있는 압도적 기술입니다.',
        expect: {
          factChecks: [
            {
              key: 'differentiation',
              evidenceClassNot: 'FACT',
            },
          ],
          gapCompleteness: { differentiationVsAlternatives: 'PARTIAL' },
        },
      },
    ],
  },
  {
    id: 'golden-h-wtp-assumption',
    letter: 'H',
    label: '근거 없는 지불의향',
    purpose: 'Gate 7 — assumption / unvalidated WTP',
    gates: ['GATE_7_EVIDENCE'],
    turns: [
      {
        askedGapId: 'pricingHint',
        askedQuestionText: '예상 가격대나 지불 의향을 알려 주세요.',
        askedIssueId: 'bm_design',
        userAnswer: '아마 고객들이 이 서비스에 돈을 낼 것 같아요.',
        expect: {
          factChecks: [
            {
              key: 'revenue',
              evidenceClassNot: 'FACT',
            },
          ],
          gapCompleteness: { pricingHint: 'PARTIAL', revenueModel: 'OPEN' },
        },
      },
    ],
  },
];
