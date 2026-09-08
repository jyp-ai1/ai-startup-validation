# DAY 8-I P0-11 Browser Journey Report

- **Run:** new cloud agent (not parent pod)
- **Target:** `http://localhost:3333` (local Next start, no Production deploy)
- **Git SHA:** `a3a72e8cdbc8dec91ae77095c4f2cca5687f9232`
- **Build SHA:** `a3a72e8cdbc8dec91ae77095c4f2cca5687f9232`
- **Production SHA:** `a3a72e8cdbc8dec91ae77095c4f2cca5687f9232`
- **AUTH:** 5/5 SET · hasServiceRoleKey=true · readyForBrowserJourney=true
- **Session method:** supabase-password-session-cookies (real JWT after Google OAuth probe; no Google QA account in this run)
- **Google OAuth probe:** clicked=true host=accounts.google.com
- **Authenticated:** true
- **Written:** 2026-09-08T07:02:38.288Z

## Gate

| Key | Presence |
|---|---|
| SUPABASE_SERVICE_ROLE_KEY | SET |
| SUPABASE_URL | SET |
| SUPABASE_ANON_KEY | SET |
| NEXT_PUBLIC_SUPABASE_URL | SET |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | SET |

sync-qa-env.mjs: **missing** (not created)
run-day8i-p0-11-browser-journey.mjs: **missing** (executed via real Playwright, not a product mock)

## R1–R5

