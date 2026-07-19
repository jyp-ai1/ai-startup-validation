import Link from 'next/link';
import { BarChart3, Plus } from 'lucide-react';

import type { StartupProject, VOC } from '@repo/types/validation';
import { Button, EmptyState, PageHeader } from '@repo/ui';

import type { VOCFilterParams } from '../schemas/voc-schema';
import { VOCCard } from './voc-card';
import { VOCFilters } from './voc-filters';

type VOCListProps = {
  project: StartupProject;
  entries: VOC[];
  filters: VOCFilterParams;
};

export function VOCList({ project, entries, filters }: VOCListProps) {
  const basePath = `/projects/${project.id}/voc`;

  return (
    <>
      <PageHeader
        title="VOC Analysis"
        description={`Customer voice data for ${project.title}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`${basePath}/summary`}>
                <BarChart3 className="size-4" />
                Summary Dashboard
              </Link>
            </Button>
            <Button asChild>
              <Link href={`${basePath}/new`}>
                <Plus className="size-4" />
                New VOC
              </Link>
            </Button>
          </div>
        }
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}`}>Back to project</Link>
        </Button>
      </div>

      <div className="mt-6">
        <VOCFilters projectId={project.id} current={filters} />
      </div>

      {entries.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No VOC entries found"
            description={
              filters.sourceType ||
              filters.customerSegment ||
              filters.severity ||
              filters.frequency
                ? 'Try adjusting your filters or add new customer feedback.'
                : 'Collect customer interviews, surveys, and reviews to validate pain points.'
            }
            action={
              <Button asChild>
                <Link href={`${basePath}/new`}>Create VOC</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <VOCCard key={entry.id} projectId={project.id} entry={entry} />
          ))}
        </div>
      )}
    </>
  );
}
