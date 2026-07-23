'use client';

import Link from 'next/link';
import { Brain } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatRelativeTime } from '@repo/utils/date';

import type { ConsultantMemoryItem } from '../services/consultant-types';

type ConsultantMemoryProps = {
  items: ConsultantMemoryItem[];
};

export function ConsultantMemory({ items }: ConsultantMemoryProps) {
  const t = useTranslations('aiConsultant');

  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('memory.title')}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted/50"
            >
              <Brain className="size-3.5 shrink-0 text-primary/70" />
              <span className="min-w-0 flex-1 truncate">{t(item.labelKey as 'memory.decisionGenerated')}</span>
              <span className="shrink-0 text-muted-foreground">
                {formatRelativeTime(new Date(item.occurredAt))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
