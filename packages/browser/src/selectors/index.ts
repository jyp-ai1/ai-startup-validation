import type { Page, Locator } from 'playwright';

import type { SelectorQuery } from '../types';
import { SelectorNotFoundError } from '../errors';

export async function query(page: Page, selector: SelectorQuery): Promise<Locator> {
  switch (selector.strategy) {
    case 'css':
      return page.locator(selector.value);
    case 'xpath':
      return page.locator(`xpath=${selector.value}`);
    case 'text':
      return page.getByText(selector.value);
    case 'role':
      return page.getByRole(selector.role as 'link', { name: selector.name });
    default:
      return page.locator(selector.value);
  }
}

/** Try selectors in order — first match wins. */
export async function queryWithFallback(page: Page, selectors: SelectorQuery[]) {
  for (const s of selectors) {
    const loc = await query(page, s);
    const count = await loc.count();
    if (count > 0) return loc.first();
  }
  throw new SelectorNotFoundError(selectors.map((s) => s.value).join(' | '));
}

export function css(value: string): SelectorQuery {
  return { strategy: 'css', value };
}

export function xpath(value: string): SelectorQuery {
  return { strategy: 'xpath', value };
}

export function getByText(value: string): SelectorQuery {
  return { strategy: 'text', value };
}

export function getByRole(role: string, name?: string): SelectorQuery {
  return { strategy: 'role', value: role, role, name };
}
