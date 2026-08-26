# ALABOM Phase 1-B — Evidence Package 01–20

```text
Folder: docs/evidence/ALABOM/phase1b/
Updated: 2026-08-26 (KI-1 Auth LIVE resume — FAIL at Login; Playwright chromium-1228 fixed)
Honesty rule: Code merge ≠ Evidence. Unit PASS ≠ live walkthrough.
Production: https://ai-startup-validation-tau.vercel.app
```

## Artifacts

| File | Purpose |
|------|---------|
| `unit-suite-result.json` | Vitest |
| `prod-smoke-2026-08-25.json` | HTTP smoke |
| `live-evidence-2026-08-25.json` | Session 5 surface LIVE |
| `deep-06-08-09-result.json` | Contradiction · Processing · Update |
| `deep-11-12-result.json` | Stage · Evidence-first Hero=1 |
| `deep-15-retry-result.json` | Review Retry LIVE |
| `KNOWN_ISSUES.md` | Auth durable (KI-1) — **OPEN** · CPO HOLD |
| `auth-live-ki1-result.json` | 2026-08-26 Auth LIVE resume (FAIL — expired storageState; QA profile not Auth) |
| `media/*.png` | LIVE screenshots |
| `REGRESSION_SIGNOFF.md` | S7/S8/S14/S16/S17 unit |

## Evidence checklist

| # | Item | Status | Proof |
|---|------|--------|-------|
| 01 | Strong PDF / Document First | **LIVE + UNIT** | `media/03-document-rich.png` |
| 02 | Weak PDF gap-only | **LIVE + UNIT** | `media/04-document-weak-pdf.png` |
| 03 | No filename-as-name | **LIVE + UNIT** | weak PDF assert |
| 04 | Provenance labels | **UNIT** | draft.provenance |
| 05 | Confidence / skip re-ask | **UNIT** | understanding-contract |
| 06 | Contradiction confirm | **LIVE + UNIT** | `media/06-contradiction-confirm.png` |
| 07 | Answer Quality | **UNIT** | answer-quality |
| 08 | Staged Processing | **LIVE + UNIT** | `media/08-processing-stages.png` |
| 09 | Before→After update | **LIVE + UNIT** | `media/09-understanding-update.png` |
| 10 | Summary/Detail + Spine | **UNIT** | spine + S11 |
| 11 | Stage Transition | **LIVE + UNIT** | `media/11-stage-final-review.png` |
| 12 | Evidence First + Hero=1 | **LIVE + UNIT** | `media/12-evidence-first-hero.png` · heroCount=1 |
| 13 | Memory + refresh | **LIVE + UNIT** | `media/13-refresh-persist.png` |
| 14 | Demo vs Auth | **LIVE Demo / Auth FAIL** | Demo LIVE; Auth resume → `media/14-auth-login-blocked.png` · KI-1 **OPEN** |
| 15 | Review cannot + error Retry | **LIVE + UNIT** | `media/15-review-retry.png` · demo `forceReviewError=1` |
| 16 | Mobile + Fatigue | **LIVE + UNIT** | `media/16-mobile-workspace.png` · `19-mobile-landing.png` |
| 17 | Brand Concept 3 | **LIVE + UNIT** | `media/01-landing-brand.png` |
| 18 | Correction / Why | **UNIT** | correction-and-why |
| 19 | Validation handoff + regression | **LIVE + UNIT** | handoff in #11 + REGRESSION_SIGNOFF |
| 20 | CEO Walkthrough A+B | **NOT STARTED** | After Final CPO open |

## Counts (honest)

| Kind | Count |
|------|------:|
| **LIVE** (or LIVE+UNIT) | **15** — 01–03, 06, 08–09, 11–13, 15–17, 19 (+ F1) |
| **UNIT only** | **4** — 04, 05, 07, 10, 18 |
| **Known Issue (CEO gate)** | **1** — #14 Auth durable (KI-1) |
| **NOT STARTED** | **1** — #20 CEO (post–Final CPO) |

Minimum live set (01,02,06,08,09,11,12,13,15,17): **10/10 LIVE**.

Do **not** invent screenshots.
