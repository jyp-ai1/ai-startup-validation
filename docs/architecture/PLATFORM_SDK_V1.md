# Platform SDK v1 — Architecture Contract

**Status:** 🟢 **Scope Freeze: APPROVED (CPO)** · ⛔ **Implementation: BLOCKED** until S15 CEO Walkthrough completes **+** CPO impl go  
**Sprint:** A — Platform SDK v1  
**Implementation home:** **CartPilot repo only** — not this LaunchLens / `naver-commerce` monorepo  
**Paired docs:** [`docs/testing/PLATFORM_CONTRACT_TESTS.md`](../testing/PLATFORM_CONTRACT_TESTS.md) · [`docs/sprints/SPRINT_A_PLAN.md`](../sprints/SPRINT_A_PLAN.md)  
**Authority:** CTO architecture contract for marketplace platform support. Product code must not diverge from this doc after CPO Scope Freeze.

---

## 0. Freeze & gate (locked)

| Decision | State |
|----------|-------|
| Scope Freeze | ✅ **APPROVED (CPO)** — this doc + Contract Tests + Sprint A Plan are the baseline |
| Implementation | ⛔ **BLOCKED** — no Registry / Executor / SmartStore product code until gate order clears |
| Work location | **CartPilot repo** only (when impl starts). This LaunchLens repo holds **planning baseline docs** only |

### Gate order (non-negotiable)

```text
S15 → CEO Walkthrough → Platform SDK Sprint A (CartPilot repo) → Sprint B SmartStore
```

S15 Walkthrough freeze stays in this repo. Platform SDK coding starts only in CartPilot after Walkthrough + CPO impl go.

### Release Gate (every new marketplace)

```text
New Marketplace → Registry register → Contract Test → PASS → Merge
```

**No Merge without Executor Compliance.** Detail: [`PLATFORM_CONTRACT_TESTS.md`](../testing/PLATFORM_CONTRACT_TESTS.md).

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
**CRITICAL:** SmartStore implementation is **FORBIDDEN** in Sprint A (`SmartStore 코드 0줄`).

---

## 2. Assumptions / Current state

### 2.1 CartPilot / Coupang — not present in this repo

As of Scope Freeze baseline (2026-08-06), this LaunchLens monorepo has:

| Expected | Found? | Notes |
|----------|--------|-------|
| CartPilot product surface | ❌ Absent | No files, packages, or docs named CartPilot |
| Coupang Executor / API client | ❌ Absent | No Coupang payload/register code |
| MarketplaceRegistry / Descriptor | ❌ Absent | Greenfield for Sprint A **in CartPilot repo** |

**Assumption A1:** Sprint A **implements** Platform SDK packages/modules and a **Coupang Executor** as the first compliant implementation **in the CartPilot repo**. Coupang is the greenfield-first-executor. If legacy CartPilot/Coupang code already exists there, it must be **migrated onto** this Contract — not left as a parallel path.

**Assumption A2:** “Coupang Payload/register parity” Acceptance means: once a Coupang baseline fixture set is established in Sprint A (golden payloads + register request/response), refactor must preserve byte-comparable / schema-comparable parity. Fixtures are authored during CartPilot Sprint A implementation (post–impl go), not during this doc phase.

**Assumption A3:** This LaunchLens / `naver-commerce` tree is **out of scope** for Sprint A coding. Do not refactor `apps/web/modules/naver-commerce/` for Platform SDK in Sprint A.

### 2.2 Closest existing code in this repo (shape reference only — do not implement against)

| Path | Relevance |
|------|-----------|
| `apps/web/modules/naver-commerce/` | SmartStore-oriented import → draft → upload stub — **Sprint B candidate later; 0 lines in Sprint A** |
| `packages/ai/src/providers/registry.ts` | `ProviderRegistry` — registry pattern precedent |
| `packages/automation/src/jobs/index.ts` | `JobRegistry` pattern |

**Assumption A4:** Sprint B = first `registry.register(smartstore)` + Contract Test PASS = **SDK validation** (not a SmartStore feature build). May later wrap/replace ad-hoc Naver paths; Sprint A must not touch SmartStore.

### 2.3 Layering (must fit CartPilot / shared packages when impl starts)

