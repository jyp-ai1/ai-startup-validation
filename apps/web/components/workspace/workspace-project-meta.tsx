import type { StartupProject } from '@repo/types/validation';

import { ProjectStatusBadge } from '@/features/projects/components/project-status-badge';
import { formatRelativeTime } from '@repo/utils/date';

type WorkspaceProjectMetaProps = {
  project: StartupProject;
  updatedLabel?: string;
};

export function WorkspaceProjectMeta({ project, updatedLabel }: WorkspaceProjectMetaProps) {
  const time =
    updatedLabel ?? formatRelativeTime(new Date(project.updatedAt));

  return (
    <>
      <ProjectStatusBadge status={project.status} />
      <span className="rounded-full border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
        {time}
      </span>
    </>
  );
}
