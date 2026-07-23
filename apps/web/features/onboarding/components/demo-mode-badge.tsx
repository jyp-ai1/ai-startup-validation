'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui';

export function DemoModeBadge() {
  const t = useTranslations('onboarding.demoMode');
  const { trackEvent } = useAnalytics();
  const [open, setOpen] = useState(false);

  function handleOpen() {
    trackEvent(ANALYTICS_EVENTS.demoModeOpen, { screen: '/dashboard' });
    setOpen(true);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 rounded-full border-emerald-500/30 bg-emerald-500/5 px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
        onClick={handleOpen}
        title={t('tooltip')}
      >
        <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
        {t('label')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('label')}</DialogTitle>
            <DialogDescription className="whitespace-pre-line pt-2 text-left leading-relaxed">
              {t('dialogBody')}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