- Apps consume packages; packages never import from apps.
- No marketplace vendor SDK imports in UI trees or shared core.
- UI knows Descriptor only; Executors stay server/pipeline-side.

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
Merge without PASS     →  FORBIDDEN
```

Release path:

```text
New Marketplace → Registry register → Contract Test → PASS → Merge
```

See [`PLATFORM_CONTRACT_TESTS.md`](../testing/PLATFORM_CONTRACT_TESTS.md).

### 4.4 Proposed placement (CartPilot repo — post–impl go)

| Layer | Proposed path (indicative) |
|-------|----------------------------|
| Contracts / types | marketplace contract package in CartPilot |
| Registry + Executor interfaces | same package |
| Coupang Executor impl | `executors/coupang/` |
| Contract tests | `__tests__/compliance/` |
| App wiring | Descriptor-only consumers |

Exact package paths are an implementation detail **after** CPO impl go; boundaries above are frozen.

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

Canonical types are defined at CartPilot implementation time; Contract Tests pin required fields and cases.

---

## 8. Layer boundaries

| Layer | May know | Must not know |
|-------|----------|---------------|
| UI / Presenter | Descriptor, Capabilities, canonical result DTOs | Executor, vendor SDK, payload internals |
| Pipeline / Application service | Registry, Executor lifecycle, Capabilities | JSX, i18n copy authorship |
| Executor impl | Vendor API, payload schemas, Capability self-description | React components, route handlers |
| Registry | Entries + gate | Business UI |
| Contract Tests | All Executor methods via harness | Production network side effects without fixture mode |

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
| F7 | Implementing SmartStore Executor in Sprint A | **CRITICAL** — Sprint B only; Sprint A = `SmartStore 코드 0줄` |
| F8 | Implementing Platform SDK in this LaunchLens repo | Work in **CartPilot repo** only |
| F9 | Merge without Executor Compliance | Release Gate |

---

## 10. Coupang migration onto SDK

### 10.1 Target end state (Sprint A — CartPilot)

```text
UI ──Descriptor──▶ Registry.listDescriptors()
Pipeline ──id──▶ Registry.getExecutor('coupang')
                      │
                      ▼
              CoupangExecutor
                buildPayload → validate → preview → register → normalizeResult
```

### 10.2 Migration steps (implementation order — after Walkthrough + CPO impl go, in CartPilot)

1. Land contract types + Registry + Compliance harness (red tests).
2. Implement `CoupangExecutor` to satisfy Compliance (fixtures first; greenfield-first if no prior Coupang code).
3. Wire bootstrap: register Coupang **only** if Compliance suite green in CI.
4. Point listing UI at `getDescriptor('coupang')` + Capability checks.
5. Point register pipeline at `getExecutor('coupang')` lifecycle — delete ad-hoc Coupang branches.
6. Golden parity: Payload + register request/response vs baseline fixtures (Acceptance: Regression 0).

### 10.3 If Coupang legacy code exists in CartPilot

Treat as **legacy**. Migration checklist:

- [ ] Extract payload builder → `buildPayload`
- [ ] Extract validators → `validate`
- [ ] Extract preview → `preview`
- [ ] Extract register client → `register`
- [ ] Map responses → `normalizeResult`
- [ ] Move metadata → Descriptor + Capabilities
- [ ] Delete UI/pipeline platform if-branches
- [ ] 100% Compliance + parity fixtures green
- [ ] **Zero** SmartStore Executor / feature lines in the Sprint A PR

---

## 11. Roadmap (document only)

```text
A  Platform SDK v1          ← Coupang on SDK (CartPilot) — SmartStore 코드 0줄
B  SmartStore Executor      ← first registry.register(smartstore) + Contract Test PASS = SDK validation
C  Recent Work / Snapshot / Resume
D  Dashboard 2.0
E  Expansion (11번가, G마켓, 옥션, 카페24)
```

Sprint B+ are **out of scope** until A Acceptance + CPO gates.

---

## 12. Out of scope (this doc / Sprint A)

- SmartStore feature build / any SmartStore code (`SmartStore 코드 0줄`)
- Sprint C–E product work
- S15 Guided Validation product changes
- Platform SDK coding in this LaunchLens / `naver-commerce` repo
- Real multi-vendor production credentials matrix (env design OK; expansion Executors not A)
- cancel / status lifecycle implementation

---

## 13. CPO decisions (recorded)

```text
🟢 Scope Freeze APPROVED (CPO) on:
   1. docs/architecture/PLATFORM_SDK_V1.md
   2. docs/testing/PLATFORM_CONTRACT_TESTS.md
   3. docs/sprints/SPRINT_A_PLAN.md

⛔ Implementation NOT approved — BLOCKED until:
   S15 CEO Walkthrough completes + CPO impl go

Work only in CartPilot repo (not LaunchLens).
```
