# Image Processing (MVP)

Sprint 9 image handling — **module-local**, not a platform package.

> Promote to `packages/image` only when 3+ projects need the same functions.

---

## Location

`apps/web/modules/naver-commerce/services/image-service.ts`

---

## Functions

| Function | Description |
|----------|-------------|
| `download()` | Copy local file or fetch HTTP URL |
| `resize()` | Max dimension resize (default 1200px) |
| `webp()` | Convert to WebP (quality 85) |
| `removeMetadata()` | Strip EXIF/metadata |
| `thumbnail()` | 200×200 cover crop WebP |
| `processAll()` | Full pipeline: download → clean → resize → webp |
| `zip()` | Bundle images for upload |
| `hash()` | SHA-256 duplicate detection |

---

## Output Directory

```
.naver-commerce/images/
├── sample-clean.png
├── sample-clean-1200.png
├── sample-clean-1200.webp
├── sample-clean-1200-thumb.webp
└── product-images.zip
```

Gitignored — not committed to repo.

---

## Dependencies

- `sharp` — image processing (only in `apps/web`)
- `archiver` — ZIP creation

---

## Pipeline Integration

`pipeline-service.ts` calls:

```typescript
const processed = await imageService.processAll(page.downloads);
const zipPath = await imageService.zip(processed.webp);
```

If no images found, step status = `skipped`.

---

## Future: Platform Promotion Criteria

Promote to `packages/image` when:

- [ ] Used by 3+ modules/projects
- [ ] Background removal adapter needed
- [ ] Watermark/compression presets shared
- [ ] Hash dedup across multiple pipelines

Until then, keep in `modules/naver-commerce`.
