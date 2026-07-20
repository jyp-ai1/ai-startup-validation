'use client';

import Link from 'next/link';
import { Plus, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConsultingEmptyState } from '@/components/consulting/consulting-empty-state';
import { IntelligencePage } from '@/components/intelligence';
import { buildEvidenceInsights } from '@/lib/intelligence/build-feature-insights';
import type { Evidence, EvidenceConfidence, StartupProject } from '@repo/types/validation';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';
import { formatRelativeTime } from '@repo/utils/date';

import type { EvidenceFilterParams } from '../schemas/evidence-schema';
import {
  EvidenceCategoryBadge,
  EvidenceConfidenceBadge,
  EvidenceSourceBadge,
} from './evidence-badges';
import { EvidenceFilters } from './evidence-filters';

type EvidenceListProps = {
  project: StartupProject;
  evidenceList: Evidence[];
  filters: EvidenceFilterParams;
};

function confidenceStars(confidence: EvidenceConfidence) {
  const map = { HIGH: 5, MEDIUM: 3, LOW: 1 } as const;
  const count = map[confidence];
  return Array.from({ length: 5 }).map((_, i) => (
    <Star
      key={i}
      className={cn(
        'size-3.5',
        i < count ? 'fill-consulting-accent text-consulting-accent' : 'text-muted-foreground/20',
      )}
    />
  ));
}

export function EvidenceList({ project, evidenceList, filters }: EvidenceListProps) {
  const t = useTranslations();
  const basePath = `/projects/${project.id}/evidence`;
  const hasFilters = Boolean(filters.category || filters.sourceType || filters.confidence);
  const insight = buildEvidenceInsights(evidenceList);

  const emptyState = (
    <ConsultingEmptyState
      title={hasFilters ? t('evidence.emptyFilteredTitle') : t('evidence.emptyTitle')}
      description={
        hasFilters ? t('evidence.emptyFilteredDescription') : t('evidence.emptyDescription')
      }
      primaryLabel={t('evidence.createEvidence')}
      primaryHref={`${basePath}/new`}
    />
  );

  return (
    <IntelligencePage
      eyebrow={t('meta.appTagline')}
      title={t('evidence.title')}
      description={t('evidence.description', { project: project.title })}
      insight={insight}
      dataSectionTitle={t('intelligence.dataCards')}
      actions={
        <Button className="h-11 px-6" asChild>
          <Link href={`${basePath}/new`}>
            <Plus className="size-4" />
            {t('evidence.newEvidence')}
          </Link>
        </Button>
      }
      filters={evidenceList.length > 0 ? <EvidenceFilters projectId={project.id} current={filters} /> : null}
      emptyState={evidenceList.length === 0 ? emptyState : undefined}
      rawData={
        evidenceList.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border/50 bg-muted/30 text-left text-[13px] text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-medium">{t('evidence.columns.title')}</th>
                  <th className="px-6 py-4 font-medium">{t('evidence.confidence')}</th>
                  <th className="px-6 py-4 font-medium">{t('evidence.source')}</th>
                  <th className="px-6 py-4 font-medium">{t('evidence.date')}</th>
                </tr>
              </thead>
              <tbody>
                {evidenceList.map((item) => (
                  <tr key={item.id} className="border-b border-border/30 last:border-0">
                    <td className="px-6 py-4">
                      <Link href={`${basePath}/${item.id}`} className="font-medium hover:text-primary">
                        {item.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <EvidenceConfidenceBadge confidence={item.confidence} />
                    </td>
                    <td className="px-6 py-4">
                      <EvidenceSourceBadge sourceType={item.sourceType} sourceName={item.sourceName} />
                    </td>
                    <td className="px-6 py-4 tabular-nums text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null
      }
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {evidenceList.map((item) => (
          <Link
            key={item.id}
            href={`${basePath}/${item.id}`}
            className="ll-consulting-card-hover group block"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[18px] font-semibold tracking-tight group-hover:text-primary">
                {item.title}
              </p>
              <EvidenceCategoryBadge category={item.category} />
            </div>
            <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
              {item.summary || t('common.notProvided')}
            </p>
            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{
                  width: `${item.confidence === 'HIGH' ? 100 : item.confidence === 'MEDIUM' ? 65 : 35}%`,
                }}
              />
            </div>
            <div className="mt-5 flex items-center justify-between gap-2 text-[13px]">
              <div className="flex items-center gap-1">{confidenceStars(item.confidence)}</div>
              <span className="text-muted-foreground">
                {formatRelativeTime(new Date(item.updatedAt))}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </IntelligencePage>
  );
}
