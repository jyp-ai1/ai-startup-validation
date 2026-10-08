# Founder Test Batch 3 — P1 Pattern Confirmation (`acbbf24`)

**목적:** Batch 1/2 P1의 반복성 확인. Fix 없음.  
**Production:** `acbbf24` 불변 · Analyzer `c0b9bc3`  
**PR #119:** Draft 유지 · Merge 금지  
**엔진 / Prompt / Question Engine / Analyzer 수정:** 없음  
**Source:** Batch 1 원문 (`origin/cursor/si-founder-test-e648` RIDM · 주인집 · LMULM)  
**Dump:** `si-v1-founder-test-batch3-acbbf24.json`  
**측정:** 2026-10-08T00:10:51Z · dump test PASS (재현 확인이지 품질 PASS가 아님)

답변 원문은 Batch 1/2와 동일하게 보존했다.

유료 답(RIDM · 주인집):

```text
결제 후보 2명이 월 구독을 결제했고 유료 전환 1건이 발생했다.
```

---

## 1. Question Alignment 결과

| 사업 | 유료 후 questionKind | 질문 축 | 실제 사업 다음 축 | 판정 |
|---|---|---|---|---|
| RIDM | `repeat_loop` | 재판매 등록·거래 체결·재구매 | 구독 유지·재결제 / 결제자 분리 | **FAIL 후보** |
| 주인집 | `repeat_loop` | 재판매 등록·거래 체결·재구매 | 양조장 B2B 유료 반복 / 관광 수요 | **FAIL 후보** |
| LMULM T0 | `repeat_loop` | 재판매 (C2C가 CU) | C2C 반복 | PASS (해당 사업의 DCE) |

패턴:

```text
Paid conversion 검증 완료 (VALIDATED · delta up · viable S3)
→ 다음 CU = 반복 가능한 사업
→ 다음 질문 = 재판매
```

Batch 1 · Batch 2 · Batch 3에서 RIDM·주인집 모두 동일. 일회성 noise 아님.

CU/DCE 자체는 “두 번째 거래”로 일반화된다. 축 이탈은 Presenter `repeat_loop` 템플릿이 그 일반화를 **재판매 등록**으로 고정하는 지점에서 발생한다.

---

## 2. 실제 CU

### RIDM afterPaid

> 현재 강점이 반복 가능한 사업으로 이어지는가. 1회 성과가 반복되지 않으면 사업화 판단을 유지할 수 없다.

T0 CU는 유료 전환이었다. 유료 1건 이후 CU가 일반 반복으로 이동한다. 구독 SaaS의 다음 unknown(재구독·이탈·결제자 유형)은 열리지 않는다.

### 주인집 afterPaid

RIDM과 **동일 문장**. 양조장 대표 / 관광 수요 / 공급자 축은 CU에 나타나지 않는다.

### LMULM (대조)

> C2C 재판매가 한 번의 이벤트가 아니라 반복적으로 발생하는가. 이 루프가 없으면 1차 판매만 있는 브랜드이지 플랫폼 사업이 아니다.

LMULM만 사업 축과 CU가 일치한다.

---

## 3. DCE

### RIDM / 주인집 afterPaid (동일)

> 반복 구매·재사용 또는 이탈 없는 두 번째 거래 데이터. 이 데이터가 있으면 판단을 유지·상향하고, 없으면 1회성으로 내린다.

RIDM에는 “두 번째 거래 = 재구독”으로 읽을 여지가 있다. 주인집에는 “두 번째 양조장 결제”로 읽을 여지가 있다. 둘 다 DCE 문장 자체는 재판매를 지목하지 않는다.

### LMULM T0 / Negative / Partial

> 최근 구매자의 실제 재판매 등록·거래·재구매 데이터.

LMULM DCE만 재판매를 명시한다.

---

## 4. 실제 Founder 질문

RIDM afterPaid · 주인집 afterPaid · LMULM T0/Neg/Partial **동일 문장**:

> 최근 실제로 구매한 고객 중에서, 재판매 등록·거래 체결·재구매처럼 두 번째 행동이 일어난 경우가 있습니까? 있다면 규모(명 또는 건)를 알려주세요. 아직 없다면 계획만 있다고 답해도 됩니다.

출처: `present-si-ai-pm-question.ts` `QUESTION_BY_KIND.repeat_loop`.

RIDM T0 · 주인집 T0은 `paid_conversion`으로 맞았다. 이탈은 **유료 VALIDATED 이후**에만 발생한다.

