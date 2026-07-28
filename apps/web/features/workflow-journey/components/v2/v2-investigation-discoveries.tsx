'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { DiscoveryItem } from '../../lib/v2-investigation-types';

type V2InvestigationDiscoveriesProps = {
  items: DiscoveryItem[];
  namespace?: 'investigation' | 'investigationSample';
  className?: string;
};

export function V2InvestigationDiscoveries({
  items,
  namespace = 'investigationSample',
  className,
}: V2InvestigationDiscoveriesProps) {
  const t = useTranslations(`workflow.v2.strategyWorkspace.ia.thinkingUx.${namespace}.discoveries`);

  return (
    <div className={cn('rounded-xl border border-amber-500/30 bg-amber-500/5 p-4', className)}>
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">
        {t('title')}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="text-sm leading-relaxed">
            {t(`items.${item.id}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
