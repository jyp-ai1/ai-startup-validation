'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConsultingEmptyState } from '@/components/consulting/consulting-empty-state';
import { IntelligencePage } from '@/components/intelligence';
import { buildBusinessPlanInsights } from '@/lib/intelligence/build-feature-insights';
import type { BusinessPlan, StartupProject } from '@repo/types/validation';
import { Button } from '@repo/ui';

import { BusinessPlanCard } from './business-plan-card';
import { BusinessPlanGenerateButton } from './business-plan-generate-button';

type BusinessPlanListProps = {
  project: StartupProject;
  plans: BusinessPlan[];
};

export function BusinessPlanList({ project, plans }: BusinessPlanListProps) {
  const t = useTranslations();
  const basePath = `/projects/${project.id}/business-plan`;
  const insight = buildBusinessPlanInsights(plans);

  return (
    <IntelligencePage
      eyebrow={t('meta.appName')}
      title={t('nav.businessPlan')}
      description={t('businessPlan.description', { project: project.title })}
      insight={insight}
      actions={
        <div className="flex flex-wrap gap-2">
          <BusinessPlanGenerateButton projectId={project.id} />
          <Button variant="outline" asChild>
            <Link href={`${basePath}/new`}>
              <Plus className="size-4" />
              {t('businessPlan.newPlan')}
            </Link>
          </Button>
        </div>
      }
      emptyState={
        plans.length === 0 ? (
          <ConsultingEmptyState
            title={t('businessPlan.emptyTitle')}
            description={t('businessPlan.description', { project: project.title })}
            primaryLabel={t('businessPlan.generate')}
            primaryHref={`${basePath}/new`}
          />
        ) : undefined
      }
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <BusinessPlanCard key={plan.id} projectId={project.id} plan={plan} />
        ))}
      </div>
    </IntelligencePage>
  );
}
