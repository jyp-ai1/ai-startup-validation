# Screenshots — Conversation UX Simplification

## BEFORE (reference — Core Engine baseline UI)

| Viewport | Path |
|----------|------|
| Desktop first ask | `../real-adaptive-vnext/media/002-02-first-ask.png` |
| Adaptive loop | `../real-adaptive-vnext/media/011-10-adaptive-l1.png` |

## AFTER (pending post-deploy capture)

| Viewport | Path | Status |
|----------|------|--------|
| Desktop question screen | `after-desktop-question.png` | PENDING |
| Mobile 390×844 | `after-mobile-question.png` | PENDING |

Capture command (post-deploy):

```bash
cd apps/web
pnpm exec playwright test e2e/_cpo-real-adaptive-prod-capture.spec.ts --grep "smoke" --project=chromium
```

Add viewport-specific captures with Playwright `page.setViewportSize({ width: 390, height: 844 })` on first-ask step.
