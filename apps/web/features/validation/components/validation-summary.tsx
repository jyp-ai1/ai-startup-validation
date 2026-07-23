import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { StartupProject, ValidationScore } from '@repo/types/validation';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
} from '@repo/ui';

import {
  SCORE_CATEGORIES,
  getScorePercentage,
} from '../utils/score-calculator';
import { ValidationDecisionBadge } from './validation-decision-badge';

type ValidationSummaryProps = {
  project: StartupProject;
  score: ValidationScore | null;
};

function buildInsights(score: ValidationScore) {
  const ranked = SCORE_CATEGORIES.map((category) => ({
    label: category.label,
    description: category.description,
    score: score[category.key],
    maxScore: category.maxScore,
    percent: getScorePercentage(score[category.key], category.maxScore),
  })).sort((a, b) => b.percent - a.percent);

  return {
    strengths: ranked.filter((item) => item.percent >= 70).slice(0, 3),
    risks: [...ranked].reverse().filter((item) => item.percent < 70).slice(0, 3),
  };
}

export async function ValidationSummary({ project, score }: ValidationSummaryProps) {
  const t = await getTranslations('validation');
  const tPages = await getTranslations('pages');
  const tNav = await getTranslations('common.navLinks');
  const basePath = `/projects/${project.id}/validation`;

  if (!score) {
    return (
      <>
        <PageHeader title={tPages('validationSummary')} description={project.title} />
        <div className="mt-8">
          <EmptyState
            title={t('summaryEmptyTitle')}
            description={t('summaryEmptyDesc')}
            action={
              <Button asChild>
                <Link href={`${basePath}/new`}>{tPages('newValidation')}</Link>
              </Button>
            }
          />
        </div>
      </>
    );
  }

  const { strengths, risks } = buildInsights(score);

  return (
    <>
      <PageHeader
        title={tPages('validationSummary')}
        description={project.title}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ValidationDecisionBadge decision={score.decision} />
        <span className="text-sm text-muted-foreground">
          {t('totalScoreLabel', { score: score.totalScore })}
        </span>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={basePath}>{tNav('backToValidation')}</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-green-600 dark:text-green-400">
              {t('summaryStrength')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {strengths.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noStrengths')}</p>
            ) : (
              strengths.map((item) => (
                <div key={item.label}>
                  <p className="font-medium">
                    {item.label}{' '}
                    <span className="text-muted-foreground">
                      ({item.score}/{item.maxScore})
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive">{t('summaryRisk')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {risks.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('allPerformingWell')}</p>
            ) : (
              risks.map((item) => (
                <div key={item.label}>
                  <p className="font-medium">
                    {item.label}{' '}
                    <span className="text-muted-foreground">
                      ({item.score}/{item.maxScore})
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{t('recommendationTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">
            {score.comment?.trim() ? score.comment : t('addCommentHint')}
          </p>
        </CardContent>
      </Card>
    </>
  );
}
