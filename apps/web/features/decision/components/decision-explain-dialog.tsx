'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { DecisionLogicStep } from '@/features/decision';
import type { FrameworkResult } from '@/features/framework';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type DecisionExplainDialogProps = {
  steps: DecisionLogicStep[];
  frameworks?: FrameworkResult[];
  projectId: string;
  verdict: string;
};

export function DecisionExplainDialog({
  steps,
  frameworks = [],
  projectId,
  verdict,
}: DecisionExplainDialogProps) {
  const t = useTranslations('decision.explainMode');
  const tf = useTranslations('framework');
  const { trackEvent } = useAnalytics();
  const [open, setOpen] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      trackEvent(ANALYTICS_EVENTS.decisionExplainView, {
        project_id: projectId,
        screen: `/projects/${projectId}/decision`,
        status: verdict,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <HelpCircle className="size-4" />
          {t('whyButton')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <ol className="space-y-4 pt-2">
          {steps.map((step, index) => (
            <li key={step.id} className="flex gap-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <div>
                <p className="font-medium">{t(step.labelKey as 'stepData', step.params ?? {})}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(step.detailKey as 'stepDataDetail', step.params ?? {})}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {frameworks.length > 0 ? (
          <div className="mt-6 border-t border-border/50 pt-6">
            <h3 className="font-semibold">{t('frameworkSectionTitle')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('frameworkSectionDesc')}</p>
            <ul className="mt-4 space-y-3">
              {frameworks.map((fw) => (
                <li
                  key={fw.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{tf(fw.titleKey as 'names.swot')}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tf('score')}: {fw.score} · {tf('confidence')}: {fw.confidence}%
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-bold tabular-nums',
                      fw.decisionImpact >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400',
                    )}
                  >
                    {fw.decisionImpact > 0 ? '+' : ''}
                    {fw.decisionImpact}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
