import type {
  DecisionInput,
  DecisionProvider,
  DecisionReason,
  DecisionResult,
  MissingEvidenceItem,
  OpportunityItem,
  RecommendedAction,
  RiskMatrixItem,
} from '../decision-types';
import { buildDecisionExplanation } from '../decision-explainer';
import {
  calculateDataCompleteness,
  calculateDecisionScores,
  resolveVerdict,
} from '../decision-score';

function buildMissingEvidence(input: DecisionInput): MissingEvidenceItem[] {
  const projectId = input.projectId;
  return [
    {
      id: 'voc',
      labelKey: 'missing.vocInterviews',
      completed: input.voc.total >= 10,
      href: `/projects/${projectId}/voc`,
    },
    {
      id: 'market-size',
      labelKey: 'missing.marketSize',
      completed: input.research.total >= 3 && input.research.progressPercent >= 50,
      href: `/projects/${projectId}/research`,
    },
    {
      id: 'competitor-pricing',
      labelKey: 'missing.competitorPricing',
      completed: input.competitors.total >= 2,
      href: `/projects/${projectId}/competitors`,
    },
    {
      id: 'government',
      labelKey: 'missing.governmentReview',
      completed: input.grants.total >= 1,
      href: `/projects/${projectId}/grants`,
    },
    {
      id: 'evidence',
      labelKey: 'missing.highConfidenceEvidence',
      completed: input.evidence.highConfidence >= 5,
      href: `/projects/${projectId}/evidence`,
    },
    {
      id: 'validation',
      labelKey: 'missing.validationScore',
      completed:
        input.validationScore !== null && input.validationScore.decision !== 'DRAFT',
      href: `/projects/${projectId}/validation`,
    },
  ];
}

function buildRecommendedActions(
  input: DecisionInput,
  missing: MissingEvidenceItem[],
): RecommendedAction[] {
  const pending = missing.filter((m) => !m.completed);
  const projectId = input.projectId;

  const catalog: Omit<RecommendedAction, 'priority'>[] = [
    {
      id: 'voc-10',
      labelKey: 'actions.voc10.label',
      descriptionKey: 'actions.voc10.desc',
      scoreImpact: 8,
      estimatedDays: 2,
      effectKey: 'actions.voc10.effect',
      href: `/projects/${projectId}/voc/new`,
    },
    {
      id: 'evidence-high',
      labelKey: 'actions.evidenceHigh.label',
      descriptionKey: 'actions.evidenceHigh.desc',
      scoreImpact: 10,
      estimatedDays: 3,
      effectKey: 'actions.evidenceHigh.effect',
      href: `/projects/${projectId}/evidence/new`,
    },
    {
      id: 'competitor-matrix',
      labelKey: 'actions.competitorMatrix.label',
      descriptionKey: 'actions.competitorMatrix.desc',
      scoreImpact: 6,
      estimatedDays: 1,
      effectKey: 'actions.competitorMatrix.effect',
      href: `/projects/${projectId}/competitors/compare`,
    },
    {
      id: 'grant-fit',
      labelKey: 'actions.grantFit.label',
      descriptionKey: 'actions.grantFit.desc',
      scoreImpact: 5,
      estimatedDays: 2,
      effectKey: 'actions.grantFit.effect',
      href: `/projects/${projectId}/grants`,
    },
    {
      id: 'validation-run',
      labelKey: 'actions.validationRun.label',
      descriptionKey: 'actions.validationRun.desc',
      scoreImpact: 12,
      estimatedDays: 1,
      effectKey: 'actions.validationRun.effect',
      href: `/projects/${projectId}/validation/new`,
    },
  ];

  const relevant = catalog.filter((action) => {
    if (action.id === 'voc-10' && input.voc.total >= 10) return false;
    if (action.id === 'evidence-high' && input.evidence.highConfidence >= 5) return false;
    if (action.id === 'competitor-matrix' && input.competitors.total >= 3) return false;
    if (action.id === 'grant-fit' && input.grants.total >= 2) return false;
    if (
      action.id === 'validation-run' &&
      input.validationScore &&
      input.validationScore.decision !== 'DRAFT'
    ) {
      return false;
    }
    return true;
  });

  if (relevant.length === 0 && pending.length > 0) {
    const first = pending[0]!;
    return [
      {
        id: `missing-${first.id}`,
        priority: 1,
        labelKey: first.labelKey,
        descriptionKey: 'actions.generic.desc',
        scoreImpact: 6,
        estimatedDays: 2,
        effectKey: 'actions.generic.effect',
        href: first.href,
      },
    ];
  }

  return relevant.slice(0, 3).map((action, index) => ({
    ...action,
    priority: (index + 1) as 1 | 2 | 3,
  }));
}

