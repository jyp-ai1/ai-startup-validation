import type { Page } from 'playwright';

import type { NavigationOptions } from '../types';
import { NavigationError } from '../errors';

export async function goto(page: Page, url: string, options: NavigationOptions = {}): Promise<void> {
  try {
    await page.goto(url, {
      waitUntil: options.waitUntil ?? 'domcontentloaded',
      timeout: options.timeout ?? 30_000,
    });
  } catch (error) {
    throw new NavigationError(
      url,
      error instanceof Error ? error.message : 'Navigation failed',
    );
  }
}

export async function waitForNavigation(
  page: Page,
  options: NavigationOptions = {},
): Promise<void> {
  const waitUntil = options.waitUntil === 'commit' ? 'domcontentloaded' : (options.waitUntil ?? 'domcontentloaded');
  await page.waitForLoadState(waitUntil, {
    timeout: options.timeout ?? 30_000,
  });
}

export async function waitForNetworkIdle(page: Page, timeout = 10_000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

export async function waitForDomReady(page: Page, timeout = 10_000): Promise<void> {
  await page.waitForLoadState('domcontentloaded', { timeout });
}

export async function reload(page: Page): Promise<void> {
  await page.reload({ waitUntil: 'domcontentloaded' });
}

export async function goBack(page: Page): Promise<void> {
  await page.goBack({ waitUntil: 'domcontentloaded' });
}

export async function goForward(page: Page): Promise<void> {
  await page.goForward({ waitUntil: 'domcontentloaded' });
}
