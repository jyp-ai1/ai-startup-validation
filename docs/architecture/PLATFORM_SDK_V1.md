# Platform SDK v1 — Architecture Contract

**Status:** 🔒 Scope Freeze — awaiting CPO approval (NO implementation until approved)  
**Sprint:** A — Platform SDK v1  
**Paired docs:** [`docs/testing/PLATFORM_CONTRACT_TESTS.md`](../testing/PLATFORM_CONTRACT_TESTS.md) · [`docs/sprints/SPRINT_A_PLAN.md`](../sprints/SPRINT_A_PLAN.md)  
**Authority:** CTO architecture contract for marketplace platform support. Product code must not diverge from this doc after CPO Scope Freeze.

---

## 1. Purpose

Promote marketplace platform support from **ad-hoc implementation** to a **Contract**.

| Before (ad-hoc) | After (Contract) |
|-----------------|------------------|
| Platform if-branches in UI / pipeline | Capability flags + Descriptor-driven UI |
| UI knows API/SDK details | UI knows **Descriptor only** |
| Register path hardcoded per platform | All platforms via **MarketplaceRegistry** |
| Tests per platform, inconsistent | Shared **Compliance Tests** gate registration |

**Sprint A success definition (locked by CPO):**  
Coupang runs on the SDK (refactored onto Registry/Executor). Success ≠ building SmartStore.

---

## 2. Assumptions / Current state

### 2.1 CartPilot / Coupang — not present in this repo

As of Scope Freeze authoring (2026-08-06), this monorepo has:

| Expected | Found? | Notes |
|----------|--------|-------|
| CartPilot product surface | ❌ Absent | No files, packages, or docs named CartPilot |
| Coupang Executor / API client | ❌ Absent | No Coupang payload/register code |
| MarketplaceRegistry / Descriptor | ❌ Absent | Greenfield for Sprint A |

**Assumption A1:** Sprint A will **introduce** Platform SDK packages/modules and a **Coupang Executor** as the first compliant implementation. If CartPilot/Coupang code later lands from another branch/repo, it must be **migrated onto** this Contract — not left as a parallel path.

**Assumption A2:** “Coupang Payload/register parity” Acceptance means: once a Coupang baseline fixture set is established in Sprint A (golden payloads + register request/response), refactor must preserve byte-comparable / schema-comparable parity. Until Coupang code exists, fixtures are authored as part of Sprint A implementation (post–Scope Freeze), not during this doc phase.

### 2.2 Closest existing code (fit targets)

Use these as **shape references** when placing SDK code — do not treat them as the SDK itself:

| Path | Relevance |
|------|-----------|
| `apps/web/modules/naver-commerce/` | SmartStore-oriented import → draft → upload stub pipeline |
| `apps/web/modules/naver-commerce/services/draft-service.ts` | Draft build + `uploadDraftToNaver()` stub |
| `apps/web/modules/naver-commerce/services/pipeline-service.ts` | Step pipeline (validate → crawl → extract → …) |
| `apps/web/modules/naver-commerce/types/index.ts` | `ProductDraft`, pipeline types |
| `packages/automation/src/jobs/index.ts` | `naver.upload` job stub; `JobRegistry` pattern |
| `packages/ai/src/providers/registry.ts` | `ProviderRegistry` — registry pattern precedent |
| `packages/agents/src/intelligence/platform/` | Intelligence “platform” types (unrelated domain; do not conflate) |

**Assumption A3:** Sprint B (SmartStore Executor) will likely **wrap or replace** ad-hoc Naver paths under `apps/web/modules/naver-commerce/`. Sprint A must not rewrite SmartStore product UX.

### 2.3 Monorepo layering (must fit)

Follow existing architecture law (`docs/ARCHITECTURE.md`, `.cursor/rules/architecture.mdc`):

- Apps consume packages; packages never import from apps.
- No marketplace vendor SDK imports in `apps/` UI trees or `packages/core`.
- Shared types → `@repo/types` (or a dedicated `@repo/marketplace` package if introduced post-Freeze).
- UI components stay in `@repo/ui` / feature modules; Executors stay server/pipeline-side.

---

## 3. Core concepts

```text
┌─────────────────────────────────────────────────────────────┐
│  UI Layer                                                   │
│  knows: MarketplaceDescriptor + MarketplaceCapabilities only │
└───────────────────────────┬─────────────────────────────────┘
                            │ registry.list() / getDescriptor()
┌───────────────────────────▼─────────────────────────────────┐
│  MarketplaceRegistry                                        │
│  entry: descriptor · executor · capabilities                │
└─────────────┬───────────────────────────────┬───────────────┘
              │                               │
   ┌──────────▼──────────┐         ┌──────────▼──────────┐
   │ MarketplaceDescriptor│         │ MarketplaceExecutor │
   │ (UI-safe metadata)   │         │ (lifecycle ops)     │
   └─────────────────────┘         └─────────────────────┘
              │                               │
              └──────────┬────────────────────┘
                         │
              MarketplaceCapabilities
              (feature flags for UI + Pipeline)
```

