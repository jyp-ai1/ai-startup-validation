'use client';

import Link from 'next/link';
import { Brain } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConsultingEmptyState } from '@/components/consulting/consulting-empty-state';
import { useGuidedEmptyHint } from '@/components/consulting/use-guided-empty-hint';
import { formatRelativeTime } from '@repo/utils/date';

import type { ConsultantMemoryItem } from '../services/consultant-types';

type ConsultantMemoryProps = {
  items: ConsultantMemoryItem[];
  projectId?: string;
};

export function ConsultantMemory({ items, projectId }: ConsultantMemoryProps) {
  const t = useTranslations('aiConsultant');
  const { aiHint, aiGuideLabel } = useGuidedEmptyHint('memory');

  if (items.length === 0) {
    return (
      <ConsultingEmptyState
        className="py-10"
        title={t('memory.emptyTitle')}
        description={t('memory.emptyDescription')}
        primaryLabel={t('memory.emptyAction')}
        primaryHref={projectId ? `/projects/${projectId}/research/new` : '/projects'}
        aiHint={aiHint}
        aiGuideLabel={aiGuideLabel}
      />
    );
  }

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
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted/50 motion-safe:hover:translate-x-0.5"
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
