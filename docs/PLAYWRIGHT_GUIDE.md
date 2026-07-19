# Playwright Guide

How to use `@repo/browser` without importing Playwright in apps.

---

## Installation

Playwright lives only in `packages/browser`:

```bash
pnpm --filter @repo/browser install:browsers
```

---

## Crawl API

```typescript
import { crawlPages } from '@repo/browser';

const result = await crawlPages({
  urls: ['https://smartstore.naver.com/product/123'],
  screenshotDir: '/tmp/screenshots',
  downloadDir: '/tmp/downloads',
});

// result.results[0]:
// { url, title, html, htmlLength, screenshotPath, downloads, loadTimeMs, domReadyMs }
```

When `urls` is empty but `files` is provided (from pipeline), crawls local test fixture.

---

## Low-Level API

```typescript
import { createBrowserPlatform } from '@repo/browser';

const platform = createBrowserPlatform({ headless: true });

const manager = await platform.manager.launch();
const browser = manager.getBrowser();
const context = await platform.context.createContext(browser, {
  locale: 'ko-KR',
  timezone: 'Asia/Seoul',
  mobile: false,
});
const page = await platform.page.newPage(context);

import { goto } from '@repo/browser';
await goto(page, 'https://example.com');
```

---

## Selectors with Fallback

```typescript
import { queryWithFallback, css, getByText, getByRole } from '@repo/browser';

const element = await queryWithFallback(page, [
  css('#product-title'),
  getByText('상품명'),
  getByRole('heading', 'Product'),
]);
```

---

## Next.js Configuration

```typescript
// apps/web/next.config.ts
serverExternalPackages: ['playwright'],
transpilePackages: [..., '@repo/browser'],
```

Import `@repo/browser` only in server code (API routes, server actions, automation jobs).

---

## Sprint 8 Validation

```
browser.crawl (real)
  → Playwright Launch
  → Open Local Test Page
  → Extract HTML
  → Screenshot
  → Download Test Image
  → Return Result
```

Verified by integration test + Naver pipeline E2E test.
