import { BrowserManager } from './manager';
import { BrowserPool, browserPool } from './pool';
import { ContextManager, contextManager } from './context';
import { PageManager, pageManager } from './page';
import { PlaywrightCrawler, getPlaywrightCrawler, crawlPages } from './playwright';
import { browserLogger, browserEvents } from './events';
import { browserMetrics } from './metrics';
import { CookieManager } from './cookies';

export type BrowserPlatform = {
  manager: BrowserManager;
  pool: BrowserPool;
  context: ContextManager;
  page: PageManager;
  crawler: PlaywrightCrawler;
  cookies: CookieManager;
  logger: typeof browserLogger;
  events: typeof browserEvents;
  metrics: typeof browserMetrics;
  crawl: typeof crawlPages;
};

export function createBrowserPlatform(options?: {
  headless?: boolean;
  maxPoolSize?: number;
}): BrowserPlatform {
  const pool = new BrowserPool({
    maxInstances: options?.maxPoolSize ?? 3,
    launchOptions: { headless: options?.headless ?? true },
  });

  const crawler = new PlaywrightCrawler({ pool, headless: options?.headless ?? true });

  return {
    manager: new BrowserManager('default'),
    pool,
    context: contextManager,
    page: pageManager,
    crawler,
    cookies: new CookieManager('.browser-temp/cookies'),
    logger: browserLogger,
    events: browserEvents,
    metrics: browserMetrics,
    crawl: crawlPages,
  };
}

let defaultPlatform: BrowserPlatform | null = null;

export function getBrowserPlatform(): BrowserPlatform {
  if (!defaultPlatform) {
    defaultPlatform = createBrowserPlatform();
  }
  return defaultPlatform;
}

// Types
export type * from './types';

// Errors
export * from './errors';

// Manager & Pool
export { BrowserManager } from './manager';
export { BrowserPool, browserPool } from './pool';

// Context & Page
export { ContextManager, contextManager } from './context';
export { PageManager, pageManager } from './page';

// Navigation
export * from './navigation';

// Selectors
export * from './selectors';

// Screenshot
export * from './screenshot';

// Download & Cookies
export { DownloadManager } from './download';
export { CookieManager } from './cookies';

// Network
export { NetworkMonitor } from './network';

// Playwright / Crawl
export { PlaywrightCrawler, getPlaywrightCrawler, crawlPages } from './playwright';
export * from './crawl';

// Events & Metrics
export { browserLogger, browserEvents } from './events';
export { browserMetrics } from './metrics';

// Utils
export { getTestFixturePath, getTempDir } from './utils';

// Storage & Session
export * from './storage';
export * from './session';
