import type { Browser, BrowserContext, Page, Download } from 'playwright';

export type BrowserLaunchOptions = {
  headless?: boolean;
  slowMo?: number;
  args?: string[];
};

export type ContextOptions = {
  persistent?: boolean;
  incognito?: boolean;
  mobile?: boolean;
  locale?: string;
  timezone?: string;
  viewport?: { width: number; height: number };
  userAgent?: string;
  storageStatePath?: string;
};

export type NavigationOptions = {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeout?: number;
};

export type SelectorStrategy = 'css' | 'xpath' | 'text' | 'role';

export type SelectorQuery = {
  strategy: SelectorStrategy;
  value: string;
  role?: string;
  name?: string;
};

export type CrawlPageInput = {
  url: string;
  screenshotDir?: string;
  downloadDir?: string;
  takeScreenshot?: boolean;
  downloadImages?: boolean;
};

export type CrawlPageResult = {
  url: string;
  title: string;
  html: string;
  htmlLength: number;
  screenshotPath?: string;
  downloads: string[];
  loadTimeMs: number;
  domReadyMs: number;
};

export type CrawlInput = {
  urls?: string[];
  files?: string[];
  screenshotDir?: string;
  downloadDir?: string;
};

export type CrawlResult = {
  urls: string[];
  pages: number;
  results: CrawlPageResult[];
};

export type BrowserHealth = {
  healthy: boolean;
  browserCount: number;
  activeContexts: number;
  activePages: number;
  memoryMb?: number;
};

export type NetworkEntry = {
  url: string;
  method: string;
  status?: number;
  failed: boolean;
  resourceType: string;
};

export type BrowserEvent =
  | { type: 'browser.launched'; browserId: string }
  | { type: 'browser.closed'; browserId: string }
  | { type: 'page.loaded'; url: string; loadTimeMs: number }
  | { type: 'download.completed'; path: string };

export type { Browser, BrowserContext, Page, Download };
