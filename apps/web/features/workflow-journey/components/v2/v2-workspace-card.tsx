'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { cn } from '@repo/ui/lib/utils';

import {
  enrichProjectForHome,
  getHomeDisplayName,
  getLifecycleDot,
  type V2WorkspaceCardData,
} from '../../lib/v2-workspace-home';
import type { MockProject } from '@/features/project-intelligence/constants/mock-projects';

type V2WorkspaceCardProps = {
  project: MockProject;
  onSelect?: (projectId: string) => void;
};

export function V2WorkspaceCard({ project, onSelect }: V2WorkspaceCardProps) {
  const t = useTranslations('workflow.v2.home');
  const [changesOpen, setChangesOpen] = useState(false);
  const card = enrichProjectForHome(project);
  const displayName = getHomeDisplayName(project);

  return (
    <article className="rounded-2xl border border-border/70 bg-card transition-colors hover:border-primary/30">
      <Link
        href="/validation"
        onClick={() => {
          sessionStorage.setItem('ll_journey_project_id', project.id);
          onSelect?.(project.id);
        }}
        className="block p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span aria-hidden>{getLifecycleDot(card.lifecycle)}</span>
              <h2 className="truncate text-lg font-semibold">{displayName}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span
                className={cn(
                  'font-semibold uppercase',
                  project.verdict === 'GO' ? 'text-emerald-600' : 'text-amber-600',
                )}
              >
                {project.verdict}
              </span>
              <span className="text-muted-foreground">{t('viabilityLabel')}</span>
              <span className="font-bold tabular-nums">{project.confidence}%</span>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{t('aiPmLabel')}</span>{' '}
              {t(`summary.${card.aiPmSummaryKey}`)}
            </p>
          </div>
          {card.changeCount > 0 ? (
            <button
              type="button"
              className="shrink-0 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-semibold tabular-nums text-primary"
              aria-expanded={changesOpen}
              aria-label={t('changesBadge', { count: card.changeCount })}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setChangesOpen((open) => !open);
              }}
            >
              ● {card.changeCount}
            </button>
          ) : (
            <span className="shrink-0 text-xs text-muted-foreground">{t('noChanges')}</span>
          )}
        </div>
      </Link>
      {changesOpen && card.changeItemKeys.length > 0 ? (
        <div className="border-t border-border/60 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('changesTitle')}
          </p>
          <ul className="mt-2 space-y-1.5" role="list">
            {card.changeItemKeys.map((key) => (
              <li key={key} className="text-sm">
                {t(`changeItems.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
