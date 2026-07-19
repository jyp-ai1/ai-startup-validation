export type ToolCallMetric = {
  toolId: string;
  success: boolean;
  latencyMs: number;
  retries: number;
  timestamp?: string;
};

export type MetricsSnapshot = {
  totalCalls: number;
  successRate: number;
  failureCount: number;
  avgLatencyMs: number;
  totalRetries: number;
  byTool: Record<string, { calls: number; failures: number; avgLatencyMs: number }>;
};

/** Track tool calls, execution time, failures, retries, latency. */
export class MetricsTracker {
  private readonly metrics: ToolCallMetric[] = [];

  recordToolCall(metric: ToolCallMetric): void {
    this.metrics.push({
      ...metric,
      timestamp: new Date().toISOString(),
    });
  }

  getSnapshot(): MetricsSnapshot {
    const total = this.metrics.length;
    const successes = this.metrics.filter((m) => m.success).length;
    const failures = total - successes;
    const avgLatencyMs = total
      ? this.metrics.reduce((s, m) => s + m.latencyMs, 0) / total
      : 0;
    const totalRetries = this.metrics.reduce((s, m) => s + m.retries, 0);

    const byTool: MetricsSnapshot['byTool'] = {};
    for (const m of this.metrics) {
      byTool[m.toolId] ??= { calls: 0, failures: 0, avgLatencyMs: 0 };
      byTool[m.toolId]!.calls++;
      if (!m.success) byTool[m.toolId]!.failures++;
    }
    for (const [toolId, stats] of Object.entries(byTool)) {
      const toolMetrics = this.metrics.filter((m) => m.toolId === toolId);
      stats.avgLatencyMs =
        toolMetrics.reduce((s, m) => s + m.latencyMs, 0) / toolMetrics.length;
    }

    return {
      totalCalls: total,
      successRate: total ? successes / total : 0,
      failureCount: failures,
      avgLatencyMs,
      totalRetries,
      byTool,
    };
  }

  clear(): void {
    this.metrics.length = 0;
  }
}

export const metricsTracker = new MetricsTracker();
