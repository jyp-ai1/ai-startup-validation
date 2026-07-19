export type PageMetrics = {
  url: string;
  loadTimeMs: number;
  domReadyMs: number;
  networkIdleMs?: number;
};

export class BrowserMetrics {
  private readonly metrics: PageMetrics[] = [];

  record(metric: PageMetrics): void {
    this.metrics.push(metric);
  }

  getSnapshot(): {
    totalPages: number;
    avgLoadTimeMs: number;
    avgDomReadyMs: number;
  } {
    const total = this.metrics.length;
    const avgLoadTimeMs = total
      ? this.metrics.reduce((s, m) => s + m.loadTimeMs, 0) / total
      : 0;
    const avgDomReadyMs = total
      ? this.metrics.reduce((s, m) => s + m.domReadyMs, 0) / total
      : 0;
    return { totalPages: total, avgLoadTimeMs, avgDomReadyMs };
  }

  clear(): void {
    this.metrics.length = 0;
  }
}

export const browserMetrics = new BrowserMetrics();
