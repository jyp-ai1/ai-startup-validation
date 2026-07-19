import { describe, it, expect } from 'vitest';

import { crawlPages } from './crawler';
import { getTestFixturePath } from '../utils/paths';

describe('PlaywrightCrawler integration', () => {
  it('opens local test page, extracts HTML, screenshot, downloads image', async () => {
    const fixtureUrl = getTestFixturePath();

    const result = await crawlPages({ urls: [fixtureUrl] });

    expect(result.pages).toBe(1);
    expect(result.urls[0]).toBe(fixtureUrl);

    const page = result.results[0]!;
    expect(page.title).toBe('Browser Platform Test Page');
    expect(page.htmlLength).toBeGreaterThan(100);
    expect(page.html).toContain('Product Test Page');
    expect(page.screenshotPath).toBeTruthy();
    expect(page.downloads.length).toBeGreaterThan(0);
    expect(page.loadTimeMs).toBeGreaterThan(0);
    expect(page.domReadyMs).toBeGreaterThan(0);
  }, 60_000);
});
