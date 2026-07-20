'use client';

import Link from 'next/link';

import type { StartupProject } from '@repo/types/validation';
import { cn } from '@repo/ui/lib/utils';

type ProjectQuickSwitchProps = {
  projects: Pick<StartupProject, 'id' | 'title'>[];
  activeProjectId?: string | null;
  className?: string;
};

export function ProjectQuickSwitch({
  projects,
  activeProjectId,
  className,
}: ProjectQuickSwitchProps) {
  if (projects.length === 0) return null;

  return (
    <div className={cn('space-y-1', className)}>
      {projects.slice(0, 4).map((project) => {
        const isActive = project.id === activeProjectId;
        return (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className={cn(
              'block truncate rounded-md px-2 py-1.5 text-xs transition-colors',
              isActive
                ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
            )}
          >
            {project.title}
          </Link>
        );
      })}
    </div>
  );
}
