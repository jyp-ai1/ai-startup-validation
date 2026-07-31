# CTO Workspace Experience Fixes

> **Status:** Sprint 5 P0 backlog — philosophy vs implementation gap  
> **Audience:** CTO / engineering  
> **Source:** Co-founder product review (2026-07-31) vs Sprint 1–4 agreements

---

## Product philosophy (frozen)

```
Unknown → Read Before Speak → Align → Review
```

| Phase | User should feel | Must NOT feel |
|-------|------------------|---------------|
| Unknown | AI knows what it does not know | Blank form |
| Read Before Speak | AI read my document first | CRM data entry |
| Align | We decide together before judgment | AI picked for me |
| Review | Strategy review on confirmed basis | Random AI opinion |

Reference: `docs/PRODUCT_CONSTITUTION.md`, `docs/PRODUCT_PRINCIPLES.md`, ADR-045, `docs/first-trust/ZERO_LIE_CORPUS.md`

---

## Current vs intended (screenshot diagnosis)

| Area | Intended (Sprint 1–4) | Current production-like UI | Gap severity |
|------|------------------------|----------------------------|--------------|
| Language | Korean-first; English auxiliary only | Sidebar/overview: Founder, Business Score, Start, Summary | **P0** |
| Demo | Same flow as workspace (PDF → read → extract → align → review) | `V2DemoExperience` linear mock; feels like saved sample | **P0** |
| Demo → Login | Continue same analysis in workspace | Cookie promote works; workflow snapshot merge unwired | **P0** |
| Workspace entry | AI working: “Founder를 발견했습니다…” | Form-like domain fields; overview mock | **P0** |
| Information order | AI presents findings → founder confirms → review | Direct input before AI voice | **P1** |
| Uncertainty | Unknown / confirmed / decide-together zones | Partially in card; edit/together modes not surfaced | **P2** |
| Start CTA | Always actionable or explains why blocked | Overview “Start” had no handler; alignment Start gated silently | **P3** |

---

## P0 — Must fix this sprint

### 1. Korean-first UI

**Problem:** `ko.json` still ships English for workspace chrome.

**Fix:** Translate `workflow.journey.workspaceShell.*` in `packages/i18n/src/messages/ko.json`.

| Key | Was | Should be |
|-----|-----|-----------|
| `nodes.founder` | Founder | 창업자 |
| `nodes.business` | Business | 사업 |
| `nodes.customer` | Customer | 고객 |
| `nodes.market` | Market | 시장 |
| `nodes.competitor` | Competitor | 경쟁 |
| `overview.scoreLabel` | Business Score | 사업성 점수 |
| `overview.summaryLabel` | Summary | AI PM 요약 |
| `overview.nextStepLabel` | Recommended Next Step | 다음 단계 |
| `overview.nextStepCta` | Start | 검토 시작 |

**Rule:** English only as secondary hint when needed, e.g. `시장 (Market)`.

**Files:** `packages/i18n/src/messages/ko.json`, `workspace-sidebar.tsx`, `workspace-progressive-overview.tsx`

**Acceptance:** Korean locale workspace screenshot has zero English labels in sidebar + overview.

---

### 2. Demo = real analysis flow

**Problem:** `/demo/enter` → `demo-guided` renders legacy `V2DemoExperience`, not `ProjectWorkspaceShell` + business understanding.

**Current paths:**

| Mode | Component | Has read-before-speak? |
|------|-----------|------------------------|
| `demo-guided` | `V2DemoExperience` | No (sample → investigation mock) |
| `demo-readonly` | `ProjectWorkspaceShell` | Partial (pre-filled GTM) |
| Authenticated | `ProjectWorkspaceShell` + `WorkspaceAiPmMain` | Yes |

**Fix:**

1. Route `demo-guided` to same shell as authenticated workspace (guest user).
2. Run `V2SmartIntakeFlow` PDF/paste → `buildBusinessUnderstanding()` → card → alignment → review.
3. Show progressive “AI reading” states (not instant pre-filled sidebar).

**Files:**

- `apps/web/app/demo/enter/route.ts`
- `apps/web/features/workflow-journey/components/v2/v2-strategy-workspace.tsx` (`useLegacyDemoLayout`)
- `apps/web/features/workflow-journey/components/v2/v2-smart-intake-flow.tsx`
- `apps/web/features/workflow-journey/lib/business-understanding/build-business-understanding.ts`

**Acceptance:** Demo user uploads PDF → sees ① confirmed / ② decide together / ③ founder judgment before review.

---

### 3. Demo → Login → workspace handoff

**Problem:** User fears “다시 해야 하나?”

**Partially working:**

- `persistDemoProjectDraftForLogin` → OAuth → `promoteDemoProject` creates owned project.

**Missing:**

- `DemoProjectPromotedTracker` was never mounted → `mergeDemoWorkflowSnapshotAction` never runs.

**Fix:**

1. Mount `DemoProjectPromotedTracker` when `promoted=1` on workspace canvas.
2. After promote, land on same phase (understanding / aligning / review-ready) via sessionStorage keys.
3. Login CTA at review boundary (not at end of unrelated demo steps).

