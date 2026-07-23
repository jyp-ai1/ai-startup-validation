'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

const STORAGE_KEY = 'launchlens_demo_welcome_dismissed';

type DemoWelcomeCardProps = {
  projectId?: string | null;
  className?: string;
};

export function DemoWelcomeCard({ projectId, className }: DemoWelcomeCardProps) {
  const t = useTranslations('onboarding.welcome');
  const { trackEvent } = useAnalytics();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(STORAGE_KEY) !== '1');
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss(finishedTour = false) {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    if (finishedTour) {
      trackEvent(ANALYTICS_EVENTS.tourFinish, { screen: '/dashboard' });
    }
    setVisible(false);
  }

  function handleStartTour() {
    trackEvent(ANALYTICS_EVENTS.tourStart, { screen: '/dashboard', project_id: projectId ?? undefined });
    dismiss(true);
    const target = document.getElementById('guided-workspace-panel');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (!visible) return null;

  const steps = [
    { label: t('step1'), href: projectId ? `/projects/${projectId}` : '/projects/new' },
    { label: t('step2'), href: projectId ? `/projects/${projectId}/research` : '/projects/new' },
    { label: t('step3'), href: projectId ? `/projects/${projectId}/decision` : '/decision-center' },
    { label: t('step4'), href: projectId ? `/projects/${projectId}/executive-report` : '/dashboard' },
  ] as const;

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-6 shadow-sm md:p-8',
        className,
      )}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute right-3 top-3 text-muted-foreground"
        onClick={() => dismiss()}
        aria-label={t('dismiss')}
      >
        <X className="size-4" />
      </Button>

      <div className="flex items-start gap-3 pr-8">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{t('eyebrow')}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">{t('title')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('subtitle')}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t('desc')}</p>
        </div>
      </div>

      <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step.label}>
            <Link
              href={step.href}
              className="group flex h-full items-center gap-3 rounded-xl border border-border/60 bg-background/80 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-muted/40"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                {index + 1}
              </span>
              <span className="text-sm font-medium">{step.label}</span>
              <ArrowRight className="ml-auto size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={handleStartTour}>{t('startTour')}</Button>
        <Button variant="outline" onClick={() => dismiss()}>
          {t('dismiss')}
        </Button>
      </div>
    </section>
  );
}
