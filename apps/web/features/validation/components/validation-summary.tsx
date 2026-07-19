import Link from 'next/link';

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

export function ValidationSummary({ project, score }: ValidationSummaryProps) {
  const basePath = `/projects/${project.id}/validation`;

  if (!score) {
    return (
      <>
        <PageHeader title="Validation Summary" description={project.title} />
        <div className="mt-8">
          <EmptyState
            title="No validation data"
            description="Create a validation score first to generate a summary report."
            action={
              <Button asChild>
                <Link href={`${basePath}/new`}>Create Validation Score</Link>
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
        title="Validation Report Summary"
        description={project.title}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ValidationDecisionBadge decision={score.decision} />
        <span className="text-sm text-muted-foreground">
          Total Score: {score.totalScore} / 100
        </span>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={basePath}>Back to dashboard</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-green-600 dark:text-green-400">
              Strength
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {strengths.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No category scored above 70% yet.
              </p>
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
            <CardTitle className="text-base text-destructive">Risk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {risks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All categories are performing well.
              </p>
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
          <CardTitle className="text-base">Recommendation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">
            {score.comment?.trim()
              ? score.comment
              : 'Add a comment in your validation score to capture recommendations.'}
          </p>
        </CardContent>
      </Card>
    </>
  );
}
