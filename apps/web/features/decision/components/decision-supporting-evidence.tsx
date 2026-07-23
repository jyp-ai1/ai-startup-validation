'use client';

import Link from 'next/link';
import { ArrowRight, FileText, Landmark, MessageSquareQuote, Search, Swords, Gauge } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { SupportingEvidenceRef } from '@/features/decision';

const TYPE_ICON = {
  EVIDENCE: FileText,
  VOC: MessageSquareQuote,
  RESEARCH: Search,
  COMPETITOR: Swords,
  GRANT: Landmark,
  VALIDATION: Gauge,
} as const;

type DecisionSupportingEvidenceProps = {
  items: SupportingEvidenceRef[];
};

export function DecisionSupportingEvidence({ items }: DecisionSupportingEvidenceProps) {
  const t = useTranslations('decision.supporting');

  if (items.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('desc')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = TYPE_ICON[item.type];
          const label = item.metaKey
            ? t(item.metaKey as 'research', item.metaParams ?? {})
            : item.title;

          return (
            <Link
              key={item.id}
              href={item.href}
              className="group flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 transition-colors hover:border-primary/40"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t(`type.${item.type.toLowerCase()}` as 'type.evidence')}
                </p>
                <p className="truncate text-sm font-medium group-hover:text-primary">{label}</p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
