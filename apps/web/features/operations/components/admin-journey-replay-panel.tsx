'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, User } from 'lucide-react';

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type JourneySession = {
  sessionId: string;
  userId: string | null;
  lastEventAt: string;
  eventCount: number;
};

type JourneyStep = {
  id: string;
  eventName: string;
  eventData: Record<string, unknown>;
  createdAt: string;
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function eventLabel(name: string): string {
  return name.replace(/_/g, ' ');
}

export function AdminJourneyReplayPanel() {
  const t = useTranslations('operations.journeyReplay');
  const [sessions, setSessions] = useState<JourneySession[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [journey, setJourney] = useState<JourneyStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/journey')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setSessions(json.data.sessions ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) {
      setJourney([]);
      return;
    }
    fetch(`/api/analytics/journey?sessionId=${encodeURIComponent(selected)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setJourney(json.data.journey ?? []);
      });
  }, [selected]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="size-4" aria-hidden />
          {t('title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t('loading')}</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
          ) : (
            sessions.map((session) => (
              <button
                key={session.sessionId}
                type="button"
                onClick={() => setSelected(session.sessionId)}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                  selected === session.sessionId
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border/60 hover:bg-muted/40',
                )}
              >
                <p className="font-medium">{t('sessionLabel', { count: session.eventCount })}</p>
                <p className="text-xs text-muted-foreground">{formatTime(session.lastEventAt)}</p>
              </button>
            ))
          )}
        </div>

        <div className="min-h-[200px] rounded-xl border border-border/60 bg-muted/5 p-4">
          {!selected ? (
            <p className="text-sm text-muted-foreground">{t('selectSession')}</p>
          ) : journey.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('loading')}</p>
          ) : (
            <ol className="space-y-0">
              {journey.map((step, index) => (
                <li key={step.id} className="relative pl-6">
                  {index < journey.length - 1 ? (
                    <span
                      className="absolute left-[9px] top-6 h-full w-px bg-border"
                      aria-hidden
                    />
                  ) : null}
                  <span className="absolute left-0 top-1 flex size-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div className="pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        <Clock className="mr-1 size-3" aria-hidden />
                        {formatTime(step.createdAt)}
                      </Badge>
                      <span className="text-sm font-medium">{eventLabel(step.eventName)}</span>
                    </div>
                    {typeof step.eventData.screen === 'string' ? (
                      <p className="mt-1 text-xs text-muted-foreground">{step.eventData.screen}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
