import Link from 'next/link';
import { GitCompare, Plus } from 'lucide-react';

import type { Competitor, StartupProject } from '@repo/types/validation';
import { Button, EmptyState, PageHeader } from '@repo/ui';

import { CompetitorCard } from './competitor-card';

type CompetitorListProps = {
  project: StartupProject;
  competitors: Competitor[];
};

export function CompetitorList({ project, competitors }: CompetitorListProps) {
  const basePath = `/projects/${project.id}/competitors`;

  return (
    <>
      <PageHeader
        title="Competitor Intelligence"
        description={`Competitive landscape for ${project.title}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {competitors.length > 0 ? (
              <Button variant="outline" asChild>
                <Link href={`${basePath}/compare`}>
                  <GitCompare className="size-4" />
                  Compare Matrix
                </Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href={`${basePath}/new`}>
                <Plus className="size-4" />
                New Competitor
              </Link>
            </Button>
          </div>
        }
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}`}>Back to project</Link>
        </Button>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}/research`}>Research Plans</Link>
        </Button>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}/evidence`}>Evidence</Link>
        </Button>
      </div>

      {competitors.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No competitors yet"
            description="Map direct, indirect, and substitute competitors to understand your market position."
            action={
              <Button asChild>
                <Link href={`${basePath}/new`}>Add Competitor</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {competitors.map((competitor) => (
            <CompetitorCard
              key={competitor.id}
              projectId={project.id}
              competitor={competitor}
            />
          ))}
        </div>
      )}
    </>
  );
}
