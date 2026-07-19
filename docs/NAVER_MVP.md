# Naver Commerce MVP

Sprint 9 — First production feature built on existing platforms.

> **Principle:** No new platform packages. Build product features first; promote to platform only when reused across 3+ projects.

---

## Goal

Automatically register products to Naver Smart Store:

```
Product URL → Browser Crawl → Extract → AI Content → Image Optimize → Draft Save
```

---

## Module Location

```
apps/web/modules/naver-commerce/
├── components/     UI (dashboard, preview, pipeline status)
├── hooks/          useProductPipeline
├── services/       pipeline, extractor, image, AI, draft
├── types/          ProductDraft, ExtractedProduct, etc.
└── utils/          URL validation
```

---

## UI

Open [http://localhost:3000/naver-commerce](http://localhost:3000/naver-commerce)

| Screen | Description |
|--------|-------------|
| URL Input | Enter product URL (or `test` for local fixture) |
| Pipeline Status | Step-by-step progress |
| Product Preview | Editable title, description, options |
| Image Preview | Optimized WebP paths |
| AI Preview | Generated title, summary, SEO keywords |
| Upload Result | Draft ID and save path |
| Logs | Pipeline execution log |

---

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/naver-commerce/import` | Run full import pipeline |
| POST | `/api/naver-commerce/draft` | Save/update draft JSON |

---

## Platforms Used

| Platform | Usage |
|----------|-------|
| `@repo/browser` | Playwright crawl (HTML, screenshot, images) |
| `@repo/ai` | Title, summary, description, SEO keywords |
| `@repo/automation` | Future: scheduled re-import jobs |
| `@repo/mcp` | Future: MCP tool integration |

**Not a platform:** `services/image-service.ts` uses Sharp directly — promote to `packages/image` only when needed elsewhere.

---

## Product Draft Format

Saved to `.naver-commerce/drafts/DRAFT-XXXXXXXX.json`:

```json
{
  "id": "DRAFT-A1B2C3D4",
  "version": "1.0",
  "status": "draft",
  "product": { "title", "description", "price", "options", "shipping", "seoKeywords" },
  "images": { "original", "optimized", "thumbnail", "zipPath" },
  "metadata": { "traceId", "aiGenerated" }
}
```

Compatible with future Naver Smart Store API upload (Sprint 11).

---

## Development

```bash
# Local fixture (no external URL needed)
# Enter "test" in URL field

pnpm --filter web test          # unit + integration tests
pnpm --filter @repo/browser install:browsers  # first time only
```

---

## Related Docs

- [PRODUCT_PIPELINE.md](./PRODUCT_PIPELINE.md)
- [IMAGE_PROCESS.md](./IMAGE_PROCESS.md)
