# ALABOM — DAY 8-I P0-11 Browser Journey Report (CPO 2nd)

**Date:** 2026-09-08 (09:33–09:46 UTC)  
**Run:** `bc-8600e587-1993-56bb-9f8f-ac41d60b64c3`  
**SHA:** `0ca2fa4bd803f6236105ce8566de123b6a8d66dc`  
**Harness:** `apps/web/scripts/run-day8i-p0-11-browser-journey.mjs` (R1 R2 R3 R5) + in-browser R4 completion on the same projects  
**Product code changes this run:** None

## Gate Status

```text
Identity                   🟢 PASS  bc-8600e587-1993-56bb-9f8f-ac41d60b64c3
SHA MATCH                  🟢 PASS  0ca2fa4bd803f6236105ce8566de123b6a8d66dc
AUTH                       🟢 SET
QA sync                    🟢 hasServiceRoleKey: true · 5/5 env SET
pnpm build                 🟢 PASS
GET /api/health            🟢 HTTP 200  (127.0.0.1:3333)
Browser R1~R5              🟢 5/5 PASS
CPO 2nd                    ⏳ HOLD — evidence recorded; not a Production gate
Production                 ⏸ HOLD — no deploy this run
CEO TEST                   ⏳ HOLD — waiting CPO 2nd on this evidence
```

---

## 1. Environment Sync

| Check | Result |
|-------|--------|
| `node apps/web/scripts/sync-qa-env.mjs` | `hasServiceRoleKey: true`, `readyForBrowserJourney: true` |
| `SUPABASE_SERVICE_ROLE_KEY` | SET |
| `SUPABASE_URL` | SET |
| `SUPABASE_ANON_KEY` | SET |
| `NEXT_PUBLIC_SUPABASE_URL` | SET |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | SET |
| Secret values printed | No |

Auth session: magic-link for `cto-qa@launchlens.dev` (email domain only recorded).

---

## 2. Build & Local Production Server

| Step | Result | Timestamp (UTC) |
|------|--------|-----------------|
| `pnpm build` | PASS | 2026-09-08T09:32 |
| `PORT=3333 pnpm exec next start --port 3333` | Running | 2026-09-08T09:32 |
| `GET http://127.0.0.1:3333/api/health` | HTTP 200 `status: ok` | 2026-09-08T09:32:53Z |

---

## 3. Project IDs (real)

| Role | Title | Project ID |
|------|-------|------------|
| A (R1 upload / R3 / R4 / R5) | 주인집1 → 주인집1-renamed | `a89efa0f-b7c2-4526-a9e2-685bdddc4429` |
| R2 text-only | 텍스트온리QA | `34beac8f-1453-46c3-827d-09574d2b4546` |
| B (R3 isolation / R4 delete) | 반찬가게 배송관리 | `bf800113-7b65-47ca-b44c-3e7f62f46305` |

---

## 4. R1~R5 Detailed Results

### R1 — 실제 계정 + 사업계획서 파일 업로드

| 항목 | 기록 |
|------|------|
| Scenario | R1 |
| Account | `cto-qa@launchlens.dev` (magic-link) |
| Project ID | `a89efa0f-b7c2-4526-a9e2-685bdddc4429` |
| Input | 주인집1 + `e2e/fixtures/p0-11-brewery-plan.txt` |
| UI Action | Workspace create form → file upload → 새 프로젝트 → AI Understanding |
| Actual | Real project ID. Understanding shows 영세한 양조장 / 온라인 마케팅 / MZ·FIT 관광객. Title 주인집1 ≠ business one-liner. |
| Expected | Project name ≠ business one-liner; 양조장 in AI Understanding |
| Verdict | **PASS** |
| Screenshot | `docs/evidence/ALABOM/p0-11-browser/media/r1_upload_understanding.png` |
| Timestamp | 2026-09-08T09:33:01Z |

---

### R2 — Text-only 프로젝트

| 항목 | 기록 |
|------|------|
| Scenario | R2 |
| Account | same QA session |
| Project ID | `34beac8f-1453-46c3-827d-09574d2b4546` |
| Input | 텍스트온리QA + 동네 카페 원두 구독 서비스 description |
| UI Action | Create project text-only → Workspace |
| Actual | Real project ID. Understanding shows 카페 / 원두 / 구독 copy from the description. |
| Expected | Description appears in AI Understanding |
| Verdict | **PASS** |
| Screenshot | `docs/evidence/ALABOM/p0-11-browser/media/r2_text_only_understanding.png` |
| Timestamp | 2026-09-08T09:33:01Z |

