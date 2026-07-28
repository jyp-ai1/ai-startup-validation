# Event Taxonomy — Sprint 5 (100% target)

All product events use `recordFunnelEvent()` → ops store → Supabase `analytics_events` (when configured).

**Rule:** Unmeasured feature = unfinished (Sprint 5).

---

## Funnel events (16 steps)

| Event | Step | Trigger |
|-------|------|---------|
| `landing_viewed` | Landing | Landing page load |
| `demo_started` | Demo | Demo experience mounts |
| `sample_selected` | Sample | Sample project selected |
| `investigation_started` | — | Live/daily investigation begins |
| `investigation_finished` | Investigation | Investigation completes |
| `evidence_opened` | Evidence | Evidence panel opened |
| `smart_question_answered` | Question | Smart question answered |
| `review_completed` | Review | First review done |
| `strategy_changed` | Strategy | Strategy improvement accepted |
| `my_project_started` | Project | Smart intake / my project |
| `login_started` | Login | Google sign-in click |
| `login_clicked` | Login | Same — explicit click event |
| `oauth_redirect` | Login | Redirect to Google |
| `oauth_success` | Login | Callback success (server) |
| `oauth_failed` | Login | Any failure (server/client) |
| `login_failed` | Login | Alias for failed attempts |
| `login_cancelled` | Login | User cancelled OAuth |
| `google_login_success` | Login | OAuth success (client tracker) |
| `workspace_entered` | Workspace | First workspace load post-login |
| `workspace_restored` | Workspace | Session restored after OAuth |
| `returning_user` | Return | Repeat visit (new day) |
| `draft_promoted` | Project | Demo draft → project |
| `analysis_completed` | Review2 | Second review |
| `artifact_generated` | Artifact | Artifact created (`artifact_type` in payload) |
| `workspace_returned` | Return | Return visit (new session/day) |
| `morning_report_view` | Morning | Morning brief viewed |
| `founder_memo_written` | Memo | Founder memo saved |

---

## AI PM / Decision events

| Event | Purpose |
|-------|---------|
| `decision_changed` | Generic founder decision |
| `price_changed` | Pricing decision |
| `target_changed` | Target customer |
| `usp_changed` | USP change |
| `market_changed` | Market strategy |
| `bm_changed` | Business model |
| `next_action_clicked` | Next action CTA |
| `blind_spot_detected` | Gap found in doc/evidence |
| `clarity_question_raised` | Question shown |
| `clarity_question_answered` | Question answered |
| `clarity_question_skipped` | Question skipped |
| `competitor_found` | New competitor in investigation |
| `strategy_proposed` | AI PM strategy recommendation |
| `evidence_created` | New evidence item persisted |

---

## Impact KPI events (Epic D — aggregate for Landing + Admin)

| Event | Impact metric |
|-------|---------------|
| `competitor_found` | 경쟁사 N건 발견 |
| `strategy_proposed` | 전략 변경 N건 제안 |
| `decision_changed` (+ category) | 대표 Decision N건 |
| `investigation_finished` | 조사 시간 (duration in payload) |
| `evidence_created` | 새 Evidence N건 |

**Derived (daily summary cron):**

- `impact_hours_saved` — sum investigation durations × founder-equivalent factor
- `impact_strategy_adopted` — `decision_changed` where `source=ai_pm`

---

## Feedback events

| Event | Purpose |
|-------|---------|
| `feedback_sent` | 👍/👎 |
| `feedback_bug` | Bug report |
| `feedback_suggestion` | Feature suggestion |
| `nps_submitted` | NPS score |

---

## Required params (all events)

Include when available:

```typescript
{
  project_id?: string;
  user_id?: string;      // server-side when authenticated
  session_id: string;  // client localStorage `ll_analytics_session`
  screen?: string;
  category?: string;   // decision / blind_spot category
  artifact_type?: string;
  duration_ms?: number;
  step?: string;        // funnel step id
  locale?: string;
}
```

---

## Persistence

| Layer | File |
|-------|------|
| Client emit | `apps/web/lib/analytics/product-analytics.ts` |
| Server store | `apps/web/lib/analytics/server/ops-store.ts` |
| DB write | `apps/web/lib/analytics/server/analytics-persistence.ts` |
| Migration | `packages/db/src/migration/022_analytics_events.sql` |
| Repository | `packages/db/src/repositories/analytics-event.repository.ts` |

**Sprint 5 DoD:** Event recorded → server restart → still visible in Admin.

---

## Admin panel → event mapping

| Panel | Primary events |
|-------|----------------|
| Funnel 16 | All funnel step events |
| Heatmap | Funnel events × `created_at` day |
| Retention D1/D3/D7/D14 | `workspace_entered`, `workspace_returned` |
| User Replay | All events by `session_id` |
| Drop Top 10 | Funnel step drop-offs |
| Question | `clarity_question_*` |
| Blind Spot | `blind_spot_detected` by category |
| AI PM KPI | `investigation_*`, `competitor_found`, `strategy_proposed`, `decision_changed`, `artifact_generated` |
| Product KPI | `google_login_success`, `my_project_started`, `analysis_completed`, `workspace_returned` |
| Impact KPI | Aggregates above |
