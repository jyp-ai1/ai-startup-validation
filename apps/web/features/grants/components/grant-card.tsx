import Link from 'next/link';

import type { GovernmentGrant } from '@repo/types/validation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui';

import {
  GrantFitScoreBadge,
  GrantStatusBadge,
  GrantSupportTypeBadge,
  GrantTargetStageBadge,
} from './grant-badges';

type GrantCardProps = {
  projectId: string;
  grant: GovernmentGrant;
};

export function GrantCard({ projectId, grant }: GrantCardProps) {
  const href = `/projects/${projectId}/grants/${grant.id}`;
  const deadlineLabel = grant.deadline
    ? new Date(grant.deadline).toLocaleDateString('ko-KR')
    : 'No deadline';

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">
              <Link href={href} className="hover:underline">
                {grant.name}
              </Link>
            </CardTitle>
            <CardDescription>{grant.organization}</CardDescription>
          </div>
          <GrantFitScoreBadge score={grant.fitScore} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <GrantSupportTypeBadge type={grant.supportType} />
          <GrantTargetStageBadge stage={grant.targetStage} />
          <GrantStatusBadge status={grant.status} />
        </div>
        <p className="text-muted-foreground">Deadline: {deadlineLabel}</p>
      </CardContent>
    </Card>
  );
}
