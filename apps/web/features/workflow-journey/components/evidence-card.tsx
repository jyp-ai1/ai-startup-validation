'use client';

import { useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';

import { Badge } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { EvidenceItem } from '../constants/intelligence-mock';

type EvidenceCardProps = {
  item: EvidenceItem;
  className?: string;
};

function StarRow({ count }: { count: number }) {
  return (
    <span className="text-amber-500" aria-label={`${count} stars`}>
      {'★'.repeat(count)}
      {'☆'.repeat(Math.max(0, 5 - count))}
    </span>
  );
}

export function EvidenceCard({ item, className }: EvidenceCardProps) {
  const t = useTranslations('workflow.intelligence.evidence');

  return (
    <article
      className={cn(
        'rounded-xl border border-border/70 bg-background/90 p-4',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t(`items.${item.titleKey}`)}
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{item.value}</p>
        </div>
        <StarRow count={item.stars} />
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
              className="cursor-pointer gap-1 rounded-md text-xs hover:bg-secondary/80"
              asChild
            >
              <button type="button" aria-label={t('sourceLink', { name: source.name })}>
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
