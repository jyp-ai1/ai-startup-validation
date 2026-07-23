'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { DecisionLogicStep } from '@/features/decision';
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

type DecisionExplainDialogProps = {
  steps: DecisionLogicStep[];
  projectId: string;
  verdict: string;
};

export function DecisionExplainDialog({
  steps,
  projectId,
  verdict,
}: DecisionExplainDialogProps) {
  const t = useTranslations('decision.explainMode');
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
      </DialogContent>
    </Dialog>
  );
}
