'use client';

import { useTranslations } from 'next-intl';

import type {
  CompetitorCategory,
  CompetitorMarketPosition,
} from '@repo/types/validation';
import { Badge } from '@repo/ui';

import { useEnumLabel } from '@/lib/i18n/use-form-labels';

type CompetitorCategoryBadgeProps = {
  category: CompetitorCategory;
};

const CATEGORY_VARIANT: Record<
  CompetitorCategory,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  DIRECT: 'destructive',
  INDIRECT: 'default',
  SUBSTITUTE: 'secondary',
};

export function CompetitorCategoryBadge({
  category,
}: CompetitorCategoryBadgeProps) {
  const label = useEnumLabel('competitorCategory', category);
  return <Badge variant={CATEGORY_VARIANT[category]}>{label}</Badge>;
}

type CompetitorMarketPositionBadgeProps = {
  position: CompetitorMarketPosition | null;
};

const POSITION_VARIANT: Record<
  CompetitorMarketPosition,
  'default' | 'secondary' | 'outline'
> = {
  LEADER: 'default',
  CHALLENGER: 'secondary',
  FOLLOWER: 'outline',
  NEWCOMER: 'outline',
};

export function CompetitorMarketPositionBadge({
  position,
}: CompetitorMarketPositionBadgeProps) {
  const t = useTranslations('common');

  if (!position) {
    return <span className="text-sm text-muted-foreground">{t('notProvided')}</span>;
  }

  const label = useEnumLabel('competitorMarketPosition', position);
  return <Badge variant={POSITION_VARIANT[position]}>{label}</Badge>;
}
