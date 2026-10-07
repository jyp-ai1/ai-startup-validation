# Founder Test Batch 1 — Evidence (`0638f77`)

**CPO 1차:** S.I. 전체 **HOLD** · Production 수정 금지  
**PDF 422:** Input 분리. 이 문서에 섞지 않음.  
**엔진 수정:** 없음  
**Source:** `docs/evidence/ALABOM/SI/founder-test-sources/`  
**Dump:** `si-v1-founder-test-go-0638f77.json`  
**LMULM probe:** 2026-10-07T23:05:44Z

CTO 기록만. Fix Gate 여부는 CPO 일괄 판정.

---

## P0 후보 — LMULM Negative Evidence Re-Judgment

**답:** `1차 판매는 있었지만 재판매 등록 0건, 재구매 0건이다.`

| CPO 검증 | 실측 |
|---|---|
| `0건`이 Negative로 분류되었는가 | **아니오.** `classifyFounderEvidence` = **FACT** / `validationStrength`. Analyzer map에는 같은 문장이 CLAIM+FACT(`businessModel`)와 ASSUMPTION(`validationStrength`)로 쪼개짐. **CONFLICT 0건.** INFERENCE: “1차 판매 성공이 곧바로 C2C 반복 거래의 증거는 아니다.” |
| 기존 CU와 동일 축인가 | **부분.** CU는 C2C 반복(`validationStrength`). 분류기는 그 축. 동시에 “1차 판매”가 `businessModel` FACT로 매출 신호가 됨. |
| 기존 positive를 상쇄했는가 | **아니오.** 매출 신호가 남아 헤드라인 근거가 “실제 판매·매출 증거가 있다.” |
| S3/S4 과대 승격 | **S4는 아님** (S3 유지). **verdict는 과대 승격:** `conditionally_viable` → `viable`. |
| CU가 다시 OPEN 되었는가 | CU 문구 **불변** (`cuChanged: false`). 이미 OPEN인 C2C CU가 닫히지도 새로 열리지도 않음. |
| headline/stage가 Evidence에 맞게 내려갔는가 | Stage S3 유지. Headline **상향** “사업화 가능성이 높음”. `evidenceStrengthDelta: **up**`. |

t0: 조건부 S3 · CU “반복 없으면 브랜드” · DCE “없으면 1차 판매 브랜드로 내린다.”  
t1 부정: **viable / 가능성이 높음** · 같은 CU · 같은 재판매 질문.

DCE는 “없으면 내린다”인데 실제로는 올렸다. Founder가 “팔리니까 가도 된다”로 읽을 수 있다.

---

## Cluster A — 유료 다음 재판매 질문

RIDM·주인집: `paid_conversion` VALIDATED → 다음 질문 `repeat_loop` (재판매 등록·재구매).  
RIDM은 AI 컴패니언, 주인집은 양조장 마케팅. Question Alignment 후보. LMULM P0보다 후순위.

## Cluster B — 미결제에서 판단 유지

3/3 intent·미결제: CLAIM/ASSUMPTION, verdict 유지.  
지금은 정상 후보로만 기록. 유지 자체는 FAIL 아님.

## Cluster C — 강점 일반화

RIDM·주인집 t0 whyPossible: “분사·공급망·앱 출시”.  
주인집 원문은 예비·매출액 -. Reasoning / Decision Value 후보.

---

## 사업 1. RIDM AI

| 필드 | 값 |
|---|---|
| 입력 | 원문 9335자 · 투자자 사업계획서 |
| Initial | 조건부 가능 / S3 |
| Reason | 실행 자산·앱 출시 있으나 지불 미확인 |
| Strength | 분사·공급망·앱 출시·구체적 문제 |
| Core Risk / CU | 가치가 실제 지불로 이어지는가 |
| DCE | 최초 유료 1건 + 전후 성과 |
| Question | 유료 제안/받은 돈? `paid_conversion` |
| 답 VALIDATED | 결제 2명·유료 1건 → **viable** · 다음 **재판매** |
| 답 의도 | CLAIM · 조건부 유지 |
| 답 부정 | 유료 없음·제안 안 함 → ASSUMPTION · 조건부 · CU→결제자 분리 |
| Evidence→CU | 유료 성공 시 CU가 반복으로 이동 |
| Evidence→Judgment | 유료면 상향 · 미결제는 유지 |
| Final (부정) | 조건부 S3 |
| Stage | S3 유지 |
| Next | 유료 제안 또는 결제자 이유 |
| 의사결정 가능? | t0 유료 CU는 쓸 수 있음. t1 재판매 질문은 사업을 빗김. |

## 사업 2. LMULM

| 필드 | 값 |
|---|---|
| 입력 | 원문 12937자 · 초기창업패키지 |
| Initial | 조건부 가능 / S3 |
| Reason | 1차 판매 가능 신호 vs C2C 미검증 |
| Strength | 실행 자산·앱 출시·구체적 문제 (일반화) |
| Core Risk / CU | C2C 재판매가 반복되는가. 없으면 브랜드 |
| DCE | 등록·거래·재구매. 있으면 올리고 없으면 브랜드로 내린다 |
| Question | 두 번째 행동? `repeat_loop` |
| 답 VALIDATED | 35명/12건 → 조건부 **S4** · CU→세그먼트 |
| 답 의도 | CLAIM · 조건부 유지 |
| 답 부정 | **FACT** · **viable / 가능성이 높음** · delta **up** · CU 불변 |
| Evidence→CU | 부정에도 CU 그대로 OPEN |
| Evidence→Judgment | 0건인데 상향. DCE와 반대 |
| Final (부정) | viable S3 |
| Stage | S3 (S4 아님) |
| Next | 같은 재판매 질문 + 헤드라인은 가도 된다 |
| 의사결정 가능? | **위험.** Founder가 플랫폼 실패를 사업화 성공으로 읽을 수 있음. |

## 사업 3. 주인집

| 필드 | 값 |
|---|---|
| 입력 | 원문 4787자 · 예비관광벤처 · 酒人集 · 매출 - |
| Initial | 조건부 가능 / S3 |
| Reason | 문제 인식 + “앱 출시” · 유료 미확인 |
| Strength | 제품/앱 출시 · 구체적 문제 |
| Core Risk / CU | 유료 전환 (양조장 대표 미분리) |
| DCE | 최초 유료 1건 + 전후 |
| Question | 유료 제안/받은 돈? |
| 답 VALIDATED | viable · 다음 **재판매** |
| 답 의도 | CLAIM · 유지 |
| 답 부정 | 양조장 제안·결제 0 · ASSUMPTION · 유지 |
| Evidence→CU | 미결제 시 CU 유지 |
| Evidence→Judgment | 미결제 유지 · 유료면 상향 |
| Final (부정) | 조건부 S3 |
| Stage | S3 |
| Next | 같은 유료 질문 |
| 의사결정 가능? | 미결제 유지는 쓸 수 있음. 앱 출시·재판매 질문은 사업을 빗김. |

---

## Batch cluster (Fix 후보, 아직 Gate 아님)

1. **Negative Evidence → Re-Judgment (P0)** — LMULM 0건 = FACT, CONFLICT 아님, headline UP, CU/Judgment 불일치
2. **DCE → Question** — 유료 다음 재판매 (RIDM · 주인집)
3. **Reasoning** — 강점 일반화 (RIDM · 주인집)
4. 미결제 유지 — 정상 후보

Production `0638f77` 불변. CPO가 GO / HOLD / FIX GATE를 일괄 판정한다.
