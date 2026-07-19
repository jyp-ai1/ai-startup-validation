export { MemoryQueue, InMemoryDeadLetterQueue, memoryQueue, deadLetterQueue } from './memory-queue';
export type { QueuePort, DeadLetterQueuePort, QueueAdapterPort, QueueKind, QueueAdapterKind } from '../types';

/** Future adapter ports — Redis, BullMQ, Temporal, Cloud Tasks, GitHub Actions. */
export type RedisQueueAdapterPort = import('../types').QueueAdapterPort & { kind: 'redis' };
export type BullMQAdapterPort = import('../types').QueueAdapterPort & { kind: 'bullmq' };
export type TemporalAdapterPort = import('../types').QueueAdapterPort & { kind: 'temporal' };
export type CloudTasksAdapterPort = import('../types').QueueAdapterPort & { kind: 'cloud-tasks' };
export type GitHubActionsAdapterPort = import('../types').QueueAdapterPort & { kind: 'github-actions' };
