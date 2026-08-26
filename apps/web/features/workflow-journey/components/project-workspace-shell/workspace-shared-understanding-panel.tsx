'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type {
  WorkspaceSharedUnderstanding,
  WorkspaceUnderstandingSpine,
} from '../../lib/business-understanding/build-shared-understanding';
import type { UnderstandingProvenance } from '../../lib/business-understanding/understanding-contract';

type FieldKey = keyof WorkspaceSharedUnderstanding;

type WorkspaceSharedUnderstandingPanelProps = {
  understanding: WorkspaceSharedUnderstanding;
  /** Optional enriched spine (provenance / marks). */
  spine?: WorkspaceUnderstandingSpine | null;
  /** S17-2 — optional forced highlight keys (otherwise auto-diff). */
  highlightKeys?: FieldKey[];
  /** S17-2 — show 「이렇게 이해를 수정했습니다」 banner briefly */
  reflectBanner?: boolean;
  className?: string;
};

const HIGHLIGHT_MS = 1800;

const MARK_GLYPH = {
  known: '✔',
  progress: '●',
  unknown: '○',
} as const;

function provenanceLabelKey(provenance: UnderstandingProvenance): string {
  switch (provenance) {
    case 'DOCUMENT':
      return 'provenance.document';
    case 'USER_CONFIRMED':
      return 'provenance.userConfirmed';
    case 'USER_CORRECTED':
      return 'provenance.userCorrected';
    case 'AI_INFERENCE':
      return 'provenance.aiInference';
    case 'EXTERNAL_EVIDENCE':
      return 'provenance.externalEvidence';
    default:
      return 'provenance.unknown';
  }
}

/** S8-1 + S17-2 + Long Sprint Spine — always-visible understanding with Summary/Detail. */
export function WorkspaceSharedUnderstandingPanel({
  understanding,
  spine = null,
  highlightKeys,
  reflectBanner = false,
  className,
}: WorkspaceSharedUnderstandingPanelProps) {
  const t = useTranslations('workflow.journey.workspaceShell.sharedUnderstanding');
  const prevRef = useRef<WorkspaceSharedUnderstanding | null>(null);
  const [autoHighlight, setAutoHighlight] = useState<FieldKey[]>([]);
  const [showReflect, setShowReflect] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

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
        <div className="flex flex-wrap items-center gap-2">
          {showReflect ? (
            <p
              data-testid="shared-understanding-reflect"
              className="animate-in fade-in text-xs font-medium text-amber-800 dark:text-amber-200"
            >
              {t('reflectUpdated')}
            </p>
          ) : null}
          <button
            type="button"
            data-testid="shared-understanding-detail-toggle"
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            aria-expanded={detailOpen}
            onClick={() => setDetailOpen((open) => !open)}
          >
            {detailOpen ? t('summaryCta') : t('detailCta')}
          </button>
        </div>
      </div>
      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        {rows.map((row) => {
          const highlighted = autoHighlight.includes(row.key);
          const mark = spine?.marks[row.key] ?? 'progress';
          const provenance = spine?.provenance[row.key];
          return (
            <div
              key={row.key}
              data-highlighted={highlighted ? 'true' : undefined}
              data-mark={mark}
              className={cn(
                'min-w-0 rounded-lg px-2 py-1.5 transition-[background-color,box-shadow,opacity] duration-500',
                highlighted
                  ? 'bg-amber-100/90 opacity-100 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.55)] dark:bg-amber-950/50'
                  : 'bg-transparent opacity-100',
              )}
            >
              <dt className="flex flex-wrap items-baseline gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <span aria-hidden className="font-semibold text-foreground/70">
                  {MARK_GLYPH[mark]}
                </span>
                <span>{t(`fields.${row.key}`)}</span>
              </dt>
              <dd
                className={cn(
                  'mt-1 text-sm font-medium leading-snug text-foreground',
                  highlighted && 'animate-in fade-in duration-500',
                )}
              >
                {row.value}
              </dd>
              {provenance ? (
                <p
                  data-testid={`shared-understanding-provenance-${row.key}`}
                  className="mt-1 text-[11px] text-muted-foreground"
                >
                  {t(provenanceLabelKey(provenance))}
                  {detailOpen && provenance === 'AI_INFERENCE' ? (
                    <span className="ml-1 text-amber-700 dark:text-amber-300">
                      · {t('inferenceNotFact')}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>
          );
        })}
      </dl>
    </section>
  );
}
