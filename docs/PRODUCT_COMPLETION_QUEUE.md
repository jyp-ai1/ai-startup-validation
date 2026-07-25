# LaunchLens Product Completion Queue — Infinite Mode

**This directive never ends.**  
**Consumer pointer:** `docs/QUEUE_STATE.md`  
**Vision:** `docs/PRODUCT_VISION_V3.md`

---

## Operating principles (immutable)

```text
이 작업지시서는 종료되지 않는다.
작업 완료 후 다음 작업을 기다리지 않는다.
Roadmap을 모두 소비할 때까지 계속 진행한다.
Roadmap이 모두 완료되면 Product Vision을 기준으로 새로운 Queue를 생성하여 계속 진행한다.

Commit · Push · Production Deploy · Smoke Test · QA · Documentation — 모두 자동 수행.

대표 승인, PM 승인, 커밋 여부, 배포 여부를 묻지 않는다.
매일 08:00 KST Daily Report만 작성한다.
```

**Do not optimize for:** version · release · sprint · epic · mission numbers.  
**Optimize for:** product completion quality on each surface below.

---

## Product Vision (immutable)

LaunchLens is **AI Strategy Project Manager** — not chat, not reports, not business-plan writer.

AI understands project → builds Workflow → makes Decision → leads Execution. User **approves**.

---

## Completion areas (consume 1 → 20 → repeat from 1)

Each area = full quality bar: Feature + UX + Animation + Loading + Error + Empty + Retry + Offline + A11y + Responsive + SEO + Perf + Analytics + Admin + Docs + Regression + Deploy.

### 1. Landing

Hero · Story · Before/After · AI PM · Journey · Trust · Closed Beta notice · CTA · Footer · SEO · Schema · OG · Perf · Mobile · Animation · Skeleton · Loading · Empty · Error · Retry · A11y · Responsive · Analytics

### 2. Goal Experience

Intake · AI understanding · Thinking · Context · Recommendation · Edit · Natural language · AI Preview · History · Autosave · Loading · Error · Retry · Analytics · Keyboard · Mobile · A11y

### 3. Workflow Experience

AI Recommendation · Why · Expected Result · Confidence · Risk · Duration · Timeline · Graph · Next Action · Progress · Decision flow · Animation · Skeleton · Empty · Retry · Analytics · Responsive · A11y

### 4. Workspace

Today · Morning Brief · Coach · Decision · Evidence · Confidence · Timeline · Memory · History · Summary · Risk · Recommendation · Health · Next Action · Daily loop · Weekly · Celebration · Empty · Retry · Offline · Loading · Responsive · A11y

### 5. Decision Engine

Evidence · Citation · Rule · Confidence · Risk · Tradeoff · Missing data · Why · History · Undo · Redo · Timeline · Change log · Analytics

### 6. Execution Workspace

MVP · Interview · Pricing · GTM · Government · Investment · Roadmap · Sprint plan · Checklist · Progress · Achievement · Celebration · Recommendation · History

### 7. Project Management

CRUD · Archive · Favorite · Search · Filter · Tags · Templates · Import · Export · Local cache · Recovery

### 8. AI Coach

Morning · Afternoon · Evening · Weekly · Daily goal · Motivation · Confidence explain · Why · Suggested action · Achievement · Personality · Tone · Context memory

### 9. Intelligence Engine

Explainable AI · Evidence · Confidence rules · Missing data · Risk · Market · Competitor · Customer · Business model · Financial · Strategy · Stability · Health · Future gain (mock + real-ready structure)

### 10. Admin Platform

Dashboard · Funnel · Analytics · Heatmap · Session · Projects · Goals · GO/HOLD rates · Completion · Dropoff · Retention · DAU · Feedback · CSV · Release notes · Flags · Monitoring

### 11. Analytics

PostHog · Clarity · GA4 · Custom events · Funnel · Conversion · Cohort · Retention · Session replay · User journey · Dashboard

### 12. Closed Beta ops

Feedback widget · Feedback admin · Beta banner · Changelog · Notice · FAQ · Help · Contact · Beta guide

### 13. Product Quality (all pages)

Loading · Skeleton · Error · Retry · Empty · Offline · Timeout · Slow network · Animation · Toast · Focus · Keyboard · Responsive · A11y

### 14. Performance (all pages)

Lighthouse Perf ≥95 · A11y 100 · Best Practices 100 · SEO 100 · Bundle split · Lazy · Dynamic import · Image · Font · Cache · Streaming · Prefetch · Hydration

### 15. Responsive (all pages)

390 · 430 · 768 · 1024 · 1440 · 1920 QA

### 16. Accessibility (all pages)

Keyboard · ESC · Focus · ARIA · Screen reader · Contrast · Dialog · Skip nav — 100 target

### 17. SEO (all pages)

Metadata · OG · JSON-LD · Robots · Sitemap · Canonical · Social share

### 18. Documentation

ADR · Product docs · QA report · Architecture · Analytics docs · Release history · Ops guide

### 19. Code Quality

Refactor · Dead code · Component merge · Hooks · Types · Folder structure · Tests

### 20. Product Polish (infinite loop)

Journey · UX · Animation · Perf · A11y · Analytics · Admin · Coach · Copy · Loading · Error UX · Mobile · Design system → **return to Area 1**

---

## Auto cycle (per work item)

Implement → Self Review → QA → Build → Lint → Types → Regression → Commit → Push → Production → Smoke → Documentation → **next item**

## Stop only (report required)

Build fail · Production outage · External cost (DB/LLM/Billing/Auth) · Security · Product Vision change

## Vision guard (new queue items)

Journey improvement first · Vision V3 only · AI PM experience only · no unrelated feature sprawl

## Related

- `docs/PRODUCT_COMPLETION_DIRECTIVE.md` — evolution philosophy (v8)
- `docs/EVOLUTION_QUEUES.md` — auto-generation templates when slice empty

Production: https://ai-startup-validation-tau.vercel.app
