# ALABOM Phase 1-B — Known Issues (Final CPO package)

```text
Date: 2026-08-25
Head: see git main tip
```

## KI-1 — D2 Auth durable persistence (CEO gate)

| Field | Value |
|-------|--------|
| **Severity** | Known Issue — does **not** block Demo-equivalent DoD proof |
| **Matrix** | D2 Auth durable |
| **Evidence #** | 14 |
| **Status** | **OPEN** — no Production Auth credentials / E2E Auth secrets in this environment |
| **Honest gap** | Auth account refresh/resume on Production was **not** walked. Do not invent Auth screenshots. |
| **Demo-equivalent proof** | C1 LIVE — Demo `sessionStorage` loop survives reload (`media/13-refresh-persist.png`). Understanding contracts shared with Auth path. |
| **CEO / CPO gate** | Accept as Known Issue for Final CPO **or** supply Auth test account for a follow-up LIVE walk before CEO Walkthrough. |
| **§29** | Not escalated — not a contract break; documentation-only gap. |

## KI-2 — Review Retry LIVE probe depends on tip

| Field | Value |
|-------|--------|
| **Matrix** | E3 |
| **Note** | Retry UI shipped in `f15f940`. Demo QA probe `?forceReviewError=1` ships in follow-up commit for honest LIVE #15 capture after tip catch-up. |

## Closed this session (not Known Issues)

- C1 Refresh, D3 Mobile Hero, F1 Idea seed — PASS LIVE/unit (prior)
- Deep LIVE targets in progress: Contradiction · Processing · Update · Stage · Evidence-first
