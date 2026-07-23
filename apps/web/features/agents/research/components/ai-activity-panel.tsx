'use client';

import type { AgentActivityStats } from '@/features/agents/research';
import { useTranslations } from 'next-intl';
import { Bot, Clock, CheckCircle2 } from 'lucide-react';

type AiActivityPanelProps = {
  stats: AgentActivityStats;
};

export function AiActivityPanel({ stats }: AiActivityPanelProps) {
  const t = useTranslations('researchAgent.activity');

  return (
    <section className="ll-executive-panel space-y-6 px-8 py-8">
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-ai">
          {t('eyebrow')}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">{t('title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('desc')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Bot className="size-5 text-primary" />}
          label={t('running')}
          value={String(stats.runningCount)}
        />
        <StatCard
          icon={<CheckCircle2 className="size-5 text-emerald-600" />}
          label={t('completed')}
          value={String(stats.recentCompleted)}
        />
        <StatCard
          icon={<Clock className="size-5 text-muted-foreground" />}
          label={t('avgDuration')}
          value={t('durationValue', { ms: stats.avgDurationMs })}
        />
      </div>

      {stats.recentJobs.length > 0 ? (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('recent')}
          </p>
          <ul className="space-y-2">
            {stats.recentJobs.map((job) => (
              <li
                key={job.id}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-sm"
              >
                <span className="font-medium truncate">{job.request.projectTitle}</span>
                <span className="shrink-0 text-muted-foreground">{job.state}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card px-5 py-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
