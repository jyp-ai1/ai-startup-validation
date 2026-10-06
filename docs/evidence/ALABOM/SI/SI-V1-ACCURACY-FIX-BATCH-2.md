# S.I. Accuracy Fix Batch #2 — Evidence Reconciliation

**Branch:** `cursor/si-accuracy-fix-batch-2-e648`  
**Base measurement:** Accuracy Batch #2 FAIL (`4a4a45c`)  
**Negative Judgment Fix:** `4b2aa21` 유지  
**Production:** `dea7cb1916cfbd4e6f8c54a86e6da920ed708bd2` 불변  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-accuracy-fix-batch-2.json`  
**금지 준수:** Presenter · Question generator · persist SoT · 사업명 분기 · merge · Production

## RCA

문서는 append-only라서 나중 라인이 앞선 VALIDATED를 덮지 않는다. 분석 시점 retract는 이미 있다. 막힌 지점은 세 곳이었다.

1. **직접 부인 미검출.** `없다`만 보고 `없었다` / `발생하지 않았다`를 놓침. “실제로 결제한 고객은 없었다”가 FACT로 append되고 기존 VALIDATED가 살아 재판단이 없었다.
2. **재구매 0 → S4.** `재구매` 언급이 VALIDATED `repeat_validation`이 됨. CONFLICT는 아니지만 0건이 승격 신호가 됐다.
3. **payer/job CU 잔류.** VALIDATED 결제가 나와도 `pickCriticalUnknown`이 문서의 `payer_split` / `job_unknown`을 먼저 집어 t0 CU가 남았다. #107 2/2 경로는 quantified_problem이라 우회했고, 결제자·직무 경로는 같은 규칙을 쓰지 않았다.

Question generator는 고치지 않는다. 5건 generic은 CU=다음 고객/기간 이후 Presenter 잔여로 측정만 한다.

## Fix

분석기만 변경. `decideStage` / `decideVerdict` / `pickCriticalUnknown` 시그니처 불변.

- 같은 축 직접 부인(`발생하지 않` / `없었`) → 기존 VALIDATED 철회 + CONFLICT + 유효 시그널로 재판단
- `재구매 0` · 계획 · 의도는 CONFLICT 아님. `repeat_validation` VALIDATED도 아님
- live VALIDATED `revenue`/`repeat_validation`이 있으면 해결된 payer/job CU를 건너뛰고 다음 unresolved CU (#107과 같은 재사용)

## Fix Test

`si-evidence-reconciliation.test.ts` 7 + `si-accuracy-fix-batch-2.test.ts`.

| 시나리오 | 결과 |
|---|---|
| 지불만 ≠ S3 (#104) | PASS |
| 2/2 CU 다음 고객/기간 (#107) | PASS |
| “실제로 결제한 고객은 없었다” | CONFLICT · S3/viable 유지 안 함 |
| “실제 재판매는 발생하지 않았다” | CONFLICT · S4 아님 |
| 재구매 0 after 2/2 | CONFLICT 아님 · S4 아님 |
| LMULM 재구매 0 after S4 | CONFLICT 아님 · S4 아님 |
| 주인집·RIDM VALIDATED 결제 후 CU/Priority 이동 | PASS |
| Negative hops | 유지 |

## Post-Fix Accuracy Batch

8 × 6 = 48. 동일 스코어러.

| 축 | PASS | PARTIAL | FAIL |
|---|---|---|---|
| Judgment | **8** | 0 | 0 |
| Evidence | **8** | 0 | 0 |
| State | **8** | 0 | 0 |
| Negative / Contradictory | **8** | 0 | 0 |
| CU / Priority | **8** | 0 | 0 |
| Question | 3 | **5** | 0 |
| Founder Outcome | **8** | 0 | 0 |

| Focus | PASS | PARTIAL | FAIL |
|---|---|---|---|
| Positive promotion | 3 | **5** | 0 |
| Conflict | **8** | 0 | 0 |
| Regression | **8** | 0 | 0 |

hops 유지: S1→S3→S1 · S3→S4→S3 · S0→S3→S0.

반복 failure: `generic_ask_after_specific_cu` 5 — 2/2 다음 고객/기간 이후 generic. Presenter 미수정.

## Regression

SI `__tests__` + P0-1/P0-2 **27 files / 155 tests PASS**.

Presenter vs `4b2aa21` = 0. Production 불변.
