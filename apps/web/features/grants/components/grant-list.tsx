'use client';

import Link from 'next/link';
import { LayoutDashboard, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConsultingEmptyState } from '@/components/consulting/consulting-empty-state';
import { IntelligencePage } from '@/components/intelligence';
import { buildGrantInsights } from '@/lib/intelligence/build-feature-insights';
import type { GovernmentGrant, StartupProject } from '@repo/types/validation';
import { Button } from '@repo/ui';

import type { GrantFilterParams } from '../schemas/grant-schema';
import { GrantCard } from './grant-card';
import { GrantFilters } from './grant-filters';

type GrantListProps = {
  project: StartupProject;
  grants: GovernmentGrant[];
  filters: GrantFilterParams;
};

export function GrantList({ project, grants, filters }: GrantListProps) {
  const t = useTranslations();
  const basePath = `/projects/${project.id}/grants`;
  const hasFilters = Boolean(
    filters.category || filters.targetStage || filters.supportType || filters.status,
  );
  const insight = buildGrantInsights(grants);

  return (
    <IntelligencePage
      eyebrow={t('meta.appName')}
      title={t('grants.title')}
      description={t('grants.description', { project: project.title })}
      insight={insight}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`${basePath}/dashboard`}>
              <LayoutDashboard className="size-4" />
              {t('grants.dashboard')}
            </Link>
          </Button>
          <Button asChild>
            <Link href={`${basePath}/new`}>
              <Plus className="size-4" />
              {t('grants.newGrant')}
            </Link>
          </Button>
        </div>
      }
      filters={grants.length > 0 ? <GrantFilters projectId={project.id} current={filters} /> : null}
      emptyState={
        grants.length === 0 ? (
          <ConsultingEmptyState
            title={hasFilters ? t('grants.emptyFilteredTitle') : t('grants.emptyTitle')}
            description={
              hasFilters ? t('grants.emptyFilteredDescription') : t('grants.emptyDescription')
            }
            primaryLabel={t('grants.addGrant')}
            primaryHref={`${basePath}/new`}
          />
        ) : undefined
      }
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {grants.map((grant) => (
          <GrantCard key={grant.id} projectId={project.id} grant={grant} />
        ))}
      </div>
    </IntelligencePage>
  );
}
