# UI Audit — Sprint UI 4.1 (Insight-First Intelligence Platform)

**Date:** 2026-07-20  
**Philosophy:** AI speaks first — conclusion before data. No new features/API.  
**Status:** Complete. Build + lint pass. No deploy.

---

## Standard Page Flow (Intelligence Layout System)

Every migrated feature page now follows:

```
1. Page Header (eyebrow + title)
2. AI Summary Card      ← GO / Funding Probability / Stars / Recommendation
3. Key Insights         ← bullet conclusions
4. AI Reasoning         ← why (numbered + progress bars)
5. Confidence Meter     ← circular reliability
6. Category Chips       ← (Evidence only)
7. Filters / Actions
8. Data Cards
9. Growth Timeline
10. Raw Table           ← last
```

**WorkspaceHeader removed** from all migrated list pages.

---

## Epic Completion

| Epic | Status |
|------|--------|
| Intelligence Layout System | `IntelligencePage` component |
| AI Insight Components | Summary, Confidence, Insights, Reasoning, Expert Consensus, Timeline |
| Page Migration (8 pages) | VOC, Grants, Validation, Reports, Business Plan, PRD, Dev Spec, Knowledge |
| Dashboard reorder | Hero → AI Summary → Insights/Reasoning → Action → Experts → Radar → Metrics → Timeline |
| Motion | Count-up, progress animation, hover lift, fade-in |

---

## Dashboard Order (PM Spec)

```
Hero
→ AI Summary Card
→ Key Insights + AI Reasoning
→ Action Center
→ Expert Consensus (82% / ★★★★★ cards)
→ Validation Radar
→ Readiness Rings (Metrics)
→ Growth Timeline
→ Evidence Snapshot
```

---

## Insight Derivation (No New API)

All AI Summary / Insights / Reasoning derived from existing data:

- `lib/intelligence/build-dashboard-insights.ts` — dashboard
- `lib/intelligence/build-feature-insights.ts` — per-feature pages

Templates use validation scores, evidence confidence, VOC volume, grant fit, document status.

---

## Migrated Pages

| Page | Component |
|------|-----------|
| Dashboard | `intelligence-dashboard.tsx` |
| Evidence | `evidence-list.tsx` |
| VOC | `voc-list.tsx` |
| Grants | `grant-list.tsx` |
| Validation | `validation-dashboard.tsx` |
| Reports | `report-list.tsx` |
| Business Plan | `business-plan-list.tsx` |
| PRD | `prd-list.tsx` |
| Dev Spec | `development-spec-list.tsx` |
| Knowledge | `knowledge-list.tsx` |

---

## Still Using Old Layout

- Research, Competitors, Project Overview, AI Agent, AI Studio hub
- Global feature picker pages (`/voc`, `/reports`, etc.)
- Entity detail/edit sub-pages

---

## Build

```
pnpm --filter web build  ✓
pnpm --filter web lint   ✓
```

---

## Next (UI 4.2)

1. Migrate Research + Competitors + Project Overview to IntelligencePage
2. Real LLM-generated AI Summary (when backend ready) — swap template keys for API response
3. Skeleton loading + unified empty states
4. Agent page intelligence layout
