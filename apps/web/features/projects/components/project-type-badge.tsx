'use client';

import { useTranslations } from 'next-intl';

import type { ProjectType } from '@repo/types/validation';
import { Badge } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

const BADGE_VARIANTS: Record<
  ProjectType,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  STARTUP: 'default',
  BUSINESS_STRATEGY: 'secondary',
  NEW_BUSINESS: 'outline',
  AI_INITIATIVE: 'default',
  DIGITAL_TRANSFORMATION: 'secondary',
  MARKET_EXPANSION: 'outline',
  CUSTOM: 'secondary',
};

type ProjectTypeBadgeProps = {
  projectType: ProjectType;
  className?: string;
};

export function ProjectTypeBadge({ projectType, className }: ProjectTypeBadgeProps) {
  const t = useTranslations('enums.projectTypeBadge');

  return (
    <Badge variant={BADGE_VARIANTS[projectType]} className={cn('font-mono text-[10px]', className)}>
      {t(projectType)}
    </Badge>
  );
}
