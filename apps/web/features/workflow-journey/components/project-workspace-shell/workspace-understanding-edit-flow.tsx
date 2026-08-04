'use client';

import { useTranslations } from 'next-intl';

import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { WorkspaceSharedUnderstanding } from '../../lib/business-understanding/build-shared-understanding';
import type { WorkspaceDomainEvidence, WorkspaceDomainFieldId } from '../../lib/workspace-ai-pm-messages';
import { WorkspaceDomainFields } from './workspace-domain-fields';

type WorkspaceUnderstandingEditFlowProps = {
  mode: 'edit' | 'together';
  domain: WorkspaceDomainEvidence;
  entities?: LaunchLensDomainContext | null;
  readOnly?: boolean;
  onDomainChange: (field: WorkspaceDomainFieldId, value: string) => void;
  onApplyEdits: () => void;
  className?: string;
};

type WorkspaceUnderstandingConfirmFlowProps = {
  summary: WorkspaceSharedUnderstanding;
  onConfirm: () => void;
  onRevise: () => void;
  className?: string;
};

export function WorkspaceUnderstandingEditFlow({
  mode,
  domain,
  entities = null,
  readOnly = false,
  onDomainChange,
  onApplyEdits,
  className,
}: WorkspaceUnderstandingEditFlowProps) {
  const t = useTranslations('workflow.journey.workspaceShell.businessUnderstanding');

  return (
    <section
      className={cn(
        'rounded-2xl border border-border/70 bg-card px-5 py-5 sm:px-7',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{t('aiLabel')}</p>
      <p className="mt-3 text-[15px] leading-relaxed">
        {mode === 'together' ? t('togetherHint') : t('editHint')}
      </p>
      <WorkspaceDomainFields
        domain={domain}
        entities={entities}
        readOnly={readOnly}
        onChange={onDomainChange}
        className="mt-5"
      />
      <Button type="button" className="mt-5 rounded-xl" disabled={readOnly} onClick={onApplyEdits}>
        {mode === 'together' ? t('togetherComplete') : t('editComplete')}
      </Button>
    </section>
  );
}

export function WorkspaceUnderstandingConfirmFlow({
  summary,
  onConfirm,
  onRevise,
  className,
}: WorkspaceUnderstandingConfirmFlowProps) {
  const t = useTranslations('workflow.journey.workspaceShell.businessUnderstanding');
  const ts = useTranslations('workflow.journey.workspaceShell.sharedUnderstanding');

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-background px-5 py-5 sm:px-7',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{t('aiLabel')}</p>
      <p className="mt-3 text-[15px] font-medium leading-relaxed">{t('editConfirmLead')}</p>
      <dl
        data-testid="edit-understanding-confirm"
        className="mt-4 grid gap-3 rounded-xl border border-border/60 bg-background/80 px-4 py-4 sm:grid-cols-3"
      >
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {ts('fields.business')}
          </dt>
          <dd className="mt-1 text-sm font-medium">{summary.business}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {ts('fields.customer')}
          </dt>
          <dd className="mt-1 text-sm font-medium">{summary.customer}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {ts('fields.problem')}
          </dt>
          <dd className="mt-1 text-sm font-medium">{summary.problem}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm font-medium">{t('editConfirmQuestion')}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="rounded-xl" onClick={onConfirm}>
          {t('editConfirmYes')}
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={onRevise}>
          {t('editConfirmNo')}
        </Button>
      </div>
    </section>
  );
}
