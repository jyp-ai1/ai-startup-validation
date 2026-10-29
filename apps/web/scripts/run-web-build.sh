#!/bin/sh
# Preview may call OpenAI before next build. A compare failure must not skip the build.
node scripts/preview-quality-compare-once.mjs
echo "preview-quality-compare-exit=$?"
exec next build
