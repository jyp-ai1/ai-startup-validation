import type { JobPriority, QueueJob, QueuePort, DeadLetterQueuePort } from '../types';

const PRIORITY_ORDER: Record<JobPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/** In-memory queue — default for development and tests. */
export class MemoryQueue implements QueuePort {
  readonly kind = 'memory' as const;
  private readonly items: QueueJob[] = [];

  async enqueue(job: QueueJob): Promise<void> {
    this.items.push(job);
    this.items.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }

  async dequeue(): Promise<QueueJob | undefined> {
    return this.items.shift();
  }

  async peek(): Promise<QueueJob | undefined> {
    return this.items[0];
  }

  async size(): Promise<number> {
    return this.items.length;
  }

  async clear(): Promise<void> {
    this.items.length = 0;
  }
}

export type { QueuePort, DeadLetterQueuePort, QueueAdapterPort } from '../types';

/** Dead letter queue interface — in-memory impl for dev. */
export class InMemoryDeadLetterQueue implements DeadLetterQueuePort {
  private readonly items: Array<QueueJob & { error: string; deadAt: string }> = [];

  async push(job: QueueJob, error: string): Promise<void> {
    this.items.push({ ...job, error, deadAt: new Date().toISOString() });
  }

  async list() {
    return [...this.items];
  }

  async requeue(jobId: string): Promise<boolean> {
    const idx = this.items.findIndex((i) => i.id === jobId);
    if (idx < 0) return false;
    this.items.splice(idx, 1);
    return true;
  }
}

export const memoryQueue = new MemoryQueue();
export const deadLetterQueue = new InMemoryDeadLetterQueue();
