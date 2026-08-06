# Platform Contract Tests — Compliance Spec

**Status:** 🟢 **Scope Freeze: APPROVED (CPO)** · ⛔ **Implementation: BLOCKED** until S15 CEO Walkthrough completes **+** CPO impl go  
**Sprint:** A — Platform SDK v1  
**Implementation home:** **CartPilot repo only** — not this LaunchLens / `naver-commerce` monorepo  
**Paired docs:** [`docs/architecture/PLATFORM_SDK_V1.md`](../architecture/PLATFORM_SDK_V1.md) · [`docs/sprints/SPRINT_A_PLAN.md`](../sprints/SPRINT_A_PLAN.md)  
**Authority:** Every `MarketplaceExecutor` must pass the same Compliance suite before `MarketplaceRegistry.register()`. **No Merge without Executor Compliance.**

---

## 0. Freeze & Release Gate (locked)

| Decision | State |
|----------|-------|
| Scope Freeze | ✅ **APPROVED (CPO)** |
| Implementation | ⛔ **BLOCKED** until S15 CEO Walkthrough + CPO impl go |
| Work location | **CartPilot repo** (harness + fixtures land there) |

### Operating rule / Release Gate

```text
New Marketplace → Registry register → Contract Test → PASS → Merge
```

| Rule | Detail |
|------|--------|
| No Merge without Executor Compliance | PR touching Executor/Registry **must** run Compliance suite green |
| Register without PASS | `Registry.register()` MUST reject; CI MUST fail |
| SmartStore in Sprint A | **FORBIDDEN** — do not add SmartStore Executor cases as Sprint A merge requirements beyond harness extensibility |

### Gate order

```text
S15 → CEO Walkthrough → Platform SDK Sprint A (CartPilot repo) → Sprint B SmartStore
```

---

## 1. Purpose

Contract Tests are a **core Sprint A deliverable**, not an afterthought.

```text
Same Compliance Tests
    ↓
Every Executor (Coupang now, SmartStore in B, …)
    ↓
PASS required to enter Registry
    ↓
PASS required to Merge
```

Goal: platform support is **provably interchangeable at the Contract boundary**, even when vendor payloads differ.

---

## 2. Assumptions / Current state

| Item | State |
|------|-------|
| Existing Compliance suite for marketplaces | ❌ None in this LaunchLens repo |
| Coupang Executor under test | ❌ Absent — **greenfield-first-executor** assumption for CartPilot Sprint A |
| CartPilot code in this repo | ❌ Absent |

**Assumption T1:** Compliance harness lives with the marketplace contract package **in CartPilot**.  
**Assumption T2:** Coupang golden fixtures are authored in CartPilot Sprint A implementation; this doc freezes **required cases, Input / Expected / Fail / Regression**, not fixture bytes.  
**Assumption T3:** Network calls in Compliance mode use **fixture / recorded replay** — no flaky live Coupang dependency in CI gate.  
**Assumption T4:** Until pre-refactor Coupang baselines exist in CartPilot, Regression criteria compare against Sprint A–authored goldens established at first green Compliance; if legacy Coupang exists, freeze baseline **before** refactor then prove parity.

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

## 4. Required cases (v1) — test-case level

All Executors must implement and pass the following. Case IDs are stable for CI reporting.  
**Coupang** is the Sprint A subject (greenfield-first if no CartPilot Coupang code yet). SmartStore cases use the **same** harness in Sprint B.

---

### 4.1 `buildPayload`

#### `buildPayload.happy`

| Field | Spec |
|-------|------|
| **Input** | Valid `CanonicalListingInput` fixture (`fixtures/canonical/happy.json`) with all required fields (title, price, category intent, images/ids as defined by contract types) |
| **Expected** | Non-empty platform payload; all required Coupang (or subject marketplace) fields present per fixture schema; `marketplaceId` / mapping keys match Descriptor id rules |
| **Fail conditions** | Empty object; missing required platform fields; throws on valid input; wrong type for required fields |
| **Regression criteria** | Deep-equal (or schema-equal) to Coupang golden `fixtures/coupang/payload.happy.json` once baseline locked; pre-refactor Coupang parity if legacy baseline exists |

#### `buildPayload.preservesIdentity`

| Field | Spec |
|-------|------|
| **Input** | Happy canonical input with explicit `listingId` / `traceId` (or equivalent identity fields) |
| **Expected** | Identity fields appear in payload (or sanctioned side-channel) exactly per fixture mapping rules |
| **Fail conditions** | Identity dropped, overwritten with random values, or remapped to wrong key |
| **Regression criteria** | Same identity mapping as pre-refactor Coupang builder (or locked golden) |

#### `buildPayload.rejectsEmpty`

| Field | Spec |
|-------|------|
| **Input** | Empty object `{}` and/or fixture with required fields null/missing |
| **Expected** | Throws typed error **or** returns typed error result — **no** silent empty / partial payload treated as success |
| **Fail conditions** | Returns `{}`; returns payload missing required fields without error; swallows exception |
| **Regression criteria** | Error class/code family stable vs Coupang baseline empty-input behavior |

