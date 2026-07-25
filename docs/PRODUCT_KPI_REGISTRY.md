# Product KPI Registry

**Authority:** `docs/PRODUCT_EVOLUTION_DIRECTIVE.md`  
**Rule:** KPI → Cause → Hypothesis → Experiment → **Impact → Adopt/Rollback** → Next experiment

Engine: `product-os-engine.ts` · `experiment-tracker.ts` · Admin **Product OS v2**

---

## PM loop (automatic)

```text
KPI 수집 → Drop-off → 원인 → 가설 → 실험 → 영향도(Impact) → Adopt / Rollback → 재측정 → 다음 실험
```

---

## Acquisition

| KPI | Measure | Event proxy |
|-----|---------|-------------|
| Landing CTR | CTA / landing | `landing_start_click` / `landing_viewed` |
| CTA CTR | Hero CTA | `cta_start` |
| Scroll Depth | Hero engagement | Clarity / PostHog |
| First Impression | 5s comprehension | Service Understanding proxy |
| **Goal Selection Rate** | goal / landing | `goal_selected` / `landing_viewed` |

---

## Activation

| KPI | Measure |
|-----|---------|
| Goal Selection | goal / landing |
| Workflow Completion | workflow / goal |
| **Project Start Rate** | project / workspace |
| **Activation** | project / landing |
| Recommended Goal Rate | recommended / goal |

---

## Trust

| KPI | Measure |
|-----|---------|
| HOLD Understanding | `hold_path_viewed` / decision |
| **AI Trust** | Intelligence engagement / decision |
| Evidence Engagement | evidence panel open |
| Citation Click | citation events (TBD) |
| Confidence Change | confidence delta events (TBD) |

---

## Decision & Success

| KPI | Measure |
|-----|---------|
| **Decision Understanding** | decision / project |
| **GO Conversion** | go / decision |
| **Execution Start** | execution_started / go |
| **Execution Completion** | task_completed / execution_started |
| Project Completion | TBD cohort |

---

## Habit & Retention

| KPI | Measure |
|-----|---------|
| Daily Return | 24h return session |
| Weekly Return | 7d cohort |
| Session Length | PostHog |
| Next Action Completion | coach action / recommendation |
| Habit Formation | streak (TBD) |

---

## Feedback & Business

| KPI | Measure |
|-----|---------|
| **Feedback Score** | positive / total feedback |
| NPS | survey (TBD) |
| WOW Moment | go_reached + celebration |
| Beta Retention | workspace return |
| Invite / Referral / Waitlist / Paid Interest | TBD |

---

## Product OS v2 (Admin)

`/admin/operations` → **Autonomous Product**

1. **AI PM** — 오늘 무엇을 개선해야 하는가 (P0/P1, expected lift, risk)
2. Primary KPI + biggest drop
3. **Impact** — baseline → current → delta · **Adopt** / **Rollback** / Measuring
4. Cause · Hypothesis · Experiment · **Next experiment**
5. **Product Health Score**

## Impact rules

| Delta | Action |
|-------|--------|
| ≥ +3% | **Adopt** |
| ≤ −2% | **Rollback** |
| else | Measuring |

---

## Loop pointer

[PRODUCT_LOOP_STATE.md](./PRODUCT_LOOP_STATE.md)

## Gate

> 이 실험이 **어느 KPI**를 **얼마나** 올리는가? → 재측정 이벤트는?
