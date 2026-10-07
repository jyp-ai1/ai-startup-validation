# S.I. Accuracy Batch #2 — MEASUREMENT COMPLETE

**Branch:** `cursor/si-accuracy-batch-2-e648`  
**Fix SHA:** `4b2aa21` (Negative Judgment PASS CLOSED)  
**Production:** `dea7cb1916cfbd4e6f8c54a86e6da920ed708bd2` 불변  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-accuracy-batch-2.json`  
**금지:** Presenter 패치 · Question 생성기 · Fix PR · merge · Production · 사업명 분기 · 새 SoT

한 Batch에서 두 영역을 같이 측정한다.

```text
A. 2/2 → Judgment 승격 → CU → Priority → Question
B. VALIDATED + 직접 부인 → CONFLICT → Judgment → CU/Priority → Question
```

회귀: Negative downgrade · Founder Outcome · #104 · #107 · P0-1 · P0-2 · 5-business loop.

## 규모

8 cases × 6 sequences = 48. 5 calibration + 3 unnamed.

Sequences: t0 · payment-only (#104) · upgrade · downgrade · directConflict · notConflict(재구매 0).

## 7축

| 축 | PASS | PARTIAL | FAIL |
|---|---|---|---|
| Judgment | **8** | 0 | 0 |
| Evidence | 0 | 0 | **8** |
| State | 6 | 0 | 2 |
| Negative / Contradictory | 0 | 0 | **8** |
| CU / Priority | 6 | 0 | 2 |
| Question | 3 | **5** | 0 |
| Founder Outcome | **8** | 0 | 0 |

## Focus (이번 Batch 목적)

| Focus | PASS | PARTIAL | FAIL |
|---|---|---|---|
| Positive promotion | 1 | **5** | 2 |
| Conflict | 0 | 0 | **8** |
| Regression | **8** | 0 | 0 |

## A. Positive promotion state reconciliation

2/2 DCE 5건은 Judgment 승격과 CU 이동이 된다. Question은 따라가지 않는다.

| Case | hops | CU | Priority | Question |
|---|---|---|---|---|
| ClinicFlow / FitBridge / no-show / 반품 / 이탈 | S1→S3 또는 S0→S3 | 다음 고객/기간 | 이동 | **generic** |
| LMULM | S3→S4 | 이동 (다음 고객 아님) | 이동 | repeat_loop |
| 주인집 · RIDM | S1→S3 | **t0 유지** | **t0 유지** | kind 유지 (stale CU에 align) |

5/5 DCE 2/2:

```text
2/2 승격
↓
CU = 다음 고객/기간
↓
Question = generic
「지금 판단을 바꾸려면 실제 행동 증거가 필요합니다.」
```

하향 후에는 5/5가 다시 `paid_conversion`으로 돌아가고 스테이크를 묻는다. Negative 경로의 CU-question 연결은 유지된다. 끊기는 지점은 **Positive promotion → next CU → Question binding**이다.

주인집·RIDM은 Judgment만 승격되고 CU/Priority가 t0에 남는다. 질문은 그 stale CU를 따라가므로 Question 축은 PASS로 잡힌다. 결함은 질문 생성기가 아니라 **Judgment → CU/Priority sync**다.

이번 Batch에서 Presenter/Question generator는 수정하지 않았다.

## B. Direct contradiction / CONFLICT

자극은 Batch #1의 이미 매칭되는 문장이 아니라, CPO가 지정한 **같은 축 직접 부인**이다.

| Kind | 직접 부인 | 재구매 0 (NOT CONFLICT) |
|---|---|---|
| repeat_loop (LMULM) | 실제 재판매는 발생하지 않았다. | 재구매는 0건이다. |
| 그 외 | 실제로 결제한 고객은 없었다. | 재구매는 0건이다. |

결과 8/8:

```text
class = FACT
Judgment 재평가 = 없음 (S3→S3 또는 S4→S4)
CU/Priority 이동 = 없음
Question 변화 = 없음
```

LMULM: VALIDATED 재판매 이후 직접 부인도 FACT. S4 유지. 하향 플레이북(`재판매는 멈췄고 재구매는 0건이다…`)은 계속 S4→S3로 내려간다.

결제 DCE: “실제로 결제한 고객은 없었다”도 FACT. 기존 VALIDATED 결제를 철회하지 않는다. 이탈 1건은 같은 문장 이후 verdict가 `conditionally_viable→viable`로 **올라가기까지** 한다.

재구매 0은 8/8 CONFLICT가 아니다. Semantic distinction은 유지된다. 다만 7/8에서 재구매 0 FACT가 S3→S4로 **추가 승격**한다. CONFLICT가 아닌 것과, 0건을 추가 긍정 증거로 읽는 것은 별개다.

```text
결제 발생 + 재구매 0  → CONFLICT 아님  (유지)
실제 재판매 발생 + 실제 재판매 없음 → CONFLICT 아님  (이번 측정 FAIL)
```

엔진 정규식이 `없다` / `아무도 결제하지 않` 계열만 철회·CONFLICT로 본다. `않았다` / `없었다` 직접 부인은 분석 시 retract 대상이 아니다. 이번 Batch에서 그 정규식을 고치지 않았다.

## Regression — 유지

| 항목 | 결과 |
|---|---|
| Negative hops | 주인집 S1→S3→S1 · LMULM S3→S4→S3 · 이탈 S0→S3→S0 · 나머지 S1→S3→S1 |
| Founder Outcome leftover “가능성이 높음” | **0** |
| #104 지불만 ≠ S3 | 5/5 paid_conversion payment-only deferred · `si-negative-judgment` PASS |
| #107 2/2 CU 다음 고객/기간 | 5/5 |
| P0-1 / P0-2 unit | PASS |
| 5-business + unnamed 3 | 루프 유지 |

## Repeated / one-off

Repeated (≥3):

- `ignored_direct_conflict` — **8**. 직접 부인 전 구간 no-op.
- `generic_ask_after_specific_cu` — **5**. 2/2 승격 경로만. 하향 후 재정렬.
- `repeat_zero_promoted` — **7**. 재구매 0이 CONFLICT는 아닌데 S3→S4로 올라감.

One-off:

- `stale_cu_after_promotion` / `stale_priority_after_promotion` — 주인집·RIDM 2.

## 엔진

Analyzer vs Fix SHA `4b2aa21` = 0. Presenter = 0. Production 불변. Fix Gate 없음. CPO Review는 이 COMPLETE 이후.
