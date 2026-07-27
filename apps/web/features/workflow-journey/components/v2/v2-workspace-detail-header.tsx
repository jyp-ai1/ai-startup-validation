'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Share2 } from 'lucide-react';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { cn } from '@repo/ui/lib/utils';

import type { MockProject } from '@/features/project-intelligence/constants/mock-projects';
import { getLifecycleDot } from '../../lib/v2-workspace-home';
import type { V2WorkspaceCardData } from '../../lib/v2-workspace-home';

type V2WorkspaceDetailHeaderProps = {
  project: MockProject;
  phaseKey: string;
  homeCard: V2WorkspaceCardData;
  className?: string;
};

export function V2WorkspaceDetailHeader({
  project,
  phaseKey,
  homeCard,
  className,
}: V2WorkspaceDetailHeaderProps) {
  const t = useTranslations('workflow.v2.detail');

  return (
    <header className={cn('border-b border-border/60 bg-background/95 backdrop-blur', className)}>
      <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/workspace"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t('backToHome')}
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/settings" className="text-muted-foreground hover:text-foreground">
              {t('nav.settings')}
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.share) {
                  void navigator.share({ title: project.name, url: window.location.href });
                }
              }}
            >
              <Share2 className="size-3.5" aria-hidden />
              {t('nav.share')}
            </button>
            <LocaleSwitcher />
          </div>
        </div>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span aria-hidden>{getLifecycleDot(homeCard.lifecycle)}</span>
              <h1 className="truncate text-xl font-semibold tracking-tight">{project.name}</h1>
            </div>
            <p className="text-sm text-muted-foreground">{t(`phase.${phaseKey}`)}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-sm">
              <span
                className={cn(
                  'font-semibold uppercase',
                  project.verdict === 'GO' ? 'text-emerald-600' : 'text-amber-600',
                )}
              >
                {project.verdict}
              </span>
              <span className="font-bold tabular-nums">{project.confidence}%</span>
            </div>
          </div>
          {homeCard.changeCount > 0 ? (
            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-semibold tabular-nums text-primary">
              ● {t('changeBadge', { count: homeCard.changeCount })}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
