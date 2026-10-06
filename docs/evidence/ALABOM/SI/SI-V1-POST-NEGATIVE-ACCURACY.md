# Post-Negative-Judgment Accuracy Batch — MEASUREMENT COMPLETE

**Branch:** `cursor/si-post-negative-accuracy-e648`  
**Fix SHA:** `4b2aa21` (Negative Judgment PASS CLOSED)  
**Production:** `dea7cb1916cfbd4e6f8c54a86e6da920ed708bd2` 불변  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-post-negative-accuracy.json`  
**금지:** Presenter 패치 · Question 생성기 · Fix PR · merge · Production · 사업명 분기

Negative Judgment Fix 이후 연결:

```text
Negative Evidence → Evidence → Judgment → CU/Priority → Question → Founder Outcome
```

## 규모

8 cases × 5 sequences = 40. 5 calibration + 3 unnamed.

## 7축

| 축 | PASS | PARTIAL | FAIL |
|---|---|---|---|
| Judgment | **8** | 0 | 0 |
| Evidence | 7 | 0 | 1 |
| State | 6 | 0 | 2 |
| Negative / Contradictory | 7 | 0 | 1 |
| CU / Priority | 6 | 0 | 2 |
| Question | 3 | **5** | 0 |
| Founder Outcome | **8** | 0 | 0 |

## Judgment (핵심 회귀)

하향이 연결된다.

| Case | hops |
|---|---|
| 주인집 | S1→S3→S1 |
| LMULM | S3→S4→S3 |
| ClinicFlow / FitBridge / no-show / 반품 | S1→S3→S1 |
| RIDM | S1→S3→S1 |
| nameless 이탈 | S0→S3→S0 |

#104 지불만 ≠ S3, #107 2/2 CU 다음 미검증 유지.

## Question — Batch #1과 같은 잔여

`generic_ask_after_specific_cu` **5건** (클리닉 · 핏브릿지 · unnamed 3).

2/2 승격 후 CU는 “다음 고객/기간”인데 질문은 generic:

```text
지금 판단을 바꾸려면 실제 행동 증거가 필요합니다.
```

**하향 이후에는 질문이 CU를 따라간다.** 클리닉 부정 후 kind=`paid_conversion`, no-show 전후 질문. Presenter를 안 고쳐도, Judgment가 다시 열리면 질문은 스테이크 질문으로 돌아온다.

잔여는 **승격 후 next-unknown CU vs generic kind**다. 질문 생성기 선행 수정은 하지 않았다.

## Founder Outcome

부정 이후 8/8에서 headline이 “사업화 가능성이 높음”으로 남지 않는다. 4항은 재계산된 보류 판단을 읽는다. leftover_positive_headline = 0.

## Repeated / one-off

Repeated (≥3):

- `generic_ask_after_specific_cu` — 5. 2/2 승격 경로만.

One-off:

- `stale_cu` / `stale_priority` — 주인집·RIDM, 긍정 승격 후 t0 CU 유지. 이번 Fix 범위 밖.
- `ignored_conflict` — LMULM. “실제 재판매는 없었다”가 ASSUMPTION. 재구매 0은 CONFLICT가 아닌 것이 유지됨. 재판매 **직접 부인**은 retract만 되고 CONFLICT 라벨이 안 붙는 경우가 있다.

## 엔진

Analyzer vs Fix SHA = 0. Presenter = 0. Production 불변. Fix PR 없음.
