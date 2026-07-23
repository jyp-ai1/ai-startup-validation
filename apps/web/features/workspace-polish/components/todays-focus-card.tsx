'use client';

import Link from 'next/link';
import { Clock, Sparkles, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { WorkspaceFocusTask } from '@/features/workspace-home/types';
import { cn } from '@repo/ui/lib/utils';

type TodaysFocusCardProps = {
  task: WorkspaceFocusTask;
  translateLabel: (key: string) => string;
  onClick?: () => void;
};

function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${stars} stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            'size-3.5',
            index < stars ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30',
          )}
        />
      ))}
    </div>
  );
}

export function TodaysFocusCard({ task, translateLabel, onClick }: TodaysFocusCardProps) {
  const tp = useTranslations('polish.focus');

  return (
    <Link
      href={task.href}
      onClick={onClick}
      className="ll-consulting-card-hover group flex h-full flex-col gap-3 motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          {tp('todayPick')}
        </span>
        <StarRating stars={task.stars} />
      </div>
      <p className="text-base font-semibold leading-snug group-hover:text-primary">
        {translateLabel(task.labelKey)}
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">{translateLabel(task.whyKey)}</p>
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" />
          {tp('minutes', { count: task.estimatedMinutes })}
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
          <Sparkles className="size-3.5" />
          {tp('scoreImpact', { points: task.scoreImpact })}
        </span>
      </div>
    </Link>
  );
}
