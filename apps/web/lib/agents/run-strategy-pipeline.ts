import type { StrategyPipelineResult } from '@repo/agents';

export type StrategyPipelineRequestBody = {
  projectId: string;
  projectTitle: string;
  ideaSummary: string;
  goalId: string;
  industry?: string;
  locale?: string;
};

export type StrategyPipelineRunOutcome = {
  ok: true;
  data: StrategyPipelineResult;
  recovered?: boolean;
  attempts: number;
};

export type StrategyPipelineRunFailure = {
  ok: false;
  error: string;
  attempts: number;
};

export type StrategyPipelineRunResult = StrategyPipelineRunOutcome | StrategyPipelineRunFailure;

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 800;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export type RunStrategyPipelineOptions = {
  timeoutMs?: number;
  maxAttempts?: number;
  onAttempt?: (attempt: number) => void;
  onRetry?: (attempt: number, error: string) => void;
  onRecovery?: () => void;
  onSuccess?: (data: StrategyPipelineResult, recovered?: boolean) => void;
  onFailure?: (error: string, attempts: number) => void;
};

/**
 * Client-side resilient runner for Thinking → Agent → Decision.
 * Timeout · retry · recovery analytics hooks — engines unchanged.
 */
export async function runStrategyPipeline(
  body: StrategyPipelineRequestBody,
  options: RunStrategyPipelineOptions = {},
): Promise<StrategyPipelineRunResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  let lastError = 'Unknown pipeline error';

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    options.onAttempt?.(attempt);
    try {
      const response = await fetchWithTimeout(
        '/api/agents/strategy-run',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        timeoutMs,
      );

      const payload = (await response.json()) as {
        success?: boolean;
        data?: StrategyPipelineResult & { recovered?: boolean };
        message?: string;
      };

      if (response.ok && payload.success && payload.data) {
        options.onSuccess?.(payload.data, payload.data.recovered);
        if (payload.data.recovered) options.onRecovery?.();
        return {
          ok: true,
          data: payload.data,
          recovered: payload.data.recovered,
          attempts: attempt,
        };
      }

      lastError = payload.message ?? `HTTP ${response.status}`;
    } catch (error) {
      lastError =
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Pipeline timeout'
          : error instanceof Error
            ? error.message
            : String(error);
    }

    if (attempt < maxAttempts) {
      options.onRetry?.(attempt, lastError);
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  options.onFailure?.(lastError, maxAttempts);
  return { ok: false, error: lastError, attempts: maxAttempts };
}
