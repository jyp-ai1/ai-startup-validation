'use client';

import type {
  ResearchPlanStatus,
  ResearchPriority,
  ResearchType,
} from '@repo/types/validation';
import { Badge } from '@repo/ui';

import { useEnumLabel } from '@/lib/i18n/use-form-labels';

type ResearchTypeBadgeProps = {
  type: ResearchType;
};

export function ResearchTypeBadge({ type }: ResearchTypeBadgeProps) {
  const label = useEnumLabel('researchType', type);
  return <Badge variant="outline">{label}</Badge>;
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
  const label = useEnumLabel('researchStatus', status);
  return <Badge variant={STATUS_VARIANT[status]}>{label}</Badge>;
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
  const label = useEnumLabel('researchPriority', priority);
  return <Badge variant={PRIORITY_VARIANT[priority]}>{label}</Badge>;
}
