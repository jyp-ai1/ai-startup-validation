# CTO Workspace Experience Fixes

> **North star:** First 3 minutes — user feels *"AI is reading my business"*, never *"I must fill a form"*.

---

## Release pipeline (operating rule)

```text
Code Complete → Production → E2E → Experience Gate → PM Test → CEO Test
```

Full checklist: **`docs/sprints/RELEASE_PIPELINE.md`**

| Gate | CTO delivers |
|------|----------------|
| Production | Commit / Push / SHA |
| E2E | 2 Production videos |
| **Experience Gate** | Self Review + 6 experience checks |
| PM Test Ready | Only when all above PASS |

**CEO must not be the first person to hit a broken flow.**

---

## Release Checklist (every handoff)

```text
□ Commit
□ Push
□ Production
□ SHA

□ E2E Video 1 — Start Free → Insight
□ E2E Video 2 — Demo → Login → Continue

□ CTO Self Review (PASS/FAIL + Why + fix priority)
□ Experience Gate PASS

□ PM Test Ready
```

---

## Experience Gate (CTO Self Review)

Attach **after each E2E video** — video without Self Review is not evidence.

```text
Flow: ______
Result: PASS | FAIL
Why? (user perception)
Fix priority: P0 | P1 | skip
PM Test Ready? YES | NO
```

**Flow 1 checks:** 끝까지 가능 · 막히지 않음 · AI가 먼저 일함  
**Flow 2 checks:** Demo 같음 · 내 프로젝트로 이어짐 · 저장하고 싶어짐

Example FAIL:

```text
Flow 2 — FAIL
Insight 이후 Login CTA 없음. 사용자는 끝났다고 생각함. → P0
```

---

## P0 blockers (experience, not code)

| ID | Blocker |
|----|---------|
| P0-E2E-A | Start Free → Insight not completable on Production |
| P0-E2E-B | Demo → Insight → Login → Continue not completable |
| P0-EXP | Experience Gate FAIL (Form-first, stall, no save intent) |

Supporting fixes (metrics, width, CTA panel, routes): see git history `7ab4cc7` — **necessary, not sufficient**.

---

## PM one-liner to CTO

> E2E 영상 2개 + **CTO Self Review** + **Experience Gate PASS** 없이 PM 테스트 요청하지 마세요.

---

## P1+ (after pipeline PASS)

- PDF upload on auth workspace
- Real PDF extraction
- UI polish

See `docs/sprints/E2E_VERIFICATION_GATE.md` for code gap table.
