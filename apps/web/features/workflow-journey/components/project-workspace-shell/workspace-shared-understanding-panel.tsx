'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { WorkspaceSharedUnderstanding } from '../../lib/business-understanding/build-shared-understanding';

type FieldKey = keyof WorkspaceSharedUnderstanding;

type WorkspaceSharedUnderstandingPanelProps = {
  understanding: WorkspaceSharedUnderstanding;
  /** S17-2 — optional forced highlight keys (otherwise auto-diff). */
  highlightKeys?: FieldKey[];
  /** S17-2 — show 「이렇게 이해를 수정했습니다」 banner briefly */
  reflectBanner?: boolean;
  className?: string;
};

const HIGHLIGHT_MS = 1800;

/** S8-1 + S17-2 — always-visible AI understanding with change highlight. */
export function WorkspaceSharedUnderstandingPanel({
  understanding,
  highlightKeys,
  reflectBanner = false,
  className,
}: WorkspaceSharedUnderstandingPanelProps) {
  const t = useTranslations('workflow.journey.workspaceShell.sharedUnderstanding');
  const prevRef = useRef<WorkspaceSharedUnderstanding | null>(null);
  const [autoHighlight, setAutoHighlight] = useState<FieldKey[]>([]);
  const [showReflect, setShowReflect] = useState(false);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = understanding;

    const keys: FieldKey[] = highlightKeys?.length
      ? highlightKeys
      : prev
        ? (['business', 'customer', 'problem'] as FieldKey[]).filter(
            (key) => prev[key] !== understanding[key],
          )
        : [];

    if (keys.length === 0) return;

    setAutoHighlight(keys);
    setShowReflect(reflectBanner || Boolean(prev));
    const timer = window.setTimeout(() => {
      setAutoHighlight([]);
      setShowReflect(false);
    }, HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [understanding.business, understanding.customer, understanding.problem, highlightKeys, reflectBanner]);

  const rows: Array<{ key: FieldKey; value: string }> = [
    { key: 'business', value: understanding.business },
    { key: 'customer', value: understanding.customer },
    { key: 'problem', value: understanding.problem },
  ];

  return (
    <section
      data-testid="shared-understanding-panel"
      className={cn(
        'shrink-0 border-b border-border/60 bg-muted/20 px-4 py-4 sm:px-6 lg:px-8',
        className,
      )}
      aria-label={t('label')}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{t('label')}</p>
        {showReflect ? (
          <p
            data-testid="shared-understanding-reflect"
            className="animate-in fade-in text-xs font-medium text-amber-800 dark:text-amber-200"
          >
            {t('reflectUpdated')}
          </p>
        ) : null}
      </div>
      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        {rows.map((row) => {
          const highlighted = autoHighlight.includes(row.key);
          return (
            <div
              key={row.key}
              data-highlighted={highlighted ? 'true' : undefined}
              className={cn(
                'min-w-0 rounded-lg px-2 py-1.5 transition-[background-color,box-shadow,opacity] duration-500',
                highlighted
                  ? 'bg-amber-100/90 opacity-100 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.55)] dark:bg-amber-950/50'
                  : 'bg-transparent opacity-100',
              )}
            >
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t(`fields.${row.key}`)}
              </dt>
              <dd
                className={cn(
                  'mt-1 text-sm font-medium leading-snug text-foreground',
                  highlighted && 'animate-in fade-in duration-500',
                )}
              >
                {row.value}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
