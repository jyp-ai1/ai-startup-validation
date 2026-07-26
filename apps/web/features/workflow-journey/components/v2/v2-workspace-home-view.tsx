'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';

import { Link } from '@/i18n/navigation';

import { useJourneyProject } from '../../hooks/use-journey-project';
import { V2WorkspaceCard } from './v2-workspace-card';
import { V2WorkspaceHomeHeader } from './v2-workspace-home-header';

export function V2WorkspaceHomeView() {
  const t = useTranslations('workflow.v2.home');
  const { allProjects, ready } = useJourneyProject();

  const activeProjects = useMemo(
    () => allProjects.filter((p) => p.status !== 'archived'),
    [allProjects],
  );

  const managingCount = activeProjects.length;

  return (
    <div className="min-h-screen bg-background">
      <V2WorkspaceHomeHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">LaunchLens</h1>
          <p className="text-sm text-muted-foreground">{t('lead')}</p>
        </div>

        <Link
          href="/who"
          className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/[0.04] px-4 py-4 text-sm font-medium text-primary transition-colors hover:bg-primary/[0.08]"
        >
          <Plus className="size-4" aria-hidden />
          {t('newProjectCta')}
        </Link>

        {ready && managingCount > 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">{t('kpi', { count: managingCount })}</p>
        ) : null}

        <div className="mt-4 space-y-3" role="list">
          {ready
            ? activeProjects.map((project) => (
                <div key={project.id} role="listitem">
                  <V2WorkspaceCard project={project} />
                </div>
              ))
            : null}
        </div>

        {ready && activeProjects.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">{t('emptyHint')}</p>
        ) : null}
      </main>
    </div>
  );
}