---

### R3 — Project A/B Data Isolation

| 항목 | 기록 |
|------|------|
| Scenario | R3 |
| Project A ID | `a89efa0f-b7c2-4526-a9e2-685bdddc4429` |
| Project B ID | `bf800113-7b65-47ca-b44c-3e7f62f46305` |
| Input | A=양조장, B=반찬가게 배송관리 (`p0-11-banchan-plan.txt`) |
| UI Action | Open A → create B → open B → re-open A |
| Actual | B canvas: 반찬가게 배송관리 / B2B 반찬 배송. A canvas: 주인집1 / 양조장. Harness recorded `bLeakedA: false`, `aLeakedB: false`. Sidebar still shows a default workspace label (실버 세대 매칭 서비스); isolation gate is Understanding/Judgment/Question text, not that chrome. |
| Expected | No cross-project Understanding/Judgment/Question bleed |
| A → B leak | No |
| B → A leak | No |
| Verdict | **PASS** |
| Screenshots | `r3_a_partial_review.png`, `r3_project_b.png`, `r3_project_a_reentry.png` |
| Timestamp | 2026-09-08T09:33:01Z |

---

### R4 — Project Lifecycle

| 항목 | 기록 |
|------|------|
| Scenario | R4 |
| Project A | `a89efa0f-b7c2-4526-a9e2-685bdddc4429` |
| Project B | `bf800113-7b65-47ca-b44c-3e7f62f46305` |
| Input | rename → archive → archived list → restore → delete B |
| UI Action | Workspace list ⋯ menu. First harness pass timed out: rename Save was outside the 1440×900 viewport. Same run completed R4 against the same IDs (no product edits): rename 주인집1-renamed, archive (active list hide + 보관), restore (초안), B list item gone after delete. |
| Actual | `renamedVisible`, `archivedHidden`, `archivedVisible`, `restoredVisible`, `bGone` all true. Archived snippet: `주인집1-renamed · 보관`. Restored snippet: `주인집1-renamed · 초안`. |
| Expected | List state changes at each lifecycle step |
| Verdict | **PASS** |
| Screenshots | `r4_rename.png`, `r4_rename_item.png`, `r4_archived.png`, `r4_archived_item.png`, `r4_archived_open.png`, `r4_restored.png`, `r4_restored_item.png`, `r4_deleted.png` |
| Timestamp | 2026-09-08T09:46:30Z |

---

### R5 — Logout/Login Persistence

| 항목 | 기록 |
|------|------|
| Scenario | R5 |
| Project ID | `a89efa0f-b7c2-4526-a9e2-685bdddc4429` |
| Input | clear cookies + storage → magic-link re-login → `/workspace?project=A` |
| UI Action | session clear → login → open A |
| Actual | Brewery Understanding restored (영세한 양조장 / 주인집1). Did not bounce to `/auth/login`. |
| Expected | Project A business context preserved after re-login |
| Verdict | **PASS** |
| Screenshot | `docs/evidence/ALABOM/p0-11-browser/media/r5_relogin_restore.png` |
| Timestamp | 2026-09-08T09:34:00Z |

---

## 5. Final Verdict

```text
R1: PASS  a89efa0f-b7c2-4526-a9e2-685bdddc4429
R2: PASS  34beac8f-1453-46c3-827d-09574d2b4546
R3: PASS  A vs B isolation, no leak
R4: PASS  rename / archive / restore / delete
R5: PASS  re-login restores brewery context

Overall: 5/5 PASS
```

JSON: `docs/evidence/ALABOM/p0-11-browser/p0-11-browser-journey.json`

Production deploy was **not** performed. CPO 2nd / CEO TEST remain process HOLD until CPO reads this evidence.

---

## 6. SHA Record

| Field | Value |
|-------|-------|
| Target SHA | `0ca2fa4bd803f6236105ce8566de123b6a8d66dc` |
| HEAD during journey | `0ca2fa4bd803f6236105ce8566de123b6a8d66dc` |
| MATCH | PASS |
| Message | `fix(p0-11): expose workspace project lifecycle UI for R4 gate` |
| Push/Deploy | **Not done** (execution-only; CPO: no PR, no Production) |
