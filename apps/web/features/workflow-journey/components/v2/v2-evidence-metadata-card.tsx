'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, ExternalLink, TrendingUp } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import type { EvidenceMetadata } from '../../lib/v2-reason-chain-types';

const BADGE_CLASS: Record<EvidenceMetadata['badge'], string> = {
  data: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  search: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  news: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  competitor: 'bg-red-500/10 text-red-700 dark:text-red-300',
  startup: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  community: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  report: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
};

type V2EvidenceMetadataCardProps = {
  item: EvidenceMetadata;
  namespace?: 'evidenceMeta' | 'evidenceMetaSample';
  className?: string;
};

export function V2EvidenceMetadataCard({
  item,
  namespace = 'evidenceMeta',
  className,
}: V2EvidenceMetadataCardProps) {
  const t = useTranslations(`workflow.v2.strategyWorkspace.ia.thinkingUx.${namespace}`);
  const [open, setOpen] = useState(false);

  const hasKeywords = t.has(`items.${item.id}.keywords`);
  const hasTrend = t.has(`items.${item.id}.trendBefore`) && t.has(`items.${item.id}.trendAfter`);
  const hasInsight = t.has(`items.${item.id}.insight`);
  const hasSourceLink = t.has(`items.${item.id}.sourceLink`);

  return (
    <div className={cn('rounded-lg border border-border/40 bg-muted/5 px-4 py-3', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              'inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
              BADGE_CLASS[item.badge],
            )}
          >
            {t(`badges.${item.badge}`)}
          </span>
          <p className="mt-2 text-sm font-semibold">{t(`items.${item.id}.label`)}</p>
          <p className="mt-0.5 text-sm font-medium text-primary">{t(`items.${item.id}.headline`)}</p>
          {t.has(`items.${item.id}.period`) ? (
            <p className="mt-1 text-xs text-muted-foreground">{t(`items.${item.id}.period`)}</p>
          ) : null}
          {t.has(`items.${item.id}.detail`) ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{t(`items.${item.id}.detail`)}</p>
          ) : null}

          {hasKeywords ? (
            <div className="mt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('keywordsLabel')}
              </p>
              <p className="mt-1 text-xs text-foreground/80">{t(`items.${item.id}.keywords`)}</p>
            </div>
          ) : null}

          {hasTrend ? (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="rounded-md bg-muted px-2 py-1 font-mono font-medium">
                {t(`items.${item.id}.trendBefore`)}
              </span>
              <TrendingUp className="size-3.5 text-primary" aria-hidden />
              <span className="rounded-md bg-primary/10 px-2 py-1 font-mono font-semibold text-primary">
                {t(`items.${item.id}.trendAfter`)}
              </span>
            </div>
          ) : null}

          {hasInsight ? (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t(`items.${item.id}.insight`)}
            </p>
          ) : null}

          {hasSourceLink ? (
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              onClick={() => setOpen(true)}
            >
              <ExternalLink className="size-3" aria-hidden />
              {t(`items.${item.id}.sourceLink`)}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className="shrink-0 text-xs text-primary"
          aria-label={open ? 'Collapse' : 'Expand'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>
      {open ? (
        <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
          <p className="text-xs leading-relaxed text-muted-foreground">{t(`items.${item.id}.why`)}</p>
          {hasSourceLink ? (
            <p className="text-[11px] text-muted-foreground">{t('sourceDetailHint')}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
