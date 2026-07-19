import Link from 'next/link';
import { Plus } from 'lucide-react';

import type { BusinessPlan, StartupProject } from '@repo/types/validation';
import { Button, EmptyState, PageHeader } from '@repo/ui';

import { BusinessPlanCard } from './business-plan-card';
import { BusinessPlanGenerateButton } from './business-plan-generate-button';

type BusinessPlanListProps = {
  project: StartupProject;
  plans: BusinessPlan[];
};

export function BusinessPlanList({ project, plans }: BusinessPlanListProps) {
  const basePath = `/projects/${project.id}/business-plan`;

  return (
    <>
      <PageHeader
        title="Business Plan"
        description={`Investor / grant-ready plans for ${project.title}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BusinessPlanGenerateButton projectId={project.id} />
            <Button variant="outline" asChild>
              <Link href={`${basePath}/new`}>
                <Plus className="size-4" />
                New Plan
              </Link>
            </Button>
          </div>
        }
      />
      <div className="mt-4">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}`}>Back to project</Link>
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No business plans yet"
            description="Generate an AI business plan from your validation data, or create one manually."
            action={<BusinessPlanGenerateButton projectId={project.id} />}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <BusinessPlanCard key={plan.id} projectId={project.id} plan={plan} />
          ))}
        </div>
      )}
    </>
  );
}
