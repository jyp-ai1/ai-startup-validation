import type { Page } from 'playwright';

import { BrowserPool } from '../pool';
import { ContextManager } from '../context';
import { PageManager } from '../page';
import { goto, waitForDomReady } from '../navigation';
import { screenshotFullPage } from '../screenshot';
import { DownloadManager } from '../download';
import { NetworkMonitor } from '../network';
import { browserMetrics } from '../metrics';
import { browserLogger, browserEvents } from '../events';
import { getTestFixturePath, getTempDir } from '../utils/paths';
import type { CrawlInput, CrawlPageInput, CrawlPageResult, CrawlResult } from '../types';

export type PlaywrightCrawlerOptions = {
  pool?: BrowserPool;
  headless?: boolean;
};

/** High-level Playwright crawl — used by browser.crawl automation job. */
export class PlaywrightCrawler {
  private readonly pool: BrowserPool;
  private readonly contextManager = new ContextManager();
  private readonly pageManager = new PageManager();

  constructor(options: PlaywrightCrawlerOptions = {}) {
    this.pool = options.pool ?? new BrowserPool({ launchOptions: { headless: options.headless ?? true } });
  }

  async crawlPage(input: CrawlPageInput): Promise<CrawlPageResult> {
    const manager = await this.pool.acquire();
    const start = Date.now();

    try {
      const browser = manager.getBrowser();
      const context = await this.contextManager.createContext(browser, {
        locale: 'ko-KR',
        timezone: 'Asia/Seoul',
      });
      const page = await this.pageManager.newPage(context);

      const networkMonitor = new NetworkMonitor();
      networkMonitor.attach(page);

      const screenshotDir = input.screenshotDir ?? getTempDir('screenshots');
      const downloadDir = input.downloadDir ?? getTempDir('downloads');
      const downloadManager = new DownloadManager(downloadDir);

      const domStart = Date.now();
      await goto(page, input.url);
      await waitForDomReady(page);
      const domReadyMs = Date.now() - domStart;
      const loadTimeMs = Date.now() - start;

      const title = await page.title();
      const html = await page.content();

      let screenshotPath: string | undefined;
      if (input.takeScreenshot !== false) {
        screenshotPath = await screenshotFullPage(
          page,
          `${screenshotDir}/page-${Date.now()}.png`,
        );
      }

      const downloads: string[] = [];
      if (input.downloadImages !== false) {
        const imgPath = await downloadManager.downloadImage(page, '#product-image');
        if (imgPath) downloads.push(imgPath);
      }

      browserMetrics.record({ url: input.url, loadTimeMs, domReadyMs });
      browserEvents.emit({ type: 'page.loaded', url: input.url, loadTimeMs });
      browserLogger.info('page.crawled', { url: input.url, title, loadTimeMs });

      await this.pageManager.closePage(page);
      await this.contextManager.closeContext(context);

      return {
        url: input.url,
        title,
        html,
        htmlLength: html.length,
        screenshotPath,
        downloads,
        loadTimeMs,
        domReadyMs,
      };
    } finally {
      this.pool.release(manager);
    }
  }

  async crawl(input: CrawlInput): Promise<CrawlResult> {
    const urls = this.resolveUrls(input);
    const results: CrawlPageResult[] = [];

    for (const url of urls) {
      results.push(
        await this.crawlPage({
          url,
          screenshotDir: input.screenshotDir,
          downloadDir: input.downloadDir,
        }),
      );
    }

    return {
      urls: results.map((r) => r.url),
      pages: results.length,
      results,
    };
  }

  async shutdown(): Promise<void> {
    await this.pageManager.closeAll();
    await this.pool.closeAll();
  }

  private resolveUrls(input: CrawlInput): string[] {
    if (input.urls?.length) return input.urls;
    if (input.files?.length) {
      // Local dev: map files to test fixture for pipeline compatibility
      return [getTestFixturePath()];
    }
    return [getTestFixturePath()];
  }
}

let defaultCrawler: PlaywrightCrawler | null = null;

export function getPlaywrightCrawler(options?: PlaywrightCrawlerOptions): PlaywrightCrawler {
  if (!defaultCrawler) {
    defaultCrawler = new PlaywrightCrawler(options);
  }
  return defaultCrawler;
}

export async function crawlPages(input: CrawlInput): Promise<CrawlResult> {
  const crawler = getPlaywrightCrawler();
  try {
    return await crawler.crawl(input);
  } finally {
    await crawler.shutdown();
  }
}
