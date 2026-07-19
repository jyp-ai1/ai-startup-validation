# Product Pipeline

End-to-end flow for Naver Commerce MVP.

---

## Pipeline Steps

```
1. validate       URL 검증
2. crawl          @repo/browser — Playwright Chromium
3. extract        Cheerio HTML parser → ExtractedProduct
4. optimize-images Sharp (module-local image-service)
5. generate-ai    @repo/ai — title, summary, description, SEO
6. save-draft     JSON draft → .naver-commerce/drafts/
```

---

## Data Flow

```
ImportProductInput { url }
        ↓
resolveCrawlUrl() → file:// fixture or https:// URL
        ↓
crawlPages() → { html, title, downloads, screenshotPath }
        ↓
extractProductFromHtml() → ExtractedProduct
        ↓
ImageService.processAll() → { original, webp, thumbnail, zipPath }
        ↓
generateProductContent() → AiProductContent
        ↓
createProductDraft() → ProductDraft
        ↓
saveDraft() + uploadDraftToNaver() → { productId, savedPath }
```

---

## Platform Boundaries

| Layer | Responsibility |
|-------|----------------|
| `pipeline-service.ts` | Orchestration only — no business logic duplication |
| `@repo/browser` | Browser automation, never imported in UI components |
| `@repo/ai` | LLM calls, never OpenAI SDK in module |
| `image-service.ts` | MVP-local Sharp processing |
| `draft-service.ts` | Draft persistence |

---

## Error Handling

Each step updates `PipelineStepState.status`:
- `running` → in progress
- `completed` → success with message
- `failed` → pipeline stops, error returned
- `skipped` → optional step (no images, AI disabled)

---

## Retry

UI provides "재시도" button → re-runs full pipeline with same URL.

Future: `@repo/automation` scheduler for batch re-import.

---

## Testing

```bash
pnpm --filter web test
```

Integration test runs real Playwright against local fixture — no external websites.
