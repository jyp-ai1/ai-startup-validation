# Download Manager

Image and file downloads in `@repo/browser`.

---

## DownloadManager

```typescript
import { DownloadManager } from '@repo/browser';

const dm = new DownloadManager('/tmp/downloads');

// Download image from page element
const path = await dm.downloadImage(page, '#product-image');
```

---

## Features

| Feature | Status |
|---------|--------|
| Image download (file:// and relative) | ✅ |
| Duplicate detection (SHA-256 hash) | ✅ |
| Custom destination directory | ✅ |
| PDF / file download events | 🔜 Sprint 11 |
| HTTP remote URL fetch | 🔜 Sprint 11 |

---

## Duplicate Detection

Same image downloaded twice → second download skipped (hash match).

```typescript
dm.clearSeen();  // reset between pipeline runs
```

---

## Pipeline Integration

`browser.crawl` automatically downloads `#product-image` and returns paths in `results[].downloads`.

Downstream `image.optimize` job receives download paths via pipeline variables.

---

## Artifact Storage

Default temp dir: `.browser-temp/downloads/` (gitignored)

Production: configure `downloadDir` in crawl input or job context.
