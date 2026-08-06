# Sprint A Plan — Platform SDK v1

**Status:** 🔒 Scope Freeze package — **impl blocked** until CPO approval  
**Sprint name:** Platform SDK v1  
**Owner:** CTO (docs) → engineering after Freeze  
**Paired docs:**  
- Architecture: [`docs/architecture/PLATFORM_SDK_V1.md`](../architecture/PLATFORM_SDK_V1.md)  
- Contract Tests: [`docs/testing/PLATFORM_CONTRACT_TESTS.md`](../testing/PLATFORM_CONTRACT_TESTS.md)

---

## 1. Goal (locked by CPO)

Promote CartPilot / marketplace platform support from **ad-hoc implementation** to **Contract**.

**Success = Coupang refactored to run on the SDK**  
**Not success = building SmartStore**

---

## 2. Assumptions / Current state

| Finding | Detail |
|---------|--------|
| CartPilot | **Not found** in this monorepo (no package, feature, or docs) |
| Coupang | **Not found** — no Executor, payload, or register client |
| Closest code | `apps/web/modules/naver-commerce/` (SmartStore-oriented pipeline + draft upload stub) |
| Registry precedent | `packages/ai/src/providers/registry.ts`, `packages/automation` `JobRegistry` |

Sprint A therefore **introduces** Platform SDK + Coupang Executor as first compliant platform, and establishes golden fixtures for Regression parity. SmartStore remains Sprint B.

S15 CEO Walkthrough freeze remains intact — no S15 product code changes for this sprint.

---

## 3. Deliverables (scope frozen)

| # | Deliverable | Done means |
|---|-------------|------------|
| 1 | **MarketplaceRegistry** | Single entry: descriptor / executor / capabilities |
| 2 | **MarketplaceDescriptor** | id, displayName, icon, brandColor, capabilities; UI knows Descriptor only |
| 3 | **MarketplaceCapabilities** | Feature flags for **UI and Pipeline** (e.g. `categoryRecommendation`) |
| 4 | **MarketplaceExecutor** lifecycle | `buildPayload`, `validate`, `preview`, `register`, `normalizeResult` (cancel/status extensible later) |
| 5 | **Marketplace Contract Tests** | Core deliverable — shared Compliance suite; gate before Registry registration |

Detail: architecture + test specs in paired docs above.

---

## 4. Acceptance Criteria (all 6 required)

| Item | Done when |
|------|-----------|
| Registry | All platform metadata via Registry |
| Descriptor | UI renders from Descriptor only |
| Executor | Coupang runs via Registry |
| Capability | UI + Pipeline capability-based |
| Contract Test | Coupang Executor **100%** Compliance |
| Regression | Coupang Payload/register parity maintained |

Sprint A is not done if any row is unmet.

---

## 5. Work order (after CPO Scope Freeze only)

```text
0. CPO Scope Freeze APPROVED
1. Contract types + Registry skeleton (no vendor calls)
2. Compliance harness (red) — PLATFORM_CONTRACT_TESTS.md cases
3. CoupangExecutor + golden fixtures → Compliance green
4. Registration gate wired (CI + register() guard)
5. UI Descriptor-only wiring for Coupang
6. Pipeline Capability + Executor lifecycle wiring
7. Regression parity lock (payload/register goldens)
8. Delete / forbid ad-hoc Coupang branches (if any landed)
9. Acceptance checklist sign-off (6/6) — then Sprint B planning
```

**Do not start step 1+ until Freeze approval.**

---

## 6. Regression Strategy

| Layer | Strategy |
|-------|----------|
| Golden fixtures | Commit Coupang `buildPayload` + `register` request/response baselines under marketplace test fixtures |
| Parity case | `register.parity` + payload golden compare in Compliance suite |
| CI | PR touching Executor/Registry must run Compliance + parity |
| Non-goal | Live Coupang production as merge gate |
| Drift rule | Intentional vendor schema change = update goldens in same PR with note in Compliance report |

If CartPilot/Coupang code is imported from elsewhere mid-sprint: freeze a baseline **before** refactor, then prove parity after Executor extraction (see PLATFORM_SDK_V1 §10.3).

---

## 7. Sprint B (define only — do not implement)

**SmartStore Executor (Reference Implementation)** — second platform on the same SDK.

- Proves Registry + Compliance harness are not Coupang-shaped one-offs.
- Likely consumes / migrates patterns from `apps/web/modules/naver-commerce/`.
- Same Compliance suite; SmartStore Capabilities may differ (Capability-driven skips only where declared).

---

## 8. Roadmap order (document only)

```text
A  Platform SDK v1          ← this sprint (Coupang on SDK)
B  SmartStore Executor      ← reference implementation
C  Recent Work / Snapshot / Resume
D  Dashboard 2.0
E  Expansion — 11번가, G마켓, 옥션, 카페24
```

---

## 9. Out of Scope (Sprint A)

| Out | Why |
|-----|-----|
| SmartStore feature build / Naver UX rewrite | Sprint B |
| Sprint C–E product work | Later roadmap |
| S15 product code / Walkthrough UX changes | S15 freeze |
| cancel / status Executor methods | Extensibility only |
| Expansion Executors (11번가, G마켓, 옥션, 카페24) | Sprint E |
| Landing redesign, Dashboard 2.0 | Unrelated / Sprint D |

---

## 10. Process constraints

- **S15 remains frozen** (CEO Walkthrough) — do not change S15 product code.
- **No implementation** of Registry/Executor/Compliance harness until CPO Scope Freeze.
- Docs in this package are the review artifact; coding starts only after explicit CPO approval of all three docs.

---

## 11. Gate — CPO Scope Freeze (mandatory)

```text
┌─────────────────────────────────────────────────────────┐
│  BEFORE any Platform SDK coding:                        │
│                                                         │
│  CPO approves Scope Freeze on:                          │
│    1. docs/architecture/PLATFORM_SDK_V1.md              │
│    2. docs/testing/PLATFORM_CONTRACT_TESTS.md           │
│    3. docs/sprints/SPRINT_A_PLAN.md  (this file)        │
│                                                         │
│  Until then: Planning only / impl blocked               │
└─────────────────────────────────────────────────────────┘
```

---

## 12. Exit report fields (when A completes — future)

| Field | Value at exit |
|-------|----------------|
| Compliance | Coupang 100% |
| Registry | Coupang entry only via gate |
| Regression | Parity goldens green |
| Next | Sprint B SmartStore Executor |
