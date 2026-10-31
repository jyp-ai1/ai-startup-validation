#!/bin/sh
# Preview may call OpenAI before next build. A compare failure must not skip the build.
node scripts/preview-quality-compare-once.mjs
echo "preview-quality-compare-exit=$?"
if [ "$VERCEL_ENV" = "preview" ]; then
  if [ -n "$VERCEL_GIT_COMMIT_REF" ]; then
    if [ "$VERCEL_GIT_COMMIT_REF" != "main" ]; then
      AI_PM_PRODUCT_REANALYSIS_ONCE=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-product-reanalysis-once.live.test.ts
      echo "preview-product-reanalysis-exit=$?"
    fi
  fi
fi
exec next build
