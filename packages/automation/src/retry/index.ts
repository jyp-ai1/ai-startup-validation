export type RetryStrategy = 'exponential' | 'linear';

export type RetryOptions = {
  strategy: RetryStrategy;
  baseDelayMs: number;
  maxDelayMs: number;
  maxRetries: number;
};

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  strategy: 'exponential',
  baseDelayMs: 500,
  maxDelayMs: 30_000,
  maxRetries: 3,
};

/** Retry engine — exponential backoff, linear retry, max retry. */
export class RetryEngine {
  constructor(private readonly options: RetryOptions = DEFAULT_RETRY_OPTIONS) {}

  getDelay(attempt: number): number {
    if (this.options.strategy === 'linear') {
      return Math.min(this.options.baseDelayMs * attempt, this.options.maxDelayMs);
    }
    return Math.min(this.options.baseDelayMs * 2 ** (attempt - 1), this.options.maxDelayMs);
  }

  shouldRetry(attempt: number): boolean {
    return attempt <= this.options.maxRetries;
  }

  get maxRetries(): number {
    return this.options.maxRetries;
  }
}

export const retryEngine = new RetryEngine();

export async function withRetry<T>(
  fn: () => Promise<T>,
  engine: RetryEngine = retryEngine,
): Promise<{ result: T; attempts: number }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= engine.maxRetries + 1; attempt++) {
    try {
      return { result: await fn(), attempts: attempt };
    } catch (error) {
      lastError = error;
      if (!engine.shouldRetry(attempt)) break;
      await new Promise((r) => setTimeout(r, engine.getDelay(attempt)));
    }
  }
  throw lastError;
}
