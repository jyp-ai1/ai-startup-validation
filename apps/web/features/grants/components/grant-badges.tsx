import type {
  GrantCategory,
  GrantStatus,
  GrantSupportType,
  GrantTargetStage,
} from '@repo/types/validation';
import { Badge } from '@repo/ui';

import {
  GRANT_CATEGORY_LABELS,
  GRANT_STATUS_LABELS,
  GRANT_SUPPORT_TYPE_LABELS,
  GRANT_TARGET_STAGE_LABELS,
} from '../schemas/grant-schema';

export function GrantCategoryBadge({ category }: { category: GrantCategory | null }) {
  if (!category) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return <Badge variant="outline">{GRANT_CATEGORY_LABELS[category]}</Badge>;
}

export function GrantTargetStageBadge({
  stage,
}: {
  stage: GrantTargetStage | null;
}) {
  if (!stage) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return <Badge variant="secondary">{GRANT_TARGET_STAGE_LABELS[stage]}</Badge>;
}

export function GrantSupportTypeBadge({
  type,
}: {
  type: GrantSupportType | null;
}) {
  if (!type) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return <Badge variant="outline">{GRANT_SUPPORT_TYPE_LABELS[type]}</Badge>;
}

export function GrantStatusBadge({ status }: { status: GrantStatus }) {
  const variant =
    status === 'OPEN' ? 'default' : status === 'PREPARING' ? 'secondary' : 'outline';
  return <Badge variant={variant}>{GRANT_STATUS_LABELS[status]}</Badge>;
}

export function GrantFitScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-sm text-muted-foreground">N/A</span>;
  }
  const variant = score >= 80 ? 'default' : score >= 60 ? 'secondary' : 'outline';
  return <Badge variant={variant}>{score}% fit</Badge>;
}
