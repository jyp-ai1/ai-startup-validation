# Project Brief (사업 판단 현황) — QA Evidence

**Branch:** `cursor/project-brief-e648` · **PR:** #73 (Draft, not merged, not deployed)
**Discovery:** [`../NEW-PAGE-DISCOVERY.md`](../NEW-PAGE-DISCOVERY.md)
**Raw results:** [`project-brief-qa.json`](./project-brief-qa.json) · screenshots in [`media/`](./media/)
**Runner:** `apps/web/scripts/project-brief-qa.mjs`

## Environment

| Item | Value |
|---|---|
| Target | Local production build (`next build` + `next start -p 3100`) of the PR head |
| Why not Preview | Vercel Preview is behind Vercel SSO (302 → `vercel.com/sso-api`); no `VERCEL_AUTOMATION_BYPASS_SECRET` in agent secrets. The runner sends `x-vercel-protection-bypass` automatically once that secret is added. |
| Data | Same Supabase project as Production (real stored `onboarding_context.v2Workspace.aiPmLoop`) |
| Auth | Existing QA path: Supabase magic link for `cto-qa@launchlens.dev` → `sb-<ref>-auth-token` cookie. No OAuth bypass, no auth code change. |
| Fixture | Case D needs a READY project; none exists in Production (0/87). The runner inserts `[QA] Project Brief READY fixture` for the QA account and deletes it in `finally` (`fixture.deleted: true`). |
| Viewports | Desktop 1280×900, Mobile 390×844 |

## Results (A–F)

| Case | Project | Render | Review status | CTA → | `project_brief_viewed` | `project_brief_cta_clicked` | Console errors | Mobile overflow | Internal-copy leak |
|---|---|---|---|---|---|---|---|---|---|
| A normal | `9fc88893…` | ✅ 4 confirmed / 6 unconfirmed | 사업 이해 중 | `/workspace?project=…` ✅ | ✅ `NOT_READY`, entry `list` | ✅ | 0 | none | none |
| B partial | `b742768b…` | ✅ 2 / 6 | 사업 이해 중 | ✅ | ✅ | ✅ | 0 | none | none |
| C conflict | `b58d8257…` | ✅ 4 / 5 / 1 conflict (고객 페르소나) | 사업 이해 중 | ✅ | ✅ | ✅ | 0 | none | none |
| D READY | QA fixture | ✅ 8 confirmed, no next question | 검토 준비 완료 | `/workspace?project=…` ✅ (no `runReview`) | ✅ `READY` | ✅ `READY` | 0 | none | none |
| E no data | `ca6b148b…` | ✅ empty state (`data-brief-kind=empty`) | — | ✅ | ✅ `empty` | ✅ | 0 | none | none |
| F missing `project` | — | ✅ "이 프로젝트를 찾을 수 없습니다" | — | `/workspace` | not fired | — | 0 | — | — |
| F `not-a-uuid` | — | ✅ same | — | `/workspace` | not fired | — | 0 | — | — |
| F unknown UUID | — | ✅ same | — | `/workspace` | not fired | — | 0 | — | — |
| F another user's project | — | ✅ same, no data shown | — | `/workspace` | not fired | — | 0 | — | — |

Other checks:

- Unauthenticated access → `/auth/login`, nothing rendered.
- Entry points: the project card shows "현황" only for projects with at least one answer (`linkForEmptyProject: false`). The canvas header link is `/workspace/brief?project=…&from=canvas`.
- Hydration: 0 page errors in A–E on both viewports (server-formatted relative time).
- Read-only: the page calls only `getOwnedProject` + pure builders. No question generation, gap-state write, review re-run, or loop change.

## Defect found and fixed during QA

**Invalid-id handling crashed the App Router (React #310) on first load.** The first version used `redirect('/workspace')` for F cases. In the production build, when the redirect fired before any data await (missing `project`), Next's client `Router` threw "Rendered more hooks than during the previous render" (stack: `Router → useMemo`) and the tab sometimes stayed on a blank `/workspace/brief`. The case with a DB round-trip happened to survive, but only because it was slower, so the same thing could happen in Production with low DB latency. Dev mode does not reproduce it.

Fix: the page now renders an in-page `ProjectBriefUnavailable` state (title, body, a single "내 프로젝트로 돌아가기" CTA) for every F case. It does not redirect, and it reveals nothing about whether the project exists. Re-run: 4/4 F cases render the state with 0 console errors.

## Excluded (per CPO)

READY-while-loop-continues (Sprint 2) · analytics `user_id` NULL · analysis CTA no-op.
