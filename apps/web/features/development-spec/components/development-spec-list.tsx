'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConsultingEmptyState } from '@/components/consulting/consulting-empty-state';
import { IntelligencePage } from '@/components/intelligence';
import { buildDevSpecInsights } from '@/lib/intelligence/build-feature-insights';
import type { DevelopmentSpec, StartupProject } from '@repo/types/validation';
import { Button } from '@repo/ui';

import { DevelopmentSpecCard } from './development-spec-card';
import { DevelopmentSpecGenerateButton } from './development-spec-generate-button';

type DevelopmentSpecListProps = {
  project: StartupProject;
  specs: DevelopmentSpec[];
  hasPRD: boolean;
};

export function DevelopmentSpecList({ project, specs, hasPRD }: DevelopmentSpecListProps) {
  const t = useTranslations();
  const basePath = `/projects/${project.id}/development-spec`;
  const insight = buildDevSpecInsights(specs);

  return (
    <IntelligencePage
      eyebrow={t('meta.appName')}
      title={t('nav.devSpec')}
      description={t('devSpec.description', { project: project.title })}
      insight={insight}
      actions={
        <div className="flex flex-wrap gap-2">
          {hasPRD ? <DevelopmentSpecGenerateButton projectId={project.id} /> : null}
          <Button variant="outline" asChild={hasPRD} disabled={!hasPRD}>
            {hasPRD ? (
              <Link href={`${basePath}/new`}>
                <Plus className="size-4" />
                {t('devSpec.newSpec')}
              </Link>
            ) : (
              <>
                <Plus className="size-4" />
                {t('devSpec.newSpec')}
              </>
            )}
          </Button>
        </div>
      }
      emptyState={
        specs.length === 0 ? (
          <ConsultingEmptyState
            title={t('devSpec.emptyTitle')}
            description={t('devSpec.description', { project: project.title })}
            primaryLabel={hasPRD ? t('devSpec.generate') : t('devSpec.createPrdFirst')}
            primaryHref={hasPRD ? `${basePath}/new` : `/projects/${project.id}/prd`}
          />
        ) : undefined
      }
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {specs.map((spec) => (
          <DevelopmentSpecCard key={spec.id} projectId={project.id} spec={spec} />
        ))}
      </div>
    </IntelligencePage>
  );
}
