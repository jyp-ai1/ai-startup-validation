# Sprint A Plan — Platform SDK v1

**Status:** 🟢 **Scope Freeze: APPROVED (CPO)** · ⛔ **Implementation: BLOCKED** until S15 CEO Walkthrough completes **+** CPO impl go  
**Sprint name:** Platform SDK v1  
**Implementation home:** **CartPilot repo only** — not this LaunchLens / `naver-commerce` monorepo  
**Owner:** CTO (docs baseline here) → CartPilot engineering after Walkthrough + CPO impl go  
**Paired docs:**  
- Architecture: [`docs/architecture/PLATFORM_SDK_V1.md`](../architecture/PLATFORM_SDK_V1.md)  
- Contract Tests: [`docs/testing/PLATFORM_CONTRACT_TESTS.md`](../testing/PLATFORM_CONTRACT_TESTS.md)

---

## 0. Freeze & gate order (locked)

| Decision | State |
|----------|-------|
| Scope Freeze | ✅ **APPROVED (CPO)** — baseline locked on the three paired docs |
| Implementation | ⛔ **BLOCKED** — no Registry / Executor / SmartStore code until gates below clear |
| Work location | **CartPilot repo** when coding starts; this repo = planning baseline only |

### Gate order

```text
S15 → CEO Walkthrough → Platform SDK Sprint A (CartPilot repo) → Sprint B SmartStore
```

S15 Walkthrough freeze stays. Do not start CartPilot Sprint A coding until CEO Walkthrough completes and CPO gives impl go.

### Release Gate (every marketplace)

```text
New Marketplace → Registry register → Contract Test → PASS → Merge
```

**No Merge without Executor Compliance.**

---

## 1. Goal (locked by CPO)

Promote CartPilot / marketplace platform support from **ad-hoc implementation** to **Contract**.

**Success = Coupang refactored to run on the SDK**  
**Not success = building SmartStore**  
**CRITICAL:** Sprint A = **`SmartStore 코드 0줄`** (SmartStore implementation FORBIDDEN)

---

## 2. Assumptions / Current state

| Finding | Detail |
|---------|--------|
| CartPilot | **Not found** in this LaunchLens monorepo — implement in **CartPilot repo** |
| Coupang | **Not found** here — greenfield-first-executor assumption for CartPilot Sprint A |
| Closest code here | `apps/web/modules/naver-commerce/` (SmartStore-oriented) — **do not touch in Sprint A** |
| Registry precedent | `packages/ai` ProviderRegistry, automation JobRegistry (shape reference only) |

S15 CEO Walkthrough freeze remains intact — no S15 product code changes for this sprint.

---

## 3. Deliverables (scope frozen)

| # | Deliverable | Done means |
|---|-------------|------------|
| 1 | **MarketplaceRegistry** | Single entry: descriptor / executor / capabilities |
| 2 | **MarketplaceDescriptor** | id, displayName, icon, brandColor, capabilities; UI knows Descriptor only |
| 3 | **MarketplaceCapabilities** | Feature flags for **UI and Pipeline** (e.g. `categoryRecommendation`) |
| 4 | **MarketplaceExecutor** Contract | `buildPayload`, `validate`, `preview`, `register`, `normalizeResult` (cancel/status extensible later) |
| 5 | **Platform Contract Tests** | Core deliverable — shared Compliance suite; gate before Registry registration **and** Merge |

Detail: architecture + test-case specs in paired docs above.

---

## 4. Sprint A exit criteria (locked)

All boxes required. Sprint A is not done if any unchecked.

```text
□ MarketplaceRegistry
□ MarketplaceDescriptor
□ MarketplaceCapabilities
□ MarketplaceExecutor Contract
□ Platform Contract Tests
□ Coupang Refactoring
□ Regression 0
□ SmartStore 코드 0줄   ← CRITICAL: SmartStore implementation FORBIDDEN in Sprint A
```

### Acceptance mapping

| Exit item | Done when |
|-----------|-----------|
| MarketplaceRegistry | All platform metadata via Registry; Coupang entry only via Compliance gate |
| MarketplaceDescriptor | UI renders from Descriptor only |
| MarketplaceCapabilities | UI + Pipeline capability-based (no platform id if-branches for features) |
| MarketplaceExecutor Contract | Coupang runs full lifecycle via Registry |
| Platform Contract Tests | Coupang Executor **100%** Compliance cases PASS |
| Coupang Refactoring | Ad-hoc Coupang paths migrated onto Executor (or greenfield CoupangExecutor if no legacy) |
| Regression 0 | Payload + register parity vs golden / pre-refactor baseline |
| SmartStore 코드 0줄 | Diff contains **zero** SmartStore Executor/feature implementation lines |

---

