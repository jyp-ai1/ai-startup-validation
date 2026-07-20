'use client';

import { useState } from 'react';
import Link from 'next/link';
import { History, Pencil, Plus, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConsultingEmptyState } from '@/components/consulting/consulting-empty-state';
import { IntelligencePage } from '@/components/intelligence';
import { buildValidationInsights } from '@/lib/intelligence/build-feature-insights';
import type { StartupProject, ValidationScore } from '@repo/types/validation';
import { Button } from '@repo/ui';

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

export function ValidationDashboard({ project, score }: ValidationDashboardProps) {
  const t = useTranslations();
  const [isEditing, setIsEditing] = useState(false);
  const basePath = `/projects/${project.id}/validation`;
  const insight = buildValidationInsights(score);

  if (isEditing && score) {
    return (
      <>
        <header className="mb-8 border-b border-border/40 pb-8">
          <h1 className="text-intelligence-section font-semibold">{t('validation.editTitle')}</h1>
          <Button variant="outline" className="mt-4" onClick={() => setIsEditing(false)}>
            {t('common.cancel')}
          </Button>
        </header>
        <ValidationScoreForm mode="edit" projectId={project.id} score={score} />
      </>
    );
  }

  if (!score) {
    return (
      <IntelligencePage
        eyebrow={t('meta.appName')}
        title={t('validation.title')}
        description={t('validation.description', { project: project.title })}
        insight={insight}
        emptyState={
          <ConsultingEmptyState
            title={t('validation.emptyTitle')}
            description={t('validation.description', { project: project.title })}
            primaryLabel={t('validation.createScore')}
            primaryHref={`${basePath}/new`}
          />
        }
      />
    );
  }

  return (
    <IntelligencePage
      eyebrow={t('meta.appName')}
      title={t('validation.title')}
      description={t('validation.description', { project: project.title })}
      insight={insight}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`${basePath}/history`}>
              <History className="size-4" />
              {t('validation.history')}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`${basePath}/summary`}>
              <FileText className="size-4" />
              {t('validation.summary')}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`${basePath}/new`}>
              <Plus className="size-4" />
              {t('validation.newEvaluation')}
            </Link>
          </Button>
          <Button onClick={() => setIsEditing(true)}>
            <Pencil className="size-4" />
            {t('common.edit')}
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="ll-consulting-card flex flex-col items-center justify-center p-10">
          <ScoreProgressCircle totalScore={score.totalScore} />
          <ValidationDecisionBadge decision={score.decision} />
        </div>
        <div className="ll-consulting-card p-10">
          <ValidationScoreRadar score={score} />
        </div>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {SCORE_CATEGORIES.map((category) => {
          const value = score[category.key];
          const percent = getScorePercentage(value, category.maxScore);
          return (
            <div key={category.key} className="ll-consulting-card p-8">
              <p className="font-medium">{category.label}</p>
              <div className="mt-4 flex items-end justify-between">
                <span className="text-3xl font-semibold tabular-nums">{value}</span>
                <span className="text-muted-foreground">/ {category.maxScore}</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-consulting-accent" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {score.comment ? (
        <div className="ll-consulting-card mt-6 p-8">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('validation.comment')}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{score.comment}</p>
        </div>
      ) : null}
    </IntelligencePage>
  );
}
