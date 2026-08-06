'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type {
  BusinessUnderstanding,
  UnderstandingConfirmMode,
} from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  buildDocumentFirstDraft,
  type DocumentFirstFieldSource,
} from '../../lib/business-understanding/build-document-first-draft';
import { buildDiscoveryItems, collectUnconfirmedLines } from '../../lib/business-understanding/discovery-summary';
import { loadWorkspaceDocumentText } from '../../lib/workspace-ai-pm-messages';

type WorkspaceBusinessUnderstandingCardProps = {
  understanding: BusinessUnderstanding;
  entities?: LaunchLensDomainContext | null;
  documentReadable?: boolean;
  documentText?: string | null;
  projectId?: string;
  onConfirm: (mode: UnderstandingConfirmMode) => void;
  className?: string;
};

function sourceLabelKey(source: DocumentFirstFieldSource): string {
  switch (source) {
    case 'document':
      return 'confidenceSource.document';
    case 'inferred':
      return 'confidenceSource.inferred';
    default:
      return 'confidenceSource.unknown';
  }
}

/** S17-1 Document First — AI draft first; user confirms/corrects (never empty form primacy). */
export function WorkspaceBusinessUnderstandingCard({
  understanding,
  entities = null,
  documentReadable = true,
  documentText,
  projectId,
  onConfirm,
  className,
}: WorkspaceBusinessUnderstandingCardProps) {
  const t = useTranslations('workflow.journey.workspaceShell.businessUnderstanding');

  const resolvedText =
    documentText?.trim() ||
    loadWorkspaceDocumentText(projectId)?.trim() ||
    [
      understanding.business.value,
      understanding.customer.value,
      understanding.problem.value,
      understanding.founder.value,
    ]
      .filter(Boolean)
      .join('\n');

  const draft = useMemo(
    () =>
      resolvedText.length >= 8
        ? buildDocumentFirstDraft({
            documentText: resolvedText,
            understanding,
            entities,
          })
        : null,
    [resolvedText, understanding, entities],
  );

  const discoveryItems = buildDiscoveryItems(understanding, entities);
  const unconfirmedLines = collectUnconfirmedLines(understanding, entities);
  const readable = draft?.documentReadable ?? documentReadable;

  return (
    <section
      data-testid="document-first-card"
      className={cn(
        'rounded-2xl border border-border/70 bg-card px-5 py-5 sm:px-7',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{t('aiLabel')}</p>
      <p className="mt-2 text-[15px] font-medium leading-snug">
        {readable ? t('documentFirstLead') : t('documentFirstLeadUnreadable')}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {readable ? t('documentFirstSub') : t('documentFirstSubUnreadable')}
      </p>

      {draft ? (
        <div className="mt-4 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-background px-4 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
              {t('documentFirstDraftLabel')}
            </p>
            <p
              data-testid="document-first-confidence"
              className="text-xs font-medium tabular-nums text-muted-foreground"
            >
              {t('confidencePercent', { percent: draft.confidencePercent })}
              <span className="mx-1 text-border">·</span>
              {t(`confidenceMode.${draft.confidenceMode}`)}
            </p>
          </div>
          <dl className="mt-3 space-y-3">
            {draft.fields.map((field) => (
              <div key={field.id} className="min-w-0">
                <dt className="flex flex-wrap items-baseline gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span>{t(`draftFields.${field.id}`)}</span>
                  <span className="font-normal normal-case tracking-normal">
                    ({t(sourceLabelKey(field.source))})
                  </span>
                </dt>
                <dd className="mt-1 text-sm font-medium leading-snug text-foreground">{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <ul className="mt-4 space-y-2 rounded-xl border border-border/60 px-4 py-4">
          {discoveryItems.map((item) => (
            <li key={item.id} className="text-sm leading-relaxed">
              <span className="font-medium">{t(item.labelKey)}</span>
              {item.detail ? (
                <span className="text-muted-foreground"> — {item.detail}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {unconfirmedLines.length > 0 ? (
        <div className="mt-4 border-t border-border/50 pt-4">
          <p className="text-sm font-medium">{t('unconfirmedTitle')}</p>
          <ul className="mt-2 space-y-1.5">
            {unconfirmedLines.slice(0, 4).map((line) => (
              <li key={line} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span aria-hidden>•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 rounded-xl border border-amber-200/70 bg-amber-50/40 px-4 py-4 dark:border-amber-900/40 dark:bg-amber-950/20">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
          {t('zoneFounderJudgment')}
        </p>
        <p className="mt-2 text-sm font-medium text-foreground">{t('confirmLead')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('confirmLeadHint')}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" className="rounded-xl" onClick={() => onConfirm('accepted')}>
            {t('confirmYes')}
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onConfirm('edit')}>
            {t('confirmNo')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="rounded-xl"
            onClick={() => onConfirm('together')}
          >
            {t('confirmTogether')}
          </Button>
        </div>
      </div>
    </section>
  );
}
