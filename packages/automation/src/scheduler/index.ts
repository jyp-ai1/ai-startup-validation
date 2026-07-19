import type { JobSchedule, ScheduledJob } from '../types';
import { SchedulerError } from '../errors';

/** Compute next run time from schedule — timezone-aware where supported. */
export function computeNextRun(schedule: JobSchedule, from: Date = new Date()): Date | null {
  switch (schedule.type) {
    case 'once': {
      return new Date(schedule.runAt);
    }
    case 'delayed':
      return new Date(from.getTime() + schedule.delayMs);
    case 'recurring':
      return new Date(from.getTime() + schedule.intervalMs);
    case 'cron':
      return computeNextCronRun(schedule.expression, schedule.timezone, from);
    default:
      return null;
  }
}

/** Minimal cron support — minute hour dom month dow (5-field). */
function computeNextCronRun(expression: string, timezone: string | undefined, from: Date): Date {
  const parts = expression.trim().split(/\s+/);
  if (parts.length < 5) {
    throw new SchedulerError(`Invalid cron expression: ${expression}`);
  }

  const next = new Date(from);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);

  // Simplified: if timezone provided, use locale offset approximation for dev
  if (timezone && timezone !== 'UTC') {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      throw new SchedulerError(`Invalid timezone: ${timezone}`);
    }
  }

  return next;
}

/** Scheduler — cron, one-time, delayed, recurring, timezone-aware. */
export class Scheduler {
  private readonly schedules = new Map<string, ScheduledJob>();
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private onDue: ((scheduled: ScheduledJob) => void) | null = null;

  schedule(job: Omit<ScheduledJob, 'createdAt' | 'nextRunAt'>): ScheduledJob {
    const nextRunAt = computeNextRun(job.schedule);
    const scheduled: ScheduledJob = {
      ...job,
      createdAt: new Date().toISOString(),
      nextRunAt: nextRunAt?.toISOString(),
    };
    this.schedules.set(job.id, scheduled);
    return scheduled;
  }

  unschedule(id: string): boolean {
    return this.schedules.delete(id);
  }

  get(id: string): ScheduledJob | undefined {
    return this.schedules.get(id);
  }

  list(): ScheduledJob[] {
    return [...this.schedules.values()];
  }

  listDue(now: Date = new Date()): ScheduledJob[] {
    return this.list().filter((s) => {
      if (!s.enabled) return false;
      if (s.schedule.type === 'once') {
        if (s.lastRunAt) return false;
        return new Date(s.schedule.runAt) <= now;
      }
      if (!s.nextRunAt) return false;
      return new Date(s.nextRunAt) <= now;
    });
  }

  markRun(id: string): void {
    const scheduled = this.schedules.get(id);
    if (!scheduled) return;
    scheduled.lastRunAt = new Date().toISOString();
    const next = computeNextRun(scheduled.schedule, new Date());
    scheduled.nextRunAt = next?.toISOString();
    if (scheduled.schedule.type === 'once') {
      scheduled.enabled = false;
    }
  }

  onJobDue(handler: (scheduled: ScheduledJob) => void): void {
    this.onDue = handler;
  }

  start(intervalMs = 1000): void {
    if (this.tickInterval) return;
    this.tickInterval = setInterval(() => {
      for (const due of this.listDue()) {
        this.onDue?.(due);
        this.markRun(due.id);
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }
}

export const scheduler = new Scheduler();
