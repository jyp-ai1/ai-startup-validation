'use client';

import { useTranslations } from 'next-intl';

import type {
  BusinessUnderstanding,
  UnderstandingConfirmMode,
  UnderstandingField,
} from '@repo/types/domain/business-understanding';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type WorkspaceBusinessUnderstandingCardProps = {
  understanding: BusinessUnderstanding;
  onConfirm: (mode: UnderstandingConfirmMode) => void;
  className?: string;
};

type ReadField = {
  id: string;
  labelKey: string;
  field: UnderstandingField;
};

function ZoneHeader({ step, children }: { step?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      {step ? (
        <span className="text-[11px] font-bold tabular-nums text-primary">{step}</span>
      ) : null}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{children}</p>
    </div>
  );
}

function DocReadBlock({
  label,
  field,
  t,
}: {
  label: string;
  field: UnderstandingField;
  t: (key: string, values?: Record<string, string>) => string;
}) {
  const expressions = field.confirmedExpressions ?? [];
  if (expressions.length === 0) return null;

  if (expressions.length === 1) {
    return (
      <div className="text-sm leading-relaxed">
        <p className="font-medium text-foreground">{label}</p>
        <p className="mt-1 text-muted-foreground">
          {t('docReadSingle', { expression: expressions[0]! })}
        </p>
      </div>
    );
  }

  return (
    <div className="text-sm leading-relaxed">
      <p className="font-medium text-foreground">{label}</p>
      <p className="mt-1 text-muted-foreground">{t('docReadLead')}</p>
      <ul className="my-1.5 space-y-0.5 pl-1">
        {expressions.map((expr) => (
          <li key={expr} className="flex items-start gap-2 text-muted-foreground">
            <span aria-hidden>•</span>
            <span>{expr}</span>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground">{t('docReadSuffix')}</p>
    </div>
  );
}

function isWithheld(field: UnderstandingField): boolean {
  return field.value === null && Boolean(field.missingLine || field.nextStep);
}

function WithholdBlock({
  label,
  field,
  t,
}: {
  label: string;
  field: UnderstandingField;
  t: (key: string, values?: Record<string, string>) => string;
}) {
  const expressions = field.confirmedExpressions ?? [];

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="mt-0.5 text-muted-foreground">{t('notDecided')}</p>
      </div>

      {expressions.length === 1 ? (
        <p className="text-muted-foreground">
          {t('docReadSingle', { expression: expressions[0]! })}
        </p>
      ) : expressions.length > 1 ? (
        <div>
          <p className="text-muted-foreground">{t('docReadLead')}</p>
          <ul className="my-1.5 space-y-0.5 pl-1">
            {expressions.map((expr) => (
              <li key={expr} className="flex items-start gap-2 text-muted-foreground">
                <span aria-hidden>•</span>
                <span>{expr}</span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">{t('docReadSuffix')}</p>
        </div>
      ) : null}

      {field.missingLine ? (
        <p className="text-muted-foreground">
          {expressions.length > 0 ? (
            <>
              <span className="font-medium text-foreground">{t('butLead')} </span>
              {field.missingLine}
            </>
          ) : (
            field.missingLine
          )}
        </p>
      ) : null}

      {field.nextStep ? <p className="font-medium text-foreground">{field.nextStep}</p> : null}
    </div>
  );
}

function collectReadFields(u: BusinessUnderstanding): ReadField[] {
  return [
    { id: 'founder', labelKey: 'fields.founder', field: u.founder },
    { id: 'business', labelKey: 'fields.business', field: u.business },
    { id: 'valueProposition', labelKey: 'fields.valueProposition', field: u.valueProposition },
    { id: 'revenue', labelKey: 'fields.revenue', field: u.revenue },
    { id: 'partner', labelKey: 'fields.partner', field: u.partner },
  ].filter(({ field, id }) => {
    if (!field.confirmedExpressions?.length) return false;
    if (id === 'valueProposition' && field.value === u.business.value?.replace(/\s*·\s*B2C|\s*·\s*B2B/gi, '').trim()) {
      return false;
    }
    return true;
  });
}

export function WorkspaceBusinessUnderstandingCard({
  understanding,
  onConfirm,
  className,
}: WorkspaceBusinessUnderstandingCardProps) {
  const t = useTranslations('workflow.journey.workspaceShell.businessUnderstanding');
  const readFields = collectReadFields(understanding);
  const customerWithheld = isWithheld(understanding.customer);

  return (
    <section
      className={cn(
        'rounded-2xl border border-border/70 bg-card px-5 py-5 sm:px-7',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{t('title')}</p>
      <p className="mt-1.5 text-[15px] leading-snug">{t('intro')}</p>

      {/* ① Read Before Speak — confirmed from document */}
      <div className="mt-5 rounded-xl border border-primary/15 bg-primary/[0.03] px-4 py-4">
        <ZoneHeader step="①">{t('zoneConfirmed')}</ZoneHeader>
        {readFields.length > 0 ? (
          <div className="mt-3 space-y-4 divide-y divide-border/40 [&>div:not(:first-child)]:pt-4">
            {readFields.map(({ id, labelKey, field }) => (
              <DocReadBlock key={id} label={t(labelKey)} field={field} t={t} />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{t('zoneConfirmedEmpty')}</p>
        )}
      </div>

      {/* ② Withhold — decide together */}
      <div className="mt-3 rounded-xl border border-border/60 px-4 py-4">
        <ZoneHeader step="②">{t('zoneDecideTogether')}</ZoneHeader>
        {customerWithheld ? (
          <div className="mt-3">
            <WithholdBlock label={t('fields.customer')} field={understanding.customer} t={t} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{t('zoneDecideTogetherEmpty')}</p>
        )}
      </div>

      {/* ③ Founder judgment */}
      <div className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/40 px-4 py-4 dark:border-amber-900/40 dark:bg-amber-950/20">
        <ZoneHeader step="③">{t('zoneFounderJudgment')}</ZoneHeader>
        <p className="mt-2 text-sm text-muted-foreground">{t('confirmLead')}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" className="rounded-xl" onClick={() => onConfirm('accepted')}>
            {t('confirmYes')}
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onConfirm('edit')}>
            {t('confirmEdit')}
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
