# ALABOM Conversation Validation — Known Issues

```text
Date: 2026-08-26
Source: Core Conversation Experience Validation Long Sprint
```

## KI-CQ-1 — Form-like / wrong-slot merge

| Field | Value |
|-------|--------|
| **Status** | **FIXED in engine** (pending CPO review — not CPO PASS) |
| **Fix tips** | `5c6cb20` · `f6338b8` · this sprint whyNow polish (working tree) |
| **Evidence** | `TRANSCRIPT.md` T2 semantic buyer routing; T7 competitor not CUSTOMER |

## KI-CQ-2 — Generic whyNow

| Field | Value |
|-------|--------|
| **Status** | **FIXED this sprint** (Living `whyNowForGapField` + i18n ban) |
| **Evidence** | Transcript Why This Question Now fields; unit assert no `다음 질문입니다` / empty-field template |

## KI-1 — Auth durable (HOLD)

Unchanged. Out of scope. Auth untouched.

## Open (P1 / Remaining Risks)

| ID | Issue | Notes |
|----|-------|-------|
| KI-CV-9 | Final analysis narrative drift vs journey spine | Seen on older Live pack; not batch-fixed |
| KI-CV-DIFF | Differentiation shares issue id with competitor | Conversational OK; finer slot split deferred |
| KI-CV-PROD | Judgment-first whyNow not on Production until commit/push | Tip `f6338b8` still has prior causality UI |
