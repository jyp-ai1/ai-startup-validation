import Link from 'next/link';

import type { BusinessPlan } from '@repo/types/validation';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

import { BusinessPlanStatusBadge } from './business-plan-status-badge';

type BusinessPlanCardProps = {
  projectId: string;
  plan: BusinessPlan;
};

export function BusinessPlanCard({ projectId, plan }: BusinessPlanCardProps) {
  const createdDate = new Date(plan.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={`/projects/${projectId}/business-plan/${plan.id}`}>
      <Card className="transition-colors hover:bg-muted/30">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{plan.title}</CardTitle>
            <BusinessPlanStatusBadge status={plan.status} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Created {createdDate}</p>
          {plan.summary ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {plan.summary}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