function buildRisks(input: DecisionInput, verdict: DecisionResult['verdict']): RiskMatrixItem[] {
  const risks: RiskMatrixItem[] = [];

  if (input.competitors.total >= 4) {
    risks.push({
      id: 'competition',
      riskKey: 'risks.competitionIntensity',
      severity: 'HIGH',
      probability: 'HIGH',
      impact: 'HIGH',
      mitigationKey: 'risks.competitionMitigation',
    });
  } else if (input.competitors.total === 0) {
    risks.push({
      id: 'competition-blind',
      riskKey: 'risks.competitionBlindSpot',
      severity: 'MEDIUM',
      probability: 'HIGH',
      impact: 'MEDIUM',
      mitigationKey: 'risks.competitionBlindMitigation',
    });
  }

  if (input.voc.total < 10) {
    risks.push({
      id: 'voc-gap',
      riskKey: 'risks.vocGap',
      severity: verdict === 'GO' ? 'MEDIUM' : 'HIGH',
      probability: 'HIGH',
      impact: verdict === 'GO' ? 'MEDIUM' : 'HIGH',
      mitigationKey: 'risks.vocMitigation',
    });
  }

  if (input.evidence.highConfidence < 5) {
    risks.push({
      id: 'evidence-weak',
      riskKey: 'risks.weakEvidence',
      severity: 'MEDIUM',
      probability: 'MEDIUM',
      impact: 'MEDIUM',
      mitigationKey: 'risks.evidenceMitigation',
    });
  }

  if (input.grants.total === 0) {
    risks.push({
      id: 'funding-path',
      riskKey: 'risks.fundingPath',
      severity: 'LOW',
      probability: 'MEDIUM',
      impact: 'LOW',
      mitigationKey: 'risks.fundingMitigation',
    });
  }

  return risks.slice(0, 4);
}

function buildOpportunities(input: DecisionInput): OpportunityItem[] {
  const items: OpportunityItem[] = [];

  if (input.research.progressPercent >= 50) {
    items.push({
      id: 'market',
      category: 'MARKET',
      titleKey: 'opportunities.market.title',
      descriptionKey: 'opportunities.market.desc',
    });
  }

  if (input.grants.total > 0) {
    items.push({
      id: 'grant',
      category: 'GRANT',
      titleKey: 'opportunities.grant.title',
      descriptionKey: 'opportunities.grant.desc',
    });
  }

  if (input.voc.total >= 5) {
    items.push({
      id: 'growth',
      category: 'GROWTH',
      titleKey: 'opportunities.growth.title',
      descriptionKey: 'opportunities.growth.desc',
    });
  }

  if (input.evidence.highConfidence >= 3) {
    items.push({
      id: 'tech',
      category: 'TECHNOLOGY',
      titleKey: 'opportunities.tech.title',
      descriptionKey: 'opportunities.tech.desc',
    });
  }

  if (input.projectType === 'AI_INITIATIVE' || input.evidence.highConfidence >= 2) {
    items.push({
      id: 'ai',
      category: 'AI',
      titleKey: 'opportunities.ai.title',
      descriptionKey: 'opportunities.ai.desc',
    });
  }

  return items.slice(0, 5);
}

function projectTypeSummaryPrefix(projectType: DecisionInput['projectType']): string {
  switch (projectType) {
    case 'STARTUP':
      return 'summary.startup';
    case 'BUSINESS_STRATEGY':
      return 'summary.businessStrategy';
    case 'AI_INITIATIVE':
      return 'summary.aiInitiative';
    case 'DIGITAL_TRANSFORMATION':
      return 'summary.dx';
    case 'NEW_BUSINESS':
      return 'summary.newBusiness';
    case 'MARKET_EXPANSION':
      return 'summary.marketExpansion';
    default:
      return 'summary.default';
  }
}

export class MockDecisionProvider implements DecisionProvider {
  readonly id = 'mock' as const;

  async generate(input: DecisionInput): Promise<DecisionResult> {
    const scores = calculateDecisionScores(input);
    const completeness = calculateDataCompleteness(input);
    const verdict = resolveVerdict(scores, completeness);
    const missingEvidence = buildMissingEvidence(input);
    const recommendedActions = buildRecommendedActions(input, missingEvidence);
    const risks = buildRisks(input, verdict);
    const opportunities = buildOpportunities(input);

    const typePrefix = projectTypeSummaryPrefix(input.projectType);

    const executiveSummaryKeys =
      completeness < 0.35
        ? [
            'executive.insufficient1',
            'executive.insufficient2',
            'executive.insufficient3',
          ]
        : verdict === 'GO'
          ? [
              `${typePrefix}.go1`,
              'executive.go2',
              'executive.go3',
            ]
          : verdict === 'NO_GO'
            ? [
                `${typePrefix}.noGo1`,
                'executive.noGo2',
                'executive.noGo3',
              ]
            : [
                `${typePrefix}.hold1`,
                'executive.hold2',
                'executive.hold3',
              ];

    const reasons: DecisionReason[] =
      verdict === 'GO'
        ? [
            { id: 'r1', textKey: 'reasons.go.market', params: { score: scores.decisionScore } },
            { id: 'r2', textKey: 'reasons.go.evidence' },
            { id: 'r3', textKey: 'reasons.go.execution', params: { score: scores.executionReadiness } },
          ]
        : verdict === 'NO_GO'
          ? [
              { id: 'r1', textKey: 'reasons.noGo.market' },
              { id: 'r2', textKey: 'reasons.noGo.competition' },
              { id: 'r3', textKey: 'reasons.noGo.evidence' },
            ]
          : [
              { id: 'r1', textKey: 'reasons.hold.voc', params: { count: input.voc.total } },
              { id: 'r2', textKey: 'reasons.hold.competition' },
              { id: 'r3', textKey: 'reasons.hold.data', params: { percent: Math.round(completeness * 100) } },
            ];

    const explanation = buildDecisionExplanation(input, scores, verdict, missingEvidence);

    return {
      verdict,
      scores,
      executiveSummaryKeys,
      reasons,
      missingEvidence,
      recommendedActions,
      risks,
      opportunities,
      explanation,
      frameworkAnalysis: input.frameworkAnalysis ?? null,
      marketAnalysis: input.marketAnalysis ?? null,
      generatedAt: new Date().toISOString(),
      providerId: 'mock',
      projectType: input.projectType,
      locale: input.locale,
    };
  }
}
