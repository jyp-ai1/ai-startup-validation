import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';

import { JobRegistry, JobRunner } from './runner';
import { RetryEngine } from '../retry';
import { AutomationLogger } from '../logging';
import { AutomationMetrics } from '../metrics';
import { EventBus } from '../events';

describe('JobRunner', () => {
  let runner: JobRunner;
  let registry: JobRegistry;

  beforeEach(() => {
    registry = new JobRegistry();
    registry.register({
      id: 'test.echo',
      name: 'Echo',
      version: '1.0.0',
      description: 'Echo job',
      inputSchema: z.object({ msg: z.string() }),
      outputSchema: z.object({ msg: z.string() }),
      timeout: 5000,
      retryable: false,
      maxRetries: 0,
      tags: ['test'],
      handler: async (input) => input,
    });

    runner = new JobRunner({
      registry,
      retry: new RetryEngine(),
      logger: new AutomationLogger(),
      metrics: new AutomationMetrics(),
      events: new EventBus(),
    });
  });

  it('runs job successfully', async () => {
    const result = await runner.run('test.echo', { msg: 'hello' });
    expect(result.status).toBe('completed');
    expect(result.output).toEqual({ msg: 'hello' });
  });

  it('fails for unknown job', async () => {
    await expect(runner.run('unknown', {})).rejects.toThrow();
  });
});
