import type { Page } from 'playwright';
import path from 'node:path';

import { ensureDir } from '../utils/paths';

export type ScreenshotOptions = {
  fullPage?: boolean;
  path?: string;
  selector?: string;
};

export async function screenshotPage(page: Page, options: ScreenshotOptions = {}): Promise<string> {
  const filePath =
    options.path ?? path.join(process.cwd(), '.browser-temp', 'screenshots', `${Date.now()}.png`);
  ensureDir(path.dirname(filePath));

  if (options.selector) {
    await page.locator(options.selector).screenshot({ path: filePath });
  } else {
    await page.screenshot({ path: filePath, fullPage: options.fullPage ?? false });
  }

  return filePath;
}

export async function screenshotViewport(page: Page, filePath?: string): Promise<string> {
  return screenshotPage(page, { fullPage: false, path: filePath });
}

export async function screenshotFullPage(page: Page, filePath?: string): Promise<string> {
  return screenshotPage(page, { fullPage: true, path: filePath });
}

export async function screenshotElement(
  page: Page,
  selector: string,
  filePath?: string,
): Promise<string> {
  return screenshotPage(page, { selector, path: filePath });
}
