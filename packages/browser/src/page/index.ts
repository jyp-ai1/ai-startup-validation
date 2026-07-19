import type { BrowserContext, Page } from 'playwright';

/** Manage pages within a browser context. */
export class PageManager {
  private readonly pages = new Map<string, Page>();

  async newPage(context: BrowserContext): Promise<Page> {
    const page = await context.newPage();
    this.pages.set(page.url() || crypto.randomUUID(), page);
    return page;
  }

  async closePage(page: Page): Promise<void> {
    await page.close();
    for (const [key, p] of this.pages) {
      if (p === page) this.pages.delete(key);
    }
  }

  async closeAll(): Promise<void> {
    for (const page of this.pages.values()) {
      await page.close().catch(() => {});
    }
    this.pages.clear();
  }

  listPages(): Page[] {
    return [...this.pages.values()];
  }
}

export const pageManager = new PageManager();
