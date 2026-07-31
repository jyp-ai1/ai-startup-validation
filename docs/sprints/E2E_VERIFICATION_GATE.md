# E2E Verification Gate

> **Rule:** Commit / push / SHA ≠ done.  
> **Done** = two Production screen recordings pass end-to-end, plus QA table below.

PM / CEO must **not** be asked to test until CTO submits this package.

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
⬜ Start Free → Review → Insight
⬜ Demo → Review → Insight → Login → Continue

Known blockers (if any E2E ⬜)
- Flow: ______
- Step where it stops: ______
- Root cause (file / behavior): ______

Known Issues (non-blocker)
- ...
```

**Do not write "반영 완료" if either E2E row is ⬜.**

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

- `docs/sprints/CTO_WORKSPACE_EXPERIENCE_FIXES.md`
- `docs/DEPLOYMENT_RULE.md`
