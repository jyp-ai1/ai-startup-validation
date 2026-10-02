import type { GoldenTurnExpect } from './golden-scenarios';
import type { InputPerturbationType } from './input-perturbation-types';
import type { AiPmLoopIssueId } from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-types';

export type MultiBusinessScriptTurn = {
  perturbation: InputPerturbationType;
  askedGapId: string;
  askedQuestionText: string;
  askedIssueId: AiPmLoopIssueId;
  userAnswer: string;
  /** Structural checks — does not fix global question order across businesses */
  expect: GoldenTurnExpect;
};

export type MultiBusinessPilotScript = {
  businessId: string;
  label: string;
  layer: 'A' | 'B';
  turns: MultiBusinessScriptTurn[];
};

/** Layer A — one probe turn per business (normal input on customer ask). */
export function buildLayerAProbeTurn(bizLabel: string): MultiBusinessScriptTurn {
  return {
    perturbation: 'normal',
    askedGapId: 'customerPersona',
    askedQuestionText: '이 서비스를 가장 필요로 하는 구체 고객은 누구인가요?',
    askedIssueId: 'customer_definition',
    userAnswer: `주요 고객은 ${bizLabel}을(를) 위한 사용자이며, 현재 파일럿 단계입니다.`,
    expect: {
      gapCompleteness: { customerPersona: 'CLOSED' },
    },
  };
}

/** Layer B — longitudinal pilots (question order not pre-scored; invariants per turn). */
export const MULTI_BUSINESS_PILOT_SCRIPTS: MultiBusinessPilotScript[] = [
  {
    businessId: 'biz-01',
    label: 'B2B SaaS longitudinal pilot',
    layer: 'B',
    turns: [
      turn('normal', 'customerPersona', 'customer_definition', '직원 10~50명 중소기업 HR·경영진이 구매 결정합니다.', {
        gapCompleteness: { customerPersona: 'CLOSED' },
      }),
      turn('multi_fact', 'problemJtbd', 'problem_definition', '대표가 구매하고 직원이 매일 사용하며 지금은 엑셀로 관리합니다.', {
        factChecks: [
          { key: 'customer', valueIncludes: ['중소', '기업'] },
          { key: 'problem', valueIncludes: ['엑셀'] },
        ],
      }),
      turn('off_slot', 'customerPersona', 'customer_definition', '경쟁사는 네이버웍스입니다.', {
        factChecks: [{ key: 'competitor', valueIncludes: ['네이버'], evidenceClass: 'FACT' }],
        gapCompleteness: { customerPersona: 'OPEN' },
      }),
      turn('uncertainty', 'pricingHint', 'bm_design', '아마 팀당 월 구독료를 낼 것 같지만 아직 검증은 없습니다.', {
        factChecks: [{ key: 'revenue', evidenceClassNot: 'FACT' }],
        gapCompleteness: { pricingHint: 'PARTIAL' },
      }),
      turn('contradiction', 'customerPersona', 'customer_definition', '실제 결제는 IT 담당자가 합니다. 대표는 관여하지 않아요.', {
        hasContradictionOn: 'customer',
      }),
    ],
  },
  {
    businessId: 'biz-07',
    label: 'Local F&B longitudinal pilot',
    layer: 'B',
    turns: [
      turn('normal', 'customerPersona', 'customer_definition', '동네 카페·음식점을 직접 운영하는 1~3호점 사장님입니다.', {
        gapCompleteness: { customerPersona: 'CLOSED' },
      }),
      turn('sparse', 'problemJtbd', 'problem_definition', '홍보가 어렵습니다.', {
        gapCompleteness: { problemJtbd: 'PARTIAL' },
      }),
      turn('off_slot', 'customerPersona', 'customer_definition', '월 매출 3천만원이고 배달앱이 경쟁사입니다.', {
        factChecks: [
          { key: 'revenue', valueIncludes: ['3천'], evidenceClass: 'FACT' },
          { key: 'competitor', valueIncludes: ['배달'], evidenceClass: 'FACT' },
        ],
        gapCompleteness: { customerPersona: 'OPEN', revenueModel: 'PARTIAL' },
      }),
    ],
  },
  {
    businessId: 'biz-03',
    label: 'AI SaaS longitudinal pilot',
    layer: 'B',
    turns: [
      turn('normal', 'customerPersona', 'customer_definition', 'PM과 기획자가 주 사용자입니다.', {
        gapCompleteness: { customerPersona: 'CLOSED' },
      }),
      turn('unsupported_claim', 'differentiationVsAlternatives', 'competitor_analysis', '시장 100조이고 무조건 1위가 될 기술입니다.', {
        factChecks: [
          {
            key: 'differentiation',
            evidenceClassNot: 'FACT',
          },
        ],
        gapCompleteness: { differentiationVsAlternatives: 'PARTIAL' },
      }),
      turn('refusal', 'validationAssumptions', 'market_validation', '아직 어떤 실험도 하지 않았습니다. 모르겠습니다.', {
        quality: 'PARTIAL',
      }),
    ],
  },
];

function turn(
  perturbation: InputPerturbationType,
  askedGapId: string,
  askedIssueId: AiPmLoopIssueId,
  userAnswer: string,
  expect: GoldenTurnExpect,
): MultiBusinessScriptTurn {
  return {
    perturbation,
    askedGapId,
    askedQuestionText: `[${askedGapId}] 질문`,
    askedIssueId,
    userAnswer,
    expect,
  };
}
