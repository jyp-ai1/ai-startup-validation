'use client';

import { useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';

import { Badge, toast } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { EvidenceItem } from '../constants/intelligence-mock';

type EvidenceCardProps = {
  item: EvidenceItem;
  className?: string;
  animationIndex?: number;
};

function StarRow({ count, label }: { count: number; label: string }) {
  return (
    <span className="text-amber-500" aria-label={label} role="img">
      {'★'.repeat(count)}
      {'☆'.repeat(Math.max(0, 5 - count))}
    </span>
  );
}

export function EvidenceCard({ item, className, animationIndex = 0 }: EvidenceCardProps) {
  const t = useTranslations('workflow.intelligence.evidence');

  const openSource = (name: string) => {
    toast.info(t('sourcePreview', { name }));
  };

  return (
    <article
      className={cn(
        'evidence-card-enter rounded-xl border border-border/70 bg-background/90 p-4 transition-colors hover:border-primary/30',
        className,
      )}
      style={{ animationDelay: `${animationIndex * 90}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t(`items.${item.titleKey}`)}
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-foreground sm:text-2xl">{item.value}</p>
        </div>
        <StarRow count={item.stars} label={t('starRating', { count: item.stars })} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {t('confidence')}: <span className="font-semibold tabular-nums text-foreground">{item.confidence}%</span>
      </p>
      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t('sources')}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {item.sources.map((source) => (
            <Badge
              key={source.id}
              variant="secondary"
              className="cursor-pointer gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-primary/10 hover:text-primary"
              asChild
            >
              <button
                type="button"
                onClick={() => openSource(source.name)}
                aria-label={t('sourceLink', { name: source.name })}
              >
                <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium uppercase">{source.type}</span>
                {source.name}
                <ExternalLink className="size-3 opacity-60" aria-hidden />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    </article>
  );
}
