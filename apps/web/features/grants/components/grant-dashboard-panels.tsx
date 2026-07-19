'use client';

import Link from 'next/link';

import type { GrantDeadlineItem } from '@repo/types/validation';
import type { VOCDistributionItem } from '@repo/types/validation';
import { cn } from '@repo/ui/lib/utils';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { GrantStatusBadge } from './grant-badges';

type DistributionChartProps = {
  title: string;
  data: VOCDistributionItem[];
};

function DistributionChart({ title, data }: DistributionChartProps) {
  const hasData = data.some((item) => item.count > 0);

  return (
    <div className="rounded-md border p-4">
      <h3 className="mb-4 text-sm font-medium">{title}</h3>
      {hasData ? (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={50}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No data yet</p>
      )}
    </div>
  );
}

type GrantDashboardChartsProps = {
  supportTypeDistribution: VOCDistributionItem[];
};

export function GrantDashboardCharts({
  supportTypeDistribution,
}: GrantDashboardChartsProps) {
  return (
    <DistributionChart
      title="Support Type Distribution"
      data={supportTypeDistribution}
    />
  );
}

type GrantDeadlineCalendarProps = {
  projectId: string;
  deadlines: GrantDeadlineItem[];
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function GrantDeadlineCalendar({
  projectId,
  deadlines,
}: GrantDeadlineCalendarProps) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay.getDay();

  const deadlineDays = new Set(
    deadlines
      .filter((d) => {
        const date = new Date(d.deadline);
        return date.getFullYear() === year && date.getMonth() === month;
      })
      .map((d) => new Date(d.deadline).getDate()),
  );

  const monthLabel = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });

  const cells: Array<number | null> = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return (
    <div className="rounded-md border p-4">
      <h3 className="mb-4 text-sm font-medium">Deadline Calendar — {monthLabel}</h3>
      <div className="mb-4 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAY_LABELS.map((day) => (
          <div key={day} className="py-1 font-medium">
            {day}
          </div>
        ))}
        {cells.map((day, index) => (
          <div
            key={`${day ?? 'empty'}-${index}`}
            className={cn(
              'flex h-9 items-center justify-center rounded-md text-sm',
              day === null && 'invisible',
              day !== null &&
                deadlineDays.has(day) &&
                'bg-primary font-medium text-primary-foreground',
              day !== null &&
                !deadlineDays.has(day) &&
                day === now.getDate() &&
                'ring-1 ring-border',
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {deadlines.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deadlines scheduled yet.</p>
      ) : (
        <ul className="space-y-2 border-t pt-4">
          {deadlines.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-1 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link
                  href={`/projects/${projectId}/grants/${item.id}`}
                  className="font-medium hover:underline"
                >
                  {item.name}
                </Link>
                <p className="text-sm text-muted-foreground">{item.organization}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>{new Date(item.deadline).toLocaleDateString('ko-KR')}</span>
                <GrantStatusBadge status={item.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
