import Link from 'next/link';
import { Plus } from 'lucide-react';

import type { StartupProject } from '@repo/types/validation';
import { Button, EmptyState, PageHeader } from '@repo/ui';

import { ProjectCard } from './project-card';

type ProjectListProps = {
  projects: StartupProject[];
};

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <>
        <PageHeader
          title="Startup Projects"
          description="Manage and create startup idea projects."
          actions={
            <Button asChild>
              <Link href="/projects/new">
                <Plus className="size-4" />
                New Project
              </Link>
            </Button>
          }
        />
        <div className="mt-8">
          <EmptyState
            title="No startup projects yet"
            description="Register your first startup idea to start the validation workflow."
            action={
              <Button asChild>
                <Link href="/projects/new">Create Project</Link>
              </Button>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Startup Projects"
        description="Manage and create startup idea projects."
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="size-4" />
              New Project
            </Link>
          </Button>
        }
      />
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </>
  );
}
