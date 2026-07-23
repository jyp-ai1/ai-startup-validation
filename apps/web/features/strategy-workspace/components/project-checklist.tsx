'use client';

import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { StrategyChecklistItem } from '../services/strategy-workspace-types';
import { cn } from '@repo/ui/lib/utils';

type ProjectChecklistProps = {
  items: StrategyChecklistItem[];
};

export function ProjectChecklist({ items }: ProjectChecklistProps) {
  const t = useTranslations('strategyWorkspace');

  return (
    <aside className="rounded-xl border border-border/50 bg-card p-5">
      <h3 className="text-sm font-semibold">{t('checklist.title')}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t('checklist.desc')}</p>
      <ul className="mt-4 space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/60',
                item.completed && 'opacity-80',
              )}
            >
              {item.completed ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate">{t(item.labelKey as 'checklist.research')}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{item.percent}%</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