#### `buildPayload.deterministic`

| Field | Spec |
|-------|------|
| **Input** | Same happy canonical input invoked twice in one test |
| **Expected** | Deep-equal payloads excluding **documented** volatile fields only (e.g. timestamps if explicitly sanctioned in fixture meta) |
| **Fail conditions** | Non-deterministic ids/order/content on sanctioned-stable fields |
| **Regression criteria** | Two-run equality matches golden compare rules used for Coupang parity |

---

### 4.2 `validate`

#### `validate.acceptsValid`

| Field | Spec |
|-------|------|
| **Input** | Payload produced by `buildPayload.happy` (or fixture clone of golden happy payload) |
| **Expected** | `ok: true` (or equivalent); zero errors |
| **Fail conditions** | `ok: false` on valid payload; throws; warnings promoted to hard fail incorrectly (unless fixture says so) |
| **Regression criteria** | Same accept set as pre-refactor Coupang validator / golden |

#### `validate.rejectsInvalid`

| Field | Spec |
|-------|------|
| **Input** | Mutated payload fixture (`fixtures/coupang/payload.invalid.json`) — e.g. missing price, illegal category, empty title |
| **Expected** | `ok: false`; ≥1 structured error with `code` + `message` (+ optional `path`) |
| **Fail conditions** | Accepts invalid; returns success; returns empty error list; throws unstructured exception without mapping |
| **Regression criteria** | At least the golden set of invalid cases still reject; error codes stable where baseline defined |

#### `validate.errorShape`

| Field | Spec |
|-------|------|
| **Input** | Same invalid payload as `validate.rejectsInvalid` |
| **Expected** | Every error is structured: `{ code: string, message: string, path?: string }` (or contract-equivalent schema) — not raw string-only dumps |
| **Fail conditions** | String-only errors; empty code; non-array errors blob without schema |
| **Regression criteria** | Error schema matches shared Zod/contract used by Pipeline (Coupang + future SmartStore) |

#### `validate.idempotent`

| Field | Spec |
|-------|------|
| **Input** | Same valid payload validated twice |
| **Expected** | Same outcome (`ok` + error list deep-equal) |
| **Fail conditions** | Flip-flopping ok/fail; error list order/content drift without input change |
| **Regression criteria** | Idempotent behavior preserved vs Coupang baseline |

---

### 4.3 `preview`

**Capability note:** If `capabilities.preview === false`, preview cases may be `skip` **only** when Descriptor Capabilities declare preview unavailable — and Registry must not expose preview UI. **Coupang Sprint A target:** `preview: true` (required pass, not skip).

#### `preview.happy`

| Field | Spec |
|-------|------|
| **Input** | Valid payload from happy build |
| **Expected** | Preview DTO with Founder-facing fields defined in contract types (e.g. title, price display, category label, image refs) |
| **Fail conditions** | Empty preview; missing required Founder fields; throws on valid payload |
| **Regression criteria** | Preview field set ⊇ Coupang golden preview fixture |

#### `preview.reflectsPayload`

| Field | Spec |
|-------|------|
| **Input** | Happy payload with known title/price/category values |
| **Expected** | Preview values match payload mapping rules in fixtures (no stale/wrong fields) |
| **Fail conditions** | Preview title/price diverge from payload mapping; shows placeholder when data present |
| **Regression criteria** | Mapping table matches pre-refactor Coupang preview (or locked golden) |

#### `preview.noSideEffects`

| Field | Spec |
|-------|------|
| **Input** | Valid payload; harness spies on `register` / network adapter |
| **Expected** | Preview completes; **register not called**; no write side effects in fixture mode |
| **Fail conditions** | Register invoked; live network write; state mutated such that a second preview changes vendor state |
| **Regression criteria** | Same no-side-effect guarantee as Coupang baseline preview path |

---

### 4.4 `register`

#### `register.happy`

| Field | Spec |
|-------|------|
| **Input** | Valid payload; Compliance mode = `fixture` with recorded success response |
| **Expected** | Raw result with vendor correlation id / status per fixture; not a silent empty success |
| **Fail conditions** | Throws on valid fixture path; returns success without correlation id when fixture requires it; hits live network in CI |
| **Regression criteria** | Raw result shape matches Coupang golden `register.response.happy.json` |

#### `register.rejectsInvalid`

| Field | Spec |
|-------|------|
| **Input** | Invalid payload (from invalid fixture) |
| **Expected** | Fails without claiming success (`ok: false` / thrown typed error per contract) |
| **Fail conditions** | Returns success; returns vendor id for invalid payload; swallows error |
| **Regression criteria** | Invalid set still rejected vs Coupang baseline |

#### `register.parity`

