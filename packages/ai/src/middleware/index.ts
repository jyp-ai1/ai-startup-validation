import { RateLimitError, AIProviderError } from '../errors';

export type RetryOptions = {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
};

export function isRetriableError(error: unknown): boolean {
  if (error instanceof RateLimitError) return true;
  if (error instanceof AIProviderError) {
    return error.statusCode >= 500 || error.statusCode === 429;
  }
  if (error instanceof Error) {
    return error.name === 'TimeoutError' || error.message.includes('timeout');
  }
  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<{ result: T; retries: number }> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;
  let retries = 0;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const result = await fn();
      return { result, retries };
    } catch (error) {
      lastError = error;
      if (!isRetriableError(error) || attempt >= opts.maxRetries) break;
      retries++;
      const delay = Math.min(opts.baseDelayMs * 2 ** attempt, opts.maxDelayMs);
      await sleep(delay);
    }
  }

  throw lastError;
}

export type RateLimitState = {
  tokens: number;
  lastRefill: number;
};

/** Simple token-bucket rate limiter. */
export class RateLimiter {
  private readonly buckets = new Map<string, RateLimitState>();

  constructor(
    private readonly maxTokens: number,
    private readonly refillRatePerMs: number,
  ) {}

  consume(key: string, tokens = 1): boolean {
    const now = Date.now();
    const state = this.buckets.get(key) ?? { tokens: this.maxTokens, lastRefill: now };
    const elapsed = now - state.lastRefill;
    state.tokens = Math.min(this.maxTokens, state.tokens + elapsed * this.refillRatePerMs);
    state.lastRefill = now;

    if (state.tokens < tokens) {
      this.buckets.set(key, state);
      return false;
    }

    state.tokens -= tokens;
    this.buckets.set(key, state);
    return true;
  }

  require(key: string, tokens = 1): void {
    if (!this.consume(key, tokens)) {
      throw new RateLimitError(`Rate limit exceeded for: ${key}`);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { sleep };
