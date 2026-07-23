'use client';

import { useTranslations } from 'next-intl';

import type { StartupProjectStatus } from '@repo/types/validation';
import { Badge } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

const STATUS_VARIANTS: Record<
  StartupProjectStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  DRAFT: 'secondary',
  RESEARCHING: 'default',
  ANALYZING: 'default',
  COMPLETED: 'outline',
  ARCHIVED: 'destructive',
};

type ProjectStatusBadgeProps = {
  status: StartupProjectStatus;
  className?: string;
};

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  const t = useTranslations('enums.projectStatus');

  return (
    <Badge variant={STATUS_VARIANTS[status]} className={cn(className)}>
      {t(status)}
    </Badge>
  );
}
