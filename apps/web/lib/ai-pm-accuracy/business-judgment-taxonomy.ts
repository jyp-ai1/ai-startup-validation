/**
 * CPO Sprint 1 — 26-item Business Judgment Knowledge Taxonomy.
 * Maps CPO labels to V3 gapId + ConversationFactKey (no ordered questionnaire).
 */

import type { ConversationFactKey } from '@repo/types/domain/answer-review';

export type TaxonomyKnowledgeStatus =
  | 'CLOSED'
  | 'PARTIAL'
  | 'OPEN'
  | 'CONFLICT'
  | 'UNKNOWN';

export type BusinessJudgmentTaxonomyItem = {
  id: number;
  category: 'A' | 'B' | 'C' | 'D';
  categoryLabel: string;
  labelKo: string;
  labelEn: string;
  /** Primary V3 gap when applicable */
  primaryGapId: string | null;
  factKeys: ConversationFactKey[];
  /** CPO taxonomy id string for evidence exports */
  taxonomyKey: string;
};

export const BUSINESS_JUDGMENT_TAXONOMY: BusinessJudgmentTaxonomyItem[] = [
  {
    id: 1,
    category: 'A',
    categoryLabel: 'Business Understanding',
    labelKo: '사업/제품',
    labelEn: 'business_product',
    primaryGapId: 'businessOneLiner',
    factKeys: ['business'],
    taxonomyKey: 'business_product',
  },
  {
    id: 2,
    category: 'A',
    categoryLabel: 'Business Understanding',
    labelKo: '고객',
    labelEn: 'customer',
    primaryGapId: 'customerPersona',
    factKeys: ['customer'],
    taxonomyKey: 'customer',
  },
  {
    id: 3,
    category: 'A',
    categoryLabel: 'Business Understanding',
    labelKo: '실제 사용자',
    labelEn: 'end_user',
    primaryGapId: 'customerPersona',
    factKeys: ['customer'],
    taxonomyKey: 'end_user',
  },
  {
    id: 4,
    category: 'A',
    categoryLabel: 'Business Understanding',
    labelKo: '구매자/지불자',
    labelEn: 'buyer_payer',
    primaryGapId: 'payer',
    factKeys: ['buyer'],
    taxonomyKey: 'buyer_payer',
  },
  {
    id: 5,
    category: 'A',
    categoryLabel: 'Business Understanding',
    labelKo: '핵심 문제',
    labelEn: 'core_problem',
    primaryGapId: 'problemJtbd',
    factKeys: ['problem'],
    taxonomyKey: 'core_problem',
  },
  {
    id: 6,
    category: 'A',
    categoryLabel: 'Business Understanding',
    labelKo: 'JTBD / 사용 상황',
    labelEn: 'jtbd_context',
    primaryGapId: 'problemJtbd',
    factKeys: ['problem'],
    taxonomyKey: 'jtbd_context',
  },
  {
    id: 7,
    category: 'B',
    categoryLabel: 'Market / Alternatives',
    labelKo: '시장/고객 접근 경로',
    labelEn: 'market_channel',
    primaryGapId: 'marketChannel',
    factKeys: ['market'],
    taxonomyKey: 'market_channel',
  },
  {
    id: 8,
    category: 'B',
    categoryLabel: 'Market / Alternatives',
    labelKo: '기존 대안',
    labelEn: 'alternatives',
    primaryGapId: 'alternativesCompetitors',
    factKeys: ['competitor'],
    taxonomyKey: 'alternatives',
  },
  {
    id: 9,
    category: 'B',
    categoryLabel: 'Market / Alternatives',
    labelKo: '경쟁 서비스',
    labelEn: 'competitors',
    primaryGapId: 'alternativesCompetitors',
    factKeys: ['competitor'],
    taxonomyKey: 'competitors',
  },
  {
    id: 10,
    category: 'B',
    categoryLabel: 'Market / Alternatives',
    labelKo: '현재 문제 해결 방식',
    labelEn: 'current_solution',
    primaryGapId: 'alternativesCompetitors',
    factKeys: ['competitor'],
    taxonomyKey: 'current_solution',
  },
  {
    id: 11,
    category: 'B',
    categoryLabel: 'Market / Alternatives',
    labelKo: '기존 대안의 불만',
    labelEn: 'alternative_pain',
    primaryGapId: 'alternativesCompetitors',
    factKeys: ['competitor', 'problem'],
    taxonomyKey: 'alternative_pain',
  },
  {
    id: 12,
    category: 'B',
    categoryLabel: 'Market / Alternatives',
    labelKo: '차별성',
    labelEn: 'differentiation',
    primaryGapId: 'differentiationVsAlternatives',
    factKeys: ['differentiation', 'diffRelevance'],
    taxonomyKey: 'differentiation',
  },
  {
    id: 13,
    category: 'C',
    categoryLabel: 'Business Model',
    labelKo: '고객이 돈을 낼 이유',
    labelEn: 'value_for_payment',
    primaryGapId: 'revenueModel',
    factKeys: ['revenue', 'differentiation'],
    taxonomyKey: 'value_for_payment',
  },
  {
    id: 14,
    category: 'C',
    categoryLabel: 'Business Model',
    labelKo: '가격 / 지불의향',
    labelEn: 'pricing_wtp',
    primaryGapId: 'pricingHint',
    factKeys: ['revenue', 'buyer'],
    taxonomyKey: 'pricing_wtp',
  },
  {
    id: 15,
    category: 'C',
    categoryLabel: 'Business Model',
    labelKo: '수익모델',
    labelEn: 'revenue_model',
    primaryGapId: 'revenueModel',
    factKeys: ['revenue'],
    taxonomyKey: 'revenue_model',
  },
  {
    id: 16,
    category: 'C',
    categoryLabel: 'Business Model',
    labelKo: '반복 구매/사용 가능성',
    labelEn: 'retention_repeat',
    primaryGapId: 'revenueModel',
    factKeys: ['revenue'],
    taxonomyKey: 'retention_repeat',
  },
  {
    id: 17,
    category: 'C',
    categoryLabel: 'Business Model',
    labelKo: '고객 확보 방법',
    labelEn: 'acquisition',
    primaryGapId: 'marketChannel',
    factKeys: ['market'],
    taxonomyKey: 'acquisition',
  },
  {
    id: 18,
    category: 'C',
    categoryLabel: 'Business Model',
    labelKo: '고객 확보 비용/경제성 가정',
    labelEn: 'cac_economics',
    primaryGapId: 'marketChannel',
    factKeys: ['market', 'revenue'],
    taxonomyKey: 'cac_economics',
  },
  {
    id: 19,
    category: 'C',
    categoryLabel: 'Business Model',
    labelKo: '시장 진입 가능성',
    labelEn: 'market_entry',
    primaryGapId: 'marketChannel',
    factKeys: ['market'],
    taxonomyKey: 'market_entry',
  },
  {
    id: 20,
    category: 'D',
    categoryLabel: 'Validation',
    labelKo: '핵심 사업 가정',
    labelEn: 'key_assumptions',
    primaryGapId: 'validationTestability',
    factKeys: ['differentiation', 'problem'],
    taxonomyKey: 'key_assumptions',
  },
  {
    id: 21,
    category: 'D',
    categoryLabel: 'Validation',
    labelKo: '미검증 사실',
    labelEn: 'unvalidated_facts',
    primaryGapId: 'validationTestability',
    factKeys: ['differentiation'],
    taxonomyKey: 'unvalidated_facts',
  },
  {
    id: 22,
    category: 'D',
    categoryLabel: 'Validation',
    labelKo: '고객 검증',
    labelEn: 'customer_validation',
    primaryGapId: 'validationTestability',
    factKeys: ['customer'],
    taxonomyKey: 'customer_validation',
  },
  {
    id: 23,
    category: 'D',
    categoryLabel: 'Validation',
    labelKo: '시장 검증',
    labelEn: 'market_validation',
    primaryGapId: 'validationTestability',
    factKeys: ['market'],
    taxonomyKey: 'market_validation',
  },
  {
    id: 24,
    category: 'D',
    categoryLabel: 'Validation',
    labelKo: '지불 검증',
    labelEn: 'payment_validation',
    primaryGapId: 'pricingHint',
    factKeys: ['revenue', 'buyer'],
    taxonomyKey: 'payment_validation',
  },
  {
    id: 25,
    category: 'D',
    categoryLabel: 'Validation',
    labelKo: 'MVP / 실험 방법',
    labelEn: 'mvp_experiment',
    primaryGapId: 'validationTestability',
    factKeys: ['differentiation'],
    taxonomyKey: 'mvp_experiment',
  },
  {
    id: 26,
    category: 'D',
    categoryLabel: 'Validation',
    labelKo: '성공 판단 기준',
    labelEn: 'success_criteria',
    primaryGapId: 'validationTestability',
    factKeys: ['differentiation'],
    taxonomyKey: 'success_criteria',
  },
];

export function taxonomyItemByKey(key: string): BusinessJudgmentTaxonomyItem | undefined {
  return BUSINESS_JUDGMENT_TAXONOMY.find((t) => t.taxonomyKey === key);
}
