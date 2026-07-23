'use client';

import Link from 'next/link';
import { Clock, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { ConsultantViewModel } from '@/features/ai-consultant';
import type { ValidationDecision } from '@repo/types/validation';
import { ValidationDecisionBadge } from '@/features/validation/components/validation-decision-badge';
import { Button } from '@repo/ui';
import { formatRelativeTime } from '@repo/utils/date';
import type { StartupProject } from '@repo/types/validation';

type WorkspaceHeaderProps = {
  project: StartupProject;
  consultant: ConsultantViewModel | null;
  goProbability?: number;
  decision?: ValidationDecision | null;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
};

function projectTypeLabel(type: StartupProject['projectType']): string {
  return type.replace(/_/g, ' ');
}

export function WorkspaceHeader({
  project,
  consultant,
  goProbability,
  decision,
  isFavorite = false,
  onToggleFavorite,
}: WorkspaceHeaderProps) {
  const t = useTranslations('polish.header');
  const tw = useTranslations('workspace.home');
  const go = goProbability ?? consultant?.goProbability;

  return (
    <header className="ll-consulting-card space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {project.industry ? (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {project.industry}
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t('industryUnknown')}
              </span>
            )}
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              {projectTypeLabel(project.projectType)}
            </span>
            {project.projectGoal ? (
              <span className="rounded-full border border-border/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {project.projectGoal.replace(/_/g, ' ')}
              </span>
            ) : null}
          </div>
          <div className="flex items-start gap-2">
            <h1 className="min-w-0 text-intelligence-section font-semibold tracking-tight">{project.title}</h1>
            {onToggleFavorite ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                onClick={onToggleFavorite}
                aria-label={isFavorite ? t('unfavorite') : t('favorite')}
              >
                <Star className={isFavorite ? 'size-4 fill-amber-400 text-amber-400' : 'size-4'} />
              </Button>
            ) : null}
          </div>
          {project.summary ? (
            <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{project.summary}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {go !== undefined ? (
            <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-2 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{t('goLabel')}</p>
              <p className="text-2xl font-bold tabular-nums text-primary">{go}%</p>
            </div>
          ) : null}
          {decision && decision !== 'DRAFT' ? (
            <ValidationDecisionBadge decision={decision} />
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-[13px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" />
          {tw('hero.updated')} {formatRelativeTime(new Date(project.updatedAt))}
        </span>
        <Button variant="link" className="h-auto p-0 text-[13px]" asChild>
          <Link href="/dashboard">{tw('hero.openDashboard')}</Link>
        </Button>
      </div>
    </header>
  );
}
