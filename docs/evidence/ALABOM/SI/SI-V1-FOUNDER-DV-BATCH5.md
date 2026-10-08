# Founder Decision Value Batch 5 — P1-C Pattern Confirmation

**목적:** Batch 4 HOLD cluster가 구조적인지 확인한다.  
`Quantified DCE 충족 → Evidence delta up → Judgment/질문 불변`

**Production:** `671005f` 불변 · Analyzer `c0b9bc3` 불변  
**엔진 / Prompt / Question Engine / Analyzer:** 수정 없음  
**PR #119 / #120:** Draft 유지 · Merge 금지  
**P1-A Question Alignment:** CLOSED  
**P1-B (`MVP 런칭 → 이미 출시`):** Backlog 유지  
**사업:** 클리닉플로우 · 핏브릿지 · 동네장터알림 (RIDM/주인집/LMULM 제외)  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-founder-dv-batch5-671005f.json`  
**측정 시각:** 2026-10-08T00:44:39.260Z

이번 Batch는 코드가 아니라 `DCE fulfillment → Re-judgment promotion` 경계를 고정한다.  
P1-C Fix Gate는 여기서 열지 않는다. CPO가 Full DCE 재현을 보고 개방 여부를 결정한다.

---

## 측정 설계

| 경로 | Founder 답 | 기대 |
|---|---|---|
| A. Semantic Full | 결제 + 지표 전후. 단위는 `2곳` (자연 한국어) | 사람 기준으로 DCE 완전 충족. 판단이 움직이는가 |
| A. Token Full | 같은 내용 + `유료 전환 N건` | 엔진 토큰(`명\|건`)이 붙으면 판단이 움직이는가 |
| B. Partial Pay | 결제만 (`N건`). 지표 없음 | 전체 DCE fulfilled 금지. S3/S4 금지. 남은 축이 CU |
| B. Partial Stake | 지표만. 결제 0건 | 승격 금지. 결제가 CU로 남아야 함 |
| C. ASSUMPTION / INTENT | 생각·제안·0건 | VALIDATED 금지. 판단 상승 금지 |

Semantic Full은 Batch 4와 같은 문장이다. Token Full은 엔진이 `isQuantifiedPayment`에서 요구하는 `명|건`만 추가한다.

---

## 핵심 결과

```text
Semantic Full (2곳 + 지표)
→ FACT · delta up
→ S1 judgment_deferred
→ 동일 질문
→ 클리닉 · 핏브릿지 2/2 재현
```

CPO 조건:

> DCE full fulfillment → delta up → S1 유지 → 동일 질문이 재현되면 **P1-C Fix Gate 후보를 확정**한다.

**P1-C Fix Gate 후보 확정.** 개방은 CPO.

같은 내용에 `2건`만 붙이면 반대가 된다.

```text
Token Full (2건 + 지표)
→ VALIDATED · delta up
→ viable S3
→ CU = 다음 고객/기간
→ 다음 질문 generic (재판매 아님)
```

클러스터는 일회성 fixture가 아니다. **구조적이고 토큰 경계에 묶여 있다.**

Founder가 DCE를 말로 다 채워도 `곳`은 revenue/VALIDATED로 세지 않는다.  
`명|건`이 있어야 `hasRevenue`가 켜지고 `dceStakeOpen` 경로를 빠져나간다.

---

## A. Full DCE

### 클리닉플로우

DCE: 유료 파일럿 1건과 no-show 전후 비교. 지표가 줄면 조건부 가능 이상으로 올리고, 지불만 있거나 지표가 그대로면 보류.

| 필드 | T0 | Semantic Full | Token Full |
|---|---|---|---|
| Founder Answer | — | `결제 후보 2곳이 월 구독을 결제했고 no-show가 22%에서 12%로 줄었다.` | `…유료 전환 2건이 발생했으며 no-show가 22%에서 12%로 줄었다.` |
| Evidence class | — | FACT | VALIDATED |
| Evidence delta | — | up | up |
| DCE fulfillment (사람) | OPEN | **완전** (결제+지표) | **완전** |
| DCE fulfillment (엔진) | OPEN | 미충족 (`2곳` ≠ `명\|건`) | 충족 (`2건` + stake) |
| Judgment | `judgment_deferred` | `judgment_deferred` | `viable` |
| Stage | S1 | S1 | S3 |
| CU | 유료 후 no-show가 주는가. 지불만으로는 확정 금지 | **동일** | 다음 고객/기간에도 같은 방향인가 |
| Validation Priority | 가장 가까운 후보에 유료 제안 + no-show 전후 | **동일** | 다음 고객 또는 다음 기간에서 반복 확인 |
| Next Question | no-show 전후 + 결제 한 건 | **동일** | generic (`실제 행동 증거가 필요합니다`) |
| whyAsking | 유료 파일럿 1건과 no-show 전후 | **동일** | 다음 고객 또는 다음 기간에서 같은 성과가 유지되는지 |
| 재판매 | 없음 | 없음 | 없음 |
| Decision Value | T0은 다음 행동이 분명 | **FAIL** — 완전 충족인데 질문 반복 | 판단은 움직임. 다음 질문은 Pattern A generic |

### 핏브릿지

DCE: 유료 파일럿 1건과 반품률 전후 비교. 지불만이면 보류.

| 필드 | T0 | Semantic Full | Token Full |
|---|---|---|---|
| Founder Answer | — | `결제 후보 2곳이 위젯을 결제했고 반품률이 38%에서 29%로 줄었다.` | `…유료 전환 2건이 발생했으며 반품률이 38%에서 29%로 줄었다.` |
| Evidence class | — | FACT | VALIDATED |
| Evidence delta | — | up | up |
| DCE fulfillment (사람) | OPEN | **완전** | **완전** |
| DCE fulfillment (엔진) | OPEN | 미충족 (`2곳`) | 충족 (`2건` + stake) |
| Judgment | `judgment_deferred` | `judgment_deferred` | `viable` |
| Stage | S1 | S1 | S3 |
| CU | 유료 후 반품률이 주는가 | **동일** | 다음 고객/기간 |
| Next Question | 반품률 전후 + 결제 한 건 | **동일** | generic |
| whyAsking | 유료 파일럿 1건과 반품률 전후 | **동일** | 다음 기간 성과 유지 |
| 재판매 | 없음 | 없음 | 없음 |
| Decision Value | T0 명확 | **FAIL** — P1-C 재현 | 판단 이동. 다음 질문 generic |

두 사업의 Semantic Full은 Batch 4와 **같은 문장, 같은 정지**다. 신규 현상 아님. 반복성 확정.

---

## B. Partial DCE

기대: 전체 DCE fulfilled 금지 · S3/S4 과도 승격 금지 · 미충족 조건은 CU · 다음 질문은 남은 검증축.

### 클리닉 · 핏브릿지 — Partial Pay (`2건`, 지표 없음)

| 필드 | 클리닉 | 핏브릿지 |
|---|---|---|
| Founder Answer | `결제 후보 2곳이 월 구독을 결제했고 유료 전환 2건이 발생했다.` | `결제 후보 2곳이 위젯을 결제했고 유료 전환 2건이 발생했다.` |
| Evidence class | VALIDATED | VALIDATED |
| Evidence delta | up | up |
| DCE fulfillment | 부분 (지불만) | 부분 |
| Judgment | `judgment_deferred` | `judgment_deferred` |
| Stage | **S1** (S3/S4 아님) | **S1** |
| CU 변화 | 예 — `유료 전환 이후 no-show가 줄었는가` | 예 — `유료 전환 이후 반품률이 줄었는가` |
| Priority 변화 | 예 — 이미 돈을 낸 후보에서 전후를 잰다 | 동일 |
| Next Question | T0과 **동일** (paid+stake) | 동일 |
| whyAsking | 이미 결제한 후보의 전후 비교 | 동일 |
| Decision Value | **PASS** — #104 유지. 지불만으로 승격하지 않음 | PASS |

지불만이면 Headline은 보류를 유지하고, CU만 “유료 이후 지표”로 좁힌다. 전체 DCE를 VALIDATED로 닫지 않는다.

### 클리닉 · 핏브릿지 — Partial Stake (지표만, 결제 0)

| 필드 | 클리닉 | 핏브릿지 |
|---|---|---|
| Founder Answer | `no-show가 22%에서 12%로 줄었지만 아직 한 건도 결제되지 않았다.` | `반품률이 38%에서 29%로 줄었지만 아직 한 건도 결제되지 않았다.` |
| Evidence class | ASSUMPTION | ASSUMPTION |
| Evidence delta | **up** | **up** |
| DCE fulfillment | 부분 (지표만) | 부분 |
| Judgment / Stage | `judgment_deferred` S1 | 동일 |
| CU / Question | T0과 동일 | 동일 |
| Decision Value | 승격 없음은 정상. `delta up`은 판단 상승이 아님 | 동일 |

지표만으로는 S3가 되지 않는다. 결제가 CU로 남는다.  
다만 Evidence `delta`는 rank/FACT 개수로 `up`이 된다. Headline은 그대로다.

---

## C. ASSUMPTION / INTENT

기대: VALIDATED 금지 · `delta up`이 판단 상승 신호로 쓰이면 안 됨 · 근거 없는 판단 상승 금지.

| 사업 | Answer | class | delta | Judgment | Stage | 질문 |
|---|---|---|---|---|---|---|
| 클리닉 | `유료 제안을 생각하고 있지만 아직 아무도 결제하지 않았다.` | CLAIM | unchanged | deferred | S1 | 동일 |
| 핏브릿지 | `브랜드 3곳에 제안했지만 아직 한 건도 결제되지 않았다.` | ASSUMPTION | **up** | deferred | S1 | 동일 |
| 동네장터 | `유료 제안을 생각하고 있지만 아직 아무도 결제하지 않았다.` | CLAIM | unchanged | deferred | S1 | 동일 |

VALIDATED 승격 **0**. Verdict/Stage 상승 **0**.  
핏브릿지 미결제의 `delta up`은 Batch 4 이슈 2 재현이다. Headline은 오르지 않았다.  
`reconcileEvidenceStrengthDelta`는 verdict가 아니라 evidence rank로 `up`을 줄 수 있다.

---

## 동네장터알림 — 1건 → viable

DCE 원문:

> 최초 유료 거래 또는 유료 파일럿 한 건과 **그 전후 성과**. 이 증거가 있으면 판단을 조건부 가능 이상으로 올리고, 없으면 보류를 유지한다.

| 필드 | T0 | Semantic / Partial Pay (1건) | Token Full (2건+게시 반복) |
|---|---|---|---|
| Founder Answer | — | `파일럿 사장 1~2명이 월 구독을 결제했고 유료 전환 1건이 발생했다.` | `…2건이 발생했으며 주간 게시가 반복됐다.` |
| Evidence class | — | VALIDATED | VALIDATED |
| Evidence delta | — | up | up |
| DCE (사람) | OPEN | **부분** — 결제만. 전후 성과 없음 | 결제 + 운영 반복. KPI 전후는 없음 |
| DCE (엔진) | OPEN | **충족** — `명\|건` 결제 = revenue. `quantified_problem` 없음 → `dceStakeOpen` false | 충족 |
| Judgment | `judgment_deferred` | **viable** | viable |
| Stage | S1 | **S3** | S3 |
| CU 변화 | — | 반복 가능한 사업으로 이어지는가 | 동일 |
| Next Question | 유료 제안/받은 돈 한 건 | 구독 유지·재결제 | 구독 유지·재결제 |
| whyAsking | 유료 한 건과 전후 성과 | 구독 유지·재결제가 반복되는지 | 동일 |
| 재판매 | 없음 | 없음 | 없음 |

`1건 결제 → S3 viable`은 **엔진 조건상 정당하다.**  
동네장터 원문에는 클리닉/핏브릿지형 수치화 KPI가 없어 `dceStakeOpen`이 열리지 않는다.  
`hasRevenue && !dceStakeOpen`이면 `decideStage`는 S3, `decideVerdict`는 viable이다.

DCE **문장**은 “전후 성과”를 같이 요구한다. 엔진은 그 절을 평가하지 않는다.  
따라서 1건→viable는 P0 overpromotion이 아니다. **DCE 텍스트 ↔ 엔진 조건 불일치**다.

Partial Pay와 Semantic Full이 같은 승격인 이유: 둘 다 `명|건` 결제이고, 막을 stake DCE가 없다.

---

## 경계 고정 (엔진, 수정 없음)

읽기 전용. Analyzer rewrite 아님.

```text
isQuantifiedPayment / classify VALIDATED
  = /\d+\s*(명|건)/  AND  (결제했|지불했|유료로 썼/사용/전환)

