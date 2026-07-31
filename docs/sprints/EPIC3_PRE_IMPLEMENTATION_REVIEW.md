# Epic 3 Pre-Implementation Review

> **Date:** 2026-07-29 · CPO Sprint Review (대표 피드백)  
> **Status:** Analysis complete · **UI 수정 금지** until P0 items addressed in plan  
> **Gate:** Prototype Phase 0 continues · React Phase 1 blocked until P0 plan approved

---

## Executive summary

| Priority | Issue | Verdict |
|----------|-------|---------|
| 🔴 **P0** | Login shows legacy workspace, not prototype | **Root cause found** — not a route bug |
| 🔴 **P0** | Founder / Customer domain mixed | **Schema + inference bug** — causes B2C misclassification |
| 🟠 **P1** | AI PM presence weak (orange line only) | Design proposal below |
| 🟠 **P1** | Sidebar Summary invisible | Design proposal below |
| 🟡 **P2** | Prototype spacing | Updated in `docs/prototypes/` |

**CPO north star (this sprint):** *"LaunchLens의 AI PM을 보여줘."*

---

## 🔴 P0-1 — Legacy Workspace Root Cause

### Symptom

대표: 로그인 → 내 프로젝트 → **예전 화면** (긴 스크롤, 우측 mini nav, validation canvas).

### Root cause (ranked)

#### 1. Prototype was never wired to the app (primary — by design)

Epic 3 Phase 0 is **HTML-only** in `docs/prototypes/workspace-layout-prototype.html`.  
No Next.js route, import, or iframe serves it. **Expected until Phase 0 founder approval + Phase 1 start.**

#### 2. Post-login routing intentionally targets legacy V2 canvas (primary — product gap)

Authenticated users are funnelled to `/validation?project=:id`, which mounts **`V2StrategyWorkspaceView`** — the pre-Epic-3 validation journey, **not** the approved WORKSPACE_IA blueprint.

```
Login → /auth/callback?next=/workspace
     → /workspace (redirect if 1 project)
     → /validation?project={id}
     → V2StrategyWorkspaceView  ← legacy
```

#### 3. Epic 3 Phase 1 React shell never started (process gate)

`docs/sprints/EPIC3_WORKSPACE_LAYOUT.md` blocks Phase 1 until prototype sign-off.  
`v2-strategy-workspace.tsx` was **not replaced** with GNB + Sidebar + Main shell.

#### 4. Orphan component — not the live path

`V2AuthenticatedWorkspace` exists but has **zero route imports**. Login never reaches it.

#### 5. No feature flag mismatch

`journey_immersion` flag is defined but **unused**. Demo modes (`demo-readonly`, `demo-guided`) still render the **same** `V2StrategyWorkspaceView`.

### Component tree (logged-in → single project → validation)

```
app/layout.tsx
└── app/[locale]/layout.tsx
    └── DeferredAppShell
        └── (public)/validation/page.tsx
            ├── ValidationProjectScopeTracker
            ├── ValidationJourneyTracker
            └── V2StrategyWorkspaceView          ← apps/web/features/.../v2-strategy-workspace.tsx
                └── JourneyLayout                  ← journey-layout.tsx (GNB + phase bar)
                    ├── V2ThinkingWorkspaceMain    ← long scroll Main
                    │   ├── V2WorkspaceProjectHeader
                    │   ├── V2AiPmInbox
                    │   ├── V2AiUnderstandingChips
                    │   ├── V2WhySourcesSection    ← evidence inline (IA violation)
                    │   └── V2AiPmMeetingNote
                    └── V2JourneyMiniNav           ← RIGHT sticky nav (IA violation)
```

**Not rendered:** Epic 3 prototype layout · left Sidebar tree · AI PM-first entry · progressive Overview.

### `/workspace` (multi-project list)

```
(shell)/workspace/page.tsx
└── AppShellWrapper → AppShell + sidebar
    └── MyProjectsHome → link to /validation?project=
```

List uses **AppShell**; canvas uses **JourneyLayout** — two stacks, neither is Epic 3.

### `/projects/*`

Middleware 307 → `/validation?project=` — legacy `ProjectWorkspaceOverview` **never runs**.

### Recommended fix sequence (no code in this task)

