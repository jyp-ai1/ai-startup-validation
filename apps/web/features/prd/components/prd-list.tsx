import Link from 'next/link';
import { Plus } from 'lucide-react';

import type { PRD, StartupProject } from '@repo/types/validation';
import { Button, EmptyState, PageHeader } from '@repo/ui';

import { PRDCard } from './prd-card';
import { PRDGenerateButton } from './prd-generate-button';

type PRDListProps = {
  project: StartupProject;
  prds: PRD[];
};

export function PRDList({ project, prds }: PRDListProps) {
  const basePath = `/projects/${project.id}/prd`;

  return (
    <>
      <PageHeader
        title="PRD"
        description={`Development-ready product specs for ${project.title}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PRDGenerateButton projectId={project.id} />
            <Button variant="outline" asChild>
              <Link href={`${basePath}/new`}>
                <Plus className="size-4" />
                New PRD
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

      {prds.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No PRDs yet"
            description="Generate an AI PRD from your validation and business plan data, or create one manually."
            action={<PRDGenerateButton projectId={project.id} />}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {prds.map((prd) => (
            <PRDCard key={prd.id} projectId={project.id} prd={prd} />
          ))}
        </div>
      )}
    </>
  );
}
