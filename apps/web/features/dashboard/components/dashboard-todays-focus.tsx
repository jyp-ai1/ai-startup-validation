'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { Button } from '@repo/ui';

type DashboardTodaysFocusProps = {
  projectId: string;
};

const FOCUS_STEPS = [
  { id: 'research', labelKey: 'focus.research', href: (id: string) => `/projects/${id}/agent` },
  { id: 'evidence', labelKey: 'focus.evidence', href: (id: string) => `/projects/${id}/evidence/new` },
  { id: 'decision', labelKey: 'focus.decision', href: (id: string) => `/projects/${id}/decision` },
] as const;

export function DashboardTodaysFocus({ projectId }: DashboardTodaysFocusProps) {
  const t = useTranslations('dashboard');
  const { trackEvent } = useAnalytics();

  function handleClick(stepId: string, href: string) {
    trackEvent(ANALYTICS_EVENTS.workspaceContinue, {
      project_id: projectId,
      task_id: stepId,
      screen: '/dashboard',
    });
  }

  return (
    <section className="ll-consulting-card space-y-5 border-primary/20 bg-primary/[0.03]">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
          {t('focus.eyebrow')}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">{t('focus.title')}</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">{t('focus.desc')}</p>
      </div>
      <ol className="space-y-3">
        {FOCUS_STEPS.map((step, index) => {
          const href = step.href(projectId);
          return (
            <li key={step.id}>
              <Link
                href={href}
                onClick={() => handleClick(step.id, href)}
                className="flex items-center gap-4 rounded-xl border border-border/60 bg-background px-4 py-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <span className="flex-1 font-medium">{t(step.labelKey)}</span>
                <Button variant="ghost" size="sm" className="shrink-0 text-primary" tabIndex={-1}>
                  {t('focus.start')}
                </Button>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
