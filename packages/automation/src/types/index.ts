import type { z } from 'zod';

export const JOB_STATUSES = [
  'pending',
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
  'retrying',
  'dead',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

export type JobDefinition<TInput = unknown, TOutput = unknown> = {
  id: string;
  name: string;
  version: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  timeout: number;
  retryable: boolean;
  maxRetries: number;
  tags: string[];
  handler: JobHandler<TInput, TOutput>;
};

export type JobHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: JobContext,
) => Promise<TOutput> | TOutput;

export type JobContext = {
  jobId: string;
  runId: string;
  traceId: string;
  attempt: number;
  maxRetries: number;
  scheduledAt: string;
  startedAt: string;
  metadata: Record<string, unknown>;
  signal: AbortSignal;
};

export type JobResult<TOutput = unknown> = {
  jobId: string;
  runId: string;
  status: JobStatus;
  output?: TOutput;
  error?: string;
  latencyMs: number;
  attempt: number;
  retries: number;
  completedAt: string;
};

export type ScheduledJob = {
  id: string;
  jobId: string;
  input: unknown;
  schedule: JobSchedule;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
};

export type JobSchedule =
  | { type: 'cron'; expression: string; timezone?: string }
  | { type: 'once'; runAt: string }
  | { type: 'delayed'; delayMs: number }
  | { type: 'recurring'; intervalMs: number; timezone?: string };

export type QueueJob = {
  id: string;
  jobId: string;
  input: unknown;
  priority: JobPriority;
  enqueuedAt: string;
  attempts: number;
  maxAttempts: number;
  traceId: string;
};

export type PipelineStep =
  | { type: 'job'; jobId: string; input?: unknown | ((ctx: PipelineContext) => unknown); id?: string }
  | { type: 'sequential'; steps: PipelineStep[]; id?: string }
  | { type: 'parallel'; steps: PipelineStep[]; id?: string }
  | {
      type: 'conditional';
      condition: (ctx: PipelineContext) => boolean | Promise<boolean>;
      then: PipelineStep[];
      else?: PipelineStep[];
      id?: string;
    };

export type PipelineDefinition = {
  id: string;
  name: string;
  steps: PipelineStep[];
  timeout?: number;
  retry?: { maxAttempts: number; delayMs: number };
};

export type PipelineContext = {
  traceId: string;
  runId: string;
  variables: Record<string, unknown>;
  results: Map<string, JobResult>;
  cancelled: boolean;
};

export type PipelineResult = {
  pipelineId: string;
  success: boolean;
  results: JobResult[];
  latencyMs: number;
  error?: string;
  cancelled: boolean;
};

export type DomainEvent = {
  id: string;
  type: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  timestamp: string;
  traceId?: string;
};

export type JobEvent = DomainEvent & {
  type: 'job.enqueued' | 'job.started' | 'job.completed' | 'job.failed' | 'job.retrying' | 'job.cancelled';
};

export type WorkflowEvent = DomainEvent & {
  type: 'pipeline.started' | 'pipeline.completed' | 'pipeline.failed' | 'pipeline.cancelled';
};

export type QueueKind = 'memory' | 'redis' | 'cloud';

export type QueuePort = {
  kind: QueueKind;
  enqueue(job: QueueJob): Promise<void>;
  dequeue(): Promise<QueueJob | undefined>;
  peek(): Promise<QueueJob | undefined>;
  size(): Promise<number>;
  clear(): Promise<void>;
};

export type DeadLetterQueuePort = {
  push(job: QueueJob, error: string): Promise<void>;
  list(): Promise<Array<QueueJob & { error: string; deadAt: string }>>;
  requeue(jobId: string): Promise<boolean>;
};

export type NotificationChannel = 'email' | 'slack' | 'discord' | 'webhook' | 'push';

export type NotificationPort = {
  channel: NotificationChannel;
  send(payload: NotificationPayload): Promise<void>;
};

export type NotificationPayload = {
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  recipients?: string[];
};

export type JobStoragePort = {
  saveResult(result: JobResult): Promise<void>;
  getResult(runId: string): Promise<JobResult | undefined>;
  listResults(jobId: string, limit?: number): Promise<JobResult[]>;
};

export type QueueAdapterKind = 'redis' | 'bullmq' | 'temporal' | 'cloud-tasks' | 'github-actions';

export type QueueAdapterPort = {
  kind: QueueAdapterKind;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getQueue(name: string): QueuePort;
};
