import type {
  DocumentCitation,
  DocumentProfile,
  EvidenceMetadata,
  ReasonChainContext,
  ContextualResource,
} from './v2-reason-chain-types';
import type { SmartIntakeAnalysis, SmartIntakeImportSource, SmartIntakePricingChoice } from './v2-smart-intake-types';

export const SAMPLE_EVIDENCE_MARKET: EvidenceMetadata[] = [
  { id: 'googleTrends', badge: 'data' },
  { id: 'searchVolume', badge: 'search' },
  { id: 'productHunt', badge: 'startup' },
  { id: 'yc', badge: 'startup' },
];

export const SMART_INTAKE_EVIDENCE: EvidenceMetadata[] = [
  { id: 'googleTrends', badge: 'data' },
  { id: 'searchVolume', badge: 'search' },
  { id: 'productHunt', badge: 'startup' },
  { id: 'yc', badge: 'startup' },
];

export const EVIDENCE_SOURCE_IDS = [
  'googleTrends',
  'cursor',
  'lovable',
  'productHunt',
  'reddit',
  'yc',
] as const;

export const EVIDENCE_SOURCE_BADGES: Record<(typeof EVIDENCE_SOURCE_IDS)[number], EvidenceMetadata['badge']> = {
  googleTrends: 'data',
  cursor: 'competitor',
  lovable: 'competitor',
  productHunt: 'startup',
  reddit: 'community',
  yc: 'startup',
};

export function buildDocumentProfile(fileName: string): DocumentProfile {
  const base = fileName.replace(/\.[^.]+$/, '') || '사업계획서';
  return {
    fileName: base,
    pageCount: 18,
    strategyCount: 12,
    bmCount: 4,
    kpiCount: 8,
    riskCount: 3,
  };
}

export function buildPricingGapCitations(): DocumentCitation[] {
  return [
    {
      id: 'pricing-missing',
      page: 13,
      section: '가격 모델',
      quote: '미기재',
      findingKey: 'pricingMissing',
    },
    {
      id: 'bm-vague',
      page: 15,
      section: 'B2B 수익모델 검증',
      quote: 'B2B 수익모델 검증 · 유료 전환 가능성 검증',
      findingKey: 'bmVague',
    },
    {
      id: 'market-strategy',
      page: 15,
      section: 'MAU 확보 전략',
      quote: '검색 유입 · MAU 확보 전략',
      findingKey: 'marketStrategy',
    },
  ];
}

export function buildSmartIntakeReasonChain(
  analysis: SmartIntakeAnalysis,
  source: SmartIntakeImportSource,
  fileName?: string,
): ReasonChainContext {
  const documentProfile =
    source === 'pdf' && fileName ? buildDocumentProfile(fileName) : null;
  const citations = analysis.missing.includes('pricing') ? buildPricingGapCitations() : [];

  const resources: ContextualResource[] = [
    { id: 'businessPlanGuide' },
    { id: 'governmentSupport' },
    { id: 'marketReport' },
  ];

  return {
    serviceName: analysis.serviceName,
    targetUserKey: 'targetUsers',
    documentProfile,
    citations,
    evidence: SMART_INTAKE_EVIDENCE,
    chainSteps: [
      'documentAnalyzed',
      'reviewFocus',
      'evidenceTrends',
      'thereforeMarket',
      'butGap',
      'thereforePricing',
      'thereforeImprovement',
    ],
    resources,
    pricingGapCitationId: 'pricing-missing',
  };
}

export function getChainStepsUpTo(
  ctx: ReasonChainContext,
  stepId: ReasonChainContext['chainSteps'][number],
): ReasonChainContext['chainSteps'] {
  const index = ctx.chainSteps.indexOf(stepId);
  if (index < 0) return ctx.chainSteps;
  return ctx.chainSteps.slice(0, index + 1);
}

export const SAMPLE_REASON_CHAIN_STEPS: ReasonChainContext['chainSteps'] = [
  'reviewFocus',
  'evidenceTrends',
  'thereforeMarket',
  'butGap',
  'thereforePricing',
  'thereforeImprovement',
];
