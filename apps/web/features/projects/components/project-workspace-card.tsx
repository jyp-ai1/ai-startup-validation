'use client';

import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { ProjectOverviewCard } from '@/features/dashboard/services/dashboard-service';
import { getDecisionTone } from '@/features/dashboard/types';
import { ProjectStatusBadge } from '@/features/projects/components/project-status-badge';
import { ProjectTypeBadge } from '@/features/projects/components/project-type-badge';
import { VALIDATION_DECISION_LABELS } from '@/features/validation/utils/score-calculator';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';
import { formatRelativeTime } from '@repo/utils/date';

type ProjectWorkspaceCardProps = {
  overview: ProjectOverviewCard;
};

export function ProjectWorkspaceCard({ overview }: ProjectWorkspaceCardProps) {
  const t = useTranslations();
  const { project, validationScore, researchProgress, evidenceCount, vocCount, competitorCount } =
    overview;
  const score = validationScore?.totalScore ?? null;
  const decision = validationScore?.decision ?? null;
  const stars = score === null ? 0 : Math.min(5, Math.max(1, Math.round(score / 20)));

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-all hover:border-primary/25 hover:shadow-md">
      <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.04] to-transparent px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/projects/${project.id}`}
              className="truncate text-lg font-semibold tracking-tight hover:text-primary"
            >
              {project.title}
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ProjectTypeBadge projectType={project.projectType} />
              <ProjectStatusBadge status={project.status} />
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(new Date(project.updatedAt))}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className={cn('text-xl font-bold', getDecisionTone(decision))}>
              {decision ? VALIDATION_DECISION_LABELS[decision] : '—'}
            </p>
            <p className="text-2xl font-semibold tabular-nums">{score ?? '—'}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                'size-3.5',
                i < stars ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/25',
              )}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3 px-5 py-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('workspace.projectCard.research')}</span>
            <span>{researchProgress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${researchProgress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <Metric label={t('workspace.projectCard.evidence')} value={evidenceCount} />
          <Metric label={t('workspace.projectCard.voc')} value={vocCount} />
          <Metric label={t('workspace.projectCard.competitors')} value={competitorCount} />
        </div>
      </div>

      <div className="mt-auto border-t border-border/60 px-5 py-3">
        <Button className="w-full" asChild>
          <Link href={`/projects/${project.id}`}>
            {t('workspace.projectCard.openWorkspace')}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/15 px-2 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
