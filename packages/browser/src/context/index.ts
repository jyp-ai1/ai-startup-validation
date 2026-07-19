import type { Browser, BrowserContext } from 'playwright';

import type { ContextOptions } from '../types';

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1280, height: 720 };

/** Create and configure browser contexts. */
export class ContextManager {
  async createContext(browser: Browser, options: ContextOptions = {}): Promise<BrowserContext> {
    const viewport = options.viewport ?? (options.mobile ? MOBILE_VIEWPORT : DESKTOP_VIEWPORT);

    const contextOptions = {
      locale: options.locale ?? 'ko-KR',
      timezoneId: options.timezone ?? 'Asia/Seoul',
      viewport,
      userAgent: options.userAgent,
      ...(options.storageStatePath ? { storageState: options.storageStatePath } : {}),
    };

    if (options.persistent) {
      // Persistent context requires userDataDir — use launchPersistentContext at manager level in future
      return browser.newContext(contextOptions);
    }

    return browser.newContext(contextOptions);
  }

  async closeContext(context: BrowserContext): Promise<void> {
    await context.close();
  }
}

export const contextManager = new ContextManager();

export type { ContextOptions };
