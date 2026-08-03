# S13 Acceptance Contract

**Status:** Locked before Implementation  
**Paired with:** `S13_IMPLEMENTATION.md`  
**Purpose:** S13 PASS는 코드량이 아니라 이 Contract 충족으로 판정한다.

> Implementation Rule (parent):  
> Same Stage · Type · Evidence ⇒ same Decision. Else bug — not intelligence.

---

## 1. Determinism

동일 입력 → 동일 출력. **100회 실행해도 동일.**

```
Stage
Type
Evidence
    ↓
Decision
Insight
Recommended Action
```

Fail if outputs diverge with identical inputs.

---

## 2. Traceability

모든 Decision은 근거 역추적 가능.

```
Decision: Revenue = Insufficient
Evidence: Revenue = Unknown
Reason:   Rule R-03
```

Fail if a Decision cannot name Evidence + Rule id.

---

## 3. No Hallucination

Engine은 Evidence 없는 Insight를 만들 수 없다.

```
Evidence 없음 → Insight 생성  = FAIL
```

Every Insight cites ≥1 Evidence object (and its Decision).

---

## 4. Rule Coverage

모든 Rule에 Acceptance Test 1:1.

```
R-01 ✓ Test
R-02 ✓ Test
R-03 ✓ Test
…
```

Fail if any shipped Rule lacks a test.

---

## 5. Engine Purity

Engine은 UI와 완전 분리.

```
Engine → Presenter → UI
```

Fail if Engine contains JSX, i18n/translation keys, or Founder-facing copy authoring beyond structured Insight fields defined in S12.

---

## S13 PASS (이것만)

| Gate | Required |
|------|----------|
| Rule 구현 | yes |
| Rule Acceptance 100% | yes (§4) |
| Deterministic | yes (§1) |
| Traceability | yes (§2) |
| No Hallucination | yes (§3) |
| Engine Purity | yes (§5) |
| CPO Review | yes |

Not PASS criteria: prettier UI · smarter LLM · new Types/Canons/Libraries.

---

## Roadmap lock

```
S10 Knowledge → S11 Surface → S12 Analysis (all FROZEN)
    ↓
S13 Implementation
    ├── Acceptance Contract (this file)
    ├── Determinism
    ├── Traceability
    └── Evidence
    ↓
CPO Review
```

After S13: verify **설계대로 구현되었는가** — not “설계가 맞느냐.”
