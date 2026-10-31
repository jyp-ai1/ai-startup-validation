import type { ProviderId, TokenUsage } from '../types';

export type AIObservabilityEvent = {
  id: string;
  timestamp: string;
  provider: ProviderId;
  model: string;
  operation: 'chat' | 'stream' | 'complete' | 'embed' | 'generateObject' | 'generateJSON';
  latencyMs: number;
  usage: TokenUsage;
  /** Null when usage was not measured or cost was not calculated. Null is not 0. */
  estimatedCostUsd: number | null;
  success: boolean;
  error?: string;
  retries: number;
  metadata?: Record<string, unknown>;
};

export type ObservabilityListener = (event: AIObservabilityEvent) => void;

/** Track provider usage, latency, tokens, cost, errors, retries. */
export class ObservabilityTracker {
  private readonly events: AIObservabilityEvent[] = [];
  private readonly listeners: ObservabilityListener[] = [];

  record(event: Omit<AIObservabilityEvent, 'id' | 'timestamp'>): AIObservabilityEvent {
    const full: AIObservabilityEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    this.events.push(full);
    for (const listener of this.listeners) {
      listener(full);
    }
    return full;
  }

  subscribe(listener: ObservabilityListener): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  getEvents(): AIObservabilityEvent[] {
    return [...this.events];
  }

  getStats(): {
    totalRequests: number;
    successRate: number;
    totalTokens: number;
    totalCostUsd: number;
    /** Events whose cost was not calculated. They are absent from totalCostUsd. */
    unpricedRequests: number;
    avgLatencyMs: number;
    byProvider: Record<string, { count: number; tokens: number; cost: number }>;
  } {
    const total = this.events.length;
    const successes = this.events.filter((e) => e.success).length;
    const totalTokens = this.events.reduce((s, e) => s + e.usage.totalTokens, 0);
    let unpricedRequests = 0;
    let totalCostUsd = 0;
    const avgLatencyMs = total ? this.events.reduce((s, e) => s + e.latencyMs, 0) / total : 0;

    const byProvider: Record<string, { count: number; tokens: number; cost: number }> = {};
    for (const e of this.events) {
      byProvider[e.provider] ??= { count: 0, tokens: 0, cost: 0 };
      byProvider[e.provider]!.count++;
      byProvider[e.provider]!.tokens += e.usage.totalTokens;
      if (e.estimatedCostUsd == null) {
        unpricedRequests += 1;
      } else {
        totalCostUsd += e.estimatedCostUsd;
        byProvider[e.provider]!.cost += e.estimatedCostUsd;
      }
    }

    return {
      totalRequests: total,
      successRate: total ? successes / total : 0,
      totalTokens,
      totalCostUsd,
      unpricedRequests,
      avgLatencyMs,
      byProvider,
    };
  }

  clear(): void {
    this.events.length = 0;
  }
}

export const observabilityTracker = new ObservabilityTracker();