| Row | Result | Project ID | Input | UI Action | Actual | Expected | Screenshot | Timestamp |
|---|---|---|---|---|---|---|---|---|
| AUTH-GOOGLE | PASS | — | Google CTA | click Continue with Google | navigated host=accounts.google.com | Google OAuth or Supabase authorize | `day8i-p0-11/media/01-google-oauth-probe.png` | 2026-09-08T06:59:28.123Z |
| AUTH-SESSION | PASS | 6053040b-3f3d-4cbc-ba39-38fd88e98494 | real Supabase user | supabase-password-session-cookies (real JWT after Google OAuth probe; no Google QA account in this run) | workspace reachable, userId prefix 6053040b | Authenticated /workspace without login redirect | `day8i-p0-11/media/02-workspace-authenticated.png` | 2026-09-08T06:59:32.058Z |
| R1 | PASS | b304bc26-6419-4d30-bbfa-9901152c2385 | P011 Alpha Hospital OS + file r1-business-plan.txt | login → demo custom upload → AI Read → promote real project → Understanding | id=b304bc26-6419-4d30-bbfa-9901152c2385 upload=true understanding=true persisted=true url=http://localhost:3333/workspace?project=b304bc26-6419-4d30-bbfa-9901152c2385&welcome=1&promoted=1 | real Project ID, real file upload, Understanding received | `day8i-p0-11/media/r1-03-understanding.png` | 2026-09-08T07:00:10.981Z |
| R2 | PASS | dea80e98-70ef-4f7b-bb59-d56df65d73c1 | name + typed business text, no file | new project → type content → create → Understanding | id=dea80e98-70ef-4f7b-bb59-d56df65d73c1 understanding=true fileInputVisible=false url=http://localhost:3333/workspace?project=dea80e98-70ef-4f7b-bb59-d56df65d73c1&welcome=1 | creation works with no file; Understanding received | `day8i-p0-11/media/r2-understanding.png` | 2026-09-08T07:00:49.465Z |
| R3 | PASS | b304bc26-6419-4d30-bbfa-9901152c2385 / a66b00a9-368e-4a44-b829-f6ac760fdd20 | A=P011-ALPHA-HOSPITAL-TRIAGE-KOREA B=P011-BRAVO-FACTORY-ROBOT-LINE | create A, answer, create B, open B, return A | A=b304bc26-6419-4d30-bbfa-9901152c2385 B=a66b00a9-368e-4a44-b829-f6ac760fdd20 leak=false bOwn=true aPreserved=true answered=true | A data ≠ B data; A preserved; B isolated | `day8i-p0-11/media/r3-project-b.png` | 2026-09-08T07:01:35.281Z |
| R4 | FAIL | f706219b-623f-4d1d-86bc-3197a32b63ce | P011 Lifecycle Probe | Create→List→Open→Rename→List→Archive→Restore→Delete on real UI | [{"step":"Create","titles":["P011 Lifecycle Probe","P011 Bravo Factory Robot","P011 Text Only Cafe","내 첫 프로젝트"],"id":"f706219b-623f-4d1d-86bc-3197a32b63ce"},{"step":"List","url":"http://localhost:3333/workspace","titles":[],"hasEmpty":true,"snippet":"본문으로 건너뛰기 안녕하세요, P0-11님. 오늘 어떤 전략을 이어가시겠어요? 프로젝트 이름 무엇을 검토하시나요? 창업 아이디어 신사업 기존 사업 전략 투자 준비 사업 설명 (선택) 0/1000 새 프로젝트 만들기 최근 프로젝트 P011 Lifecycle Probe 초안 최근 수정 방금 P011 Bravo Factory Robot 초안 최근 수정 방금 P011 Text Only Cafe 초안 최근 수정 1분 전 내 첫 프로젝트 초안 최근 수정 2분 전"},{"step":"Open","url":"http://localhost:3333/workspace?project=f706219b-623f-4d1d-86bc-3197a32b63ce"},{"step":"Rename","url":"http://localhost:3333/workspace","titles":[],"hasEmpty":true,"snippet":"본문으로 건너뛰기 안녕하세요, P0-11님. 오늘 어떤 전략을 이어가시겠어요? 프로젝트 이름 무엇을 검토하시나요? 창업 아이디어 신사업 기존 사업 전략 투자 준비 사업 설명 (선택) 0/1000 새 프로젝트 만들기 최근 프로젝트 P011 Lifecycle Probe 초안 최근 수정 방금 P011 Bravo Factory Robot 초안 최근 수정 방금 P011 Text Only Cafe 초안 최근 수정 1분 전 내 첫 프로젝트 초안 최근 수정 2분 전"},{"step":"Archive/Delete controls","present":{"archive":false,"delete":false},"note":"/projects redirects to /workspace list; overflow archive/delete menu not in this list UI","url":"http://localhost:3333/workspace","titles":[],"hasEmpty":true,"snippet":"본문으로 건너뛰기 안녕하세요, P0-11님. 오늘 어떤 전략을 이어가시겠어요? 프로젝트 이름 무엇을 검토하시나요? 창업 아이디어 신사업 기존 사업 전략 투자 준비 사업 설명 (선택) 0/1000 새 프로젝트 만들기 최근 프로젝트 P011 Lifecycle Probe 초안 최근 수정 방금 P011 Bravo Factory Robot 초안 최근 수정 방금 P011 Text Only Cafe 초안 최근 수정 1분 전 내 첫 프로젝트 초안 최근 수정 2분 전"}] | list state after each lifecycle step including archive/restore/delete | `day8i-p0-11/media/r4-04-list-no-archive-menu.png` | 2026-09-08T07:01:55.494Z |
| R5 | PASS | 83de72d5-c8b8-4ce9-9f70-f8be3081abcf | P011 Persistence Probe | create → logout → login → list → open | id=83de72d5-c8b8-4ce9-9f70-f8be3081abcf loggedOut=true inList=true kept=true titles=P011 Persistence Probe,P011 Lifecycle Probe,P011 Bravo Factory Robot,P011 Text Only Cafe,내 첫 프로젝트 | project exists, name kept, business content kept | `day8i-p0-11/media/r5-03-list-after-login.png` | 2026-09-08T07:02:38.288Z |

## Status summary

