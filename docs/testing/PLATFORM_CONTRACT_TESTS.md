# Platform Contract Tests — Compliance Spec

**Status:** 🔒 Scope Freeze — awaiting CPO approval (NO implementation until approved)  
**Sprint:** A — Platform SDK v1  
**Paired docs:** [`docs/architecture/PLATFORM_SDK_V1.md`](../architecture/PLATFORM_SDK_V1.md) · [`docs/sprints/SPRINT_A_PLAN.md`](../sprints/SPRINT_A_PLAN.md)  
**Authority:** Every `MarketplaceExecutor` must pass the same Compliance suite before `MarketplaceRegistry.register()`.

---

## 1. Purpose

Contract Tests are a **core Sprint A deliverable**, not an afterthought.

```text
Same Compliance Tests
    ↓
Every Executor (Coupang now, SmartStore in B, …)
    ↓
PASS required to enter Registry
```

Goal: platform support is **provably interchangeable at the Contract boundary**, even when vendor payloads differ.

---

## 2. Assumptions / Current state

| Item | State |
|------|-------|
| Existing Compliance suite for marketplaces | ❌ None |
| Coupang Executor under test | ❌ Absent in repo (see PLATFORM_SDK_V1 §2) |
| Closest test precedents | `apps/web/modules/naver-commerce/__tests__/*`, `packages/automation` job tests, AI `ProviderRegistry` tests |

**Assumption T1:** Compliance harness lives with the marketplace contract package (proposed: `packages/marketplace/src/__tests__/compliance/` or equivalent).  
**Assumption T2:** Coupang golden fixtures are authored in Sprint A implementation; this doc freezes **required cases and pass criteria**, not fixture bytes.  
**Assumption T3:** Network calls in Compliance mode use **fixture / recorded replay** — no flaky live Coupang dependency in CI gate.

---

## 3. Compliance Test harness

### 3.1 Shape

```text
complianceSuite(executor, fixtures) → ComplianceReport
```

| Input | Requirement |
|-------|-------------|
| `executor` | Implements full v1 lifecycle |
| `fixtures` | Canonical inputs + expected payload shapes + validate/preview/register/normalize cases |
| Mode | `fixture` (CI) mandatory; `live` optional / manual only |

### 3.2 Report

```ts
type ComplianceReport = {
  marketplaceId: string;
  passed: boolean;
  cases: Array<{
    id: string;           // e.g. 'buildPayload.happy'
    lifecycle: 'buildPayload' | 'validate' | 'preview' | 'register' | 'normalizeResult';
    status: 'pass' | 'fail' | 'skip';
    message?: string;
  }>;
};
```

**Pass rule:** `passed === true` iff every **required** case is `pass` (no required `fail` or unexpected `skip`).

---

## 4. Required cases (v1)

All Executors must implement and pass the following. Case IDs are stable for CI reporting.

### 4.1 `buildPayload`

| Case ID | Intent | Pass when |
|---------|--------|-----------|
| `buildPayload.happy` | Valid canonical listing → platform payload | Payload non-empty; required platform fields present per fixture schema |
| `buildPayload.preservesIdentity` | Trace / listing identity carried | Trace/id fields match fixture mapping rules |
| `buildPayload.rejectsEmpty` | Empty / missing required canonical input | Throws or returns typed error — no silent empty payload |
| `buildPayload.deterministic` | Same input twice | Deep-equal payloads (excluding sanctioned volatile fields, e.g. timestamps if documented) |

### 4.2 `validate`

| Case ID | Intent | Pass when |
|---------|--------|-----------|
| `validate.acceptsValid` | Payload from happy build | `ok: true` (or equivalent); zero errors |
| `validate.rejectsInvalid` | Mutated / fixture-invalid payload | `ok: false`; ≥1 structured error with code/path |
| `validate.errorShape` | Invalid case errors | Errors are structured (code + message + optional path) — not raw string-only dumps |
| `validate.idempotent` | Validate same valid payload twice | Same outcome |

### 4.3 `preview`

| Case ID | Intent | Pass when |
|---------|--------|-----------|
| `preview.happy` | Valid payload | Preview DTO with Founder-facing fields defined in contract types |
| `preview.reflectsPayload` | Title/price/etc. | Preview values match payload mapping rules in fixtures |
| `preview.noSideEffects` | Preview must not register | No register side effect; fixture spy asserts register not called |

