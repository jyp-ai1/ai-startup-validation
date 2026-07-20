import type { ProjectDashboardStats } from '../types';

export type ExpertRole = 'vc' | 'pm' | 'cto' | 'marketing';

export type ExpertOpinion = {
  role: ExpertRole;
  labelKey: string;
  opinionKey: string;
  sentiment: 'positive' | 'neutral' | 'negative';
};

export function buildExpertOpinions(stats: ProjectDashboardStats): ExpertOpinion[] {
  const { validationScore, evidence, voc, competitors, research } = stats;
  const score = validationScore;

  const vcSentiment =
    score && score.marketScore >= 14 && score.businessModelScore >= 10
      ? 'positive'
      : score && score.marketScore >= 10
        ? 'neutral'
        : 'negative';

  const pmSentiment =
    score && score.problemScore >= 14 && voc.total >= 10
      ? 'positive'
      : voc.total >= 5
        ? 'neutral'
        : 'negative';

  const ctoSentiment =
    score && score.executionScore >= 10 && evidence.byConfidence.HIGH >= 5
      ? 'positive'
      : evidence.total >= 5
        ? 'neutral'
        : 'negative';

  const marketingSentiment =
    score && score.competitionScore >= 10 && competitors.total >= 2
      ? 'positive'
      : competitors.total >= 1
        ? 'neutral'
        : 'negative';

  const vcKey =
    vcSentiment === 'positive'
      ? 'intelligence.expert.vc.positive'
      : vcSentiment === 'neutral'
        ? 'intelligence.expert.vc.neutral'
        : 'intelligence.expert.vc.negative';

  const pmKey =
    pmSentiment === 'positive'
      ? 'intelligence.expert.pm.positive'
      : pmSentiment === 'neutral'
        ? 'intelligence.expert.pm.neutral'
        : 'intelligence.expert.pm.negative';

  const ctoKey =
    ctoSentiment === 'positive'
      ? 'intelligence.expert.cto.positive'
      : ctoSentiment === 'neutral'
        ? 'intelligence.expert.cto.neutral'
        : 'intelligence.expert.cto.negative';

  const marketingKey =
    marketingSentiment === 'positive'
      ? 'intelligence.expert.marketing.positive'
      : marketingSentiment === 'neutral'
        ? 'intelligence.expert.marketing.neutral'
        : 'intelligence.expert.marketing.negative';

  if (!score && research.progressPercent < 30) {
    return [
      { role: 'vc', labelKey: 'intelligence.expert.vc.label', opinionKey: 'intelligence.expert.insufficient', sentiment: 'neutral' },
      { role: 'pm', labelKey: 'intelligence.expert.pm.label', opinionKey: 'intelligence.expert.insufficient', sentiment: 'neutral' },
      { role: 'cto', labelKey: 'intelligence.expert.cto.label', opinionKey: 'intelligence.expert.insufficient', sentiment: 'neutral' },
      { role: 'marketing', labelKey: 'intelligence.expert.marketing.label', opinionKey: 'intelligence.expert.insufficient', sentiment: 'neutral' },
    ];
  }

  return [
    { role: 'vc', labelKey: 'intelligence.expert.vc.label', opinionKey: vcKey, sentiment: vcSentiment },
    { role: 'pm', labelKey: 'intelligence.expert.pm.label', opinionKey: pmKey, sentiment: pmSentiment },
    { role: 'cto', labelKey: 'intelligence.expert.cto.label', opinionKey: ctoKey, sentiment: ctoSentiment },
    { role: 'marketing', labelKey: 'intelligence.expert.marketing.label', opinionKey: marketingKey, sentiment: marketingSentiment },
  ];
}
