import type {
  ResearchPlanStatus,
  ResearchPriority,
  ResearchType,
} from '@repo/types/validation';
import { Badge } from '@repo/ui';

import {
  RESEARCH_PRIORITY_LABELS,
  RESEARCH_STATUS_LABELS,
  RESEARCH_TYPE_LABELS,
} from '../schemas/research-schema';

type ResearchTypeBadgeProps = {
  type: ResearchType;
};

export function ResearchTypeBadge({ type }: ResearchTypeBadgeProps) {
  return <Badge variant="outline">{RESEARCH_TYPE_LABELS[type]}</Badge>;
}

type ResearchStatusBadgeProps = {
  status: ResearchPlanStatus;
};

const STATUS_VARIANT: Record<
  ResearchPlanStatus,
  'default' | 'secondary' | 'outline'
> = {
  TODO: 'secondary',
  IN_PROGRESS: 'default',
  COMPLETED: 'outline',
};

export function ResearchStatusBadge({ status }: ResearchStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {RESEARCH_STATUS_LABELS[status]}
    </Badge>
  );
}

type ResearchPriorityBadgeProps = {
  priority: ResearchPriority;
};

const PRIORITY_VARIANT: Record<
  ResearchPriority,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  HIGH: 'destructive',
  MEDIUM: 'default',
  LOW: 'secondary',
};

export function ResearchPriorityBadge({ priority }: ResearchPriorityBadgeProps) {
  return (
    <Badge variant={PRIORITY_VARIANT[priority]}>
      {RESEARCH_PRIORITY_LABELS[priority]}
    </Badge>
  );
}
