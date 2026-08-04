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
- ConversationMemory bag retained prior keys (no overwrite)

**Evidence:** `media/live-memory-trail.json` · `06-memory-append.json`  
**Result:** PASS on overwrite ban (keys accumulate).

**Confirmed Issue (S15 Backlog):** Live capture confirmed that after a `problem_definition` turn was recorded, the persisted ConversationMemory bag did not yet contain the `problem` Fact key, while Review-time rebuild from turns fed Engine with `problem=confirmed`. This is a Memory bag sync defect relative to the Loop turn contract — not Expected Behavior. S14 ships with overwrite-ban intact; bag sync is tracked for S15.

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
| **Observed** | Live bag: `[] → [business] → [business, customer, buyer, market]`. Turns include `problem_definition`. Unit JSON trail proves exact expected shape including problem key update without wipe. Confirmed Issue: bag missed `problem` key after turn (S15). |
| **Evidence file** | `media/live-memory-trail.json` · `06-memory-append.json` · `06-memory-append.png` |
| **Result** | PASS (Live append + Unit exact trail). Confirmed Issue logged for bag/`problem` sync → S15. |

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

## Classification

### Confirmed Issue — S15 Backlog

**Title:** ConversationMemory bag sync after `problem_definition`

**Confirming observation (Live):** `problem_definition` turn existed in `aiPmLoop`, and Engine AnalysisInput had `problem=confirmed`, but `launchlens.conversationMemory.demo-session` facts did not include key `problem` at end-of-capture.

**Not:** Expected Behavior.  
**Not:** Overwrite (prior keys remained).

**Disposition:** S15 Backlog — fix Memory bag persistence so each confirmed Loop turn’s Fact key is present in sessionStorage ConversationMemory immediately after apply.

### Expected Behavior

Demo Loop priority may insert `market_validation` before `problem_definition`. This is demo routing, not a Memory wipe.

### Gate

Push / Deploy stay HOLD until CPO Release Gate PASS.
