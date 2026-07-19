import type {
  CompetitorCategory,
  CompetitorMarketPosition,
} from '@repo/types/validation';
import { Badge } from '@repo/ui';

import {
  COMPETITOR_CATEGORY_LABELS,
  COMPETITOR_MARKET_POSITION_LABELS,
} from '../schemas/competitor-schema';

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
  return (
    <Badge variant={CATEGORY_VARIANT[category]}>
      {COMPETITOR_CATEGORY_LABELS[category]}
    </Badge>
  );
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
  if (!position) {
    return <span className="text-sm text-muted-foreground">Not set</span>;
  }

  return (
    <Badge variant={POSITION_VARIANT[position]}>
      {COMPETITOR_MARKET_POSITION_LABELS[position]}
    </Badge>
  );
}
