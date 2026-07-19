import type { Page, Request, Response } from 'playwright';

import type { NetworkEntry } from '../types';

/** Monitor network requests on a page. */
export class NetworkMonitor {
  private readonly entries: NetworkEntry[] = [];

  attach(page: Page): () => void {
    const onRequest = (req: Request) => {
      this.entries.push({
        url: req.url(),
        method: req.method(),
        resourceType: req.resourceType(),
        failed: false,
      });
    };

    const onResponse = (res: Response) => {
      const existing = this.entries.find((e) => e.url === res.url() && !e.status);
      if (existing) existing.status = res.status();
    };

    const onFailed = (req: Request) => {
      this.entries.push({
        url: req.url(),
        method: req.method(),
        resourceType: req.resourceType(),
        failed: true,
      });
    };

    page.on('request', onRequest);
    page.on('response', onResponse);
    page.on('requestfailed', onFailed);

    return () => {
      page.off('request', onRequest);
      page.off('response', onResponse);
      page.off('requestfailed', onFailed);
    };
  }

  getEntries(): NetworkEntry[] {
    return [...this.entries];
  }

  getFailed(): NetworkEntry[] {
    return this.entries.filter((e) => e.failed);
  }

  clear(): void {
    this.entries.length = 0;
  }
}
