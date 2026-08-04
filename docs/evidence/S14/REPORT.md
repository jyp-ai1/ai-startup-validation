# S14 Evidence Package — Live Walkthrough (RC Localhost)

**Gate request:** Product Evidence completion (Push/Deploy still HOLD)  
**Environment:** RC only — `http://127.0.0.1:3000`  
**Feature changes:** none (evidence + capture harness only)

## Fingerprints

| Field | Value |
|-------|--------|
| RC Code SHA | `4da05a1fef3019d411a32810e902f1014b131d41` |
| Port | `http://127.0.0.1:3000` |
| Live video | `media/s14-live-walkthrough.webm` |
| Memory trail | `media/live-memory-trail.json` |
| Unit append machine proof | `06-memory-append.json` |

---

## Memory overwrite ban (explicit)

**Expected**

```text
business kept
+ customer added
→ business kept, customer kept
+ problem added
→ business kept, customer kept, problem kept
```

Same Fact **key** may update its value (per-key upsert).  
**Other Fact keys must never be wiped** when a new Loop answer arrives.

**Observed (Live)**

```text
[] 
→ [business]
→ [business, customer, buyer, market]   ← prior keys retained (no wipe)
```

- Loop turns included `customer_definition` → `market_validation` → `problem_definition`
- Engine AnalysisInput at Review: `problem=confirmed` (see trail JSON)
- Memory bag key `problem` lagged vs turn at end-of-capture — Known (not wipe)

**Evidence:** `media/live-memory-trail.json` · `06-memory-append.json`  
**Result:** PASS on overwrite ban (keys accumulate). Soft note on `problem` bag lag.

---

## Scenarios

### 1) Live Walkthrough (primary Product Evidence)

| | |
|--|--|
| **Expected** | Live UI: Loop → Answer → Memory append → Evidence ↑ → Review Gate → Analysis (Presenter). Competitor only after analysis. |
| **Observed** | RC demo filmed ~53s. HUD stages show Memory / Evidence / Review (`canStart=true`) / Analysis (`hasAnalysis=true`) / Competitor post-analysis. Analysis Presenter shows Decision · Insight · Action/Why/CTA (`RevenueValidation = Insufficient`). |
| **Evidence file** | `media/s14-live-walkthrough.webm` |
| **Result** | PASS |

### 2) Memory trail (append-only)

| | |
|--|--|
| **Expected** | `[] → [business] → [business, customer] → [business, customer, problem]` without wipe. JSON original included. |
| **Observed** | Live bag: `[] → [business] → [business, customer, buyer, market]`. Turns include `problem_definition`. Unit JSON trail proves exact expected shape including problem key update without wipe. |
| **Evidence file** | `media/live-memory-trail.json` · `06-memory-append.json` · `06-memory-append.png` |
| **Result** | PASS (Live append + Unit exact trail). Soft: Live bag `problem` key lag vs turn. |

### 3) Frame — Memory

| | |
|--|--|
| **Expected** | Real Workspace shows Memory/understanding after Loop start. |
| **Observed** | Document ingested; Loop on `customer_definition`. |
| **Evidence file** | `media/live-01-memory.png` |
| **Result** | PASS |

### 4) Frame — Evidence Status

| | |
|--|--|
| **Expected** | After payer answer, Evidence/고객 confirmed path visible; Memory append note. |
| **Observed** | Customer shown in shared understanding; facts begin with `business`; turn `customer_definition` present; market next. |
| **Evidence file** | `media/live-02-evidence-status.png` |
| **Result** | PASS |

### 5) Frame — Memory append (multi-key)

| | |
|--|--|
| **Expected** | Multiple Facts retained; Review CTA available when Evidence gap closed. |
| **Observed** | facts `[business, customer, buyer, market]`; turns include `problem_definition`; **검토 시작** enabled. |
| **Evidence file** | `media/live-03-memory-append.png` |
| **Result** | PASS |

### 6) Frame — Review Gate

| | |
|--|--|
| **Expected** | Review Gate active (`canStart=true`), clickable 검토 시작. |
| **Observed** | HUD `canStart=true`; primary CTA 검토 시작 on live UI. |
| **Evidence file** | `media/live-04-review-gate.png` |
| **Result** | PASS |

### 7) Frame — Analysis

| | |
|--|--|
| **Expected** | Engine Presenter after Review: Decision · Insight · Action/Why/CTA. |
| **Observed** | `hasAnalysis=true`; `RevenueValidation = Insufficient`; CTA present. sessionStorage `launchlens.s14.analysisResult.demo-session` populated. |
| **Evidence file** | `media/live-05-analysis.png` |
| **Result** | PASS |

### 8) Frame — Competitor (after analysis)

| | |
|--|--|
| **Expected** | Competitor path only after `analysisResult` exists. |
| **Observed** | Sidebar `경쟁 분석 중`; CTA “경쟁사 분석”; HUD `hasAnalysis=true` / competitor only after analysisResult. |
| **Evidence file** | `media/live-06-competitor.png` |
| **Result** | PASS |

---

## Fixture support (Contract, not primary Product Evidence)

`01`–`06` Presenter fixture PNGs remain for Contract support only.  
**Product Evidence primary = Live webm + live frames + live-memory-trail.json.**

---

## Acceptance

| Layer | Result |
|-------|--------|
| Unit Acceptance 7 | PASS (prior RC) |
| Memory append unit | PASS (`06-memory-append.json`) |
| Live Product Walkthrough | PASS (this package) |
| Push / Deploy / CEO Test | HOLD (await CPO Release Gate) |

---

## Known Issues

1. Live ConversationMemory bag may lag one Fact behind newest turn (`problem` key vs `problem_definition` turn). Overwrite was **not** observed — prior keys retained. Engine Review path confirmed `problem`.
2. Demo priority often inserts `market_validation` before `problem_definition` (expected demo routing). Append still holds.
3. Push / Deploy stay HOLD until CPO Release Gate PASS.
