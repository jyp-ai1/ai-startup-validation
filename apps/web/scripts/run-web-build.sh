#!/bin/sh
# Preview may call OpenAI before next build. A compare failure must not skip the build.
node scripts/preview-quality-compare-once.mjs || echo "preview-quality-compare-exit=$?"
if [ "$VERCEL_ENV" = "preview" ]; then
  if [ -n "$VERCEL_GIT_COMMIT_REF" ]; then
    if [ "$VERCEL_GIT_COMMIT_REF" != "main" ]; then
      AI_PM_REAL_GPT_SPRINT2_CLOSEOUT=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-sprint2-closeout.live.test.ts || echo "preview-real-gpt-sprint2-closeout-exit=$?"
      AI_PM_REAL_GPT_NEXT_OBJECTIVE=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-next-objective.live.test.ts || echo "preview-real-gpt-next-objective-exit=$?"
      AI_PM_REAL_GPT_NEXT_AREA=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-next-area.live.test.ts || echo "preview-real-gpt-next-area-exit=$?"
      AI_PM_REAL_GPT_CONSULTING_LOOP=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-consulting-loop.live.test.ts || echo "preview-real-gpt-consulting-loop-exit=$?"
      AI_PM_REAL_GPT_QUALITY_FIX_11=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-quality-fix-11.live.test.ts || echo "preview-real-gpt-quality-fix-11-exit=$?"
      AI_PM_REAL_GPT_QUALITY_FIX_10=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-quality-fix-10.live.test.ts || echo "preview-real-gpt-quality-fix-10-exit=$?"
      AI_PM_REAL_GPT_QUALITY_FIX_9=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-quality-fix-9.live.test.ts || echo "preview-real-gpt-quality-fix-9-exit=$?"
      AI_PM_REAL_GPT_QUALITY_FIX_8=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-quality-fix-8.live.test.ts || echo "preview-real-gpt-quality-fix-8-exit=$?"
      AI_PM_REAL_GPT_QUALITY_FIX_6=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-quality-fix-6.live.test.ts || echo "preview-real-gpt-quality-fix-6-exit=$?"
      AI_PM_REAL_GPT_QUALITY_FIX_5=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-quality-fix-5.live.test.ts || echo "preview-real-gpt-quality-fix-5-exit=$?"
      AI_PM_REAL_GPT_QUALITY_FIX_4=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-quality-fix-4.live.test.ts || echo "preview-real-gpt-quality-fix-4-exit=$?"
      AI_PM_REAL_GPT_MULTI_ROUND=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-multi-round.live.test.ts || echo "preview-real-gpt-multi-round-exit=$?"
      AI_PM_REAL_GPT_QUALITY_FIX_2=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-quality-fix-2.live.test.ts || echo "preview-real-gpt-quality-fix-2-exit=$?"
      AI_PM_REAL_GPT_QUALITY_FIX=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-quality-fix.live.test.ts || echo "preview-real-gpt-quality-fix-exit=$?"
      AI_PM_REAL_GPT_CONTINUITY=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-continuity.live.test.ts || echo "preview-real-gpt-continuity-exit=$?"
      AI_PM_CONSULTING_ROUND4=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-consulting-round4.live.test.ts || echo "preview-consulting-round4-exit=$?"
      AI_PM_CONSULTING_STAGE_JUDGMENT=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-consulting-stage-judgment.live.test.ts || echo "preview-consulting-stage-judgment-exit=$?"
      AI_PM_CONSULTING_STAGE_READING=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-consulting-stage-reading.live.test.ts || echo "preview-consulting-stage-reading-exit=$?"
      AI_PM_CONSULTING_STAGE_CONTRACT=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-consulting-stage-contract.live.test.ts || echo "preview-consulting-stage-contract-exit=$?"
      AI_PM_CONSULTING_STAGE_LIVE=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-consulting-stage.live.test.ts || echo "preview-consulting-stage-exit=$?"
      AI_PM_PRODUCT_REANALYSIS_ONCE=1 pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-product-reanalysis-once.live.test.ts || echo "preview-product-reanalysis-exit=$?"
    fi
  fi
fi
exec next build