| Step | Action |
|------|--------|
| 1 | Founder approves prototype spacing (Phase 0) |
| 2 | Phase 1: replace `V2StrategyWorkspaceView` shell with approved layout |
| 3 | Delete/replace `V2JourneyMiniNav` in same PR |
| 4 | Wire AI PM-first Main default (Phase 4) |
| 5 | Delete or wire `V2AuthenticatedWorkspace` — avoid third stack |

**Trust issue framing:** Users see old UI not because deploy failed, but because **new IA was never integrated**. Production is on correct commit; product surface is pre-Epic-3.

---

## 🔴 P0-2 — Founder / Business / Customer Domain Model

### Symptom

Example: **취향저격컴퍼니** (B2C, 고객=일반인) — AI treats **대표 / 예비창업자** as B2C customer.

### Root cause

Three distinct entities share one field: `evidence.customer` (+ founder-prefixed stores).

```text
Founder (LaunchLens user)     →  auth user, /who "persona"
Business (venture)            →  idea, problem, pricing, industry
Customer (business's buyer)   →  should be: segment, ICP, persona
```

**Today:** Customer field also stores founder archetypes (`예비창업자`, `스타트업 대표 · PM`).

### Highest-leverage mixing sites

| Location | Issue |
|----------|-------|
| `v2-smart-intake-engine.ts` | Keywords 창업/대표/PM → default customer `예비창업자 · 스타트업 대표` |
| `v2-gtm-demo.ts` | LaunchLens B2B demo: customer = `초기 스타트업 PM · 1인 창업자` (valid for B2B, wrong schema) |
| `v2-strategy-workspace.tsx` guided demo | Teaches "customer change" = 예비창업자 → 스타트업 대표 |
| `founder-information-store.ts` | Business customer under `FounderInformationField: 'customer'` |
| `v2-validation-store.ts` | `evidence.customer` → `registration.targetMarket` (customer/market blur) |
| `/who` persona | `V2PersonaId` = founder **situation**, not product customer — name collision with PRD USER_PERSONA |

### Proposed 3-entity model

```text
Founder (1) ──owns──▶ Business (N)
Business (1) ──serves──▶ Customer (N segments)
```

| Entity | Storage (target) | UI address |
|--------|------------------|------------|
| **Founder** | Auth + `founder.profile` + `founderSituation` (rename from persona) | "대표님" |
| **Business** | DB `startup_projects` + `evidence.business.{idea,problem,pricing,mvp}` | "프로젝트" / idea name |
| **Customer** | DB `target_customer` + `evidence.customer.{segment,type,persona}` | "고객" / "타깃" |

### Hard rules

1. **Never infer Customer from Founder keywords** (창업, 대표, PM) unless Business.type = sells-to-founders.
2. **`/who` selection = FounderSituation** — rename in code/i18n; not Customer.
3. **AI PM prompt envelope:**

```json
{
  "founder": { "situation": "startup-prep", "locale": "ko" },
  "business": { "name": "취향저격컴퍼니", "model": "B2C", "idea": "..." },
  "customer": { "segment": "20-30대 일반 소비자", "persona": "..." }
}
```

4. **Interview order:** Founder context (1 question) → Business (idea, model) → Customer (segment) — **never skip Business model before Customer**.

### Interview / prompt changes (design)

| Stage | Ask | Entity |
|-------|-----|--------|
| `/who` | 어떤 상황이신가요? | Founder.situation |
| Workflow | 사업 한 줄 / B2B·B2C | Business |
| AI PM Q1 | 무엇을 만드나요? | Business.idea |
| AI PM Q2 | B2B인가요 B2C인가요? | Business.model |
| AI PM Q3 | **누가 돈을 내나요?** (founder 제외 명시) | Customer.segment |
| Overview Summary | Separate sentences for Business state vs Customer fit | Both |

### Files to change (implementation sprint — list only)

**Core:** `v2-validation-store.ts`, `v2-smart-intake-engine.ts`, `packages/types`, `packages/ai/src/prompts/*`, `ko.json`/`en.json` workflow + registration keys, `persona-selection-view.tsx`, `v2-ai-pm-inbox-data.ts`.

Full list: see domain audit in agent transcript or expand in ADR-040.

---

## 🟠 P1-1 — AI PM Presence UX (design proposal)

**Problem:** AI PM = orange accent line → feels like decoration, not the brand.

**Principle:** User always feels *"AI가 지금 일하고 있네."*

### A. AI PM Status Strip (persistent, below GNB or top of Main)

