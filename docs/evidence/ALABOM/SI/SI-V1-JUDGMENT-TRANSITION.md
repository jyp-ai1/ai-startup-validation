# S.I. V1 Next Accuracy Discovery — MEASUREMENT COMPLETE

**PR:** 측정 전용 (Fix 아님)  
**Branch:** `cursor/si-judgment-transition-e648`  
**Production SHA (frozen):** `dea7cb1916cfbd4e6f8c54a86e6da920ed708bd2`  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-judgment-transition.json`  
**Referee:** `apps/web/features/strategic-intelligence/lib/__tests__/score-si-judgment-transition.ts`  
**Playbook:** `apps/web/features/strategic-intelligence/lib/__tests__/si-judgment-transition.test.ts`  
**금지:** 엔진 수정 · UI · Production · Fix PR · Gate 자동 개방 · 사업명 분기 · `decideNextQuestionFromReview` · 신규 SoT

Production `dea7cb1`은 불변이다. 이번 작업은 **판단의 방향성**만 측정한다.

```text
긍정 증거 → Judgment 상승
부정 증거 → Judgment 하락
상충 증거 → CONFLICT / CU 재설정
새로운 강한 증거 → 기존 CU / Priority 교체
```

## 방향성 요약

| 기대 | 결과 | 범위 |
|---|---|---|
| 긍정 증거 → 상승 | **YES** | 5/5 (S1/deferred → S3, 또는 LMULM S3 → S4) |
| 부정 증거 → 하락 | **NO** | 0/5 |
| 상충 증거 → CONFLICT / CU 재설정 | **NO** | 0/5 · CONFLICT verdict 없음 |
| 새 강한 증거 → CU/Priority 교체 | **PARTIAL** | 클리닉/핏브릿지 교체 · 주인집/LMULM/RIDM leftover |

```text
긍정 상승은 동작한다.
부정 / 상충 / 번복은 Judgment를 내리지 않는다.
엔진 미수정. Production 불변.
```

## 7축 × 5사업

| 축 | 주인집 | LMULM | ClinicFlow | FitBridge | RIDM |
|---|---|---|---|---|---|
| stage_consistency | PASS | PASS | PASS | PASS | PASS |
| judgment_downgrade | **FAIL** | **FAIL** | **FAIL** | **FAIL** | **FAIL** |
| evidence_conflict | **FAIL** | **FAIL** | **FAIL** | **FAIL** | **FAIL** |
| evidence_supersession | **FAIL** | **FAIL** | PASS | PASS | **FAIL** |
| s4_overpromote | PASS | **PARTIAL** | PASS | PASS | PASS |
| negative_evidence | **FAIL** | **FAIL** | **FAIL** | **FAIL** | **FAIL** |
| contradictory_answer | **FAIL** | **FAIL** | **FAIL** | **FAIL** | **FAIL** |

추가 실패: ClinicFlow / FitBridge `worsening_as_improved` (9%→22%, 20%→35% 이후에도 S3/viable).

## S0 → S4 상태

t0 Judgment / CU / Priority / Ask는 서로 모순되지 않는다. 5/5 `stage_consistency` PASS.

관측:

- 이 5사업 경로에서 **S0·S2는 쓰이지 않는다.** 승격은 `S1 → S3` (LMULM만 문서 매출로 t0가 이미 S3, 이후 `S3 → S4`).
- 하락 시나리오에서도 stage/verdict는 고정된다. S3/S4에서 내려가지 않는다.
- #104 회귀: 지불만으로 S3를 만들지 않는 기준은 이번 시퀀스에서 깨지지 않았다. 이번 결함은 **이미 올라간 판단을 내리는 쪽**이다.

## 시퀀스 (대표)

긍정 승격은 전 사업에서 동작한다.

| 사업 | t0 | 긍정 증거 후 |
|---|---|---|
| 주인집 | deferred / S1 | viable / S3 |
| LMULM | viable / S3 | viable / **S4** |
| ClinicFlow | deferred / S1 | viable / S3 |
| FitBridge | deferred / S1 | viable / S3 |
| RIDM | deferred / S1 | conditionally_viable / S3 |

부정 / 상충 / 번복 이후:

| 사업 | 입력 | 기대 | 실측 |
|---|---|---|---|
| 주인집 | 결제자 3명 거절 · 결제 없음 | S3 하락 또는 CONFLICT | S3 / viable 유지 |
| LMULM | 재판매 정지 · 재구매 0 · "유료 전환 없었다" | S4 하락 또는 CONFLICT | S4 / viable 유지 |
| ClinicFlow | 해지 + no-show 9%→22% | S3 하락 | S3 / viable 유지 |
| FitBridge | 해지 + 반품률 20%→35% | S3 하락 | S3 / viable 유지 |
| RIDM | 결제 취소 · 직무 대체 미확인 | 조건부 철회 또는 보류 | S3 / conditionally_viable 유지 |

번복 문장("지난번에는 됐다고 했지만 이번에는 아니다")은 ASSUMPTION으로 붙고, 이전 VALIDATED를 취소하지 않는다.

## 실패 분류

| Kind | 의미 | 범위 |
|---|---|---|
| `missed_downgrade` | 부정 증거 후에도 stage/verdict가 내려가지 않음 | 5/5 |
| `ignored_negative` | 지불 후 해지·거절·재구매 0이 CU/판단을 바꾸지 않음 | 5/5 |
| `ignored_conflict` | VALIDATED와 반증이 같이 있어도 CONFLICT/CU 재설정 없음 | 5/5 |
| `ignored_contradiction` | Founder 번복이 이전 VALIDATED를 대체하지 않음 | 5/5 |
| `stale_after_supersession` | 새 VALIDATED 이후에도 t0 CU 또는 leftover 질문이 남음 | 주인집 · LMULM · RIDM |
| `s4_on_single_repeat` | 반복성 증거 한 코호트로 S4 | LMULM only |
| `worsening_as_improved` | `%에서 %` 악화를 stake 개선으로 읽음 | ClinicFlow · FitBridge |

같은 구조 원인이다. 사업명 분기가 아니다.

```text
Evidence는 append-only
hasKind(revenue, false) = 과거 매출 라인이 하나라도 있으면 참
CONFLICT verdict 없음
stake_improved = 감소 동사 또는 \d+% (에서|→) \d+%  (방향 검사 없음)
번복 답 = ASSUMPTION/FACT로 추가, 이전 VALIDATED 철회 없음
```

그래서 Founder는 동시에 듣는다.

```text
Headline = 사업화 가능성이 높음
새 증거   = 해지 / 거절 / 재구매 0 / "이번에는 아니다"
CU        = 직전과 같거나, leftover 미검증
```

## 축별 메모

**Judgment downgrade / Negative evidence**  
좋은 증거가 아니라 부정적 증거가 들어와도 S3/S4가 내려가지 않는다. 고객이 돈을 냈다가 해지하고 지표가 나빠져도 headline은 “사업화 가능성이 높음”이다.

**Evidence conflict**  
기존 VALIDATED와 “유료 전환은 없었고 아무도 결제하지 않았다”가 공존해도 판단을 재설정하지 않는다. CONFLICT 상태가 엔진에 없다.

**Evidence supersession**  
클리닉/핏브릿지 2/2 이후 CU는 #107 다음-미검증(“다음 고객/기간”)으로 교체된다 — 이 축만 PASS.  
주인집·RIDM은 결제/직무 답을 VALIDATED로 받은 뒤에도 t0 CU를 그대로 묻는다.  
LMULM은 CU 문장은 바뀌지만 다음 질문이 문서 `이탈` leftover(`얼마나 줄였`)를 유지한다.

**S4 과승격**  
LMULM 재판매 한 코호트(100명 중 35명 등록·12건)만으로 S4. 나머지 4사업은 한 번의 긍정 증거로 S4에 가지 않는다.

**Contradictory founder answer**  
“지난번에는 됐다고 했는데 이번에는 아니다”는 분류만 바뀌고(ASSUMPTION), 이전 매출 시그널을 끄지 않는다.

## 엔진 / Production

```text
Analyzer / Presenter vs dea7cb1 = 0
decideNextQuestionFromReview 미사용
사업명 토큰 없음
Production SHA dea7cb1 고정
Fix PR 없음
Gate 자동 개방 없음
```

## CPO 2-pass

이번 결과는 **MEASUREMENT COMPLETE** 이다. 결함이 있어도 CTO는 고치지 않는다.

다음 Fix Gate 후보는 질문 문장이 아니라 **판단 방향성**이다.

1. 부정·상충·번복 증거가 올라간 S3/S4를 내리거나 CONFLICT로 재설정하는가  
2. `%에서 %` 악화를 개선으로 읽지 않는가  
3. 반복 한 코호트를 scalability(S4)로 과승격하지 않는가  

Fix Gate는 이 PR에서 열지 않는다. CPO가 후보를 고른 뒤에만 다음 수정을 연다.
