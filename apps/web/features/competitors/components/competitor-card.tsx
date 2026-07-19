import Link from 'next/link';

import type { Competitor } from '@repo/types/validation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui';

import {
  CompetitorCategoryBadge,
  CompetitorMarketPositionBadge,
} from './competitor-badges';

type CompetitorCardProps = {
  projectId: string;
  competitor: Competitor;
};

export function CompetitorCard({ projectId, competitor }: CompetitorCardProps) {
  const href = `/projects/${projectId}/competitors/${competitor.id}`;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">
              <Link href={href} className="hover:underline">
                {competitor.name}
              </Link>
            </CardTitle>
            {competitor.description ? (
              <CardDescription className="line-clamp-2">
                {competitor.description}
              </CardDescription>
            ) : null}
          </div>
          <CompetitorCategoryBadge category={competitor.category} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Market Position</span>
          <CompetitorMarketPositionBadge position={competitor.marketPosition} />
        </div>
        <div>
          <p className="text-muted-foreground">Target Customer</p>
          <p>{competitor.targetCustomer?.trim() || 'Not provided'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Business Model</p>
          <p>{competitor.businessModel?.trim() || 'Not provided'}</p>
        </div>
      </CardContent>
    </Card>
  );
}
