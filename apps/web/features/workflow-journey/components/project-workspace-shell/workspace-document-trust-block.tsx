'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { WorkspaceDocumentTrust } from '../../lib/business-understanding/workspace-document-eligibility';

type WorkspaceDocumentTrustBlockProps = {
  trust: Extract<WorkspaceDocumentTrust, { status: 'unreadable' }>;
  onContinue: () => void;
  readOnly?: boolean;
  className?: string;
};

export function WorkspaceDocumentTrustBlock({
  trust,
  onContinue,
  readOnly = false,
  className,
}: WorkspaceDocumentTrustBlockProps) {
  const t = useTranslations('workflow.journey.workspaceShell.aiPmLoop.trustContract');

  const bodyKey =
    trust.kind === 'pdf'
      ? 'pdfBody'
      : trust.kind === 'docx'
        ? 'docxBody'
        : 'insufficientBody';

  return (
    <section
      className={cn(
        'rounded-2xl border border-amber-500/35 bg-amber-500/[0.06] px-5 py-6 sm:px-7',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-200">
        {t('label')}
      </p>
      <p className="mt-3 text-[15px] font-medium leading-relaxed text-foreground">{t('title')}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {t(bodyKey, { fileName: trust.fileName ?? t('unknownFile') })}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t('nextHint')}</p>
      <Button type="button" className="mt-5 rounded-xl" disabled={readOnly} onClick={onContinue}>
        {t('continueCta')}
      </Button>
    </section>
  );
}
