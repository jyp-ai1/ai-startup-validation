'use client';

import { useTranslations } from 'next-intl';
import { Clock, ListChecks } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import type { StepGuideMeta } from '../constants/step-guides';

type WorkflowGuideCardProps = {
  stepId: string;
  order: number;
  meta: StepGuideMeta;
  active?: boolean;
  compact?: boolean;
  className?: string;
};

export function WorkflowGuideCard({
  stepId,
  order,
  meta,
  active = false,
  compact = false,
  className,
}: WorkflowGuideCardProps) {
  const t = useTranslations('workflow.plan');
  const ts = useTranslations('workflow.plan.steps');

  return (
    <article
      className={cn(
        'rounded-2xl border bg-card p-4 sm:p-5',
        active ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border/60',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
            active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {order}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground">{ts(`${stepId}.title`)}</h3>
          {!compact ? (
            <p className="mt-1 text-sm text-muted-foreground">{ts(`${stepId}.description`)}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Clock className="size-3.5 shrink-0" aria-hidden />
              {t('guide.eta', { minutes: meta.durationMinutes })}
            </span>
          </div>

          <div className="mt-3 rounded-xl border border-dashed border-border/70 bg-muted/20 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ListChecks className="size-3.5" aria-hidden />
              {t('guide.requiredLabel')}
            </p>
            <ul className="mt-2 space-y-1" role="list">
              {meta.requiredFieldKeys.map((fieldKey) => (
                <li key={fieldKey} className="text-sm text-foreground/90">
                  · {t(`guide.fields.${fieldKey}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </article>
  );
}
