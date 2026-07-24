# Event Schema — LaunchLens 2.0 Journey

**Version:** 1.0 (Alpha validation design)  
**Constitution:** Experience events only — no PII in event names

---

## Naming convention

```text
{object}_{action}
```

All events include optional properties: `locale`, `demo_mode`, `goal_id`, `session_id`.

---

## Core funnel events

| Event | When | Key properties |
|-------|------|----------------|
| `landing_viewed` | `/` first paint | `referrer` |
| `goal_selected` | Goal card clicked | `goal_id` |
| `workflow_created` | Workflow plan shown after compose | `goal_id`, `step_count` |
| `workspace_loaded` | Strategy Workspace ready | `goal_id`, `verdict` |
| `coach_clicked` | Coach panel interaction | `section` |
| `confidence_opened` | Confidence / timeline expanded | `confidence_value` |
| `why_opened` | Why or Evidence drawer opened | `verdict` |
| `mock_action_completed` | Mock step advance in Coach | `action_key`, `new_confidence` |
| `feedback_sent` | Alpha feedback widget | `sentiment` (`up`/`down`) |
| `compose_failed` | Compose overlay fail (mock) | `retry_count` |
| `compose_retried` | User tapped retry | `attempt` |

---

## Example payload

```json
{
  "event": "goal_selected",
  "properties": {
    "goal_id": "business-viability",
    "locale": "ko",
    "demo_mode": false
  }
}
```

---

## Implementation notes

- Wire in Epic 2 Sprint 2+ via existing `AnalyticsProvider`
- Alpha v2.0.1: schema + mock feedback only
- Do not send LLM prompts or user document content

---

## Related

- [ANALYTICS_PLAN.md](./ANALYTICS_PLAN.md)
