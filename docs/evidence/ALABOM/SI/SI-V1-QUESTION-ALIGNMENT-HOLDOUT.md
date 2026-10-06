# S.I. Question Alignment Holdout — MEASUREMENT COMPLETE

**Branch:** `cursor/si-question-alignment-holdout-e648`  
**Prior:** Question Alignment Batch PARTIAL CLOSED (`248a375`) · Fix Batch #2 `30504b7`  
**Production:** `dea7cb1916cfbd4e6f8c54a86e6da920ed708bd2` 불변  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-question-alignment-holdout.json`  
**금지:** Question Generator · `detectSiValidationKind` · Analyzer · Presenter · persist SoT · 사업명 분기 · Fix PR

기존 8시나리오를 그대로 쓰지 않는다. 새 입력 조합 11건으로 `next CU → kind → spoken question`만 측정한다.

## 규모

11. unnamed 6 (누락·부하·미스매치·불일치·수기 세무·현장 점검) + calibration 5 대체 답.

## Spoken-question alignment (CPO 기준)

| | PASS | PARTIAL | FAIL |
|---|---|---|---|
| Spoken question | 1 | **6** | **4** |

PASS: 질문은 next CU의 검증 대상을 직접 보존.  
PARTIAL: 관련 있으나 CU 객체를 일반화.  
FAIL: 다른 검증 축으로 이동.

## A. next-CU generic — 6 PARTIAL

| Case | CU | kind | Question |
|---|---|---|---|
| unnamed 누락 14%→6% | 다음 고객/기간 | generic | generic validation |
| unnamed 부하 41%→19% | 다음 고객/기간 | generic | generic validation |
| unnamed 미스매치 22%→10% | 다음 고객/기간 | generic | generic validation |
| unnamed 불일치 19%→8% | 다음 고객/기간 | generic | generic validation |
| ClinicFlow alt 3명 22%→12% | 다음 고객/기간 | generic | generic validation |
| FitBridge alt 5명 38%→29% | 다음 고객/기간 | generic | generic validation |

`detectSiValidationKind`는 `다음 고객|다음 기간` 분기가 없어 generic. 질문은 행동 증거를 묻지만 **다음 고객/기간 반복**이라는 CU 객체는 사라진다. 다른 축으로 이동하진 않아 PARTIAL.

## B. stake weave-off — 4 FAIL

| Case | CU | kind | Question |
|---|---|---|---|
| unnamed 수기 세무 (지표 없음) | 반복 가능한 사업 | repeat_loop | **이탈 수치** |
| unnamed 현장 점검 (지표 없음) | 반복 가능한 사업 | repeat_loop | **이탈 수치** |
| LMULM alt 60/18/7 | 반복 가능한 사업 | repeat_loop | **이탈 수치** |
| RIDM alt 2명 분기 구독 | 반복 가능한 사업 | repeat_loop | **이탈 수치** |

default DCE 「이탈 없는 두 번째 거래」가 Presenter stake weaver에 들어가, CU(반복 가능성)와 다른 운영 지표 축으로 질문이 이동한다. Holdout 기준 **FAIL**.

## Control

주인집 alt 결제자 5명: next CU = 세그먼트, question = `segment_proof`. **PASS**. Kind가 CU 객체를 받으면 질문은 맞는다.

## Repeated

- `generic_ask_after_specific_cu` — 6. Pattern A만. PARTIAL.
- `stake_weave_off_cu` — 4. Pattern B만. FAIL.

## Regression

#104 지불만 ≠ S3. #107 unnamed 누락 2/2 → 다음 고객/기간. hops 유지. leftover 긍정 headline 0. Negative 하향 11/11. 하향 후 질문 재정렬 10/11. P0-1/P0-2 unit PASS. Engine 0-diff.

## Fix Gate

**NOT OPEN.** Fix PR 없음. generic는 PARTIAL. weave-off는 Holdout에서 FAIL로 재현됐으나 Gate 개방은 CPO 결정.
