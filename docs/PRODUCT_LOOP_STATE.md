# Product Loop State

**Mode:** Founder Project OS — Level 5  
Production: https://ai-startup-validation-tau.vercel.app/workspace

---

## Architecture split

```text
Founder → Founder AI PM → 사업 성공 확률
CPO/운영 → Product OS → 제품 성공 확률
```

## Founder AI PM (Project OS)

| Layer | Surface |
|-------|---------|
| Daily Brief | `/workspace` Today |
| Weekly Strategy | Operating panel |
| AI Memory | Operating panel |
| AI Mentor | Operating panel |
| Strategy Calendar | Operating panel |
| Decision depth | DecisionExperienceCoach |

Engine: `founder-ai-pm-engine.ts` · `computeFounderOperatingBrief()`

**Gate:** "Founder가 AI PM과 매일 일하는 경험을 더 강하게 만드는가?"

## Active experiment

| Field | Value |
|-------|-------|
| **KPI** | Decision Understanding Rate |
| **Founder OS** | Daily Brief + Calendar + Memory + Mentor |
| **Admin OS** | Product Brain v3 (Product/User/Release Intelligence) |

## Product Brain v3 (Admin)

- Product Intelligence — success / failed / recommended experiments
- User Intelligence — top friction + fix
- Release Intelligence — deploy impact + rollback

---

PR template: [PRODUCT_LOOP_PR_TEMPLATE.md](./PRODUCT_LOOP_PR_TEMPLATE.md)
