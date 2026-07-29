'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import { STRIP_ROTATE_MS, WORKSPACE_STRIP_MESSAGES } from './workspace-shell-mock';

type WorkspaceAiPmStripProps = {
  className?: string;
  /** When set, overrides rotating mock — AI PM owns the strip. */
  message?: string | null;
};

export function WorkspaceAiPmStrip({ className, message = null }: WorkspaceAiPmStripProps) {
  const t = useTranslations('workflow.v2.workspaceShell');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (message) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % WORKSPACE_STRIP_MESSAGES.length);
    }, STRIP_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [message]);

  const mock = WORKSPACE_STRIP_MESSAGES[index];

  return (
    <div
      className={cn(
        'flex shrink-0 items-start gap-3 border-b border-border/60 bg-background px-4 py-3 sm:px-6 lg:px-8',
        className,
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <span
        className="mt-1.5 size-1.5 shrink-0 animate-pulse rounded-full bg-primary"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
          {t('strip.label')}
        </p>
        <p className="mt-0.5 max-w-3xl text-sm leading-relaxed text-foreground">
          {message ?? (
            <>
              {mock.before}{' '}
              <span className="font-medium text-primary">{mock.emphasis}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
