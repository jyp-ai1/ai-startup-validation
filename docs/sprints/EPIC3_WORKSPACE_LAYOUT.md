# Epic 3 — Workspace Layout Implementation

> **Status:** 🟡 **Phase 0 IN PROGRESS** — prototype review gate  
> **Sprint goal (revised):** **"사용자가 숨 막히지 않는 Workspace"** — not "layout shipped"  
> **Prerequisite:** Epic 2 Blueprint ✅ · [`PRODUCT_PRINCIPLES.md`](../PRODUCT_PRINCIPLES.md)

---

## Mandatory gate: Prototype → Founder review → Implement

```
Phase 0  Wireframe prototype (HTML/CSS)     ← NOW
    ↓ founder: "피그마 느낌"
Phase 1  Layout shell (React)
Phase 2  Sidebar tree
Phase 3  Main router
Phase 4  Progressive Overview (dummy)
Phase 5  Animation
```

**Do not skip Phase 0.** Most expensive cost = founder QA time, not dev hours.

**Prototype:** [`../prototypes/workspace-layout-prototype.html`](../prototypes/workspace-layout-prototype.html) · [`../prototypes/README.md`](../prototypes/README.md)

---

## Phase 0 — Wireframe Prototype ★★★★★

| Include | Exclude |
|---------|---------|
| GNB | AI |
| Sidebar + dummy ○ ● ✔ | API |
| Main + dummy Score / Next Step | React / Next routes |
| Tab: AI PM view vs Overview view | Router · state · animation |

**Done when:** Founder reviews ~5 min and approves spacing / breathing room.

---

## Phase 1 — Layout Shell

Only after Phase 0 PASS.

| Deliverable | Target |
|-------------|--------|
| 2-column shell on `/validation` | `v2-strategy-workspace.tsx` |
| Spacing from **approved prototype** — not rigid 280/980 | Match founder sign-off |

---

## Phase 2 — Sidebar Tree

○ ● ✔ lifecycle · node click highlights (no full router yet).

---

## Phase 3 — Main Router

Sidebar → Main swap · optional `?section=` · no route push.

---

## Phase 4 — Progressive Overview

Dummy blocks appear over time · no real LLM.

---

## Phase 5 — Animation

Node transitions · block reveal · score count-up.

---

## Stop Rule (implementation)

**Immediately stop** Layout work if:

| Signal | Action |
|--------|--------|
| Sidebar feels narrow | Screenshot → adjust prototype → re-implement |
| Main feels cramped | Same |
| Scroll too long before Next Step | Same |
| Action not visible | Same |
| AI PM lacks presence | Same |

Numbers are guides; **호흡감 (breathing room)** beats pixel specs.

---

## What this sprint is NOT

- ❌ Skipping Phase 0  
- ❌ New routes  
- ❌ Real LLM  
- ❌ Legacy deletion (this sprint)  

---

## Completion criteria

- [ ] **Phase 0** — founder prototype approval
- [ ] Phase 1 Layout shell
- [ ] Phase 2 Sidebar tree
- [ ] Phase 3 Main router
- [ ] Phase 4 Progressive Overview (dummy)
- [ ] Phase 5 Animation
- [ ] `pnpm build` + lint PASS

---

## Related

- Epic 2: [`WORKSPACE_IA.md`](../WORKSPACE_IA.md) · [`WORKSPACE_FLOW.md`](../WORKSPACE_FLOW.md)
- Old tab Epic 3: [`EPIC3_KICKOFF.md`](./EPIC3_KICKOFF.md) — superseded for this sprint
