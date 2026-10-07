# S.I. Question Alignment Batch — MEASUREMENT COMPLETE

**Branch:** `cursor/si-question-alignment-batch-e648`  
**Fix Batch #2:** `30504b7` PASS CLOSED  
**Production:** `dea7cb1916cfbd4e6f8c54a86e6da920ed708bd2` 불변  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-question-alignment-batch.json`  
**금지:** Presenter · `detectSiValidationKind` · analyzer (`decideStage`/`decideVerdict`/`pickCriticalUnknown`) · persist SoT · 사업명 분기 · Fix PR · Production

Evidence → Judgment → CU/Priority는 고정한 채, 실제 Founder Question이 next unresolved CU를 반영하는지만 측정한다.

## 규모

8 cases. 5 calibration + 3 unnamed. 각 1회 VALIDATED 승격 + 부정 회귀.

## 축

| 축 | PASS | PARTIAL | FAIL |
|---|---|---|---|
| CU resolved after DCE | **8** | 0 | 0 |
| Next CU specific | **8** | 0 | 0 |
| Question binds CU | 1 | **7** | 0 |
| Not generic after specific CU | 3 | **5** | 0 |
| Negative question realigns | **8** | 0 | 0 |

## 시나리오

| Case | next CU | Question kind | 판정 |
|---|---|---|---|
| 주인집 | 세그먼트 | `segment_proof` | **PASS** |
| LMULM | 반복 가능 사업 | `repeat_loop` but 이탈 수치 weave | PARTIAL |
| RIDM | 반복 가능 사업 | `repeat_loop` but 이탈 수치 weave | PARTIAL |
| ClinicFlow / FitBridge / no-show / 반품 / 이탈 | 다음 고객/기간 | **generic** | PARTIAL |

5/5 DCE 2/2:

```text
CU = 이번 성과가 다음 고객이나 다음 기간에도 같은 방향으로 이어지는가
kind = generic
Question = 지금 판단을 바꾸려면 실제 행동 증거가 필요합니다.
```

`detectSiValidationKind`는 `다음 고객|다음 기간` 분기가 없어 generic으로 떨어진다. Presenter는 kind 템플릿만 읽는다. 이번 Batch에서 둘 다 수정하지 않았다.

하향 후에는 8/8 질문이 CU로 돌아간다 (`paid_conversion` / `payer_split` / `payer_job` / `repeat_loop`). Question Engine 전체 고장이 아니다.

## Repeated / one-off

Repeated (≥3):

- `generic_ask_after_specific_cu` — **5**. 2/2 next-unknown CU 경로만.

One-off:

- `stake_weave_off_cu` — LMULM·RIDM 2. default DCE 문구의 “이탈 없는 두 번째 거래”가 Presenter stake weaver에 들어가, CU(반복 가능)와 다른 이탈 질문을 만든다.

## Regression

#104 지불만 ≠ S3 5/5 paid_conversion. hops S1→S3→S1 / S3→S4→S3 / S0→S3→S0. leftover 긍정 headline 0. Negative / P0 unit 유지. Analyzer·Presenter·ask kind vs Fix `30504b7` = 0.

## Fix Gate

열지 않음. Question binds 0 FAIL. 반복 잔여는 PARTIAL 5. CPO: FAIL일 때만 Question Generator Fix.
