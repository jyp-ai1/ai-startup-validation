'use client';

import { useTranslations } from 'next-intl';

import type {
  DomainTrustReport,
  EntityBasis,
  LaunchLensDomainContext,
} from '@repo/types/domain/launchlens-domain';
import { cn } from '@repo/ui/lib/utils';

type EntityRowId = 'founder' | 'business' | 'customer' | 'market' | 'competitor';

const ENTITY_ROWS: EntityRowId[] = ['founder', 'business', 'customer', 'market', 'competitor'];

const BASIS_STYLE: Record<EntityBasis, string> = {
  document: 'text-emerald-700 dark:text-emerald-300',
  inferred: 'text-amber-700 dark:text-amber-300',
  unknown: 'text-muted-foreground',
  needs_confirmation: 'text-rose-700 dark:text-rose-300',
};

type V2DomainEntityBasisPanelProps = {
  entities: LaunchLensDomainContext;
  trust: DomainTrustReport;
  className?: string;
};

function resolveValue(id: EntityRowId, entities: LaunchLensDomainContext): string | null {
  if (id === 'business') {
    const name = entities.business.name ?? entities.business.value;
    const model = entities.business.model;
    if (name && model) return `${name} (${model})`;
    return name ?? (model ? model : null);
  }
  return entities[id].value;
}

function resolveBasis(id: EntityRowId, entities: LaunchLensDomainContext): EntityBasis {
  if (id === 'business') return entities.business.basis;
  return entities[id].basis;
}

export function V2DomainEntityBasisPanel({
  entities,
  trust,
  className,
}: V2DomainEntityBasisPanelProps) {
  const t = useTranslations(
    'workflow.v2.strategyWorkspace.ia.thinkingUx.smartIntake.understanding.entityBasis',
  );

  return (
    <div className={cn('rounded-xl border border-border/50 bg-muted/5 p-4', className)}>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {t('title')}
      </p>
      <ul className="mt-3 space-y-2">
        {ENTITY_ROWS.map((id) => {
          const value = resolveValue(id, entities);
          const basis = resolveBasis(id, entities);
          return (
            <li key={id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
              <span className="font-medium">{t(`entities.${id}`)}</span>
              <span className="text-muted-foreground">{value ?? t('unknown')}</span>
              <span className={cn('ml-auto text-xs font-medium', BASIS_STYLE[basis])}>
                {t(`basis.${basis}`)}
              </span>
            </li>
          );
        })}
      </ul>
      {trust.mustConfirmCustomer ? (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          {t('confirmCustomer')}
        </p>
      ) : null}
    </div>
  );
}
