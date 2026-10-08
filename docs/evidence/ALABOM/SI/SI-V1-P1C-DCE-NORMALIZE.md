# P1-C DCE Fulfillment / Evidence Normalization Fix

**CPO Gate:** OPEN · 2-pass 전 Merge/Production 금지  
**Production:** `671005f` 불변 · Analyzer architecture `c0b9bc3` 불변  
**P1-A:** CLOSED · **P1-B:** Backlog · PR #119 / #120 / #124 Draft 유지  
**Branch:** `cursor/si-p1c-dce-normalize-e648`  
**PR:** https://github.com/jyp-ai1/ai-startup-validation/pull/125 (Draft)  
**SHA:** `984df710153acc4814ee26e3a5ce315a90f82009`  
**Preview:** https://ai-startup-validation-git-cursor-si-p1-6d75e4-jyp-ai1s-projects.vercel.app

수량 표현의 표면형(`곳` vs `건`)이 아니라, 그 수량이 의미하는 사업 사실을 Evidence class와 DCE fulfillment가 같이 본다.

## 변경 파일

| 파일 | 역할 |
|---|---|
| `apps/web/features/strategic-intelligence/lib/quantity-unit.ts` | 수량 단위 의미 정규화 |
| `apps/web/features/strategic-intelligence/lib/classify-founder-evidence.ts` | 동일 helper로 VALIDATED 판정 |
| `apps/web/features/strategic-intelligence/lib/analyze-strategic-intelligence.ts` | `isQuantifiedPayment` / `isQuantifiedCompletion` 본체만 helper 호출 |
| `apps/web/features/strategic-intelligence/lib/__tests__/quantity-unit.test.ts` | 단위 의미 보존 |
| `apps/web/features/strategic-intelligence/lib/__tests__/si-p1c-dce-normalize.test.ts` | Acceptance Matrix |

**미변경:** Presenter · Question Engine · `decideVerdict` / `decideStage` / `dceStakeOpen` · Auth · SoT · 사업명 분기 · P1-A bind · P1-B

Analyzer는 helper import만 추가했다. Judgment architecture rewrite 없음.

## Normalization 규칙

단위를 없애지 않는다. `곳 → 건` 치환 없음.

| 표면 | kind | DCE에서 쓰는 때 |
|---|---|---|
| 곳, N개 병원/브랜드/업체/매장 | `customer_org` | 결제 동사와 같이 있으면 유료 전환 |
| 명 | `person` | 결제/유료와 같이 있으면 결제자. `사용`만이면 사용자 수 |
| 건 | `transaction` | 결제 동사와 같이 있으면 결제 건수. 등록/거래 동사면 완료 행동 |
| 계약 | `contract` | 결제면 유료 전환. 체결이면 완료 행동 |
| 재구매 | 단위가 아님 | 반복 행동. 결제 승격에 쓰지 않음 |
| 0곳 / 0건 / 0명 | count=0 | 유료 전환 아님 |

결제 동사는 기존과 같다: `결제했|지불했|유료로 썼/사용/전환`.  
완료 동사도 기존과 같다: `등록했|거래됐|재구매했|체결됐|실제로 재판매`.

`2곳이 결제`와 `2건이 결제`는 서로 다른 kind를 유지한 채, 둘 다 **양의 유료 전환**으로 매칭한다.

## Acceptance Matrix

| # | 입력 | 기대 | 결과 |
|---|---|---|---|
| 1 | 클리닉 `2곳` 결제 + no-show 22→12% | VALIDATED · DCE Full · 승격 · S1 고정 금지 | PASS · viable S3 |
| 2 | 핏브릿지 `2곳` 결제 + 반품률 38→29% | 동일 | PASS · viable S3 |
| 3 | Token `2건` + 지표 | 기존 승격 유지 | PASS · viable S3 |
| 4 | Partial `2곳`/`2건` 결제만 | Full 금지 · S3/S4 금지 · CU=지표 | PASS · S1 deferred |
| 5 | Partial Stake / 예정·제안·검토 | VALIDATED 금지 · 승격 금지 | PASS |
| 6 | `0곳` / 미결제 | viable 금지 | PASS |
| 동네장터 | `1명`+`1건` 결제 | 기존 S3 · 구독 유지 질문 | PASS |

재판매 질문 이탈 없음.

## Regression

| Gate | 결과 |
|---|---|
| P1-C targeted | 10 passed |
| S.I. suite | 193 passed |
| #104 Partial DCE | PASS · 지불만 S1 |
| #107 / Negative | PASS · zero-repeat viable 금지 |
| P1-A 4축 | PASS · 구독 / 관광 수요 / 재판매 / unnamed |
| P0-1 | PASS (14) |
| P0-2 | PASS (10) |

## STOP

ASSUMPTION→VALIDATED · Partial→S3/S4 · Negative→viable · P1-A 재판매 · 사업명 분기 · Analyzer rewrite · 단위 의미 소거: **없음**.

## Preview / SHA

| | |
|---|---|
| Fix SHA | `984df71` |
| Preview | https://ai-startup-validation-git-cursor-si-p1-6d75e4-jyp-ai1s-projects.vercel.app |
| Production | UNCHANGED `671005f` |

Vercel Preview Comments PASS. Deployment SSO. Merge / deploy는 CPO 2-pass 후.
