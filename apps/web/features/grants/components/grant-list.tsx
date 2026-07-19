import Link from 'next/link';
import { LayoutDashboard, Plus } from 'lucide-react';

import type { GovernmentGrant, StartupProject } from '@repo/types/validation';
import { Button, EmptyState, PageHeader } from '@repo/ui';

import type { GrantFilterParams } from '../schemas/grant-schema';
import { GrantCard } from './grant-card';
import { GrantFilters } from './grant-filters';

type GrantListProps = {
  project: StartupProject;
  grants: GovernmentGrant[];
  filters: GrantFilterParams;
};

export function GrantList({ project, grants, filters }: GrantListProps) {
  const basePath = `/projects/${project.id}/grants`;

  return (
    <>
      <PageHeader
        title="Government Support"
        description={`Grant programs for ${project.title}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`${basePath}/dashboard`}>
                <LayoutDashboard className="size-4" />
                Dashboard
              </Link>
            </Button>
            <Button asChild>
              <Link href={`${basePath}/new`}>
                <Plus className="size-4" />
                New Grant
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

      <div className="mt-6">
        <GrantFilters projectId={project.id} current={filters} />
      </div>

      {grants.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No grant programs found"
            description={
              filters.category ||
              filters.targetStage ||
              filters.supportType ||
              filters.status
                ? 'Try adjusting your filters or add a new grant program.'
                : 'Register government support programs relevant to your startup idea.'
            }
            action={
              <Button asChild>
                <Link href={`${basePath}/new`}>Add Grant</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {grants.map((grant) => (
            <GrantCard key={grant.id} projectId={project.id} grant={grant} />
          ))}
        </div>
      )}
    </>
  );
}
