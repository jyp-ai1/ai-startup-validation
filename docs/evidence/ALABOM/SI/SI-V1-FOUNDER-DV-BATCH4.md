# Founder Decision Value Batch 4 — 신규 사업 (`671005f`)

**목적:** RIDM/주인집/LMULM을 반복하지 않고, 새 사업으로 판단→질문→답변→재판단→다음 행동 전체를 본다.  
**Production:** `671005f` · Analyzer `c0b9bc3`  
**엔진 수정:** 없음 · P1-A 재측정 없음 · P1-B 미수정  
**사업:** 클리닉플로우 · 핏브릿지 · 동네장터알림  
**Dump:** `si-v1-founder-dv-batch4-671005f.json`

P1-A는 CLOSED. 아래는 Decision Value이지 Question Alignment Gate가 아니다.

---

## 1. 클리닉플로우

원문: 1차 병원 no-show 15–25% · EMR 연동 B2B SaaS · 파일럿 가설. 출시 완료 문장 없음.

### T0
- Judgment: `judgment_deferred` S1 — 원문(미검증 파일럿)과 일치
- Strength: 구체적 문제. **이미 출시 없음** (P1-B 신규 증거 없음)
- CU: 유료 사용 후 no-show가 실제로 주는가. 지불만으로는 확정 금지
- DCE: 유료 1건 + no-show 전후 (+ EMR 대비)
- Question: no-show 전후 + 결제 한 건. 재판매 없음
- 다음 행동: 가장 가까운 병원에 유료 제안하고 no-show를 잰다 — 이해 가능

### 답변
- 미결제 원문: `가장 가까운 병원에 제안했지만 아직 한 건도 결제되지 않았다.` → ASSUMPTION · unchanged · 판단 유지
- 유료+지표 원문: `결제 후보 2곳이 월 구독을 결제했고 no-show가 22%에서 12%로 줄었다.` → FACT · delta up

### 재판단
유료+no-show 전후는 DCE를 충족한다. 그러나 Judgment는 **S1 `judgment_deferred` 고정**, CU/질문도 T0과 동일하다. Founder는 같은 질문을 다시 받는다.

### Decision Value
| 항목 | 점수 | 이유 |
|---|---|---|
| 원문 충실 | PASS | 보류. 출시 과장 없음 |
| 리스크 유용 | PASS | no-show + 지불 |
| 질문=DCE | PASS | 전후 수치와 한 건 |
| 판단 변화 | **FAIL** | DCE 충족인데 판단/다음 질문이 안 움직임 |
| 다음 행동 | PARTIAL | T0/미결제는 가능. 유료 후 같은 질문 |

---

## 2. 핏브릿지

원문: D2C 반품률 30–40% · 사이즈 위젯 · True Fit 대비. 출시 완료 없음.

### T0
- `judgment_deferred` S1
- CU/DCE/질문: 반품률 전후 + 결제. 재판매 없음
- Strength에 출시 과장 없음

### 답변
- 미결제: `브랜드 3곳에 제안했지만 아직 한 건도 결제되지 않았다.` → ASSUMPTION · **delta up**
- 유료+지표: `결제 후보 2곳이 위젯을 결제했고 반품률이 38%에서 29%로 줄었다.` → FACT · delta up

### 재판단
유료+반품률 전후에도 **S1 `judgment_deferred` 고정**. 질문 동일.

미결제에 delta up이 붙으면 Founder는 “제안만 했는데 증거가 강해졌다”로 오해할 수 있다.

### Decision Value
| 항목 | 점수 | 이유 |
|---|---|---|
| 원문 충실 | PASS | 보류. 반품 축 유지 |
| 리스크 유용 | PASS | 반품률 + 지불 |
| 질문=DCE | PASS | True Fit 대비 전후 |
| 판단 변화 | **FAIL** | DCE 충족인데 고정. 미결제 delta up |
| 다음 행동 | PARTIAL | T0은 가능. 유료 후 같은 질문 |

---

## 3. 동네장터알림

원문: 소상공인 SNS 대행 구독 · 파일럿 가설. 수치화 KPI는 유지율 가설 수준.

### T0
- `judgment_deferred` S1
- CU: 가치가 지불로 이어지는가
- Question: 일반 유료 제안. 재판매 없음
- 출시 Strength 없음

### 답변
- 미결제: ASSUMPTION · unchanged · 보류 유지
- 유료: `파일럿 사장 2명이 월 구독을 결제했고 유료 전환 1건이 발생했다.` → VALIDATED · **viable S3**
- 다음 질문: 구독 유지·재결제 (P1-A 축 유지)

### 재판단
1건 유료로 `viable`까지 오른다. DCE는 “유료 + 전후 성과”인데 답은 결제만 있다. 다음 행동은 구독 반복이라 Founder는 할 일을 안다.

### Decision Value
| 항목 | 점수 | 이유 |
|---|---|---|
| 원문 충실 | PASS | 보류에서 시작 |
| 리스크 유용 | PASS | 지불이 맞음 |
| 질문=DCE | PASS | 유료 한 건 |
| 판단 변화 | PARTIAL | 움직임은 있다. 1건→viable는 성과 없이 과할 수 있음 |
| 다음 행동 | PASS | 구독 유지 |

---

## 5항목 요약

| 검사 | 클리닉 | 핏브릿지 | 동네장터 |
|---|---|---|---|
| 1 원문 충실 | PASS | PASS | PASS |
| 2 리스크 유용 | PASS | PASS | PASS |
| 3 질문=DCE | PASS | PASS | PASS |
| 4 과장 없는 변화 | FAIL | FAIL | PARTIAL |
| 5 다음 행동 | PARTIAL | PARTIAL | PASS |

P1-A 축 이탈(재판매)는 세 사업 모두 **없음**.  
P1-B 출시 승격은 세 사업 모두 **없음** — Backlog 유지.

---

## 새 cluster (기록, Fix Gate 비개방)

**Quantified DCE 충족 → 재판단 정지**

클리닉·핏브릿지에서 결제+지표 전후가 FACT로 들어갔는데 CU/Headline/질문이 T0에 남는다.  
동네장터는 결제만으로 viable가 된다.

같은 Analyzer에서:

- 일반 유료 CU → VALIDATED → 판단 이동
- 수치화 stake CU → FACT → 판단 정지

P0(Negative→viable, Partial→S4)는 이 Batch에서 재발하지 않았다.

---

## 최종 후보

**HOLD**

- T0는 Founder가 다음 검증을 고를 수 있다.
- P1-A CLOSED 상태를 깨는 재판매 이탈은 없다.
- P1-B 신규 증거 없음.
- 클리닉/핏브릿지 재판단 정지는 Decision Value를 깎지만, 이번 지시는 측정이다. Analyzer rewrite는 열지 않는다.

Production `671005f` 불변. PR #119 / #120 Draft 유지.
