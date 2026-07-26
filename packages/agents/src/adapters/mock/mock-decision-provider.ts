import type { DecisionInput, DecisionOutput } from '../../types/contracts';
import type { DecisionProviderPort } from '../../ports';

export class MockDecisionProvider implements DecisionProviderPort {
  readonly id = 'mock' as const;

  async decide(input: DecisionInput): Promise<DecisionOutput> {
    const { project: context, research, strategy, plan } = input;
    const customerConf =
      research.findings.find((f) => f.domain === 'customer')?.confidence ?? 50;
    const pricingConf =
      research.findings.find((f) => f.domain === 'pricing')?.confidence ?? 50;
    const overall = research.overallConfidence;

    let verdict: DecisionOutput['verdict'] = 'HOLD';
    if (overall >= 75 && customerConf >= 65) verdict = 'GO';
    else if (overall < 45 || strategy.swot.threats.length > 4) verdict = 'NO_GO';
    else if (pricingConf < 55 && customerConf < 60) verdict = 'PIVOT';

    const missingData: string[] = [];
    if (customerConf < 65) missingData.push('Customer interviews (VOC 3+)');
    if (pricingConf < 60) missingData.push('Pricing validation interviews');
    if (research.findings.find((f) => f.domain === 'competitor')!.confidence < 70) {
      missingData.push('Competitor differentiation evidence');
    }
    for (const domain of plan.missingDomains) {
      const label = `${domain} evidence (planner priority)`;
      if (!missingData.some((m) => m.toLowerCase().includes(domain))) {
        missingData.push(label);
      }
    }

    const confidence = Math.round((overall + customerConf) / 2);
    const topGap = missingData[0] ?? 'Execution consistency';
    const gapSeverity = Math.max(0, 100 - customerConf);
    const goLift = verdict === 'GO' ? 8 : 22;

    const nextTitle =
      verdict === 'GO'
        ? 'Start MVP execution workflow'
        : topGap.includes('VOC')
          ? 'Complete 3 customer interviews'
          : 'Run pricing validation interviews';

    return {
      verdict,
      confidence,
      reasons:
        verdict === 'GO'
          ? [
              'Market and trend signals support timing',
              'Strategy differentiation is articulable',
              'Execution readiness path is clear',
            ]
          : verdict === 'PIVOT'
            ? [
                'Core idea viable but ICP or pricing hypothesis weak',
                'Recommend narrow ICP + pricing interviews before scale',
              ]
            : verdict === 'NO_GO'
              ? [
                  'Insufficient evidence across customer and market domains',
                  'Risk outweighs near-term opportunity',
                ]
              : [
                  `Customer validation at ${customerConf}% — below GO threshold`,
                  plan.rationale,
                  `${context.projectTitle}: HOLD with clear path to GO`,
                ],
      missingData,
      risks: strategy.risks,
      tradeoffs: [
        { dimension: 'Speed vs Evidence', choice: 'VOC sprint this week before GO' },
        {
          dimension: 'Scope vs Focus',
          choice: verdict === 'PIVOT' ? 'Narrow ICP' : 'Keep current goal',
        },
      ],
      nextAction: {
        title: nextTitle,
        etaMinutes: verdict === 'GO' ? 30 : 45,
        confidenceGain: verdict === 'GO' ? 8 : 13,
        goProbabilityGain: goLift,
        priority: 'P0',
      },
      intelligence: {
        why:
          verdict === 'GO'
            ? 'Evidence sufficient — speed is now the variable'
            : `Top gap: ${topGap} blocks GO at ${confidence}% confidence`,
        gap: topGap,
        gapSeverity,
        how:
          plan.missingDomains.includes('customer')
            ? '5 pricing validation interviews with prepared question set'
            : `Strengthen ${plan.missingDomains[0] ?? 'market'} evidence this week`,
        etaMinutes: verdict === 'GO' ? 30 : 45,
        expectedEffect: `Confidence +${verdict === 'GO' ? 8 : 13}% after completion`,
        goLift,
        nextActionTitle: nextTitle,
      },
      completedAt: new Date().toISOString(),
      providerId: this.id,
    };
  }
}

export const mockDecisionProvider = new MockDecisionProvider();
