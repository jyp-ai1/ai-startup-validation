# Founder Test Batch 2 — Decision Value (`acbbf24`)

**목적:** CEO가 돈을 걸고 의사결정할 수 있는가  
**Production:** `acbbf24` 불변 · Analyzer `c0b9bc3`  
**엔진 수정:** 없음 · Fix PR 없음  
**Source:** Batch 1 원문 (RIDM 9335 · LMULM 12937 · 주인집 4787자)  
**Dump:** `si-v1-founder-test-batch2-acbbf24.json`

답변 원문은 Batch 1과 동일하게 보존했다.

---

## P0 재발

| 검사 | 결과 |
|---|---|
| LMULM 0건 → `viable` 상향 | **없음** (`roseToViable: false`) |
| LMULM Partial → S4 | **없음** |
| CU 미해결인데 Judgment 상승 | **없음** (Negative CU OPEN, verdict 유지) |

P0 Negative Reconciliation **재발 없음**.

---

## 1. RIDM AI

### T0
- Judgment: `conditionally_viable` · Headline 조건부 사업화 가능
- Stage: S3
- Why: 실행 자산·앱 출시 있으나 지불 미확인
- Strength: 분사·공급망·앱 출시·구체적 문제 *(일반화)*
- Core Risk / CU: 가치가 실제 지불로 이어지는가
- DCE: 최초 유료 1건 + 전후 성과
- Priority: 가장 가까운 결제 후보에게 유료 제안

### T1 Question
`paid_conversion` — 유료로 제안했거나 받은 돈이 있습니까?  
CU/DCE와 연결됨. Founder가 목적을 이해할 수 있음.

### T2 Answer (원문)
미결제: `아직 유료 고객은 없고, 결제 제안도 하지 않았다.`  
유료(별도 경로): `결제 후보 2명이 월 구독을 결제했고 유료 전환 1건이 발생했다.`

### T3 Evidence
- 미결제: ASSUMPTION · delta unchanged
- 유료: VALIDATED · delta up

### T4 Re-Judgment
| | 미결제 | 유료 |
|---|---|---|
| Judgment | 조건부 유지 | **viable** |
| Stage | S3 | S3 |
| Headline | 조건부 | 가능성이 높음 |
| CU | 결제자 분리로 이동 | 반복 가능한 사업 |
| Next Q | `payer_split` | **`repeat_loop` 재판매** |

### T5 Next Action
- 미결제: 결제자 한 명의 지불 이유 — 이해 가능
- 유료: 재판매 등록·재구매 — **AI 컴패니언과 축이 다름**

### Decision Value
| 항목 | 점수 | 이유 |
|---|---|---|
| 판단 명확성 | PASS | T0 조건부·유료 미확정 |
| 리스크 명확성 | PASS | 지불로 이어지는가 |
| 검증 명확성 | PASS | 유료 1건 |
| 행동 가능성 | PARTIAL | T0/미결제는 가능. 유료 후 재판매는 다음 행동이 빗김 |
| 판단 변화 설명 | PARTIAL | 미결제 유지는 설명 가능. 유료→재판매는 사업과 안 맞음 |

---

## 2. LMULM

### T0 (공통)
- Judgment: `conditionally_viable` · 조건부
- Stage: S3
- Why: 실행 자산 vs C2C 미검증
- CU: C2C 반복이 없으면 1차 판매 브랜드
- DCE: 등록·거래·재구매. 있으면 올리고 없으면 내린다
- Question: `repeat_loop` 두 번째 행동?

세 상태가 Founder에게 구분되는가 → **구분됨.**

### Positive
답 원문: `최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.`
- Evidence: VALIDATED
- Re-Judgment: 조건부 **S4** · delta up · 반복 검증 strength 추가
- CU 이동: 세그먼트 가설
- Next: 지목 고객 그룹 실사용·지불
- Headline: 조건부 유지 (S4여도 `viable` 확정 아님)

### Negative
답 원문: `1차 판매는 있었지만 재판매 등록 0건, 재구매 0건이다.`
- Evidence: FACT
- Re-Judgment: `conditionally_viable` **S3 유지** · delta unchanged · **viable 아님**
- Risk: **재구매·재판매가 0건이라 반복 사업은 검증되지 않았다**
- CU: C2C **OPEN** 유지
- Next: 같은 재판매 질문
- Headline: 조건부

