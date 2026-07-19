import Link from 'next/link';

import type { PRD } from '@repo/types/validation';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

import { PRDStatusBadge } from './prd-status-badge';

type PRDCardProps = {
  projectId: string;
  prd: PRD;
};

export function PRDCard({ projectId, prd }: PRDCardProps) {
  const createdDate = new Date(prd.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={`/projects/${projectId}/prd/${prd.id}`}>
      <Card className="transition-colors hover:bg-muted/30">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{prd.title}</CardTitle>
            <PRDStatusBadge status={prd.status} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Created {createdDate}</p>
          {prd.summary ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{prd.summary}</p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