---

## 4. MarketplaceRegistry

**Role:** Single entry point for all platform metadata and execution wiring.

### 4.1 Responsibilities

| Method (conceptual) | Returns | Who may call |
|---------------------|---------|--------------|
| `register(entry)` | void | Bootstrap / DI only — **after** Compliance Tests PASS |
| `get(id)` | `MarketplaceEntry` | Pipeline / server adapters |
| `getDescriptor(id)` | `MarketplaceDescriptor` | UI / Presenters |
| `listDescriptors()` | `MarketplaceDescriptor[]` | UI platform pickers |
| `getCapabilities(id)` | `MarketplaceCapabilities` | UI + Pipeline |
| `getExecutor(id)` | `MarketplaceExecutor` | Pipeline / server **only** |

### 4.2 Entry shape

```ts
type MarketplaceId = string; // e.g. 'coupang' | 'smartstore' | …

type MarketplaceEntry = {
  descriptor: MarketplaceDescriptor;
  capabilities: MarketplaceCapabilities;
  executor: MarketplaceExecutor;
};
```

### 4.3 Registration gate (non-negotiable)

```text
Compliance Tests PASS  →  Registry.register(entry) allowed
Compliance Tests FAIL  →  register() MUST throw / be unreachable in CI
```

See [`PLATFORM_CONTRACT_TESTS.md`](../testing/PLATFORM_CONTRACT_TESTS.md).

### 4.4 Proposed placement (post–Scope Freeze)

| Layer | Proposed path (indicative) |
|-------|----------------------------|
| Contracts / types | `packages/types/src/marketplace/` **or** `packages/marketplace/src/contract/` |
| Registry + Executor interfaces | `packages/marketplace/` (new) **or** `packages/automation/src/marketplace/` |
| Coupang Executor impl | `packages/marketplace/src/executors/coupang/` |
| App wiring / UI Descriptor consumers | `apps/web/features/…` or module under `apps/web/modules/` — **Descriptor only** |
| Contract tests | `packages/marketplace/src/__tests__/compliance/` (or colocated per plan) |

Exact package name is an implementation detail **after** CPO Freeze; boundaries above are frozen.

---

## 5. MarketplaceDescriptor

**Role:** UI-safe platform identity. UI renders from Descriptor **only** — never imports Executor.

```ts
type MarketplaceDescriptor = {
  id: MarketplaceId;
  displayName: string;
  icon: string;        // asset key or URL token — UI resolves via design system
  brandColor: string;  // CSS color token / hex — presentation only
  capabilities: MarketplaceCapabilities; // denormalized for UI convenience OR looked up via Registry
};
```

### Rules

| Rule | Detail |
|------|--------|
| UI import boundary | UI modules MAY import Descriptor types + Registry `listDescriptors` / `getDescriptor` |
| Forbidden | UI imports `MarketplaceExecutor`, Coupang SDK, payload builders |
| No secrets | Descriptor never carries API keys, seller IDs, or raw credentials |
| Stable id | `id` is the join key across Registry, fixtures, analytics, and Capability checks |

---

## 6. MarketplaceCapabilities

**Role:** Feature flags for **both UI and Pipeline**. Not marketing copy — behavioral gates.

```ts
type MarketplaceCapabilities = {
  /** Example: show / run category recommendation step */
  categoryRecommendation: boolean;
  /** Preview listing before register */
  preview: boolean;
  /** Live register to marketplace */
  register: boolean;
  /** Future (Sprint A: declare false; do not implement) */
  cancel?: boolean;
  status?: boolean;
  // Extensible: add flags only via Contract revision + Compliance cases
};
```

### Interpretation rules

```text
UI:       if (capabilities.X) render control for X
Pipeline: if (capabilities.X) invoke executor path for X
Else:     hide / skip — do NOT hardcode marketplace id checks
```

**Forbidden pattern:**

```ts
// ❌ Platform if-branch outside Capability interpretation
if (marketplaceId === 'coupang') { showCategoryRec(); }

// ✅ Capability interpretation
if (caps.categoryRecommendation) { showCategoryRec(); }
```

Platform-specific **behavior** lives inside the Executor. Platform-specific **availability** lives in Capabilities.

---

## 7. MarketplaceExecutor

**Role:** Platform-specific lifecycle. Pipeline/server owns Executor; UI does not.

### 7.1 Lifecycle (v1 required)

| Method | Purpose |
|--------|---------|
| `buildPayload(input)` | Map canonical product/intent → platform payload |
| `validate(payload)` | Schema + business rules; return structured errors |
| `preview(payload)` | Dry-run / preview representation for Founder confirmation |
| `register(payload)` | Submit to marketplace (or sanctioned stub in test env) |
| `normalizeResult(raw)` | Map vendor response → canonical `MarketplaceResult` |

