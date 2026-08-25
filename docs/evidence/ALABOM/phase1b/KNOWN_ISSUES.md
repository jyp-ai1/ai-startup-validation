# ALABOM Phase 1-B — Known Issues (Final CPO package)

```text
Date: 2026-08-25
Head: ff239a7+ (see git main tip)
```

## KI-1 — D2 Auth durable persistence (CEO / CPO gate)

| Field | Value |
|-------|--------|
| **Severity** | Known Issue — Demo-equivalent proven; Auth account walk blocked by env |
| **Matrix** | D2 Auth durable |
| **Evidence #** | 14 |
| **Status** | **OPEN** — no Production Auth credentials / E2E Auth secrets in agent environment (`.env.local` has no E2E/TEST_USER/AUTH keys) |
| **Honest gap** | Auth account refresh/resume on Production was **not** walked. No Auth screenshots invented. |
| **Demo-equivalent proof** | C1 LIVE — Demo `sessionStorage` loop survives reload (`media/13-refresh-persist.png`). Same Understanding / Memory contracts as Auth path. |
| **CEO / CPO gate** | Accept KI-1 for Final CPO Review **or** supply Auth test account for a follow-up LIVE walk before CEO Walkthrough A+B. |
| **§29** | Not escalated — not a contract break. |

## Closed (not Known Issues)

- C1 Refresh · D3 Mobile Hero · E3 Review Retry · F1 Idea seed — PASS LIVE/unit  
- Deep LIVE: Contradiction · Processing · Update · Stage · Evidence-first Hero=1 · Retry  