| Row | Result | Project IDs |
|---|---|---|
| R1 | PASS | b304bc26-6419-4d30-bbfa-9901152c2385 |
| R2 | PASS | dea80e98-70ef-4f7b-bb59-d56df65d73c1 |
| R3 | PASS | A=b304bc26-6419-4d30-bbfa-9901152c2385 / B=a66b00a9-368e-4a44-b829-f6ac760fdd20 |
| R4 | FAIL | f706219b-623f-4d1d-86bc-3197a32b63ce |
| R5 | PASS | 83de72d5-c8b8-4ce9-9f70-f8be3081abcf |

**Overall:** P0-11 HOLD / CEO TEST HOLD

## Notes

Google OAuth CTA was clicked in a real browser and reached accounts.google.com. This environment has no Google QA account, so the durable session used a real Supabase Auth user (email confirmed via service role) and a real JWT cookie — not a mock user, not demo mode, not RLS bypass.

R4 FAIL: `/projects` redirects to `/workspace`. The authenticated list has Create / Open only. Rename, Archive, Restore, and Delete controls were not present in that UI.

No V3/Judgment/Gap/UX product code was modified. No Production deploy.

## Screenshots index

- `00-login.png` — 2026-09-08T06:59:23.142Z — http://localhost:3333/auth/login
- `01-google-oauth-probe.png` — 2026-09-08T06:59:28.123Z — https://accounts.google.com/v3/signin/identifier (query redacted)
- `02-workspace-authenticated.png` — 2026-09-08T06:59:32.058Z — http://localhost:3333/workspace
- `r1-01-upload.png` — 2026-09-08T06:59:34.810Z — http://localhost:3333/demo/start
- `r1-02-after-read.png` — 2026-09-08T06:59:37.736Z — http://localhost:3333/workspace?demo=guided&sample=custom&fresh=1
- `r1-03-understanding.png` — 2026-09-08T07:00:10.978Z — http://localhost:3333/workspace?project=b304bc26-6419-4d30-bbfa-9901152c2385&welcome=1&promoted=1
- `r2-understanding.png` — 2026-09-08T07:00:49.464Z — http://localhost:3333/workspace?project=dea80e98-70ef-4f7b-bb59-d56df65d73c1&welcome=1
- `r3-project-a.png` — 2026-09-08T07:00:56.692Z — http://localhost:3333/workspace?project=b304bc26-6419-4d30-bbfa-9901152c2385
- `r3-project-b.png` — 2026-09-08T07:01:32.640Z — http://localhost:3333/workspace?project=a66b00a9-368e-4a44-b829-f6ac760fdd20&welcome=1
- `r3-project-a-return.png` — 2026-09-08T07:01:35.281Z — http://localhost:3333/workspace?project=b304bc26-6419-4d30-bbfa-9901152c2385
- `r4-01-list.png` — 2026-09-08T07:01:48.126Z — http://localhost:3333/workspace
- `r4-02-open.png` — 2026-09-08T07:01:49.767Z — http://localhost:3333/workspace?project=f706219b-623f-4d1d-86bc-3197a32b63ce
- `r4-03-renamed-list.png` — 2026-09-08T07:01:51.963Z — http://localhost:3333/workspace
- `r4-04-list-no-archive-menu.png` — 2026-09-08T07:01:55.494Z — http://localhost:3333/workspace
- `r5-01-before-logout.png` — 2026-09-08T07:02:01.538Z — http://localhost:3333/workspace?project=83de72d5-c8b8-4ce9-9f70-f8be3081abcf&welcome=1
- `r5-02-logged-out.png` — 2026-09-08T07:02:02.003Z — http://0.0.0.0:3333/auth/login
- `r5-03-list-after-login.png` — 2026-09-08T07:02:03.727Z — http://localhost:3333/workspace
- `r5-04-reopened.png` — 2026-09-08T07:02:38.288Z — http://localhost:3333/workspace?project=83de72d5-c8b8-4ce9-9f70-f8be3081abcf

No secret values, JWT prefixes, or env dumps are included.
