'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { PipelineLogEntry } from '../types';

type PipelineLogsProps = {
  logs: PipelineLogEntry[];
};

const levelColor: Record<PipelineLogEntry['level'], string> = {
  info: 'text-foreground',
  warn: 'text-yellow-600',
  error: 'text-destructive',
};

export function PipelineLogs({ logs }: PipelineLogsProps) {
  if (logs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">실행 로그</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="max-h-48 space-y-1 overflow-y-auto font-mono text-xs">
          {logs.map((entry, i) => (
            <li key={`${entry.timestamp}-${i}`} className={cn(levelColor[entry.level])}>
              <span className="text-muted-foreground">
                {entry.timestamp.slice(11, 19)}
              </span>{' '}
              <span className="text-muted-foreground">[{entry.step}]</span> {entry.message}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
