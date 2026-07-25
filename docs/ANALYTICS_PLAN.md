# Analytics Plan — LaunchLens 2.0 Alpha Validation

**Version:** Alpha v2.0.1 autonomous sprint  
**Stage:** Alpha Validation (Phase 3)  
**Production deploy:** ⛔ Not in this sprint — Preview only

---

## Purpose

Measure whether users experience LaunchLens as **AI Strategy Workspace**, not a report tool.

---

## Funnel

```text
Landing → Goal → Workflow → Workspace → Coach interaction → Decision view
```

See [ALPHA_VALIDATION.md](./ALPHA_VALIDATION.md) for validation criteria.

---

## Tools (evaluation)

| Tool | Role | Recommendation |
|------|------|----------------|
| **PostHog** | Product analytics + optional session replay | ✅ Primary — OSS-friendly, event funnels, feature flags |
| **Microsoft Clarity** | Heatmaps + session replay | ✅ Supplement — free, quick UX signals |
| **Vercel Analytics** | Web vitals | ✅ Already available — performance gate |

**PM recommendation:** PostHog for events/funnels + Clarity for qualitative replay during Alpha.

---

## Implementation status

| Item | Status |
|------|--------|
| Event schema | [EVENT_SCHEMA.md](./EVENT_SCHEMA.md) |
| Ops store funnel | ✅ Live (Day 2) |
| PostHog SDK | ✅ Script + capture (env key) |
| Clarity replay | ✅ Script (env project id) |
| Feedback widget | ✅ Auto-collect to ops store |
| Drop-off dashboard | ✅ Admin `/admin/operations` |

Set in Vercel: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_CLARITY_PROJECT_ID`

---

## Out of scope (this sprint)

- Production analytics keys rollout
- Session replay SDK install
- Billing/conversion tracking

---

## Related

- [EVENT_SCHEMA.md](./EVENT_SCHEMA.md)
- [ALPHA_VALIDATION.md](./ALPHA_VALIDATION.md)
- [sprints/EPIC1_CLOSE_REPORT.md](./sprints/EPIC1_CLOSE_REPORT.md)
