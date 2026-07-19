import Link from 'next/link';

import type { VOC } from '@repo/types/validation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui';

import {
  VOCFrequencyBadge,
  VOCSeverityBadge,
  VOCSourceTypeBadge,
  VOCCustomerSegmentBadge,
} from './voc-badges';

type VOCCardProps = {
  projectId: string;
  entry: VOC;
};

export function VOCCard({ projectId, entry }: VOCCardProps) {
  const href = `/projects/${projectId}/voc/${entry.id}`;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">
              <Link href={href} className="hover:underline">
                {entry.title}
              </Link>
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {entry.painPoint}
            </CardDescription>
          </div>
          <VOCCustomerSegmentBadge segment={entry.customerSegment} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <VOCSourceTypeBadge type={entry.sourceType} />
          <VOCFrequencyBadge frequency={entry.frequency} />
          <VOCSeverityBadge severity={entry.severity} />
        </div>
      </CardContent>
    </Card>
  );
}
