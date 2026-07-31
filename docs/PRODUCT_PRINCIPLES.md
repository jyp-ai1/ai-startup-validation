# LaunchLens Product Principles — Workspace

> **CPO ratified:** 2026-07-30 · Sprint 3 Sign-off  
> **Authority:** Overrides ad-hoc UI decisions during Epic 3+ implementation.  
> **Companion:** [`VISION.md`](./VISION.md) · [`WORKSPACE_IA.md`](./WORKSPACE_IA.md) · [`WORKSPACE_FLOW.md`](./WORKSPACE_FLOW.md) · [`UX_RULES.md`](./UX_RULES.md)

---

## LaunchLens Product Rules (immutable)

새 기능을 만들기 전에 **둘 다** YES:

1. **이 기능이 대표의 사고를 더 명확하게 만드는가?**
2. **이 기능이 대표의 결정을 더 쉽게 만드는가?**

**North-star:** *대표가 지금 무엇을 결정해야 하는가?*

**Philosophy:** *결론을 늦추는 AI* · *먼저 중요한 사실을 이해하고, 그다음 무엇을 결정할지 함께 정한다.*

**P0 flow:** Insight (1) → Candidate (1) → Agreement — **Insight must come first**

**P1 Workshop:** ⛔ **BLOCKED** until Validation **Product Response** consensus

**Validation (Learning Sprint):** One Hypothesis · One Behavior · Evidence · Keep/Kill · [`SPRINT_4_P0_VALIDATION.md`](./sprints/SPRINT_4_P0_VALIDATION.md)

See [`sprints/SPRINT_4_DECISION_WORKSHOP_KICKOFF.md`](./sprints/SPRINT_4_DECISION_WORKSHOP_KICKOFF.md)

---

## Identity (one line)

> **LaunchLens는 사업을 대신 평가하는 AI가 아니라, 대표가 더 좋은 전략을 선택하도록 돕는 AI PM이다.**

Overview is an **output**. AI PM is the **experience**.

---

## The 3-second rule (QA north star)

> **Within 3 seconds, the user must understand (1) how far they've progressed and (2) what to do now.**

Every implementation and QA decision uses this single bar.  
Aligns with [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md) CTO law.

---

## Principle 1 — AI PM is always the protagonist

Users do **not**:

```text
Overview → read
```

Users **do**:

```text
AI PM → question → think → result generated
```

**Priority:** AI PM > Report — in every UX trade-off.

| ✅ Do | ❌ Don't |
|-------|----------|
| Open Workspace → AI PM thread | Open Workspace → empty Overview |
| Show progress in Sidebar (○ ● ✔) | Show four static report sections |
| Overview emerges from AI PM work | Overview as default landing |

---

## Principle 2 — Reports must feel alive

Overview does **not** appear fully formed.

It **grows** as AI PM completes work:

```text
Business Score
...
Calculating...
```

→ score fills in  
→ Summary appears  
→ Risk / Recommendation unlock  
→ Recommended Next Step updates  

**Both Sidebar and Overview grow together.** This is LaunchLens UX — not a static dashboard.

---

## Principle 3 — Finish in one screen

Never:

```text
Review → Evidence → Strategy → Execution   (page hops)
```

**One Workspace. Done.**

- Section switch = Main swap only (optional query)
- No new routes for sections
- No third column / enterprise SaaS layout

---

## Principle 4 — Action is not a result

Many SaaS products **show outcomes**. LaunchLens **creates next behavior**.

After reading Overview, the user immediately sees:

```text
Recommended Next Step

→ Start Customer Interview

[ Start ]
```

**Inline after Summary** — not a separate card, not a buried footer.

---

## Implementation rules (Epic 3 — mandatory)

Cursor **must** enforce these during layout implementation:

### Rule 1 — No Empty Screens

When AI is working, show **in-progress state** — labeled steps, ● on Sidebar — never a blank Main.

### Rule 2 — No Dead Ends

Every screen has a **next action** — question, [ Start ], or nav leaf to continue.

### Rule 3 — No Long Reports

Do **not** dump a full report at once. Information is **revealed progressively** block by block.

### Rule 4 — Everything Feels Alive

Business Score, Sidebar nodes, and Overview blocks **update in real time** (or simulated real time with dummy data in Epic 3 MVP) as AI PM progresses.

---

## Workflow gate (CPO — mandatory)

```
Phase 0  Prototype (HTML/CSS) → Founder ~5min review
Phase 1+ React implementation (only after "피그마 느낌" approval)
```

**Never:** design doc → straight to React layout.

**Prototype:** [`prototypes/workspace-layout-prototype.html`](./prototypes/workspace-layout-prototype.html)

---

## Stop Rule (Layout implementation)

**Immediately stop** if: Sidebar narrow · Main cramped · long scroll before Next Step · Action hidden · AI PM weak presence.

→ Screenshot · fix **prototype** first · then re-implement. **호흡감 > 280/980 pixels.**

---

## Epic 3 phases (CPO — revised)

**Sprint goal:** "사용자가 숨 막히지 않는 Workspace"

| Phase | Deliverable |
|-------|-------------|
| **0** | Wireframe prototype (HTML/CSS) — **gate** |
| **1** | Layout shell (React) — blocked until Phase 0 PASS |
| **2** | Sidebar tree ○ ● ✔ |
| **3** | Main router |
| **4** | Progressive Overview (dummy) |
| **5** | Animation |

**Out of scope:** real LLM · new routes · legacy deletion (this sprint)

Kickoff: [`sprints/EPIC2_5_AI_PM_PERSONALITY.md`](./sprints/EPIC2_5_AI_PM_PERSONALITY.md) · [`sprints/EPIC3_WORKSPACE_LAYOUT.md`](./sprints/EPIC3_WORKSPACE_LAYOUT.md) (React = **P2**)

---

## Before any Epic 3 PR

- [ ] Phase 0 founder approval on file
- [ ] Read this file + `WORKSPACE_IA.md` + `UX_RULES.md`
- [ ] AI PM > Report in every diff
- [ ] No empty screens · no dead ends · no long reports · alive UI
- [ ] 3-second rule: progress + next action visible
- [ ] No new routes without CPO approval
- [ ] Stop Rule respected — no pushing cramped layout
