'use client';

import { useTranslations } from 'next-intl';

import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';
import { cn } from '@repo/ui/lib/utils';

import {
  getDomainFieldMeta,
  type WorkspaceDomainEvidence,
  type WorkspaceDomainFieldId,
} from '../../lib/workspace-ai-pm-messages';

const FIELD_ORDER: WorkspaceDomainFieldId[] = [
  'founder',
  'business',
  'customer',
  'market',
  'competitor',
];

type WorkspaceDomainFieldsProps = {
  domain: WorkspaceDomainEvidence;
  entities?: LaunchLensDomainContext | null;
  activeField?: WorkspaceDomainFieldId | null;
  readOnly?: boolean;
  onChange: (field: WorkspaceDomainFieldId, value: string) => void;
  className?: string;
};

const BASIS_STYLE = {
  document: 'text-emerald-700 dark:text-emerald-300',
  inferred: 'text-amber-700 dark:text-amber-300',
  unknown: 'text-muted-foreground',
  needs_confirmation: 'text-rose-700 dark:text-rose-300',
} as const;

export function WorkspaceDomainFields({
  domain,
  entities = null,
  activeField = null,
  readOnly = false,
  onChange,
  className,
}: WorkspaceDomainFieldsProps) {
  const t = useTranslations('workflow.v2.workspaceShell.domainFields');

  return (
    <section className={cn('space-y-4', className)}>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {t('title')}
      </h2>
      <ol className="space-y-3">
        {FIELD_ORDER.map((fieldId) => {
          const basis = getDomainFieldMeta(fieldId, entities);
          const isActive = activeField === fieldId;
          return (
            <li key={fieldId}>
              <label
                htmlFor={`domain-${fieldId}`}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
              >
                <span className="font-medium">{t(`fields.${fieldId}`)}</span>
                <span className={cn('text-xs font-medium', BASIS_STYLE[basis])}>
                  {t(`basis.${basis}`)}
                </span>
              </label>
              <input
                id={`domain-${fieldId}`}
                value={domain[fieldId]}
                readOnly={readOnly}
                onChange={(event) => onChange(fieldId, event.target.value)}
                placeholder={t(`placeholders.${fieldId}`)}
                className={cn(
                  'mt-1.5 w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none transition-colors',
                  isActive
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border/70 focus:border-primary/40 focus:ring-2 focus:ring-primary/15',
                )}
              />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
