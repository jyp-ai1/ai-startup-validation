'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { DecisionVerdictBadge } from '@/features/decision/components/decision-verdict-badge';
import type { ExecutiveWorkspaceViewModel } from '../services/executive-types';

type ExecutiveHeroProps = {
  workspace: ExecutiveWorkspaceViewModel;
};

export function ExecutiveHero({ workspace }: ExecutiveHeroProps) {
  const t = useTranslations('executive');
  const te = useTranslations('enums');

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-muted/30 px-8 py-10 md:px-12 md:py-12">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            {t('hero.eyebrow')}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-tight">
            {workspace.project.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="rounded-full border border-border/60 bg-background/80 px-3 py-1">
              {te(`projectStatus.${workspace.stage}` as 'projectStatus.DRAFT')}
            </span>
            <span>
              {te(`projectTypeBadge.${workspace.projectType}` as 'projectTypeBadge.STARTUP')}
            </span>
            <span className="tabular-nums">
              {t('hero.confidence', { value: workspace.confidence })}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-4 lg:items-end">
          <DecisionVerdictBadge verdict={workspace.verdict} size="lg" />
          <Link
            href={`/projects/${workspace.project.id}/decision`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {t('hero.openDecisionCenter')}
          </Link>
        </div>
      </div>
    </section>
  );
}
