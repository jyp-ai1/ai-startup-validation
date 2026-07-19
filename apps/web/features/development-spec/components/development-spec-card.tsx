import Link from 'next/link';

import type { DevelopmentSpec } from '@repo/types/validation';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

import { DevelopmentSpecStatusBadge } from './development-spec-status-badge';

type DevelopmentSpecCardProps = {
  projectId: string;
  spec: DevelopmentSpec;
};

export function DevelopmentSpecCard({ projectId, spec }: DevelopmentSpecCardProps) {
  const createdDate = new Date(spec.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={`/projects/${projectId}/development-spec/${spec.id}`}>
      <Card className="transition-colors hover:bg-muted/30">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{spec.title}</CardTitle>
            <DevelopmentSpecStatusBadge status={spec.status} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Created {createdDate}</p>
          {spec.summary ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{spec.summary}</p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