## 5. Work order (CartPilot — after Walkthrough + CPO impl go only)

```text
0. S15 CEO Walkthrough complete + CPO impl go
1. Contract types + Registry skeleton (no vendor calls)
2. Compliance harness (red) — PLATFORM_CONTRACT_TESTS.md cases
3. CoupangExecutor + golden fixtures → Compliance green
4. Registration gate wired (CI + register() guard)
5. UI Descriptor-only wiring for Coupang
6. Pipeline Capability + Executor lifecycle wiring
7. Regression parity lock (payload/register goldens) → Regression 0
8. Delete / forbid ad-hoc Coupang branches (if any)
9. Exit criteria 8/8 — including SmartStore 코드 0줄 verified
10. Then Sprint B planning (SmartStore register = SDK validation)
```

**Do not start step 1+ in CartPilot until gate order clears. Do not implement in this LaunchLens repo.**

---

## 6. Regression Strategy

| Layer | Strategy |
|-------|----------|
| Golden fixtures | Commit Coupang `buildPayload` + `register` request/response baselines under marketplace test fixtures (CartPilot) |
| Parity case | `register.parity` + payload golden compare in Compliance suite |
| CI | PR touching Executor/Registry must run Compliance + parity → **Release Gate** |
| Non-goal | Live Coupang production as merge gate |
| Drift rule | Intentional vendor schema change = update goldens in same PR with note in Compliance report |
| Pre-refactor | If legacy Coupang exists in CartPilot: freeze baseline **before** refactor, then prove parity |

---

## 7. Sprint B (define only — do not implement)

**First `registry.register(smartstore)` + Contract Test PASS = SDK validation** — not a SmartStore feature build.

| Sprint B is | Sprint B is not |
|-------------|-----------------|
| Second platform on the same SDK | Full SmartStore product / Naver UX rewrite as the goal |
| Proof that harness + Registry are not Coupang one-offs | Expansion marketplace work (Sprint E) |
| Same Compliance suite; Capability-driven skips only where declared | Bypass of Release Gate |

Same Release Gate applies:

```text
New Marketplace → Registry register → Contract Test → PASS → Merge
```

---

## 8. Roadmap order (document only)

```text
S15 → CEO Walkthrough → A Platform SDK v1 (CartPilot, Coupang) → B SmartStore (SDK validation) → C … → D … → E Expansion
```

```text
A  Platform SDK v1          ← this sprint (Coupang on SDK; SmartStore 코드 0줄)
B  SmartStore Executor      ← registry.register(smartstore) + Contract Test PASS
C  Recent Work / Snapshot / Resume
D  Dashboard 2.0
E  Expansion — 11번가, G마켓, 옥션, 카페24
```

---

## 9. Out of Scope (Sprint A)

| Out | Why |
|-----|-----|
| SmartStore any implementation | **CRITICAL** — `SmartStore 코드 0줄`; Sprint B |
| Platform SDK coding in LaunchLens | CartPilot repo only |
| Sprint C–E product work | Later roadmap |
| S15 product code / Walkthrough UX changes | S15 freeze |
| cancel / status Executor methods | Extensibility only |
| Expansion Executors (11번가, G마켓, 옥션, 카페24) | Sprint E |
| Landing redesign, Dashboard 2.0 | Unrelated / Sprint D |

---

## 10. Process constraints

- **S15 remains frozen** (CEO Walkthrough) — do not change S15 product code.
- **Scope Freeze APPROVED** — docs baseline locked; **impl still BLOCKED** until Walkthrough + CPO impl go.
- Coding only in **CartPilot repo** after gates clear.
- **No Merge without Executor Compliance.**

---

## 11. CPO decisions (recorded)

```text
┌─────────────────────────────────────────────────────────┐
│  🟢 Scope Freeze APPROVED (CPO) on:                     │
│    1. docs/architecture/PLATFORM_SDK_V1.md              │
│    2. docs/testing/PLATFORM_CONTRACT_TESTS.md           │
│    3. docs/sprints/SPRINT_A_PLAN.md  (this file)        │
│                                                         │
│  ⛔ Implementation NOT approved                         │
│     BLOCKED until S15 CEO Walkthrough + CPO impl go     │
│                                                         │
│  Work: CartPilot repo only                              │
│  Release Gate:                                          │
│    New Marketplace → Registry register →                │
│    Contract Test → PASS → Merge                         │
└─────────────────────────────────────────────────────────┘
```

---

## 12. Exit report fields (when A completes — future, CartPilot)

| Field | Value at exit |
|-------|----------------|
| Compliance | Coupang 100% |
| Registry | Coupang entry only via gate |
| Regression | Regression 0 (parity goldens green) |
| SmartStore lines | **0** |
| Next | Sprint B — `registry.register(smartstore)` + Contract Test PASS |
