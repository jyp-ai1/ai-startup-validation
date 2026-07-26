'use client';

import { Clock, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { GeneratedTodayAction } from '../../lib/founder-intelligence-engine';

type AiActionGeneratorPanelProps = {
  actions: GeneratedTodayAction[];
  totalEtaMinutes: number;
  onStartAction: (actionId: string) => void;
  className?: string;
};

export function AiActionGeneratorPanel({
  actions,
  totalEtaMinutes,
  onStartAction,
  className,
}: AiActionGeneratorPanelProps) {
  const t = useTranslations('workflow.founderAiPm.intelligence.actionGenerator');
  const td = useTranslations('workflow.founderAiPm.intelligence.decision.howActions');

  return (
    <section
      className={cn(
        'rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] to-background p-6 sm:p-8',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        <Sparkles className="size-3.5" aria-hidden />
        {t('label')}
      </p>
      <h3 className="mt-2 text-xl font-semibold">{t('title')}</h3>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Clock className="size-3.5" aria-hidden />
        {t('totalEta', { minutes: totalEtaMinutes })}
      </p>
      <ol className="mt-5 space-y-3" role="list">
        {actions.map((action) => (
          <li
            key={action.id}
            className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/90 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {action.order}
              </span>
              <div>
                <p className="font-medium leading-snug">
                  {action.title ??
                    (action.titleKey === 'pipelineTask' && action.titleParams?.title
                      ? String(action.titleParams.title)
                      : action.titleKey === 'primaryStep'
                        ? t('primaryStep', action.titleParams ?? {})
                        : action.titleKey === 'vocInterview'
                          ? t('vocInterview', action.titleParams ?? {})
                          : action.titleKey
                            ? td(action.titleKey)
                            : '')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('actionMeta', { minutes: action.etaMinutes, go: action.goImpact })}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className="shrink-0 rounded-xl"
              onClick={() => onStartAction(action.id)}
            >
              {t('startCta')}
            </Button>
          </li>
        ))}
      </ol>
    </section>
  );
}
