# Sprint 4.8 — Operable Closed Alpha

**Status:** 🔄 PARTIAL — code shipped; QA + migration + product wiring → **Sprint 5**  
**Mission:** Analytics보다 **로그인이 되는 Alpha**를 먼저 연다.

---

## Priority order (CTO)

| P | Epic | Goal |
|---|------|------|
| **1** | **Epic B — Google Login 100%** | Release blocker — Chrome/Safari/Edge/Mobile, session, draft promotion |
| **2** | **Analytics persistence** | `022_analytics_events.sql` — no in-memory-only |
| **3** | **Admin dashboard** | Journey Replay timeline |
| **4** | Question analytics detail | avg time, drop-off, skip, AI help |
| **5** | Landing KPI | Human copy, not numbers only |
| **6** | Testimonials | 3-card rolling under Hero KPI |
| **7** | AI PM KPI | Blind Spot + clarity questions |
| **8** | Admin auth | `ADMIN_EMAIL` env — never hardcode |

---

## P0 additions

### P0-9 User Journey Replay

- Session list + per-event timeline in `/admin/operations`
- API: `GET /api/analytics/journey`, `?sessionId=`

### P0-10 Blind Spot Analytics

- `blind_spot_detected`, `clarity_question_raised` events
- Admin aggregation panel

---

## Epic B — OAuth fixes (Sprint 4.8)

- **Session cookie fix:** `update-session.ts` sets cookies on existing response (intl middleware compat)
- **Draft promotion:** Demo cookie → `bootstrapFirstProject(promoteDemo)`
- **QA:** `docs/templates/OAUTH_QA_CHECKLIST.md`

---

## Analytics persistence

Migration: `packages/db/src/migration/022_analytics_events.sql`

```
analytics_events (id, project_id, user_id, session_id, event_name, event_data, created_at)
analytics_daily_summary (summary_date, metric_key, metric_value)
```

Repository: `analytics-event.repository.ts`  
Hydrate ops store on stats API cold start.

---

## Exit criteria (updated)

- [x] Admin Journey Replay for drop-off diagnosis
- [x] Blind Spot Analytics events + admin panel
- [x] `ADMIN_EMAIL` gates `/admin/*`
- [x] 16-step funnel + heatmap scaffolding
- [ ] Google OAuth stable on Chrome, Safari, Edge, mobile → **Sprint 5 Epic A**
- [x] Migration `022_analytics_events.sql` applied in Supabase (2026-07-28)
- [ ] Events survive deploy (Supabase) — **smoke test** → Sprint 5 Epic E

---

## Sprint 5 entry

**Sprint 4.8 = analytics + admin scaffolding** → **Sprint 5 = Closed Alpha Launch Readiness**

See [SPRINT_5_CLOSED_ALPHA_LAUNCH.md](./SPRINT_5_CLOSED_ALPHA_LAUNCH.md)