dceStakeOpen
  = quantified_problem AND NOT stake_improved

decideVerdict
  if dceStakeOpen → judgment_deferred
  if hasRevenue && !dceStakeOpen → viable

decideStage
  paymentWithoutStake = revenue AND dceStakeOpen → S3 금지
  revenue AND NOT paymentWithoutStake → S3

delta up
  = evidence rank 증가. verdict 상승이 아님
```

| 사람 답 | 엔진이 보는 것 | 결과 |
|---|---|---|
| `2곳` 결제 + 지표 하락 | FACT. revenue 없음 | S1 + 동일 질문 |
| `2건` 결제 + 지표 하락 | VALIDATED + revenue + stake_improved | viable S3 |
| `2건` 결제만 | VALIDATED + revenue + dceStakeOpen | S1. CU만 지표로 이동 |
| 지표만 / 0건 | ASSUMPTION. revenue 없음 | S1 |
| 생각·아직 | CLAIM. unchanged | S1 |
| 동네장터 `1건` 결제 | VALIDATED + revenue. stake DCE 없음 | viable S3 |

---

## Decision Value 요약

| 경로 | 클리닉 | 핏브릿지 | 동네장터 |
|---|---|---|---|
| T0 원문 / 리스크 / 질문=DCE | PASS | PASS | PASS |
| A Semantic Full → 판단 이동 | **FAIL** P1-C | **FAIL** P1-C | 해당 없음 (토큰 결제) |
| A Token Full → 판단 이동 | PASS (S3) | PASS (S3) | PASS (S3) |
| B Partial Pay → 과도 승격 없음 | PASS (#104) | PASS | N/A — 엔진은 1건을 Full로 봄 |
| B Partial Stake → 보류 | PASS | PASS | — |
| C ASSUMPTION → VALIDATED 없음 | PASS | PASS | PASS |
| C `delta up` ≠ 판단 상승 | n/a (unchanged) | **주의** delta up / verdict 고정 | n/a |
| 다음 질문 재판매 이탈 | 없음 | 없음 | 없음 |
| Token Full 다음 질문 | generic PARTIAL | generic PARTIAL | 구독 유지 PASS |

---

## STOP 점검

| STOP | 결과 |
|---|---|
| P0 overpromotion 재발 | 없음. 클리닉/핏 Partial Pay = S1 |
| ASSUMPTION → VALIDATED | 없음 |
| DCE 미충족인데 S4 | 없음. Partial/Assumption ≠ S4 |
| P0-1 / P0-2 / #104 / #107 regression | 측정 경로에서 재발 없음. Partial Pay = #104 유지 |
| P1-A Question Alignment regression | 세 사업 모두 재판매 질문 없음 |

`si-negative-rejudgment` · `si-evidence-reconciliation`는 이 Batch에서 코드 변경이 없어 기준선 유지.

---

## 고정 유지

- Production `671005f`
- Analyzer `c0b9bc3`
- PR #119 / #120 Draft
- P1-A CLOSED
- P1-B Backlog
- Analyzer / Presenter / Question Engine 0-diff

---

## 판정

**P1-C Fix Gate 후보 확정. Fix Gate는 아직 열지 않음.**

근거:

1. Semantic Full (`2곳` + 수치화 지표)이 클리닉·핏브릿지에서 다시 `delta up → S1 → 동일 질문`이다.
2. 원인은 사업별 DCE 문구가 아니라 공통 토큰 규칙이다. `곳`은 사람에겐 유료 1건이고, 엔진에겐 revenue가 아니다.
3. Token Full은 승격한다. Evidence → Re-judgment 연결 전체가 끊긴 것은 아니다.
4. Partial Pay는 올바르게 S1을 유지한다 (#104).
5. 동네장터 1건→viable는 같은 P1-C가 아니다. stake DCE가 없는 사업에서 payment-only = Full이다.

CPO가 개방하면 그때 Analyzer/classifier 토큰 경계를 고친다. 이번 단계에서는 고치지 않는다.
