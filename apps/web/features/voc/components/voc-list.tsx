'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConsultingEmptyState } from '@/components/consulting/consulting-empty-state';
import { VocPainDashboard } from '@/components/consulting/voc-pain-dashboard';
import { IntelligencePage } from '@/components/intelligence';
import { buildVocInsights } from '@/lib/intelligence/build-feature-insights';
import type { StartupProject, VOC } from '@repo/types/validation';
import { Button } from '@repo/ui';

import type { VOCFilterParams } from '../schemas/voc-schema';
import { VOCCard } from './voc-card';
import { VOCFilters } from './voc-filters';

type VOCListProps = {
  project: StartupProject;
  entries: VOC[];
  filters: VOCFilterParams;
};

export function VOCList({ project, entries, filters }: VOCListProps) {
  const t = useTranslations();
  const basePath = `/projects/${project.id}/voc`;
  const hasFilters = Boolean(
    filters.sourceType || filters.customerSegment || filters.severity || filters.frequency,
  );
  const insight = buildVocInsights(entries);

  return (
    <IntelligencePage
      eyebrow={t('meta.appTagline')}
      title={t('voc.title')}
      description={t('voc.description', { project: project.title })}
      insight={insight}
      dataSectionTitle={t('voc.painDashboard.cardsTitle')}
      beforeData={entries.length > 0 ? <VocPainDashboard entries={entries} /> : null}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-11" asChild>
            <Link href={`${basePath}/summary`}>{t('voc.summaryDashboard')}</Link>
          </Button>
          <Button className="h-11 px-6" asChild>
            <Link href={`${basePath}/new`}>
              <Plus className="size-4" />
              {t('voc.newEntry')}
            </Link>
          </Button>
        </div>
      }
      filters={entries.length > 0 ? <VOCFilters projectId={project.id} current={filters} /> : null}
      emptyState={
        entries.length === 0 ? (
          <ConsultingEmptyState
            title={hasFilters ? t('voc.emptyFilteredTitle') : t('voc.emptyTitle')}
            description={
              hasFilters ? t('voc.emptyFilteredDescription') : t('voc.emptyDescription')
            }
            primaryLabel={t('voc.createEntry')}
            primaryHref={`${basePath}/new`}
          />
        ) : undefined
      }
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <VOCCard key={entry.id} projectId={project.id} entry={entry} />
        ))}
      </div>
    </IntelligencePage>
  );
}