```text
┌─────────────────────────────────────────────────────────┐
│ ● AI PM  ·  시장 조사 완료  ·  경쟁사 분석 중  ·  다음: 고객 세분화 │
└─────────────────────────────────────────────────────────┘
```

| Element | Behavior |
|---------|----------|
| Pulse dot ● | Visible whenever session active |
| Last completed | Plain text, fades after 8s |
| Current task | Bold |
| Next hint | Muted |

**Height:** ~36px — not a card, not a banner ad.

### B. AI PM Thinking (inline, when working)

```text
AI PM Thinking...
████████░░░░  market research
```

- Thin progress bar (4px) under Status Strip or inside Main header
- Labeled step — never blank spinner (Rule 1: No Empty Screens)

### C. Micro-interactions

| Event | UI |
|-------|-----|
| Topic complete | Sidebar ✔ + Status Strip flash "Customer ✔" |
| Review running | Thinking bar + Sidebar ● |
| Idle (waiting user) | Status Strip: "답변을 기다리는 중" |
| Overview block unlock | Score count-up + Strip: "Overview 업데이트됨" |

### D. Placement in layout

```text
GNB
AI PM Status Strip    ← always visible in Workspace
Sidebar | Main
```

**Not:** hidden in scroll · not only orange border on inbox.

### Prototype preview

See updated `workspace-layout-prototype.html` — Status Strip on both tabs.

---

## 🟠 P1-2 — Sidebar Summary (design proposal)

**Problem:** Sidebar = flat TOC — no score, no progress, boring.

### Sidebar zones (top → bottom)

```text
┌─────────────────────┐
│ SUMMARY             │
│ 74                  │  ← Business Score (always when review exists)
│ ████████░░  67%     │  ← Progress (topics complete / total)
│ Customer ●          │  ← Current stage label
├─────────────────────┤
│ Overview            │
│  ✔ Summary          │
│  ● Customer         │
│  ○ Market           │
├─────────────────────┤
│ Insights (locked)   │
└─────────────────────┘
```

| Field | Source |
|-------|--------|
| Score | Review aggregate — same as Main Business Score |
| Progress | `completeCount / totalTopics` from Sidebar lifecycle |
| Current stage | Label of ● node |

**Before first review:** Summary zone shows `—` + "AI PM 진행 중" — not empty.

### Rules

- Score in Sidebar **matches** Main — single source of truth
- Click Summary zone → scroll/focus Main Business Score block
- Do not duplicate full Summary paragraph in Sidebar — **numbers + stage only**

### Prototype preview

See updated prototype — `.sidebar-summary` block.

---

## 🟡 P2 — Prototype spacing (applied)

Changes in `docs/prototypes/workspace-layout-prototype.html`:

| Token | Before | After |
|-------|--------|-------|
| `--sidebar-w` | clamp(220px, 22vw, 272px) | clamp(240px, 24vw, 288px) |
| `--main-pad-x` | clamp(32px, 5vw, 64px) | clamp(40px, 6vw, 80px) |
| `--content-max` | 680px | 640px (narrower column = more breath) |
| Main line-height | 1.6 | 1.7 |
| Block gaps | 28–36px | 40–48px |

Added P1 design previews (Status Strip + Sidebar Summary) for next founder review.

---

## Sprint priority (CPO confirmed)

| # | Work | Type |
|---|------|------|
| 1 | Legacy root cause — **documented** (this file) | ✅ Analysis |
| 2 | Founder/Business/Customer — ADR + type design | 🔜 Design sprint |
| 3 | AI PM Presence — implement in Phase 1 shell | 🔜 With layout |
| 4 | Sidebar Summary — implement in Phase 2 tree | 🔜 With sidebar |
| 5 | Prototype spacing — **updated** | ✅ P2 |
| 6 | Phase 1 React — **after** founder re-review with new prototype | ⛔ Blocked |

---

## Related

- [`EPIC3_WORKSPACE_LAYOUT.md`](./EPIC3_WORKSPACE_LAYOUT.md)
- [`PRODUCT_PRINCIPLES.md`](../PRODUCT_PRINCIPLES.md)
- [`WORKSPACE_IA.md`](../WORKSPACE_IA.md)
- Prototype: [`../prototypes/workspace-layout-prototype.html`](../prototypes/workspace-layout-prototype.html)