**Capability note:** If `capabilities.preview === false`, preview cases may be `skip` **only** when Descriptor Capabilities declare preview unavailable — and Registry must not expose preview UI. Coupang Sprint A target: `preview: true` (required pass, not skip).

### 4.4 `register`

| Case ID | Intent | Pass when |
|---------|--------|-----------|
| `register.happy` | Valid payload in fixture mode | Returns raw result with vendor correlation id / status per fixture |
| `register.rejectsInvalid` | Invalid payload | Fails without claiming success |
| `register.parity` | Golden raw request/response | Matches Coupang baseline fixture (Sprint A Regression Acceptance) |
| `register.noSilentMock` | Env discipline | In `production`-like flag, mock path forbidden unless explicit sample marker — assert in harness |

### 4.5 `normalizeResult`

| Case ID | Intent | Pass when |
|---------|--------|-----------|
| `normalizeResult.happy` | Fixture raw success | Canonical `MarketplaceResult` with `marketplaceId`, external id, status, optional url |
| `normalizeResult.error` | Fixture raw failure | Canonical error result — never throws away vendor error code without mapping |
| `normalizeResult.stableShape` | Success + error | Both conform to shared Zod/schema used by Pipeline |

---

## 5. Cross-cutting required cases

| Case ID | Intent | Pass when |
|---------|--------|-----------|
| `meta.marketplaceId` | Executor self-id | `executor.marketplaceId ===` Descriptor `id` |
| `meta.capabilitiesAligned` | Caps consistency | Entry Capabilities match Descriptor Capabilities |
| `lifecycle.orderSafe` | Documented order | `build → validate → preview → register → normalize` works on happy path |
| `lifecycle.validateBeforeRegister` | Safety | Register path in pipeline harness calls validate; invalid never reaches register success |

---

## 6. Pass criteria (Executor)

An Executor is **Compliance PASS** when:

1. All **required** cases in §4–§5 are `pass` (allowed skips only per Capability rules in §4.3).
2. `ComplianceReport.passed === true`.
3. CI job for the marketplace package runs the suite on every PR that touches Executors/Registry.
4. Coupang-specific: `register.parity` + payload golden parity green (Sprint A Acceptance: Regression).

An Executor is **FAIL** if any required case fails — including non-deterministic `buildPayload`, side-effecting `preview`, or unstructured validate errors.

---

## 7. Registration gate rule

```text
┌──────────────────────────────────────────────┐
│  MarketplaceRegistry.register(entry)         │
│                                              │
│  IF compliance not proven for entry.executor │
│     → MUST reject (throw / CI fail)          │
│  IF compliance PASS                          │
│     → register allowed                       │
└──────────────────────────────────────────────┘
```

### Enforcement levels (all required for Sprint A Acceptance)

| Level | Mechanism |
|-------|-----------|
| CI | Compliance suite must pass before merge |
| Runtime (dev/test) | `register()` asserts Compliance badge / manifest generated by test run |
| Runtime (prod) | Only Executors shipped with PASS manifest are bootstrapped |

**Forbidden:** Manual `register(coupang)` in app bootstrap that bypasses the gate “to unblock UI”.

---

## 8. Coupang Sprint A bar

| Gate | Required |
|------|----------|
| Coupang Executor Compliance | **100%** required cases PASS |
| Registry | Coupang registered only via gate |
| Regression | Payload + register parity vs golden fixtures |
| UI | Renders Coupang from Descriptor only |
| Capability | UI + Pipeline gated by Capabilities |

SmartStore Compliance is **Sprint B** — do not block Sprint A on SmartStore cases beyond ensuring the **same harness** can accept a second Executor later.

---

## 9. Out of scope

- Live Coupang production soak as CI gate
- cancel / status Compliance cases (add when lifecycle + Capabilities land)
- Rewriting `naver-commerce` tests into Compliance (Sprint B migration)
- S15 product test changes

---

## 10. CPO gate

This spec is part of the Scope Freeze package. **No Compliance harness implementation** until CPO approves:

1. `docs/architecture/PLATFORM_SDK_V1.md`
2. `docs/testing/PLATFORM_CONTRACT_TESTS.md` (this file)
3. `docs/sprints/SPRINT_A_PLAN.md`
