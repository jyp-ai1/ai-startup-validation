# Conversation UX Simplification — CTO QA Checklist

**Baseline engine SHA:** `4755e27` (Core Engine CPO PASS)  
**UX change SHA:** _pending deploy commit_  
**CPO UX PASS:** **NOT declared**  
**CEO Walkthrough:** **HOLD**

## AC checklist

| AC | Criterion | Verify | Status |
|----|-----------|--------|--------|
| AC1 | Default top shows **project name only** (not long business description) | Open workspace with seed project; header shows name; seed in `사업 내용 보기 ▾` | ☐ Local impl |
| AC2 | BUSINESS/CUSTOMER/PROBLEM not visible by default | Shared understanding panel collapsed; no uppercase field labels on surface | ☐ Local impl |
| AC3 | Visual order: question → input → submit → why → understanding → internal | Inspect loop panel DOM order / mobile 390×844 | ☐ Local impl |
| AC4 | Why Now collapsed by default (`▸ 왜 지금 이 질문인가요?`) | `<details>` closed on first paint | ☐ Local impl |
| AC5 | Sidebar shows 4 user steps OR simple progress hint | Desktop sidebar + mobile `conversation-progress-bar` | ☐ Local impl |
| AC6 | No gap/score/state machine on default UI | No visible % / judgment / critical-gap on default surface | ☐ Local impl |
| AC7 | No user-visible "gap", "critical", "Business OneLiner", "현재 판단" | Scan visible copy on question screen | ☐ Local impl |
| AC8 | 390×844 first screen: name, stage hint, question, input without scroll | Playwright viewport 390×844 screenshot | ☐ Pending capture |
| AC9 | Detail in collapsed sections only (`상세 보기`, understanding, why) | Expand toggles reveal engine detail | ☐ Local impl |
| AC10 | Core engine regression unchanged | `core-final-stabilization` 77/77 + prod smoke reAsk=0 | ☑ 77/77 · ☐ prod smoke |

## Regression gates (engine)

```text
Unit:  core-final-stabilization.test.ts — 77/77 PASS (local)
Live:  _cpo-real-adaptive-prod-capture.spec.ts — PENDING post-deploy
Must:  reAsk=0 · wrong-slot=0 · P0-1/P0-2 immediate PASS preserved
```

## Build

| Step | Result |
|------|--------|
| `pnpm build` | PASS (local) |
| Typecheck / lint | PASS (pre-existing sidebar-nav warning only) |

## Screenshot plan

| Viewport | File (post-capture) |
|----------|---------------------|
| Desktop 1440×900 | `media/after-desktop-question.png` |
| Mobile 390×844 | `media/after-mobile-question.png` |
| BEFORE reference | `../real-adaptive-vnext/media/002-02-first-ask.png` |

## Verdict block (fill after prod smoke)

```text
CTO QA UX Sprint: PENDING @ <deploy-sha>
Engine regression: PENDING
AC1-AC10: PENDING live verification
CPO UX PASS: NOT declared
CEO Walkthrough: HOLD
```
