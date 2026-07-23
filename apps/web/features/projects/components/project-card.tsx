'use client';

import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
import { ProjectTypeBadge } from './project-type-badge';

type ProjectCardProps = {
  project: StartupProject;
};

export function ProjectCard({ project }: ProjectCardProps) {
  const t = useTranslations('projects');
  const createdLabel = formatRelativeTime(new Date(project.createdAt));

  return (
    <Card className="border-border/80 transition-all hover:border-primary/20 hover:shadow-md">
      <CardHeader className="gap-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-base">
              <Link
                href={`/projects/${project.id}`}
                className="hover:text-primary"
              >
                {project.title}
              </Link>
            </CardTitle>
            <CardDescription className="line-clamp-2 text-sm">
              {project.summary}
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <ProjectTypeBadge projectType={project.projectType} />
            <ProjectStatusBadge status={project.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4 pt-0">
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <p>{project.industry ?? t('industryNotSet')}</p>
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
