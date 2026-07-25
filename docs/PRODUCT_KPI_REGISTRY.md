# Product KPI Registry

**Authority:** `docs/PRODUCT_EVOLUTION_DIRECTIVE.md`  
**Rule:** Cursor thinks in **KPI**, never in screen names. Reports name KPIs only.

---

## PM loop (every iteration)

```text
현재 KPI 분석 → Drop-off 분석 → 원인 → 행동 분석
→ 가장 큰 KPI 하나 선택 → Product 개선 → Analytics 추가
→ Production → 다음 KPI
```

---

## North-star funnel KPIs

| KPI | Definition | Funnel |
|-----|------------|--------|
| **Service Understanding** | Landing → Goal intent (proxy: landing CTA / time on hero) | landing_viewed → cta_start |
| **Goal Selection Rate** | % landing sessions that select a Goal | goal_selected / landing_viewed |
| **Workflow Completion** | Goal → Workflow confirmed | workflow_started / goal_selected |
| **Activation** | Landing → Project created | project_created / landing_viewed |
| **Project Start Rate** | Workspace → one-line project submit | project_created / workspace_entered |
| **AI Trust** | Decision viewed with evidence (proxy: hold_path_viewed, intelligence open) | hold_path_viewed / decision_generated |
| **Decision Understanding** | Project → first Decision | decision_generated / project_created |
| **GO Conversion** | GO / all decisions | go_reached / decision_generated |
| **Execution Start** | GO → first execution task | execution_started / go_reached |
| **Execution Completion** | All execution tasks done | execution_task_completed rate |
| **Retention / Daily Return** | Return within 24h | session replay / cohort |
| **Feedback Score** | Positive feedback ratio | feedback up / total |
| **NPS / WOW / Habit** | Post-beta instrumentation | TBD |

Extended: Weekly Return · Project Completion · Confidence Increase · Referral · Habit Formation

---

## Data sources

| Source | Role |
|--------|------|
| `/api/analytics/events` + ops store | Product funnel (Admin `/admin/operations`) |
| PostHog | `NEXT_PUBLIC_POSTHOG_KEY` |
| Clarity | `NEXT_PUBLIC_CLARITY_PROJECT_ID` |
| Google Form / Feedback modal | Qualitative |

---

## Current loop pointer

[PRODUCT_LOOP_STATE.md](./PRODUCT_LOOP_STATE.md)

## Pre-implementation gate

> 이 변경이 **어느 KPI**를 **얼마나** 올리는가?

No answer → do not implement.
