'use client';

import { useState } from 'react';
import Link from 'next/link';
import { History, Pencil, Plus, FileText } from 'lucide-react';

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
import { ScoreProgressCircle } from './score-progress-circle';
import { ValidationDecisionBadge } from './validation-decision-badge';
import { ValidationScoreForm } from './validation-score-form';
import { ValidationScoreRadar } from './validation-score-radar';

type ValidationDashboardProps = {
  project: StartupProject;
  score: ValidationScore | null;
};

function ScoreCategoryCard({
  label,
  description,
  score,
  maxScore,
}: {
  label: string;
  description: string;
  score: number;
  maxScore: number;
}) {
  const percent = getScorePercentage(score, maxScore);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-end justify-between">
          <span className="text-2xl font-semibold">{score}</span>
          <span className="text-sm text-muted-foreground">/ {maxScore}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function ValidationDashboard({ project, score }: ValidationDashboardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const basePath = `/projects/${project.id}/validation`;

  if (!score) {
    return (
      <>
        <PageHeader
          title="Validation Score"
          description={`GO / NO GO evaluation for ${project.title}`}
        />
        <div className="mt-4">
          <Button variant="link" className="h-auto p-0" asChild>
            <Link href={`/projects/${project.id}`}>Back to project</Link>
          </Button>
        </div>
        <div className="mt-8">
          <EmptyState
            title="No validation score yet"
            description="Evaluate market, problem, competition, and execution to get a GO / NO GO recommendation."
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

  if (isEditing) {
    return (
      <>
        <PageHeader
          title="Edit Validation Score"
          description={project.title}
          actions={
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel Edit
            </Button>
          }
        />
        <div className="mt-8">
          <ValidationScoreForm mode="edit" projectId={project.id} score={score} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Validation Score"
        description={`GO / NO GO evaluation for ${project.title}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`${basePath}/history`}>
                <History className="size-4" />
                History
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`${basePath}/summary`}>
                <FileText className="size-4" />
                Summary
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`${basePath}/new`}>
                <Plus className="size-4" />
                New Evaluation
              </Link>
            </Button>
            <Button onClick={() => setIsEditing(true)}>
              <Pencil className="size-4" />
              Edit
            </Button>
          </div>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ValidationDecisionBadge decision={score.decision} />
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}`}>Back to project</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">
        <Card className="flex flex-col items-center justify-center p-6">
          <ScoreProgressCircle totalScore={score.totalScore} />
          <p className="mt-4 text-sm text-muted-foreground">Total Score</p>
        </Card>
        <Card className="p-4">
          <h3 className="mb-4 text-sm font-medium">Score Radar</h3>
          <ValidationScoreRadar score={score} />
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SCORE_CATEGORIES.map((category) => (
          <ScoreCategoryCard
            key={category.key}
            label={category.label}
            description={category.description}
            score={score[category.key]}
            maxScore={category.maxScore}
          />
        ))}
      </div>

      {score.comment ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Comment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {score.comment}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
