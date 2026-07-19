import type { StartupProjectStatus } from '@repo/types/validation';
import { Badge } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

const STATUS_LABELS: Record<StartupProjectStatus, string> = {
  DRAFT: 'Draft',
  RESEARCHING: 'Researching',
  ANALYZING: 'Analyzing',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

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
  return (
    <Badge variant={STATUS_VARIANTS[status]} className={cn(className)}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export { STATUS_LABELS };
