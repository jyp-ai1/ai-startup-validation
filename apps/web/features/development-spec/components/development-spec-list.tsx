import Link from 'next/link';
import { Plus } from 'lucide-react';

import type { DevelopmentSpec, StartupProject } from '@repo/types/validation';
import { Button, EmptyState, PageHeader } from '@repo/ui';

import { DevelopmentSpecCard } from './development-spec-card';
import { DevelopmentSpecGenerateButton } from './development-spec-generate-button';

type DevelopmentSpecListProps = {
  project: StartupProject;
  specs: DevelopmentSpec[];
  hasPRD: boolean;
};

export function DevelopmentSpecList({ project, specs, hasPRD }: DevelopmentSpecListProps) {
  const basePath = `/projects/${project.id}/development-spec`;

  return (
    <>
      <PageHeader
        title="Development Specification"
        description={`Engineering specs for ${project.title}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {hasPRD ? (
              <DevelopmentSpecGenerateButton projectId={project.id} />
            ) : (
              <Button disabled title="Create a PRD first">
                AI 개발 명세 생성
              </Button>
            )}
            {hasPRD ? (
              <Button variant="outline" asChild>
                <Link href={`${basePath}/new`}>
                  <Plus className="size-4" />
                  New Spec
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                <Plus className="size-4" />
                New Spec
              </Button>
            )}
          </div>
        }
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}`}>Back to project</Link>
        </Button>
        {!hasPRD ? (
          <Button variant="link" className="h-auto p-0" asChild>
            <Link href={`/projects/${project.id}/prd`}>Create PRD first</Link>
          </Button>
        ) : null}
      </div>

      {specs.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No development specs yet"
            description={
              hasPRD
                ? 'Generate an AI development specification from your PRD, or create one manually.'
                : 'Create a PRD first, then generate a development specification.'
            }
            action={
              hasPRD ? <DevelopmentSpecGenerateButton projectId={project.id} /> : undefined
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {specs.map((spec) => (
            <DevelopmentSpecCard key={spec.id} projectId={project.id} spec={spec} />
          ))}
        </div>
      )}
    </>
  );
}
