'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { Competitor } from '@repo/types/validation';
import { cn } from '@repo/ui/lib/utils';

type CompetitorPositioningMatrixProps = {
  competitors: Competitor[];
  basePath: string;
  className?: string;
};

type QuadrantKey = 'NEWCOMER' | 'CHALLENGER' | 'FOLLOWER' | 'LEADER';

const QUADRANT_LAYOUT: {
  position: QuadrantKey;
  labelKey: string;
  className: string;
}[] = [
  {
    position: 'NEWCOMER',
    labelKey: 'intelligence.competitors.matrix.newcomer',
    className: 'border-r border-b',
  },
  {
    position: 'CHALLENGER',
    labelKey: 'intelligence.competitors.matrix.challenger',
    className: 'border-b',
  },
  {
    position: 'FOLLOWER',
    labelKey: 'intelligence.competitors.matrix.follower',
    className: 'border-r',
  },
  {
    position: 'LEADER',
    labelKey: 'intelligence.competitors.matrix.leader',
    className: '',
  },
];

function groupByPosition(competitors: Competitor[]) {
  const groups = new Map<QuadrantKey, Competitor[]>([
    ['NEWCOMER', []],
    ['CHALLENGER', []],
    ['FOLLOWER', []],
    ['LEADER', []],
  ]);

  const unmapped: Competitor[] = [];

  for (const competitor of competitors) {
    const position = competitor.marketPosition as QuadrantKey | null;
    if (position && groups.has(position)) {
      groups.get(position)!.push(competitor);
    } else {
      unmapped.push(competitor);
    }
  }

  return { groups, unmapped };
}

export function CompetitorPositioningMatrix({
  competitors,
  basePath,
  className,
}: CompetitorPositioningMatrixProps) {
  const t = useTranslations();
  const { groups, unmapped } = groupByPosition(competitors);

  return (
    <div className={cn('space-y-6', className)}>
      <div className="ll-consulting-card overflow-hidden p-0">
        <div className="border-b px-8 py-6">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('intelligence.competitors.matrix.title')}
          </p>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-0">
          <div className="flex items-center justify-center border-r px-4 py-8">
            <p className="origin-center -rotate-90 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('intelligence.competitors.matrix.highThreat')} → {t('intelligence.competitors.matrix.lowThreat')}
            </p>
          </div>

          <div>
            <div className="grid border-b px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid-cols-2">
              <span>{t('intelligence.competitors.matrix.lowShare')}</span>
              <span>{t('intelligence.competitors.matrix.highShare')}</span>
            </div>

            <div className="grid sm:grid-cols-2">
              {QUADRANT_LAYOUT.map(({ position, labelKey, className: cellClass }) => (
                <QuadrantCell
                  key={position}
                  label={t(labelKey)}
                  competitors={groups.get(position) ?? []}
                  basePath={basePath}
                  className={cn('min-h-[140px] border-border/40 p-5', cellClass)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {unmapped.length > 0 ? (
        <QuadrantCell
          label={t('intelligence.competitors.matrix.unmapped')}
          competitors={unmapped}
          basePath={basePath}
          className="ll-consulting-card p-5"
        />
      ) : null}
    </div>
  );
}

function QuadrantCell({
  label,
  competitors,
  basePath,
  className,
}: {
  label: string;
  competitors: Competitor[];
  basePath: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {competitors.length === 0 ? (
          <span className="text-sm text-muted-foreground/60">—</span>
        ) : (
          competitors.map((competitor) => (
            <Link
              key={competitor.id}
              href={`${basePath}/${competitor.id}`}
              className="rounded-full border border-border/60 bg-muted/20 px-3 py-1.5 text-sm font-medium transition-colors hover:border-consulting-accent/40 hover:bg-consulting-accent/5"
            >
              {competitor.name}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
