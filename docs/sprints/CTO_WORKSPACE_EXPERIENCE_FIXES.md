# CTO Workspace Experience Fixes

> **North star:** First 3 minutes — user feels *"AI is reading my business"*, never *"I must fill a form"*.

---

## ⚠️ Definition of done (read first)

| CTO says | Actually means |
|----------|----------------|
| Commit / push / SHA | Deploy only — **not** product done |
| "반영 완료" | **Forbidden** until E2E gate passes |
| Done | Two Production screen recordings + QA table in `docs/sprints/E2E_VERIFICATION_GATE.md` |

**PM test handoff requires E2E, not SHA.**

---

## 🔴 P0 — Blockers (not "Known Issues")

### P0-E2E-A — Start Free → Review → Insight

Must complete on Production with recording. See Flow A in `E2E_VERIFICATION_GATE.md`.

### P0-E2E-B — Demo → Review → Insight → Login → Continue

**LaunchLens first impression is Demo.** If this stops before Login→Continue, the product is not demonstrable.

Legacy `V2DemoExperience` had login CTA; unified `demo-guided` shell **does not** — this is the main code gap.

---

## Supporting P0 (necessary, not sufficient)

| # | Item | Status (7ab4cc7) |
|---|------|------------------|
| P0-1 | Hero `today ≤ total` | ✅ |
| P0-2 | Landing width unified | ✅ |
| P0-3 | Workspace never frozen (CTA) | ✅ partial |
| P0-4 | Demo shell + sample read | ✅ partial — **Review→Insight→Login not E2E** |
| P0-5 | Start Free ≠ Demo routes | ✅ |
| P0-6 | Project list after login | ✅ |

---

## CTO handoff checklist

### 1. Deployment

- Commit / Push / Production / URL / SHA

### 2. E2E (mandatory)

- [ ] Recording: Start Free → Insight
- [ ] Recording: Demo → Login → Continue

### 3. QA report

Use template in `E2E_VERIFICATION_GATE.md` section 3.

---

## P1+ (after both E2E pass)

- PDF upload on authenticated workspace
- Real PDF extraction
- UI polish / copy / score from pipeline

---

## PM one-liner to CTO

> 코드 설명 말고, Production에서 실제 동작하는 **2개 E2E 영상**을 보내주세요.