**Files:**

- `apps/web/features/workspace/components/workspace-project-canvas.tsx`
- `apps/web/features/my-projects/components/demo-project-promoted-tracker.tsx`
- `apps/web/features/workflow-journey/lib/v2-demo-project-store.ts`
- `apps/web/lib/auth/post-login-redirect.ts`

**Acceptance:** Demo analysis text + alignment state visible immediately after Google login without re-upload.

---

### 4. Workspace must feel like AI is working

**Problem:** Sidebar + empty overview reads as CRM form.

**Partially implemented (auth path only):**

- `WorkspaceBusinessUnderstandingCard` — zones ①②③
- `WorkspaceBusinessAlignmentBlock` — withhold + direction choice
- `build-business-understanding.ts` + `extract-document-entities.ts`

**Still missing:**

- No PDF upload on authenticated workspace (document from promote only).
- Sidebar `activeNodeId` ignored — overview always mock English copy.
- `WorkspaceDomainFields` exported but unused for edit/together modes.
- `businessScore` hardcoded `74` in `build-sidebar-snapshot.ts`.

**Fix:**

1. After intake, animate domain discovery in AI PM main (Founder → Business → Customer…) before forms.
2. Wire sidebar nodes to per-domain read summary (not mock B2B SaaS paragraph).
3. Compute score from review pipeline, not constant.

**Files:** `workspace-ai-pm-main.tsx`, `build-sidebar-snapshot.ts`, `workspace-shell.tsx`

**Acceptance:** First 60 seconds user sees AI narration of discoveries, not empty inputs.

---

### 5. PDF / AI findings before manual input (P0 overlap with P1)

**Fix order in UI:**

```
AI read document → present findings → founder confirm → align market → review
```

Not: `direct input → review`.

**Acceptance:** No primary empty text fields before understanding card confirm.

---

### 6. Unknown structure (P0 overlap with P2)

**Pattern (implemented in card):**

- Zone ① confirmed from document
- Zone ② customer withheld with `missingLine` / `nextStep`
- Zone ③ Accept / Edit / Together

**Remaining:** Edit/Together must open guided correction, not raw form grid.

**Files:** `workspace-business-understanding-card.tsx`, `workspace-domain-fields.tsx`

---

### 7. Start button — actionable or explained (P3 → P0 for conversion)

**Issues found:**

| Location | Bug |
|----------|-----|
| `workspace-progressive-overview.tsx` | “Start” button had no `onClick` |
| `workspace-business-alignment-block.tsx` | Disabled when direction unset / no primary target — no explanation |

**Fix (shipped in this branch):**

- Remove dead overview Start button until next-step action exists.
- Show `startBlockedHint` under alignment Start when disabled.

**Files:** `workspace-business-alignment-block.tsx`, `workspace-progressive-overview.tsx`, i18n `alignment.startBlocked*`

---

## P1 — Next after P0 validation

- PDF upload on authenticated workspace (not demo-only).
- Real PDF text extraction (today: placeholder in `first-trust/index.ts`).
- Landing demo section points to unified flow.

## P2 — Polish

- Full Unknown UX for all domains (not customer-only withhold).
- Remove mock overview copy; bind to review output.

## P3 — Already escalated to P0

- Start button behavior (see §7).

---

## Implementation map (CTO checklist)

| # | Item | Owner | Key file | Done in branch? |
|---|------|-------|----------|-----------------|
| 1 | KO workspace labels | i18n | `ko.json` workspaceShell | ✅ partial |
| 2 | Unified demo flow | workspace | `v2-strategy-workspace.tsx` | ❌ |
| 3 | Promote + merge snapshot | auth | `workspace-project-canvas.tsx` | ✅ tracker wired |
| 4 | AI working feel | AI PM main | `workspace-ai-pm-main.tsx` | ⚠️ card only |
| 5 | Findings before input | understanding | `build-business-understanding.ts` | ⚠️ auth only |
| 6 | Unknown zones | card | `workspace-business-understanding-card.tsx` | ⚠️ customer |
| 7 | Start UX | alignment + overview | alignment block | ✅ hints |
| 8 | Landing social proof | landing | `landing-live-metrics.tsx` | ✅ today / all-time |

---

## Test plan (CEO acceptance)

1. Open `/demo/enter` — Korean labels, AI card before review, no English chrome.
2. Upload sample PDF — see confirmed + withheld customer, not instant full sidebar.
3. Login at review gate — workspace continues without re-upload.
4. Try Start before choosing direction — see Korean reason, not silent disable.
5. Complete align → review starts automatically after confirm.
6. Landing hero shows **오늘** / **지금까지** review counts.

---

## Out of scope (do not mix into P0)

- Sprint 4 Decision Workshop refinement
- New analytics dashboards
- English locale changes beyond parity keys

---

## Related docs

- `docs/WORKSPACE_FLOW.md`
- `docs/sprints/BUSINESS_UNDERSTANDING_VALIDATION.md`
- `docs/sprints/FIRST_TRUST_VALIDATION.md`
- `docs/OBSERVATION_REPORT.md`
