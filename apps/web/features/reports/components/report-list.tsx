'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConsultingEmptyState } from '@/components/consulting/consulting-empty-state';
import { useGuidedEmptyHint } from '@/components/consulting/use-guided-empty-hint';
import { IntelligencePage } from '@/components/intelligence';
import { buildReportInsights } from '@/lib/intelligence/build-feature-insights';
import type { StartupProject, ValidationReport } from '@repo/types/validation';
import { Button } from '@repo/ui';

import { ReportCard } from './report-card';

type ReportListProps = {
  project: StartupProject;
  reports: ValidationReport[];
};

export function ReportList({ project, reports }: ReportListProps) {
  const t = useTranslations();
  const basePath = `/projects/${project.id}/reports`;
  const insight = buildReportInsights(reports);
  const { aiHint, aiGuideLabel } = useGuidedEmptyHint('report');

  return (
    <IntelligencePage
      eyebrow={t('meta.appName')}
      title={t('reports.title')}
      description={t('reports.description', { project: project.title })}
      insight={insight}
      actions={
        <Button asChild>
          <Link href={`${basePath}/new`}>
            <Plus className="size-4" />
            {t('reports.newReport')}
          </Link>
        </Button>
      }
      emptyState={
        reports.length === 0 ? (
          <ConsultingEmptyState
            title={t('reports.emptyTitle')}
            description={t('reports.emptyDescription')}
            primaryLabel={t('reports.createReport')}
            primaryHref={`${basePath}/new`}
            aiHint={aiHint}
            aiGuideLabel={aiGuideLabel}
          />
        ) : undefined
      }
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <ReportCard key={report.id} projectId={project.id} report={report} />
        ))}
      </div>
    </IntelligencePage>
  );
}
