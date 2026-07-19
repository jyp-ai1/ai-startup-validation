'use client';

import Link from 'next/link';
import { Pencil } from 'lucide-react';

import type { StartupProject } from '@repo/types/validation';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui';
import { formatRelativeTime } from '@repo/utils/date';

import { ProjectStatusBadge } from './project-status-badge';

type ProjectCardProps = {
  project: StartupProject;
};

export function ProjectCard({ project }: ProjectCardProps) {
  const createdLabel = formatRelativeTime(new Date(project.createdAt));

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-lg">
              <Link
                href={`/projects/${project.id}`}
                className="hover:underline"
              >
                {project.title}
              </Link>
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {project.summary}
            </CardDescription>
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{project.industry ?? 'Industry not set'}</p>
          <p>{createdLabel}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/projects/${project.id}`}>
            <Pencil className="size-4" />
            View
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
