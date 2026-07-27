'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import {
  EVIDENCE_LIBRARY_CATEGORIES,
  buildEvidenceLibrary,
  type EvidenceLibraryCategory,
  type EvidenceLibraryItem,
} from '../../lib/v2-evidence-library-data';

type V2EvidenceLibraryPanelProps = {
  reviewCount: number;
  className?: string;
};

export function V2EvidenceLibraryPanel({ reviewCount, className }: V2EvidenceLibraryPanelProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.evidenceLibrary');
  const items = useMemo(() => buildEvidenceLibrary(), []);
  const [category, setCategory] = useState<EvidenceLibraryCategory>('market');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = items.filter((item) => item.category === category);
  const selected =
    filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  if (reviewCount === 0) return null;

  return (
    <section id="evidence-library" className={cn('space-y-3', className)}>
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid gap-3 border-t border-border/40 pt-4 lg:grid-cols-[minmax(0,180px)_1fr]">
        <nav className="flex flex-wrap gap-1 lg:flex-col lg:gap-0.5" aria-label={t('title')}>
          {EVIDENCE_LIBRARY_CATEGORIES.map((cat) => {
            const count = items.filter((i) => i.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategory(cat);
                  setSelectedId(null);
                }}
                className={cn(
                  'rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors lg:w-full',
                  category === cat
                    ? 'bg-muted/60 text-foreground'
                    : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
                )}
              >
                {t(`categories.${cat}`)}
                <span className="ml-1 text-muted-foreground">({count})</span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-2">
          <ul className="flex flex-wrap gap-1">
            {filtered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    'rounded-md border px-2 py-1 text-xs transition-colors',
                    selected?.id === item.id
                      ? 'border-primary/40 bg-primary/[0.06] font-medium'
                      : 'border-border/40 text-muted-foreground hover:border-primary/20',
                  )}
                >
                  {item.source}
                </button>
              </li>
            ))}
          </ul>

          {selected ? <EvidenceDetail item={selected} t={t} /> : null}
        </div>
      </div>
    </section>
  );
}

function EvidenceDetail({
  item,
  t,
}: {
  item: EvidenceLibraryItem;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <article className="rounded-xl border border-border/40 bg-muted/5 p-4 text-sm">
      <h3 className="font-semibold">{item.source}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{item.metric}</p>

      <dl className="mt-4 space-y-3">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('sections.interpretation')}
          </dt>
          <dd className="mt-1 leading-relaxed">{item.interpretation}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('sections.meaning')}
          </dt>
          <dd className="mt-1 leading-relaxed text-muted-foreground">{item.meaning}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('sections.whyImportant')}
          </dt>
          <dd className="mt-1 leading-relaxed">{item.whyImportant}</dd>
        </div>
      </dl>
    </article>
  );
}