| Field | Spec |
|-------|------|
| **Input** | Happy payload; capture outgoing request + fixture response in fixture mode |
| **Expected** | Outgoing request and normalized raw response **match** Coupang baseline golden (byte- or schema-comparable per fixture meta) |
| **Fail conditions** | Field drift; header/body key rename without golden update; extra/missing required fields |
| **Regression criteria** | **Sprint A Acceptance — Regression 0:** parity with pre-refactor Coupang when baseline exists; else parity with first locked Sprint A golden (freeze-before-change thereafter) |

#### `register.noSilentMock`

| Field | Spec |
|-------|------|
| **Input** | Valid payload under `production`-like env flag in harness |
| **Expected** | Mock/stub register path **forbidden** unless explicit sample marker / sanctioned test env; harness asserts env discipline |
| **Fail conditions** | Silent mock success in production-like mode; fake vendor id without `[Sample]` / env gate |
| **Regression criteria** | Same env discipline as product constitution — no silent mock regression |

---

### 4.5 `normalizeResult`

#### `normalizeResult.happy`

| Field | Spec |
|-------|------|
| **Input** | Fixture raw success from `register.happy` |
| **Expected** | Canonical `MarketplaceResult` with `marketplaceId`, external id, status, optional url — all required canonical fields present |
| **Fail conditions** | Missing `marketplaceId` / external id; wrong status mapping; throws on known success raw |
| **Regression criteria** | Canonical shape matches shared schema; Coupang success mapping stable vs golden |

#### `normalizeResult.error`

| Field | Spec |
|-------|------|
| **Input** | Fixture raw failure (vendor error code/body) |
| **Expected** | Canonical error result; vendor error code mapped (not discarded); Pipeline-readable |
| **Fail conditions** | Throws away vendor code; returns success; empty error canonical |
| **Regression criteria** | Error mapping table stable vs Coupang golden failure fixtures |

#### `normalizeResult.stableShape`

| Field | Spec |
|-------|------|
| **Input** | One success raw + one failure raw |
| **Expected** | Both conform to shared Zod/schema used by Pipeline |
| **Fail conditions** | Success/error use incompatible shapes; extra required fields only on one path |
| **Regression criteria** | Schema identical for all Executors (Coupang A, SmartStore B+) — shape freeze is the Contract |

---

## 5. Cross-cutting required cases

| Case ID | Intent | Input | Expected | Fail conditions | Regression criteria |
|---------|--------|-------|----------|-----------------|---------------------|
| `meta.marketplaceId` | Executor self-id | Executor instance + Descriptor | `executor.marketplaceId ===` Descriptor `id` | Mismatch / empty id | Id stable across refactors |
| `meta.capabilitiesAligned` | Caps consistency | Entry Capabilities + Descriptor Capabilities | Deep-equal caps | Drift between Descriptor and Entry | Caps freeze unless Contract revision |
| `lifecycle.orderSafe` | Documented order | Happy canonical input | `build → validate → preview → register → normalize` succeeds end-to-end | Any step breaks chain | E2E golden path vs Coupang baseline |
| `lifecycle.validateBeforeRegister` | Safety | Invalid payload in pipeline harness | Register never reports success | Invalid reaches register success | Same safety as Coupang pipeline |

---

## 6. Pass criteria (Executor)

An Executor is **Compliance PASS** when:

1. All **required** cases in §4–§5 are `pass` (allowed skips only per Capability rules in §4.3).
2. `ComplianceReport.passed === true`.
3. CI job runs the suite on every PR that touches Executors/Registry.
4. Coupang-specific (Sprint A): `register.parity` + payload golden parity green → **Regression 0**.

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

### Release Gate (encode in every marketplace PR)

```text
New Marketplace → Registry register → Contract Test → PASS → Merge
```

**No Merge without Executor Compliance.**

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
| Regression | Payload + register parity → **Regression 0** |
| UI | Renders Coupang from Descriptor only |
| Capability | UI + Pipeline gated by Capabilities |
| SmartStore | **코드 0줄** — no SmartStore Executor / feature in Sprint A |

SmartStore Compliance is **Sprint B** — first `registry.register(smartstore)` + Contract Test PASS = **SDK validation** (not SmartStore feature build). Harness must accept a second Executor later; do not implement SmartStore in A.

---

## 9. Out of scope

- Live Coupang production soak as CI gate
- cancel / status Compliance cases (add when lifecycle + Capabilities land)
- SmartStore Executor / `naver-commerce` Compliance migration (Sprint B)
- S15 product test changes
- Implementing the harness in this LaunchLens repo

---

## 10. CPO decisions (recorded)

```text
🟢 Scope Freeze APPROVED (CPO) on this file + PLATFORM_SDK_V1 + SPRINT_A_PLAN
⛔ Implementation NOT approved — BLOCKED until S15 CEO Walkthrough + CPO impl go
Work only in CartPilot repo
Release Gate: New Marketplace → Registry register → Contract Test → PASS → Merge
```
