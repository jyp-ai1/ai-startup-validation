'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConsultingEmptyState } from '@/components/consulting/consulting-empty-state';
import { useGuidedEmptyHint } from '@/components/consulting/use-guided-empty-hint';
import { ResearchProgressDashboard } from '@/components/consulting/research-progress-dashboard';
import { IntelligencePage } from '@/components/intelligence';
import { ResearchAgentPanel } from '@/features/agents/research/components/research-agent-panel';
import type { ResearchJob } from '@/features/agents/research';
import { buildResearchInsights } from '@/lib/intelligence/build-feature-insights';
import type { ResearchPlan, StartupProject } from '@repo/types/validation';
import { Button } from '@repo/ui';

import {
  ResearchPriorityBadge,
  ResearchStatusBadge,
  ResearchTypeBadge,
} from './research-badges';

type ResearchListProps = {
  project: StartupProject;
  plans: ResearchPlan[];
  agentJobs?: ResearchJob[];
};

export function ResearchList({ project, plans, agentJobs = [] }: ResearchListProps) {
  const t = useTranslations();
  const basePath = `/projects/${project.id}/research`;
  const insight = buildResearchInsights(plans);
  const { aiHint, aiGuideLabel } = useGuidedEmptyHint('research');

  const emptyState = (
    <ConsultingEmptyState
      title={t('research.emptyTitle')}
      description={t('research.emptyDescription')}
      primaryLabel={t('research.createPlan')}
      primaryHref={`${basePath}/new`}
      secondaryLabel={t('research.importSample')}
      secondaryHref={`${basePath}/new`}
      aiHint={aiHint}
      aiGuideLabel={aiGuideLabel}
    />
  );

  return (
    <div className="space-y-8">
      <ResearchAgentPanel
        projectId={project.id}
        projectType={project.projectType}
        jobs={agentJobs}
      />
      <IntelligencePage
      eyebrow={t('meta.appTagline')}
      title={t('research.title')}
      description={t('research.description', { project: project.title })}
      insight={insight}
      dataSectionTitle={t('intelligence.dataCards')}
      beforeData={plans.length > 0 ? <ResearchProgressDashboard plans={plans} /> : undefined}
      actions={
        <Button className="h-11 px-6" asChild>
          <Link href={`${basePath}/new`}>
            <Plus className="size-4" />
            {t('research.newPlan')}
          </Link>
        </Button>
      }
      emptyState={plans.length === 0 ? emptyState : undefined}
      rawData={
        plans.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-left text-[13px] text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">{t('research.columns.title')}</th>
                  <th className="px-6 py-4">{t('research.columns.type')}</th>
                  <th className="px-6 py-4">{t('research.columns.priority')}</th>
                  <th className="px-6 py-4">{t('research.columns.status')}</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-border/30 last:border-0">
                    <td className="px-6 py-4">
                      <Link href={`${basePath}/${plan.id}`} className="font-medium hover:text-primary">
                        {plan.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <ResearchTypeBadge type={plan.researchType} />
                    </td>
                    <td className="px-6 py-4">
                      <ResearchPriorityBadge priority={plan.priority} />
                    </td>
                    <td className="px-6 py-4">
                      <ResearchStatusBadge status={plan.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : undefined
      }
    />
    </div>
  );
}
