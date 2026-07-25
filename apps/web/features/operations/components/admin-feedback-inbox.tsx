'use client';

import { useTranslations } from 'next-intl';
import { Inbox, MessageSquare } from 'lucide-react';

import type { OpsDashboardStats } from '@/lib/analytics/types';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { formatRelativeTime } from '@repo/utils/date';

const MOCK_FEEDBACK = [
  {
    id: 'fb-1',
    sentiment: 'up' as const,
    message: 'Goal → Workspace 3분 경험 WOW',
    screen: 'workspace',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'fb-2',
    sentiment: 'down' as const,
    message: 'Workflow 단계에서 CTA가 두 개로 보임',
    screen: 'workflow',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'fb-3',
    sentiment: 'up' as const,
    message: 'Decision Evidence Drawer 유용',
    screen: 'decision',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  },
];

type AdminFeedbackInboxProps = {
  stats: OpsDashboardStats | null;
};

export function AdminFeedbackInbox({ stats }: AdminFeedbackInboxProps) {
  const t = useTranslations('operations.adminTools.feedbackInbox');
  const items = stats?.recentFeedback?.length ? stats.recentFeedback : MOCK_FEEDBACK;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Inbox className="size-4" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3" role="list">
          {items.slice(0, 6).map((item, index) => (
            <li
              key={`${item.timestamp}-${index}`}
              className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <p className="min-w-0">{item.message ?? t('emptyMessage')}</p>
                </div>
                <Badge variant={item.sentiment === 'up' ? 'default' : 'secondary'}>
                  {item.sentiment === 'up' ? t('positive') : t('negative')}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {item.screen ?? '—'} ·{' '}
                {item.timestamp ? formatRelativeTime(new Date(item.timestamp)) : t('recent')}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
