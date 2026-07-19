import { describe, it, expect } from 'vitest';

import { computeNextRun, Scheduler } from './index';

describe('Scheduler', () => {
  it('computes delayed schedule', () => {
    const next = computeNextRun({ type: 'delayed', delayMs: 5000 }, new Date('2026-01-01T00:00:00Z'));
    expect(next?.getTime()).toBe(new Date('2026-01-01T00:00:05Z').getTime());
  });

  it('computes recurring schedule', () => {
    const next = computeNextRun(
      { type: 'recurring', intervalMs: 60_000 },
      new Date('2026-01-01T00:00:00Z'),
    );
    expect(next?.getTime()).toBe(new Date('2026-01-01T00:01:00Z').getTime());
  });

  it('schedules and lists due jobs', () => {
    const sched = new Scheduler();
    const past = new Date(Date.now() - 1000).toISOString();
    sched.schedule({
      id: 'sched-1',
      jobId: 'filesystem.scan',
      input: { root: '/data' },
      schedule: { type: 'once', runAt: past },
      enabled: true,
    });

    expect(sched.listDue().length).toBe(1);
  });
});
