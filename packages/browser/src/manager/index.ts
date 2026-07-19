import { chromium, type Browser } from 'playwright';

import type { BrowserLaunchOptions, BrowserHealth } from '../types';
import { BrowserLaunchError, BrowserNotRunningError } from '../errors';
import { browserLogger, browserEvents } from '../events';

/** Launch and manage a Playwright browser instance. */
export class BrowserManager {
  private browser: Browser | null = null;
  readonly id: string;

  constructor(id?: string) {
    this.id = id ?? crypto.randomUUID();
  }

  async launch(options: BrowserLaunchOptions = {}): Promise<Browser> {
    if (this.browser) return this.browser;

    try {
      this.browser = await chromium.launch({
        headless: options.headless ?? true,
        slowMo: options.slowMo,
        args: options.args ?? ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      browserLogger.info('browser.launched', { browserId: this.id });
      browserEvents.emit({ type: 'browser.launched', browserId: this.id });
      return this.browser;
    } catch (error) {
      throw new BrowserLaunchError(
        error instanceof Error ? error.message : 'Failed to launch browser',
      );
    }
  }

  getBrowser(): Browser {
    if (!this.browser) throw new BrowserNotRunningError();
    return this.browser;
  }

  isRunning(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      browserLogger.info('browser.closed', { browserId: this.id });
      browserEvents.emit({ type: 'browser.closed', browserId: this.id });
    }
  }

  async restart(options: BrowserLaunchOptions = {}): Promise<Browser> {
    await this.close();
    return this.launch(options);
  }

  async healthCheck(): Promise<BrowserHealth> {
    return {
      healthy: this.isRunning(),
      browserCount: this.isRunning() ? 1 : 0,
      activeContexts: this.browser?.contexts().length ?? 0,
      activePages: this.browser?.contexts().reduce((s, c) => s + c.pages().length, 0) ?? 0,
    };
  }
}
