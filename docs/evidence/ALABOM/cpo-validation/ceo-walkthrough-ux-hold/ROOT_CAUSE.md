# Root Cause — CEO Walkthrough Question Not Visible

## Failure point

**Layer:** S11 Surface Presenter (`build-thinking-surface-presenter.ts`)

**Condition:** Adaptive engine selects a gap (`pricingHint`, `revenueModel`, etc.) whose Memory fact is already `confirmed`, so `presentThinking()` returns `issueId: null`.

**Bug:** Ask-mode presenter returned empty surface before reading `gapQuestionText`:

```typescript
// BEFORE (broken)
if (options.mode === 'ask') {
  if (!issueId) return base;  // nextQuestion stays ''
  ...
}
```

## Secondary failure

**Layer:** `workspace-s11-surface.tsx`

```typescript
const showQuestion = Boolean(surface.question.text.trim());
// → false → entire surface-question section omitted from DOM
```

Textarea still mounted with `issues.bm_design.placeholder` → user sees placeholder as only cue.

## Submit same-screen (UX)

After answer, `presentS11Surface` update mode cleared question text. User returned to answer UI without visible **지금 질문**, appearing stuck even when engine advanced.

## Verification

Unit test reproduces confirmed-revenue + adaptive pricing ask → empty surface before fix, non-empty after.
