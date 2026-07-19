'use client';

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { PipelineStepState } from '../types';

type PipelineStatusProps = {
  steps: PipelineStepState[];
  running?: boolean;
};

const statusIcon: Record<PipelineStepState['status'], string> = {
  pending: '○',
  running: '◐',
  completed: '✓',
  failed: '✗',
  skipped: '—',
};

const statusColor: Record<PipelineStepState['status'], string> = {
  pending: 'text-muted-foreground',
  running: 'text-blue-500',
  completed: 'text-green-600',
  failed: 'text-destructive',
  skipped: 'text-muted-foreground',
};

export function PipelineStatus({ steps, running }: PipelineStatusProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">파이프라인 상태</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="flex items-start gap-3 text-sm">
            <span className={cn('font-mono font-bold', statusColor[step.status])}>
              {statusIcon[step.status]}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{step.label}</span>
                {step.status === 'running' && running && (
                  <Badge variant="secondary" className="text-xs">
                    진행 중
                  </Badge>
                )}
              </div>
              {step.message && (
                <p className="text-xs text-muted-foreground">{step.message}</p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
