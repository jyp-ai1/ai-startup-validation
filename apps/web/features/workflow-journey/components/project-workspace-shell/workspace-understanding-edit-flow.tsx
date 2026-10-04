'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';

import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  buildDocumentFirstDraft,
  seedDomainFromDocumentFirstDraft,
} from '../../lib/business-understanding/build-document-first-draft';
import { buildBusinessUnderstanding } from '../../lib/business-understanding/build-business-understanding';
import type { WorkspaceSharedUnderstanding } from '../../lib/business-understanding/build-shared-understanding';
import {
  loadWorkspaceDocumentText,
  type WorkspaceDomainEvidence,
  type WorkspaceDomainFieldId,
} from '../../lib/workspace-ai-pm-messages';
import { WorkspaceDomainFields } from './workspace-domain-fields';

type WorkspaceUnderstandingEditFlowProps = {
  mode: 'edit' | 'together';
  domain: WorkspaceDomainEvidence;
  entities?: LaunchLensDomainContext | null;
  projectId?: string;
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

/**
 * S17-1 — correction path seeds from AI draft (never blank empty form after upload).
 */
export function WorkspaceUnderstandingEditFlow({
  mode,
  domain,
  entities = null,
  projectId,
  readOnly = false,
  onDomainChange,
  onApplyEdits,
  className,
}: WorkspaceUnderstandingEditFlowProps) {
  const t = useTranslations('workflow.journey.workspaceShell.businessUnderstanding');
  const seededRef = useRef(false);

  const seededDomain = useMemo(() => {
    const doc = loadWorkspaceDocumentText(projectId) ?? '';
    if (doc.trim().length < 8) return domain;
    const understanding = buildBusinessUnderstanding(doc);
    const draft = buildDocumentFirstDraft({
      documentText: doc,
      understanding,
      entities,
    });
    if (!draft) return domain;
    return seedDomainFromDocumentFirstDraft(draft, domain);
  }, [domain, entities, projectId]);

  useEffect(() => {
    if (readOnly || seededRef.current) return;
    seededRef.current = true;
    (['business', 'customer', 'market', 'competitor'] as const).forEach((field) => {
      if (!domain[field].trim() && seededDomain[field].trim()) {
        onDomainChange(field, seededDomain[field]);
      }
    });
  }, [domain, onDomainChange, readOnly, seededDomain]);

  return (
    <section
      data-testid="understanding-edit-seeded"
      className={cn(
        'rounded-2xl border border-border/70 bg-card px-5 py-5 sm:px-7',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{t('aiLabel')}</p>
      <p className="mt-3 text-[15px] leading-relaxed">
        {mode === 'together' ? t('togetherHint') : 'AI 초안입니다. 틀린 부분만 수정하세요.'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        사업/제품 · 실제 사용자 · 시장 · 경쟁을 처음부터 다시 쓰지 않아도 됩니다.
      </p>
      <WorkspaceDomainFields
        domain={{
          founder: domain.founder || seededDomain.founder,
          business: domain.business || seededDomain.business,
          customer: domain.customer || seededDomain.customer,
          market: domain.market || seededDomain.market,
          competitor: domain.competitor || seededDomain.competitor,
        }}
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
        className="mt-4 space-y-3 rounded-xl border border-border/60 bg-background/80 px-4 py-4"
      >
        <div className="min-w-0">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {ts('fields.business')}
          </dt>
          <dd className="mt-1 break-words text-sm font-medium leading-relaxed">{summary.business}</dd>
        </div>
        <div className="min-w-0 border-t border-border/40 pt-3">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {ts('fields.customer')}
          </dt>
          <dd className="mt-1 break-words text-sm font-medium leading-relaxed">{summary.customer}</dd>
        </div>
        <div className="min-w-0 border-t border-border/40 pt-3">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {ts('fields.problem')}
          </dt>
          <dd className="mt-1 break-words text-sm font-medium leading-relaxed">{summary.problem}</dd>
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
