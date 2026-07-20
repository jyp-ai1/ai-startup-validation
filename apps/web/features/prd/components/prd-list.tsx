'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConsultingEmptyState } from '@/components/consulting/consulting-empty-state';
import { IntelligencePage } from '@/components/intelligence';
import { buildPrdInsights } from '@/lib/intelligence/build-feature-insights';
import type { PRD, StartupProject } from '@repo/types/validation';
import { Button } from '@repo/ui';

import { PRDCard } from './prd-card';
import { PRDGenerateButton } from './prd-generate-button';

type PRDListProps = {
  project: StartupProject;
  prds: PRD[];
};

export function PRDList({ project, prds }: PRDListProps) {
  const t = useTranslations();
  const basePath = `/projects/${project.id}/prd`;
  const insight = buildPrdInsights(prds);

  return (
    <IntelligencePage
      eyebrow={t('meta.appName')}
      title={t('nav.prd')}
      description={t('prd.description', { project: project.title })}
      insight={insight}
      actions={
        <div className="flex flex-wrap gap-2">
          <PRDGenerateButton projectId={project.id} />
          <Button variant="outline" asChild>
            <Link href={`${basePath}/new`}>
              <Plus className="size-4" />
              {t('prd.newPrd')}
            </Link>
          </Button>
        </div>
      }
      emptyState={
        prds.length === 0 ? (
          <ConsultingEmptyState
            title={t('prd.emptyTitle')}
            description={t('prd.description', { project: project.title })}
            primaryLabel={t('prd.generate')}
            primaryHref={`${basePath}/new`}
          />
        ) : undefined
      }
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {prds.map((prd) => (
          <PRDCard key={prd.id} projectId={project.id} prd={prd} />
        ))}
      </div>
    </IntelligencePage>
  );
}
