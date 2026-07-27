'use client';

import { useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import type { InvestigationTopic } from '../../lib/v2-next-action-engine';
import { WHY_SOURCE_ITEMS } from '../../lib/v2-why-sources-data';

type V2WhySourcesSectionProps = {
  reviewCount: number;
  onOpenTopic: (topic: InvestigationTopic) => void;
  className?: string;
};

export function V2WhySourcesSection({
  reviewCount,
  onOpenTopic,
  className,
}: V2WhySourcesSectionProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.whySources');

  if (reviewCount < 1) return null;

  return (
    <section id="why-sources" className={cn('space-y-4', className)}>
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>

      <ul className="space-y-2 border-t border-border/40 pt-4">
        {WHY_SOURCE_ITEMS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onOpenTopic(item.topic)}
              className="flex w-full items-center justify-between rounded-lg border border-border/40 bg-muted/5 px-4 py-3 text-left transition-colors hover:bg-muted/20"
            >
              <div>
                <p className="text-sm font-medium">{t(`sources.${item.labelKey}`)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t(`trust.${item.trustKey}`)}</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
