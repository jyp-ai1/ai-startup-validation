'use client';

import { useTranslations } from 'next-intl';

import type {
  GrantCategory,
  GrantStatus,
  GrantSupportType,
  GrantTargetStage,
} from '@repo/types/validation';
import { Badge } from '@repo/ui';

export function GrantCategoryBadge({ category }: { category: GrantCategory | null }) {
  const t = useTranslations('enums.grantCategory');
  if (!category) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return <Badge variant="outline">{t(category)}</Badge>;
}

export function GrantTargetStageBadge({
  stage,
}: {
  stage: GrantTargetStage | null;
}) {
  const t = useTranslations('enums.grantTargetStage');
  if (!stage) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return <Badge variant="secondary">{t(stage)}</Badge>;
}

export function GrantSupportTypeBadge({
  type,
}: {
  type: GrantSupportType | null;
}) {
  const t = useTranslations('enums.grantSupportType');
  if (!type) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return <Badge variant="outline">{t(type)}</Badge>;
}

export function GrantStatusBadge({ status }: { status: GrantStatus }) {
  const t = useTranslations('enums.grantStatus');
  const variant =
    status === 'OPEN' ? 'default' : status === 'PREPARING' ? 'secondary' : 'outline';
  return <Badge variant={variant}>{t(status)}</Badge>;
}

export function GrantFitScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-sm text-muted-foreground">N/A</span>;
  }
  const variant = score >= 80 ? 'default' : score >= 60 ? 'secondary' : 'outline';
  return <Badge variant={variant}>{score}% fit</Badge>;
}