---

## 5. whyAsking

RIDM / 주인집 afterPaid:

> 이 답이 들어오면 S.I.가 판단을 다시 계산합니다. 반복 구매·재사용 또는 이탈 없는 두 번째 거래 데이터.

whyAsking은 DCE 첫 문장이다. 재판매를 설명하지 않는다. Founder는 질문(재판매)과 이유(두 번째 거래)를 동시에 본다. 질문이 이유를 좁힌다.

---

## 6. Founder 원문

### 주인집 — 사업 단계 (계획/예비)

```text
『 관 광 벤 처 사 업 』
사 업 실 행 계 획 서
등록번호  -  사업자유형  þ예비  □개인  □법인
매출액 (전년도 기준)  -
협약기간  2026.5.1. ~ 11.30
```

### 주인집 — 출시 관련 유일한 히트 (일정표)

```text
4) 협약기간 중 사업 추진일정
세부추진 내용     05월 06월 07월 08월 09월 10월 11월
...
MVP 런칭 l
...
매출 발생 및 BM 검증 (900만)   l l
```

`MVP 런칭 l`은 2026-05 칸의 예정 마일스톤이다. 완료 문장이 아니다. 문서 제목은 실행계획서. 사업자 유형은 예비. 전년도 매출은 `-`.

### RIDM — 출시 원문 (대조)

완료:

```text
2025 Q1  RIDM 감정AI 엔진 v1.0 출시 · 베타 테스트
2025 Q3  구독 SaaS 정식 출시 (Free / Pro / Enterprise)
```

계획/목표:

```text
2027 MAU 50만 · 일본·동남아 다국어 출시 · ARR $5M 목표
```

RIDM Strength “앱이 이미 출시”는 2025 완료 원문과 맞다. 주인집과 같은 과대해석이 아니다.

### 유료 답 원문 (RIDM · 주인집)

```text
결제 후보 2명이 월 구독을 결제했고 유료 전환 1건이 발생했다.
```

### LMULM 답 원문

- Positive: `최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.`
- Negative: `1차 판매는 있었지만 재판매 등록 0건, 재구매 0건이다.`
- Partial: `재구매 2건은 있었으나 재판매 등록은 0건이다.`

---

## 7. Evidence classification

| 경로 | 원문 | class | axis | delta |
|---|---|---|---|---|
| RIDM afterPaid | 유료 전환 1건 | VALIDATED | validationStrength | up |
| 주인집 afterPaid | 유료 전환 1건 | VALIDATED | validationStrength | up |
| LMULM Positive | 재판매 35 / 거래 12 | VALIDATED | validationStrength | up |
| LMULM Negative | 등록 0 · 재구매 0 | FACT | validationStrength | unchanged |
| LMULM Partial | 재구매 2 · 등록 0건 | FACT | validationStrength | unchanged |

분류 자체는 Batch 2와 같다. P0 경계(0건 → FACT, viable 아님) 유지.

---

## 8. Strength / Risk

### 주인집 T0

- Strength: **제품 또는 앱이 이미 출시되어 있다.** / 구체적 문제가 있다.
- Risk / CU: 가치가 실제 지불로 이어지는가

### 주인집 afterPaid

- Strength에 **실제 판매·매출 증거가 있다** 추가 (유료 답과 일치)
- Strength **앱이 이미 출시** 유지 (원문 예비/일정과 불일치 유지)
- Risk: 반복 가능한 사업인가

### RIDM T0 / afterPaid

- Strength “앱이 이미 출시”는 2025 Q1/Q3 원문과 정합
- afterPaid Strength에 판매·매출 추가 (유료 답과 일치)

---

## 9. 원문과 해석 차이

| 사업 | 원문 | Analyzer 해석 | 차이 |
|---|---|---|---|
| 주인집 | 예비 · 실행계획서 · 매출 `-` · 일정 `MVP 런칭 l` | Strength: 제품 또는 앱이 **이미 출시** | 계획/예비 → 실행 완료 FACT |
| RIDM | 2025 Q1/Q3 출시 + 2027 목표 | Strength: 이미 출시 | 완료 원문이 있어 **과장 아님** |
| RIDM 유료 후 | 월 구독 1건 | 다음 질문: 재판매 등록 | 구독 유지 축 → C2C 축 |
| 주인집 유료 후 | 월 구독 1건 | 다음 질문: 재판매 등록 | 양조장/관광 축 → C2C 축 |

