# PR #121 — Production Promotion Evidence

**CPO 2-Pass:** PASS  
**PR:** https://github.com/jyp-ai1/ai-startup-validation/pull/121  
**Merge:** rebase `acbbf24` → `671005f`  
**Code:** `bd1cba3` (`e7c5603` rebased) · Preview docs: `671005f`  
**Prod:** https://ai-startup-validation-tau.vercel.app  
**P1-B:** 미수정 / Backlog  
**PR #119 / #120:** Draft 유지

## SHA triangle

| Leg | SHA |
|---|---|
| Git main | `671005fcd540eb6132185cd58953b66a6ac2f538` |
| Build (`/api/build-info`) | `671005fcd540eb6132185cd58953b66a6ac2f538` |
| Production (`/api/health`) | `671005fcd540eb6132185cd58953b66a6ac2f538` |

**MATCH** · branch `main`

## Production smoke

| Path | Status |
|---|---|
| `/` | 200 |
| `/ko` | 200 |
| `/api/health` | 200 · `ok` · commit `671005f` |
| `/api/version` | 200 · LaunchLens |
| `/api/build-info` | 200 · branch `main` · commit `671005f` |
| `/ko/workspace` | 200 |

## Question Alignment (Production SHA `671005f`)

| 축 | 결과 |
|---|---|
| RIDM paid → 구독 유지/재결제 | PASS · 재판매 없음 |
| 주인집 paid → 두 번째 계약/관광 수요 | PASS · 재판매 없음 |
| LMULM → 재판매 등록 | PASS |
| unnamed → 두 번째 행동/반복 사용 | PASS |

## P0 regression

Measured on SHA `671005f`.

| Gate | Result |
|---|---|
| Negative → viable | 금지 유지 · S3 `conditionally_viable` |
| Partial → S4 | 금지 유지 · S3 |
| #104 | PASS |
| #107 | PASS |
| P0-1 | PASS |
| P0-2 | PASS |

Alignment + Negative + #104/#107 + P0-1 + P0-2 = **40 passed**

## Production Acceptance

| Gate | Result |
|---|---|
| SHA triangle | MATCH |
| Production smoke | PASS |
| 4축 Question Alignment | PASS |
| P0 regression | PASS |

**Production PASS**
