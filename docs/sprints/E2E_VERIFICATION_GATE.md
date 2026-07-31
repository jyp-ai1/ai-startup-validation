# E2E Verification Gate

> **Rule:** Commit / push / SHA ≠ done.  
> **Done** = E2E videos + **CTO Self Review** + **Experience Gate PASS** → then **PM Test Ready**.

PM / CEO must **not** be asked to test until CTO submits the full pipeline (see `RELEASE_PIPELINE.md`).

---

## Pipeline position

```text
Code Complete → Production → E2E (this doc) → Experience Gate → PM Test → CEO Test
```

Experience Gate checklist: `docs/sprints/RELEASE_PIPELINE.md`

---

## 1. Deployment (necessary, not sufficient)

| Item | Pass |
|------|------|
| Commit SHA on `main` | |
| Push to `origin/main` | |
| Vercel Production green | |
| Production URL | |
| `/api/build-info` SHA matches commit | |

---

## 2. E2E recordings (mandatory — block release without these)

**Format:** ~5 min screen recording each, **Production URL**, no localhost, no slides.

### Flow A — Start Free

```
Landing
  → Start Free
  → Login
  → Project List
  → 새 프로젝트
  → PDF 업로드 (or paste)
  → AI Read (discovery checklist)
  → Alignment
  → Review
  → Insight
  → (end)
```

**Recording link:** _TBD by CTO_

### Flow B — Open Demo

```
Landing
  → Open Demo
  → Demo workspace (sample doc)
  → Review
  → Insight
  → Login
  → 내 프로젝트 승격 + same state continues
```

**Recording link:** _TBD by CTO_

---

## 3. QA report template (copy for every handoff)

```text
Deployment
✅ Commit: ______
✅ Push
✅ Production
✅ SHA: ______

E2E (Production recordings attached)
⬜ Video 1 — Start Free → Insight
⬜ Video 2 — Demo → Login → Continue

CTO Self Review (after each video)
Flow 1: PASS | FAIL — Why? — Fix: P0|P1|skip
Flow 2: PASS | FAIL — Why? — Fix: P0|P1|skip

Experience Gate
⬜ Flow 1 — progress / no stall / AI first
⬜ Flow 2 — feels demo / continues / save intent
⬜ Experience Gate PASS

Handoff
⬜ PM Test Ready
```

**Do not write "반영 완료" or "PM Test Ready" if any E2E ⬜ or Experience Gate FAIL.**

---

## 4. Current code gap (honest — as of 7ab4cc7)

Use this when explaining why E2E cannot be claimed yet.

| Flow | Step | Status | Gap |
|------|------|--------|-----|
| **A Start Free** | Project list | Partial | `?intent=new` skips list; PDF upload on auth workspace not wired |
| **A** | PDF → AI Read | Partial | Paste/promote only; no upload UI on shell |
| **A** | Review → Insight | Partial | Workshop block exists post-review; full path untested E2E |
| **B Demo** | Sample → Align → Review | Partial | Unified shell + sample seed; guest review may run |
| **B** | Insight | **Missing** | No demo guest Insight gate + login CTA in unified shell |
| **B** | Login → promote | Partial | `promoteDemoProject` + tracker wired; login UI not on unified demo path |
| **B** | Continue state | Partial | Phase/session restore after promote unverified |

**P0 blocker:** Flow B **Insight → Login → Continue** — legacy `V2DemoExperience` had `loginCta`; unified `demo-guided` shell does not.

**CTO next deliverable:** Two Production videos **or** explicit fail at step + fix PR before next handoff.

---

## 5. What PM should ask CTO (one line)

> 코드 설명 말고, Production에서 실제 동작하는 **2개 E2E 영상**(Start Free / Demo→Login)을 보내주세요.

---

## Related

- `docs/sprints/RELEASE_PIPELINE.md` — Experience Gate + Release Checklist
- `docs/sprints/CTO_WORKSPACE_EXPERIENCE_FIXES.md`
- `docs/DEPLOYMENT_RULE.md`
