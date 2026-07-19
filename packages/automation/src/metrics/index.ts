export type JobMetric = {
  jobId: string;
  success: boolean;
  latencyMs: number;
  retries: number;
};

export type MetricsSnapshot = {
  totalExecutions: number;
  successRate: number;
  failureRate: number;
  avgLatencyMs: number;
  totalRetries: number;
  queueLength: number;
  byJob: Record<string, { executions: number; failures: number; avgLatencyMs: number }>;
};

/** Automation metrics — execution time, queue length, success/failure rates. */
export class AutomationMetrics {
  private readonly metrics: JobMetric[] = [];
  private queueLength = 0;

  recordJob(metric: JobMetric): void {
    this.metrics.push(metric);
  }

  setQueueLength(length: number): void {
    this.queueLength = length;
  }

  getSnapshot(): MetricsSnapshot {
    const total = this.metrics.length;
    const successes = this.metrics.filter((m) => m.success).length;
    const failures = total - successes;
    const avgLatencyMs = total
      ? this.metrics.reduce((s, m) => s + m.latencyMs, 0) / total
      : 0;
    const totalRetries = this.metrics.reduce((s, m) => s + m.retries, 0);

    const byJob: MetricsSnapshot['byJob'] = {};
    for (const m of this.metrics) {
      byJob[m.jobId] ??= { executions: 0, failures: 0, avgLatencyMs: 0 };
      byJob[m.jobId]!.executions++;
      if (!m.success) byJob[m.jobId]!.failures++;
    }
    for (const [jobId, stats] of Object.entries(byJob)) {
      const jobMetrics = this.metrics.filter((m) => m.jobId === jobId);
      stats.avgLatencyMs =
        jobMetrics.reduce((s, m) => s + m.latencyMs, 0) / jobMetrics.length;
    }

    return {
      totalExecutions: total,
      successRate: total ? successes / total : 0,
      failureRate: total ? failures / total : 0,
      avgLatencyMs,
      totalRetries,
      queueLength: this.queueLength,
      byJob,
    };
  }

  clear(): void {
    this.metrics.length = 0;
    this.queueLength = 0;
  }
}

export const automationMetrics = new AutomationMetrics();
