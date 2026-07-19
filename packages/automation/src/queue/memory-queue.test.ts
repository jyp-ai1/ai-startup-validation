import { describe, it, expect, beforeEach } from 'vitest';

import { MemoryQueue } from './memory-queue';

describe('MemoryQueue', () => {
  let queue: MemoryQueue;

  beforeEach(() => {
    queue = new MemoryQueue();
  });

  it('enqueues and dequeues by priority', async () => {
    await queue.enqueue({
      id: '1',
      jobId: 'low.job',
      input: {},
      priority: 'low',
      enqueuedAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3,
      traceId: 't1',
    });
    await queue.enqueue({
      id: '2',
      jobId: 'critical.job',
      input: {},
      priority: 'critical',
      enqueuedAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3,
      traceId: 't2',
    });

    const first = await queue.dequeue();
    expect(first?.jobId).toBe('critical.job');
  });

  it('reports queue size', async () => {
    expect(await queue.size()).toBe(0);
    await queue.enqueue({
      id: '1',
      jobId: 'test',
      input: {},
      priority: 'normal',
      enqueuedAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3,
      traceId: 't',
    });
    expect(await queue.size()).toBe(1);
  });
});
