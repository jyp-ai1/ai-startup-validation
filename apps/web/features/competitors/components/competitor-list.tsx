'use client';

import Link from 'next/link';
import { GitCompare, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CompetitorPositioningMatrix } from '@/components/consulting/competitor-positioning-matrix';
import { ConsultingEmptyState } from '@/components/consulting/consulting-empty-state';
import { IntelligencePage } from '@/components/intelligence';
import { buildCompetitorInsights } from '@/lib/intelligence/build-feature-insights';
import type { Competitor, StartupProject } from '@repo/types/validation';
import { Button } from '@repo/ui';

import { CompetitorCategoryBadge, CompetitorMarketPositionBadge } from './competitor-badges';

type CompetitorListProps = {
  project: StartupProject;
  competitors: Competitor[];
};

export function CompetitorList({ project, competitors }: CompetitorListProps) {
  const t = useTranslations();
  const basePath = `/projects/${project.id}/competitors`;
  const insight = buildCompetitorInsights(competitors);

  const emptyState = (
    <ConsultingEmptyState
      title={t('competitors.emptyTitle')}
      description={t('competitors.emptyDescription')}
      primaryLabel={t('competitors.addCompetitor')}
      primaryHref={`${basePath}/new`}
      secondaryLabel={t('competitors.importSample')}
      secondaryHref={`${basePath}/new`}
    />
  );

  return (
    <IntelligencePage
      eyebrow={t('meta.appTagline')}
      title={t('competitors.title')}
      description={t('competitors.description', { project: project.title })}
      insight={insight}
      dataSectionTitle={t('intelligence.dataCards')}
      beforeData={
        competitors.length > 0 ? (
          <CompetitorPositioningMatrix competitors={competitors} basePath={basePath} />
        ) : undefined
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {competitors.length > 0 ? (
            <Button variant="outline" className="h-11 px-6" asChild>
              <Link href={`${basePath}/compare`}>
                <GitCompare className="size-4" />
                {t('competitors.compareMatrix')}
              </Link>
            </Button>
          ) : null}
          <Button className="h-11 px-6" asChild>
            <Link href={`${basePath}/new`}>
              <Plus className="size-4" />
              {t('competitors.newCompetitor')}
            </Link>
          </Button>
        </div>
      }
      emptyState={competitors.length === 0 ? emptyState : undefined}
    >
      {competitors.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {competitors.map((competitor) => (
            <Link
              key={competitor.id}
              href={`${basePath}/${competitor.id}`}
              className="ll-consulting-card-hover block p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{competitor.name}</p>
                  {competitor.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {competitor.description}
                    </p>
                  ) : null}
                </div>
                {competitor.marketPosition ? (
                  <CompetitorMarketPositionBadge position={competitor.marketPosition} />
                ) : null}
              </div>
              <div className="mt-4">
                <CompetitorCategoryBadge category={competitor.category} />
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </IntelligencePage>
  );
}
