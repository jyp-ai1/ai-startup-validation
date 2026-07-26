# Product Loop PR Template

**Rule:** Never build a feature because it exists. Build only when a **KPI dropped**.

Every PR must include this block (in PR body or linked doc):

```text
Primary KPI
↓
Drop-off
↓
Root cause
↓
Hypothesis
↓
Implementation
↓
Expected lift
↓
Measurement events
↓
Success criteria (Adopt threshold)
↓
Rollback conditions
```

---

## Example — Decision Understanding (Founder AI PM)

| Field | Value |
|-------|-------|
| **Primary KPI** | Decision Understanding Rate |
| **Drop-off** | analysis → decision −45% |
| **Root cause** | HOLD without 3-second clarity |
| **Hypothesis** | AI Summary + Breakdown + What If + action rewards |
| **Implementation** | Founder AI PM engine + coach components |
| **Expected lift** | +15% |
| **Events** | `hold_path_viewed`, `coach_clicked` (what_if) |
| **Adopt** | delta ≥ +3% on Decision Understanding |
| **Rollback** | delta ≤ −2% or HOLD understanding drops |

---

## Priority order

```text
① Founder AI PM
② Product OS (Admin)
③ Analytics
④ Performance
⑤ Product OS depth
```

Founder experience always ships before Admin.
