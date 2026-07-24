# Epic 2 — Autonomous Progress Log

**Mode:** PM Delegation (Product Director)  
**Target:** Alpha v2.0.2 → v2.1.0  
**Mission:** Mock Intelligence → Explainable Intelligence

---

## Commit 1 (pending)

**Scope:** Performance foundation + Journey analytics + Intelligence UX + Korean unification

### Performance & bundle
- `optimizePackageImports` for lucide-react, @repo/ui
- Landing: IntersectionObserver lazy sections, dynamic header/hero
- Journey routes: dynamic imports (goal/workflow/workspace/coach)
- Goal route First Load JS: ~201kB → ~184kB

### Analytics (mock wired)
- `JOURNEY_ANALYTICS_EVENTS` + `useJourneyAnalytics`
- Events: landing_viewed, goal_selected, workflow_created, workspace_loaded, coach_clicked, confidence_opened, why_opened, mock_action_completed, feedback_sent, compose_failed/retried

### UX
- ConfidenceMeter + gain animation
- MissingDataProgress checklist
- Evidence citation badges (gov/market/database) + mock preview toast
- Coach lazy load + improved skeletons
- Workspace rename: **AI 전략 워크스페이스** (ko) / AI Strategy Workspace (en)
- Korean copy unification across workflow journey

### Responsive
- Journey layout 2xl max-width, coach stack on mobile
- Feedback widget 390/430 safe area

---

## QA (local)

| Gate | Result |
|------|--------|
| Lint | ✅ |
| Build / Type | ✅ |
| Lighthouse | ⏳ After Preview deploy |

---

## Known Issues

- Preview Deployment Protection may block external smoke
- Performance 85+ gate — verify on Preview after deploy

---

## Next

- Preview deploy + Lighthouse
- Production if gates pass (Accessibility 95+, Performance 85+)
- Epic 2 Review doc for PM morning
