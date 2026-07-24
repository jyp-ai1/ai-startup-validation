# Known Issues — Beta v0.9 RC

> Public list for open beta users. Update at each RC batch.

## Limitations (by design until post-beta)

| Item | Status | Notes |
|------|--------|-------|
| Browser Research Agent | Mock | Real web search → **L3.5** |
| MCP data connectors | Not connected | Government/KOSIS → **L3.6** |
| OpenAI direct fallback | Not configured | OpenRouter + Gemini Flash only; OpenAI → **v1.1** |
| Research evidence | Partially synthetic | Orchestrator uses Gemini; browser crawl pending |

## UX / Quality (in progress — L3.4 RC)

| Item | Status | Target |
|------|--------|--------|
| Lighthouse Performance (Landing) | ⏳ | ≥90 (Batch 3) |
| Google OAuth E2E | ⏳ PM manual QA | Batch 3 Gate |
| i18n non-ko/en locales | ~70–80% | Post-beta polish |
| AI response quality | Variable | Prompt tuning post-beta |

## Feedback links

Set in Vercel env before open beta:

- `NEXT_PUBLIC_FEEDBACK_BUG_URL`
- `NEXT_PUBLIC_FEEDBACK_IDEA_URL`
- `NEXT_PUBLIC_DISCORD_URL` (optional)

Until configured, footer links use placeholder Google Form URLs.

## Reporting

Use in-app footer **Report a bug** / **Suggest a feature**, or email hello@launchlens.ai.