### Partial
답 원문: `재구매 2건은 있었으나 재판매 등록은 0건이다.`
- Evidence: FACT
- Re-Judgment: `conditionally_viable` S3 · **S4 아님** · CU OPEN
- Risk 문구는 T0과 동일(부분 충족이 리스크 문장에 안 보임)
- Next: 같은 재판매 질문

### Decision Value
| 항목 | 점수 | 이유 |
|---|---|---|
| 판단 명확성 | PASS | 플랫폼 vs 브랜드 프레임이 T0부터 선명 |
| 리스크 명확성 | PASS | Negative에 0건이 명시 |
| 검증 명확성 | PASS | 등록·체결·재구매 |
| 행동 가능성 | PASS | 다음에 코호트 숫자 또는 세그먼트 |
| 판단 변화 설명 | PARTIAL | Pos/Neg는 설명 가능. Partial은 증거가 들어갔는데 headline/risk가 T0과 같아 “2건은?”이 남을 수 있음 |

---

## 3. 주인집

### T0
- Judgment: `conditionally_viable` S3
- Why / Strength: **제품 또는 앱이 이미 출시되어 있다** + 구체적 문제  
  원문은 예비관광벤처·매출 -. 앱 출시 strength는 과대
- CU: 유료 전환 (양조장 대표/관광수요/공급자 축은 분리되지 않음)
- DCE: 최초 유료 1건
- Question: `paid_conversion`

### T2 Answer (원문)
미결제: `양조장 대표에게 제안했지만 아직 한 건도 결제되지 않았다.`  
유료: `결제 후보 2명이 월 구독을 결제했고 유료 전환 1건이 발생했다.`

### T4 Re-Judgment
| | 미결제 | 유료 |
|---|---|---|
| Judgment | 조건부 유지 | **viable** |
| Stage | S3 | S3 |
| CU | 유료 유지 | 반복 가능한 사업 |
| Next Q | 같은 유료 질문 | **재판매 `repeat_loop`** |

### T5 Next Action
- 미결제: 유료 제안 한 번 — 이해 가능
- 유료: 재판매 — **양조장 마케팅과 축이 다름**

### Decision Value
| 항목 | 점수 | 이유 |
|---|---|---|
| 판단 명확성 | PARTIAL | 조건부은 맞음. “앱 출시” strength는 원문과 어긋남 |
| 리스크 명확성 | PARTIAL | 유료는 맞음. 관광수요·공급자 축은 안 보임 |
| 검증 명확성 | PASS | 미결제 경로의 유료 1건 |
| 행동 가능성 | PARTIAL | 미결제는 가능. 유료 후 재판매는 빗김 |
| 판단 변화 설명 | PARTIAL | 미결제 유지 가능. 유료→재판매는 설명 어려움 |

---

## Decision Value 요약

| 사업 | 판단 | 리스크 | 검증 | 행동 | 변화 설명 |
|---|---|---|---|---|---|
| RIDM | PASS | PASS | PASS | PARTIAL | PARTIAL |
| LMULM | PASS | PASS | PASS | PASS | PARTIAL |
| 주인집 | PARTIAL | PARTIAL | PASS | PARTIAL | PARTIAL |

---

## P1 cluster (기록, 테스트 미중단)

1. **Question Alignment** — RIDM·주인집 유료 VALIDATED 다음 질문이 `repeat_loop` 재판매. Batch 1 Cluster A와 동일.
2. **Reasoning Quality** — RIDM 강점 “분사·공급망·앱 출시” 일반화. 주인집 “앱이 이미 출시”는 예비 단계 원문과 불일치.

---

## 최종 후보

**HOLD**

- P0 regression 없음. LMULM Pos/Neg/Partial이 Stage·CU·Headline로 구분됨.
- T0/미결제 경로는 CEO가 다음 검증을 고를 수 있음.
- 유료 이후 재판매 질문, 강점 일반화/오인 출시는 Founder 의사결정을 흐릴 수 있으나 Batch 1에서 P1으로 분리한 동일 cluster.
- FIX GATE 조건(0건→viable, DCE 미충족→S4)은 재현되지 않음.

Production `acbbf24` 불변. CPO가 GO / HOLD / FIX GATE를 판정한다.
