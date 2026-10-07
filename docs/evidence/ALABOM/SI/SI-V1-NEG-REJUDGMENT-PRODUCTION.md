# PR #118 — Production Promotion Evidence

**CPO 2-Pass:** PASS  
**PR:** https://github.com/jyp-ai1/ai-startup-validation/pull/118  
**Merge:** fast-forward `0638f77` → `6c52fff`  
**Prod:** https://ai-startup-validation-tau.vercel.app

## SHA triangle

| Leg | SHA |
|---|---|
| Git main | `6c52fff9c8325aff9ce6faa6f1f91ef26795a3f4` |
| Build (`/api/build-info`) | `6c52fff9c8325aff9ce6faa6f1f91ef26795a3f4` |
| Production (`/api/health`) | `6c52fff9c8325aff9ce6faa6f1f91ef26795a3f4` |

**MATCH**

Fix commit (analyzer): `0b3429f` · CPO-reviewed HEAD: `c0b9bc3` (analyzer identical)

## Production smoke

| Path | Status |
|---|---|
| `/` | 200 |
| `/ko` | 200 |
| `/api/health` | 200 · `ok` · commit `6c52fff` |
| `/api/version` | 200 · LaunchLens |
| `/api/build-info` | 200 · branch `main` · commit `6c52fff` |
| `/ko/workspace` | 200 |

## Negative / Positive / Partial

Measured on SHA `6c52fff` (Production binary). Input dump: `si-v1-neg-rejudgment-2pass.json`.

| Case | Input | Result |
|---|---|---|
| Negative | `1차 판매는 있었지만 재판매 등록 0건, 재구매 0건이다.` | `conditionally_viable` S3 · CU OPEN · 조건부 headline · **not viable** |
| Positive | `35명 등록 / 12건 거래` | S4 · `viable` · 반복 검증 반영 |
| Partial | `재구매 2건은 있었으나 재판매 등록은 0건이다.` | S3 · `conditionally_viable` · **not S4** · CU OPEN |

## Regression

SI + P0-1 + P0-2 = **179 passed** on `6c52fff`

- #104 PASS
- #107 PASS
- P0-1 PASS
- P0-2 PASS

## Production Acceptance

| Gate | Result |
|---|---|
| SHA triangle | MATCH |
| Production smoke | PASS |
| Negative | PASS |
| Positive | PASS |
| Partial | PASS |
| #104 / #107 | PASS |
| P0-1 / P0-2 | PASS |

**Production PASS**
