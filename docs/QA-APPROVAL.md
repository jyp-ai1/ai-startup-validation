# LaunchLens QA Approval Process

> **Purpose:** Separate CTO submission from CPO judgment from CEO verification.  
> **Rule:** Never skip a step in the chain below.

---

## Approval chain (fixed order)

```
Code
  ↓
Deploy
  ↓
Production QA (CTO)
  ↓
Evidence Package
  ↓
CPO Review
  ↓
CEO Smoke Test
  ↓
Release Close
```

---

## 1. CTO (Cursor)

**Role:** Fix + Production QA + **evidence submission only.**

### Deliverables

| Item | Required |
|------|----------|
| Commit / SHA | Yes |
| Production URL | Yes |
| `/api/build-info` match | Yes |
| `EVIDENCE-PACKAGE.html` | Yes |
| Screenshots + repro steps | Yes |
| Known Issues (P1+) | If any |

### CTO report language (mandatory)

Do **not** write Flow PASS or “CEO test ready” in CTO reports.

```text
Flow1
Evidence Submitted

Flow2
Evidence Submitted

CPO Review
Pending

CEO Test
Not Requested
```

### CTO must never

- Declare Flow PASS / FAIL (product quality)
- Declare “CEO test possible” or release approval
- Override CPO judgment

---

## 2. CPO (GPT)

**Role:** Product quality judgment **after** evidence review.

### Input

- `EVIDENCE-PACKAGE.html` **or** required PNG set (attached to CPO chat)
- CTO machine log = reference only; **screens are primary**

### Output template

```text
Evidence
☐ 확인  ☐ 미확인

Flow1
PASS / FAIL
근거: (attached evidence only)

Flow2
PASS / FAIL
근거: (attached evidence only)

Regression
있음 / 없음
근거:

CEO Test
☐ 시작  ☐ 보류
근거:
```

### CPO rules

| State | Action |
|-------|--------|
| Evidence not attached | **판정 보류** (not FAIL) |
| Evidence attached | PASS/FAIL from **screens only** |
| CEO Test | **시작** only when Flow1 + Flow2 acceptable |

---

## 3. CEO

**Role:** Production experience verification.

- Run CEO Smoke Test **only after** CPO marks `CEO Test ☑ 시작`
- Final release close = CEO sign-off after smoke

---

## P0-2 current status (example)

| Field | Value |
|-------|-------|
| Fix commit | `46f5a8114fd6940be514313cba5be23ff387592f` |
| Production | https://ai-startup-validation-tau.vercel.app |
| Evidence | `docs/evidence/P0-QA-46f5a81/EVIDENCE-PACKAGE.html` |
| Desktop copy | `Desktop/LaunchLens-CPO-Evidence/` |

```text
Flow1
Evidence Submitted

Flow2
Evidence Submitted

CPO Review
Pending

CEO Test
Not Requested
```

---

## Evidence package location

```
docs/evidence/P0-QA-{commit-short}/
├── EVIDENCE-PACKAGE.html   ← CPO attachment (single file)
├── EVIDENCE-SUBMISSION.md
├── CPO-HANDOFF.md
└── final/
    ├── p0-2-final-batch-report.json
    └── flow*/…png
```

Regenerate HTML after new QA:

```bash
cd apps/web && node scripts/build-evidence-html-pack.mjs
```

(Adjust script paths if evidence folder name changes.)
