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

/** P0-2 — collapsed by default; no BUSINESS/CUSTOMER/PROBLEM labels on default surface. */
export function WorkspaceSharedUnderstandingPanel({
  understanding,
  spine = null,
  highlightKeys,
  reflectBanner = false,
  className,
}: WorkspaceSharedUnderstandingPanelProps) {
  const t = useTranslations('workflow.journey.workspaceShell.sharedUnderstanding');
  const tUx = useTranslations('workflow.journey.workspaceShell.conversationUx');
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

  const summaryLine = rows
    .map((row) => row.value.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(' · ');

  return (
    <section
      data-testid="shared-understanding-panel"
      className={cn(
        'shrink-0 border-b border-border/60 bg-muted/10 px-4 py-2 sm:px-6 lg:px-8',
        className,
      )}
      aria-label={tUx('understandingToggle')}
    >
      <details>
        <summary className="cursor-pointer py-2 text-xs font-medium text-muted-foreground">
          {tUx('understandingToggle')}
          {summaryLine ? (
            <span className="ml-2 font-normal text-foreground/70">— {summaryLine}</span>
          ) : null}
        </summary>
        <div className="pb-3 pt-1">
          {showReflect ? (
            <p
              data-testid="shared-understanding-reflect"
              className="animate-in fade-in mb-2 text-xs font-medium text-amber-800 dark:text-amber-200"
            >
              {t('reflectUpdated')}
            </p>
          ) : null}
          <div className="flex flex-wrap items-baseline justify-end gap-2">
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
          <ul className="mt-2 space-y-3">
            {rows.map((row) => {
              const highlighted = autoHighlight.includes(row.key);
              const provenance = spine?.provenance[row.key];
              return (
                <li
                  key={row.key}
                  data-highlighted={highlighted ? 'true' : undefined}
                  className={cn(
                    'rounded-lg px-2 py-1.5 transition-[background-color,box-shadow,opacity] duration-500',
                    highlighted
                      ? 'bg-amber-100/90 opacity-100 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.55)] dark:bg-amber-950/50'
                      : 'bg-transparent opacity-100',
                  )}
                >
                  <p
                    className={cn(
                      'text-sm font-medium leading-snug text-foreground',
                      highlighted && 'animate-in fade-in duration-500',
                    )}
                  >
                    {row.value}
                  </p>
                  {detailOpen && provenance ? (
                    <p
                      data-testid={`shared-understanding-provenance-${row.key}`}
                      className="mt-1 text-[11px] text-muted-foreground"
                    >
                      {t(provenanceLabelKey(provenance))}
                      {provenance === 'AI_INFERENCE' ? (
                        <span className="ml-1 text-amber-700 dark:text-amber-300">
                          · {t('inferenceNotFact')}
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </details>
    </section>
  );
}
