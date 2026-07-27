'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { cn } from '@repo/ui/lib/utils';

import { useJourneyProject } from '../../hooks/use-journey-project';
import { JourneyLayout } from '../journey-layout';

export function V2WorkspaceListView() {
  const t = useTranslations('workflow.v2.workspaces');
  const { allProjects, ready } = useJourneyProject();

  const activeProjects = allProjects.filter((p) => p.status !== 'archived');

  return (
    <JourneyLayout phase="workspace" width="wide" variant="intelligence" versionLabel="V2">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
          </div>
          <Link
            href="/validation"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t('newCta')}
          </Link>
        </div>
        {!ready ? null : (
          <ul className="space-y-3" role="list">
            {activeProjects.map((workspace) => (
              <li key={workspace.id}>
                <Link
                  href="/validation"
                  onClick={() => sessionStorage.setItem('ll_journey_project_id', workspace.id)}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-primary/30"
                >
                  <div>
                    <p className="text-lg font-semibold">{workspace.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {workspace.updatedAt
                        ? t('updates', { count: 1 })
                        : t('noUpdates')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold tabular-nums">{workspace.confidence}%</p>
                      <p
                        className={cn(
                          'text-xs font-semibold uppercase',
                          workspace.verdict === 'GO'
                            ? 'text-emerald-600'
                            : 'text-amber-600',
                        )}
                      >
                        {workspace.verdict}
                      </p>
                    </div>
                    <ArrowRight
                      className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="text-center text-sm text-muted-foreground">{t('nextHint')}</p>
      </div>
    </JourneyLayout>
  );
}
