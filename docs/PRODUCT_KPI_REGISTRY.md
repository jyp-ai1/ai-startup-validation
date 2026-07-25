# Product KPI Registry

**Authority:** `docs/PRODUCT_EVOLUTION_DIRECTIVE.md`  
**Rule:** KPI → Cause → Hypothesis → Experiment → Measure → Next KPI

Engine: `apps/web/lib/analytics/product-os-engine.ts` · Admin **Product OS** panel

---

## PM loop (automatic)

```text
KPI 수집 → Drop-off 발견 → 원인 → 가설 → Product 개선 → Analytics → Production → 재측정 → 다음 KPI
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

## Product OS (Admin)

`/admin/operations` → **Product OS** shows:

1. Primary KPI + current %
2. Biggest funnel drop
3. Root cause · Hypothesis · Experiment
4. Deploy version · Measure formula · Next KPI

---

## Loop pointer

[PRODUCT_LOOP_STATE.md](./PRODUCT_LOOP_STATE.md)

## Gate

> 이 실험이 **어느 KPI**를 **얼마나** 올리는가? → 재측정 이벤트는?
