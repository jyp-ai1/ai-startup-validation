# LaunchLens QA Gate

> **Purpose:** Break the loop — CTO declares PASS without CPO seeing evidence → CEO tests → Production bugs again.  
> **Rule:** Never skip a gate. Each role only declares within its authority.

---

## Release gate (recommended fixed chain)

```
Developer
    ↓
CTO — Technical QA
    (implement, deploy, Production QA, Evidence Package, Evidence Submitted)
    ↓
CPO — Product QA
    (evidence review, PASS/FAIL, regression, CEO Test approval)
    ↓
CEO — User Experience
    (Production smoke, UX, release approval)
    ↓
Customer — Beta Validation
    (real founder/customer reaction)
    ↓
Release
```

| Gate | Question | Who declares |
|------|----------|--------------|
| **Technical QA** | Does it work in Production? | CTO → Evidence Submitted |
| **Product QA** | Are flows correct? | CPO → PASS / FAIL |
| **User Experience** | Can a founder understand it? | CEO → Smoke PASS |
| **Beta Validation** | Do customers react the same? | Customer program → Beta sign-off |
| **Release** | Ship? | CEO after all gates |

---

## Fixed pipeline (minimum before Release)

```
Developer
    ↓
CTO
    ↓  Evidence Package
CPO
    ↓  CEO Test Approved
CEO
    ↓  Release Approved
Release Close
```

---

## 1. CTO report format (fixed)

**Authority ends here.** Do not write PASS, FAIL, or “CEO test ready.”

```text
Commit
46f5a81

Production
https://ai-startup-validation-tau.vercel.app

Evidence
Submitted

Flow1
Pending Review

Flow2
Pending Review

Regression
Pending Review

CEO Test
Not Requested
```

### CTO deliverables

- Commit / SHA, Production URL, `/api/build-info` match
- `EVIDENCE-PACKAGE.html` + screenshots + repro steps
- Known Issues (P1+) if any

### CTO must never

- Declare Flow PASS / FAIL
- Approve CEO Test or Release
- Override CPO judgment

---

## 2. CPO report format (fixed)

**Only CPO declares PASS/FAIL.** Judgment from **attached evidence (screens)** only; CTO narrative is reference.

### After evidence review (pass example)

```text
Evidence
Reviewed

Flow1
PASS

Flow2
PASS

Regression
None

CEO Test
Approved
```

### Fail example

```text
Evidence
Reviewed

Flow1
FAIL

근거
(attached screen only)
```

### Before evidence attached

```text
Evidence
Not Reviewed

Flow1 / Flow2 / Regression
Pending Review

CEO Test
Not Requested
```

*(Pending Review is not FAIL.)*

---

## 3. CEO report format (fixed)

**Only after CPO `CEO Test Approved`.**

```text
Smoke Test

UX
PASS

Dead-end
없음

Confusing Point
(optional count)

Release
Approved
```

---

## 4. Customer — Beta Validation (future gate)

After CEO Release Approved, selected beta users validate founder-facing flows.  
Beta sign-off is required before broad Release for AI strategy products where functional QA alone is insufficient.

*(Process TBD — track in ROADMAP when beta program starts.)*

---

## Gate exit criteria

What must be true to **leave** each gate. Without this, PASS meaning varies by person.

| Gate | Exit criteria | Deliverable |
|------|---------------|-------------|
| **Technical QA (CTO)** | Defined Production scenarios reproduced; Evidence Package generated; build SHA matches `/api/build-info` | `EVIDENCE-PACKAGE.html`, Commit, Build SHA |
| **Product QA (CPO)** | Evidence attached and reviewed; Flow1/Flow2 PASS or FAIL; Regression judged | Product QA Review |
| **CEO Smoke** | Core path completes without dead-ends (e.g. Landing → Review → Next Action); Experience Score recorded | CEO Review |
| **Customer Beta** | Real users tested (e.g. 3–5 founders); no open P0 | Beta Report |
| **Release** | All gates passed; no unresolved P0 | Release Note |

### LaunchLens — CTO minimum scenarios (Technical QA)

| Flow | Scenario |
|------|----------|
| Flow1 | Login → Project List → new project → AI Read → Review → Insight → **F5** → Insight persists |
| Flow2 | Demo Sample → Review → Insight → Promote → Project List |

### LaunchLens — CPO minimum (Product QA)

| Check | Exit |
|-------|------|
| Flow1 | PASS on attached before/after refresh screens |
| Flow2 | PASS on promote → list screen |
| Regression | None on defined flows |
| CEO Test | **Approved** only if Flow1 + Flow2 PASS and no P0 in evidence |

---

## Status board (single source of truth)

Use this vocabulary across Slack, docs, and handoffs:

```text
Commit
46f5a81

Production
배포 완료

Technical QA (CTO)
✔ Evidence Submitted

Product QA (CPO)
⏳ Pending Review (Evidence 미첨부)

CEO Smoke
Not Requested

Customer Beta
Not Started

Release
Pending
```

When CPO completes review, update **Product QA** and **CEO Smoke** only — not Release until CEO smoke.

---

## P0-2 snapshot (2026-08-01)

| Item | Value |
|------|-------|
| Commit | `46f5a8114fd6940be514313cba5be23ff387592f` |
| Evidence | `docs/evidence/P0-QA-46f5a81/EVIDENCE-PACKAGE.html` |
| Desktop handoff | `Desktop/LaunchLens-CPO-Evidence/` |

**Next:** CPO attaches/reviews HTML → Product QA → CEO Smoke → Release.

---

## Evidence package layout

```
docs/evidence/P0-QA-{commit-short}/
├── EVIDENCE-PACKAGE.html   ← attach to CPO chat
├── EVIDENCE-SUBMISSION.md
├── CPO-HANDOFF.md
└── final/
    ├── *-report.json
    └── **/*.png
```

Regenerate HTML:

```bash
cd apps/web && node scripts/build-evidence-html-pack.mjs
```
