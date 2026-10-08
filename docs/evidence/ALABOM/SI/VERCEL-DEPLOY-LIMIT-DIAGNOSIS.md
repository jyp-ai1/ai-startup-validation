# Vercel Deploy Limit Diagnosis

**CPO Work A.** Measure only. Production SHA `0b46522` UNCHANGED. No plan change. No dump SHA lock change.

Collected 2026-10-08 from GitHub Deployments / Vercel bot comments / commit statuses. No Vercel REST token in this environment, so team plan cannot be read from the Vercel dashboard API. Build Logs were requested for rejected deployments; those deployments never entered a build.

## 1. Account / project

| Field | Evidence |
|---|---|
| Team slug | `jyp-ai1s-projects` |
| Project | `ai-startup-validation` |
| Project id (from Vercel GitHub comment payload) | `prj_BWAHwnDDJfUE9PbJIQyBupaUPlkV` |
| Inspector (PR #192 queued/failed deploy) | `J6divuitRUbAJmJxeUzrCngSU3Rb` |
| Vercel CLI / `VERCEL_TOKEN` | **absent** — plan/usage dashboard not readable |
| Official Hobby limits (vercel.com/docs/limits) | Concurrent deployments **1** · Deployments created per day **100** · Pro day cap **6000** |

Plan is **not** read from billing. The live error code name is `api-deployments-free-per-day`, and the bot links `upgradeToPro=build-rate-limit`. That matches Hobby/free daily deploy cap, not a compile failure.

## 2. Exact error (not inferred)

PR **#192** dump SHA `39f6f3d` — GitHub commit status 2026-10-08T18:28:00Z:

- context: `Vercel`
- state: `failure`
- description: `Deployment rate limited — retry in 24 hours.`
- target: `https://vercel.com/jyp-ai1s-projects?upgradeToPro=build-rate-limit`

Vercel bot comment 2026-10-08T18:28:01Z, full text:

```
Resource is limited - try again in 24 hours (more than 100, code: "api-deployments-free-per-day").
```

PR **#193** dump SHA `05da173` — same code, status 2026-10-08T18:29:16Z, bot 2026-10-08T18:28:53Z.

PR **#173** dump `ede47bb` — same status description at 2026-10-08T18:02:05Z.

This is an **API admission reject** before Build. There is no Build Log / Build Diagnostics for these dump SHAs because the build never started.

## 3. What this is / is not

| Hypothesis | Verdict | Why |
|---|---|---|
| Code / dependency / compile failure | **No** | Rejected with `api-deployments-free-per-day`. No build step. |
| Concurrent-build queue only | **Not sufficient** | Hobby concurrent=1 can queue, but the recorded code is the **daily free deployment cap**, not a queue timeout. |
| GitHub Actions CI == Vercel fail | **No** | `check-runs` on `39f6f3d` and `05da173` = **0**. `actions/runs` recent list empty. Vercel status failed independently. |
| Hobby daily deploy cap (>100) | **Supported by error code** | Exact code `api-deployments-free-per-day` + “more than 100”. Team plan still unread from billing. |
| Need to upgrade now | **No** | Cause is excess Preview creation. Stop unnecessary Previews first. |

## 4. Volume (GitHub Deployments API)

Unique deployments visible on the repo: **899**.

Window 2026-10-07T18:28Z → 2026-10-08T18:30Z:

- **147** total
- **139** Preview
- **8** Production records (latest Production ref `0b465226516e`, created 2026-10-08T07:53:54Z, id `6930194244`)

139 Preview creates in 24h exceeds the documented Hobby daily cap of 100. That is enough to produce `api-deployments-free-per-day` without any app compile error.

## 5. Mixed later “success” (do not lock)

GitHub deployment `6943624393` sha `b8117f3` (holdout-53 **test** commit, not dump `39f6f3d`) recorded `Deployment has completed` at 2026-10-08T18:30:38Z with a unique `*.vercel.app` URL.

That is a **queued/earlier** Preview for a non-dump SHA after the dump SHA was rejected at the API. It is **not** a dump-SHA lock and **not** Preview PASS (SSO 302 still applies). #192/#193 dump SHA locks stay unchanged.

## 6. Rate-limit scope and reset

- **Scope:** Vercel deployment-create API, free/Hobby daily count. Not GitHub Actions minutes. Not a function invocation limit.
- **Reset text:** `try again in 24 hours` / `retry in 24 hours`.
- **Earliest dump-SHA reject seen this window:** #173 `ede47bb` at 2026-10-08T18:02:05Z → earliest retry window **~2026-10-09T18:02Z** if the 24h clock starts at first reject. If the window is rolling, slots free as older creates age out.
- Dashboard reset timestamp was **not** readable without Vercel auth.

## 7. Action taken / not taken

Taken:

- Stop factory holdout-55 Preview spawn.
- Do not retry #173–#193 dump SHA deploys.
- Do not change Production `0b46522`, #139 `0c362c7`, #140 Preview lock, or #192/#193 dump SHA locks.
- Do not upgrade the Vercel plan.

Not taken (forbidden during diagnosis):

- Production deploy
- Merge
- Plan change
- Dump SHA lock rewrite

Further Preview creation should stay at **one** independent measurement PR maximum. Duplicate factory Previews are the cause, not the product engine.