### 7.2 Extensibility (declare, do not implement in Sprint A)

```ts
// Later lifecycle hooks (optional on interface; Capability-gated)
cancel?(ref): Promise<…>
status?(ref): Promise<…>
```

### 7.3 Conceptual interface

```ts
interface MarketplaceExecutor {
  readonly marketplaceId: MarketplaceId;

  buildPayload(input: CanonicalListingInput): Promise<PlatformPayload>;
  validate(payload: PlatformPayload): Promise<ValidationOutcome>;
  preview(payload: PlatformPayload): Promise<PreviewOutcome>;
  register(payload: PlatformPayload): Promise<RegisterRawResult>;
  normalizeResult(raw: RegisterRawResult): MarketplaceResult;
}
```

Canonical types (`CanonicalListingInput`, `MarketplaceResult`, etc.) are defined in the types package at implementation time; Contract Tests pin required fields.

---

## 8. Layer boundaries

| Layer | May know | Must not know |
|-------|----------|---------------|
| UI / Presenter | Descriptor, Capabilities, canonical result DTOs | Executor, vendor SDK, payload internals |
| Pipeline / Application service | Registry, Executor lifecycle, Capabilities | JSX, i18n copy authorship |
| Executor impl | Vendor API, payload schemas, Capability self-description | React components, route handlers |
| Registry | Entries + gate | Business UI |
| Contract Tests | All Executor methods via harness | Production network side effects without fixture mode |

### Alignment with monorepo rules

- Application → Service → (Registry) → Executor → Adapter/SDK  
- Vendor SDK only inside Executor adapter layer (same spirit as “no Supabase/OpenAI in apps/core”).

---

## 9. Forbidden patterns

| # | Forbidden | Why |
|---|-----------|-----|
| F1 | UI imports Executor or vendor client | Breaks Descriptor-only UI |
| F2 | `if (id === 'coupang' \| 'smartstore')` in UI/Pipeline for feature toggles | Must use Capabilities |
| F3 | Registering Executor without Compliance PASS | Breaks Contract gate |
| F4 | Silent mock register in prod without `[Sample]` / env flag | Product Constitution — no silent mock |
| F5 | Duplicating platform metadata outside Registry | Single source of truth |
| F6 | Changing S15 product code for SDK work | S15 CEO Walkthrough freeze |
| F7 | Implementing SmartStore Executor in Sprint A | Sprint B scope |

---

## 10. Coupang migration onto SDK

### 10.1 Target end state (Sprint A)

```text
UI ──Descriptor──▶ Registry.listDescriptors()
Pipeline ──id──▶ Registry.getExecutor('coupang')
                      │
                      ▼
              CoupangExecutor
                buildPayload → validate → preview → register → normalizeResult
```

### 10.2 Migration steps (implementation order — after Freeze)

1. Land contract types + Registry + Compliance harness (red tests).
2. Implement `CoupangExecutor` to satisfy Compliance (fixtures first).
3. Wire bootstrap: register Coupang **only** if Compliance suite green in CI.
4. Point any CartPilot / listing UI at `getDescriptor('coupang')` + Capability checks.
5. Point register pipeline at `getExecutor('coupang')` lifecycle — delete ad-hoc Coupang branches.
6. Golden parity: Payload + register request/response vs baseline fixtures (Acceptance: Regression).

### 10.3 If Coupang code is imported mid-sprint

Treat external CartPilot/Coupang drops as **legacy**. Migration checklist:

- [ ] Extract payload builder → `buildPayload`
- [ ] Extract validators → `validate`
- [ ] Extract preview → `preview`
- [ ] Extract register client → `register`
- [ ] Map responses → `normalizeResult`
- [ ] Move metadata → Descriptor + Capabilities
- [ ] Delete UI/pipeline platform if-branches
- [ ] 100% Compliance + parity fixtures green

---

## 11. Roadmap (document only)

```text
A  Platform SDK v1          ← this contract (Coupang on SDK)
B  SmartStore Executor      ← reference second platform (proves SDK)
C  Recent Work / Snapshot / Resume
D  Dashboard 2.0
E  Expansion (11번가, G마켓, 옥션, 카페24)
```

Sprint B+ are **out of scope** for coding until A Acceptance + CPO gates.

---

## 12. Out of scope (this doc / Sprint A)

- SmartStore feature build / Naver Commerce UX rewrite
- Sprint C–E product work
- S15 Guided Validation product changes
- Real multi-vendor production credentials matrix (env design OK; expansion Executors not A)
- cancel / status lifecycle implementation

---

## 13. CPO gate

```text
CPO Scope Freeze APPROVED on this doc + Contract Tests + Sprint A Plan
  → implementation may start
else
  → NO Registry/Executor/product code
```

S15 remains frozen (CEO Walkthrough). Platform SDK v1 = **Planning / impl blocked** until Freeze approval.
