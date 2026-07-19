# Browser Platform

Sprint 8 introduces `@repo/browser` — production Playwright browser automation.

> **Rule:** Playwright is installed **only** in `@repo/browser`. Applications never import Playwright directly.

---

## Architecture

```
BrowserManager
    ↓
BrowserPool
    ↓
ContextManager
    ↓
PageManager
    ↓
Playwright Adapter
    ↓
Real Chromium
```

---

## Package Structure

```
packages/browser/src/
├── manager/       BrowserManager — launch, close, restart, healthCheck
├── pool/          BrowserPool — reuse, max instances, idle timeout
├── context/       ContextManager — persistent, mobile, locale, timezone
├── page/          PageManager — newPage, close, reload
├── navigation/    goto, waitForNavigation, networkIdle
├── selectors/     css, xpath, text, role + fallback
├── download/      DownloadManager — images, dedup by hash
├── cookies/       CookieManager — save, load, export, import
├── screenshot/    fullPage, element, viewport
├── network/       NetworkMonitor — requests, responses, failures
├── playwright/    PlaywrightCrawler — high-level crawl API
└── index.ts       createBrowserPlatform()
```

---

## Usage

```typescript
import { browser } from '@/lib/browser/platform';

// Crawl local or remote pages
const result = await browser.crawl({
  urls: ['https://example.com'],
});

// Or via automation job
import { automation } from '@/lib/automation/platform';
await automation.runner.run('browser.crawl', { urls: [...] });
```

---

## Integration: browser.crawl Job

The `browser.crawl` automation job now uses **real Playwright**:

1. Launch Chromium (headless)
2. Open page (local fixture in tests, real URLs in production)
3. Extract HTML + title
4. Take full-page screenshot
5. Download product images
6. Return structured result

---

## Local Test Fixture

Tests use `src/test-fixtures/test-page.html` — **no external websites**.

```bash
pnpm --filter @repo/browser install:browsers  # first time
pnpm --filter @repo/browser test
```

---

## Related Docs

- [PLAYWRIGHT_GUIDE.md](./PLAYWRIGHT_GUIDE.md)
- [SESSION_MANAGEMENT.md](./SESSION_MANAGEMENT.md)
- [DOWNLOAD_MANAGER.md](./DOWNLOAD_MANAGER.md)