주인집 메커니즘(수정하지 않음): `/출시|런칭|launch/i` 가 부정되지 않으면 `launch` FACT → Strength “이미 출시”. `MVP 런칭 l`은 부정 없음.

---

## 10. RIDM 결과

| 단계 | verdict | stage | Q kind | 다음 행동 |
|---|---|---|---|---|
| T0 | conditionally_viable | S3 | `paid_conversion` | 가장 가까운 결제 후보에게 유료 제안 — **맞음** |
| afterPaid | **viable** | S3 | **`repeat_loop`** | 재판매 등록 — **축 이탈** |

유료 1건 → viable 상향은 지불 DCE를 충족한다. 그 다음 Founder 행동은 재구독/이탈이 아니라 재판매다.

P1-A **반복 확정**. P1-B(계획→출시 FACT)는 RIDM에서 해당 없음.

---

## 11. 주인집 결과

| 검사 | 결과 |
|---|---|
| `앱 출시` Strength vs 원문 | **불일치**. 원문=예비+일정 `MVP 런칭 l`. Strength=이미 출시. Batch 1/2와 동일 |
| 유료 후 질문 | **다시 재판매**. `repeat_loop` 문장 RIDM과 동일 |

P1-A **반복 확정**. P1-B **반복 확정** (같은 원문, 같은 승격).

---

## 12. LMULM P0 sanity

| 경로 | 기대 | 측정 | 결과 |
|---|---|---|---|
| Positive | S4 | `conditionally_viable` S4 · CU 세그먼트로 이동 · `segment_proof` | **유지** |
| Negative | S3 조건부 | `conditionally_viable` S3 · **viable 아님** · CU OPEN · Risk에 0건 명시 | **유지** |
| Partial | S3 조건부 | `conditionally_viable` S3 · **S4 아님** · CU OPEN | **유지** |

STOP 조건 해당 없음. Batch를 끝까지 완료했다.

---

## 13. P0 regression 여부

**없음.**

- Negative → viable: 없음
- DCE 미충족 → S4: 없음 (Partial S3)
- OPEN CU인데 검증 완료 headline: 없음 (Negative headline 조건부, CU OPEN)
- FACT/ASSUMPTION/VALIDATED 혼동으로 사업 결론이 뒤집힌 신규 P0: 없음

P0 Fix Gate **CLOSED 유지**. Production `acbbf24` 불변.

---

## 14. P1 반복성 여부

| P1 | Batch 1 | Batch 2 | Batch 3 | 반복성 |
|---|---|---|---|---|
| A. 유료 → 재판매 질문 | RIDM · 주인집 | RIDM · 주인집 | RIDM · 주인집 | **3회 · 2사업. 체계적** |
| B. 계획/예비 → 출시 FACT | 주인집 | 주인집 | 주인집 (원문 일정표 확인) | **3회 · 주인집만. 재현 확정** |

P1-A는 사업이 C2C가 아닌데도 `repeat_loop` 템플릿이 재판매를 묻는다.  
P1-B는 주인집 일정 토큰 `런칭`만으로 Strength가 실행 완료가 된다. RIDM은 같은 Strength라도 2025 완료 원문이 있어 동일 결함이 아니다.

---

## 15. 최종 판정

**FIX GATE 후보 — Question Alignment (P1-A)**

CPO가 Batch 2에서 건 조건(“유료 검증 후 재판매 질문이 다음 Batch에서도 반복되면 Gate를 연다”)이 Batch 3에서 충족됐다.

- 유료 VALIDATED 이후 Founder 다음 행동이 재판매로 고정된다.
- RIDM(구독) · 주인집(양조장/관광) 모두 해당. LMULM만 맞다.
- whyAsking/DCE는 “두 번째 거래”인데 질문은 재판매라 Founder가 잘못된 축을 검증하게 된다.

**P1-B (주인집 앱 출시)** — 반복 확정. Analyzer 전체 rewrite 후보는 아님. 일정/예비/런칭 토큰 → `launch` FACT 경계만 별도 후보로 남긴다. RIDM은 이 부정합이 없다.

**GO 아님** — P1이 비핵심 일회성이 아니다.  
**HOLD 아님** — 3 Batch로 관찰 가치는 소진. 추가 Batch는 같은 원문·같은 답을 한 번 더 찍을 뿐이다.

Production `acbbf24` 불변. PR #119 Draft 유지. 이 문서는 측정이다. 코드 없음.
