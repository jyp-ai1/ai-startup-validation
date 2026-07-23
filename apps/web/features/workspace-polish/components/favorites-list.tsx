'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { cn } from '@repo/ui/lib/utils';

import type { FavoriteProject } from '../types';

type FavoritesListProps = {
  favorites: FavoriteProject[];
  activeProjectId?: string | null;
  className?: string;
};

export function FavoritesList({ favorites, activeProjectId, className }: FavoritesListProps) {
  const t = useTranslations('polish.favorites');
  const { trackEvent } = useAnalytics();

  if (favorites.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
        {t('title')}
      </p>
      <ul className="space-y-0.5">
        {favorites.map((project) => (
          <li key={project.id}>
            <Link
              href={`/projects/${project.id}`}
              onClick={() =>
                trackEvent(ANALYTICS_EVENTS.workspaceFavoriteOpen, {
                  project_id: project.id,
                })
              }
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                activeProjectId === project.id
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60',
              )}
            >
              <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
              <span className="truncate">{project.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
