# Founder Decision Value Accuracy Batch — MEASUREMENT COMPLETE

**CPO Gate:** OPEN · 측정 전용 · Fix 없음  
**Production:** `5cd89dc` (#128 CLOSED)  
**#127:** Freeze `3015c9a` · **#129:** Freeze `44fdb33`  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-decision-value-batch.json`  
**Referee:** `score-si-decision-value-batch.ts` — Analyzer/Presenter/self-scorer import 없음

#128을 닫은 뒤, 같은 Production 나무에서 **정확성 + 전략 정렬**을 5층으로 측정한다. 코드는 고치지 않았다.

## 5층

| 층 | 질문 |
|---|---|
| 1 Accuracy | 상태를 정직하게 갱신했는가 |
| 2 Judgment | 판단이 이유와 같이 움직이는가 |
| 3 Validation | spoken 질문이 현재 DCE를 찾는가 |
| 4 Decision Value | Founder가 지금 뭘 확인해야 하는지 듣는가 |
| 5 Strategy | AI PM이 현재 CU를 실행하고 다른 축으로 빠지지 않는가 |

## 5시나리오

| # | 시나리오 | 1 | 2 | 3 | 4 | 5 | 종합 |
|---|---|---|---|---|---|---|---|
| 1 | 검수 누락 t0 | PASS | PASS | PASS | PASS | PASS | **PASS** |
| 2 | 2/2 → next-period CU | PASS | PASS | **PARTIAL** | **PARTIAL** | PASS | **PARTIAL** |
| 3 | 다음 기간 유지 | PASS | PASS | PASS | PASS | PASS | **PASS** |
| 4 | 다음 기간 악화 | PASS | PASS | PASS | PASS | PASS | **PASS** |
| 5 | C2C 재판매 t0 | PASS | PASS | PASS | PASS | PASS | **PASS** |

실패군: **1** (2/2 spoken question generic). 새 FAIL 없음.

## 실제 대화 — Decision Value 분기점

### 2/2 후 (PARTIAL)

| | 실제 |
|---|---|
| 판단 | `사업화 가능성이 높음` · viable S3 |
| CU | `다음 고객이나 다음 기간에도 같은 방향으로 이어지는가` |
| DCE | `유지되면 판단을 유지하고, 1회성이면 내린다` |
| Priority | `다음 고객 또는 다음 기간에서 같은 성과가 반복되는지 한 번 확인한다` |
| 질문 | `지금 판단을 바꾸려면 실제 행동 증거가 필요합니다` |
| whyAsking | `다음 고객 또는 다음 기간에서 같은 성과가 유지되는지` |

정확성/판단/전략은 맞다. Founder가 **질문 문장만** 보면 “다음 기간 유지율”을 듣지 못한다. 이것이 Pattern A leftover이며, #128 FAIL가 아니다.

CPO 전략 질문: **“이 질문이 Founder의 사업 판단을 더 정확하게 만들었나?”**  
→ CU/DCE/Priority는 예. spoken 질문만은 아니오.

### 비교 — t0와 held는 Decision Value PASS

t0 질문: `누락 수치를 실제로 얼마나 줄였고, 그 결과로 결제 후보가 돈을 낸 사례가 있습니까?`  
→ Founder가 확인할 증거가 들린다.

held 질문: `이미 구매하거나 결제한 고객 중에서, 두 번째 행동이나 반복 사용이 일어난 경우가 있습니까?`  
→ 새 CU(반복 가능)와 맞다. 재판매로 빠지지 않는다.

C2C t0 질문: `재판매 등록·거래 체결·재구매`  
→ 그 사업의 CU다. 병원 유지율로 빠지지 않는다.

악화: deferred S1 · CONFLICT · down · 누락 전후를 다시 묻는다.

## 실패 패턴

| id | 층 | 의미 |
|---|---|---|
| `spoken_generic_after_promotion` | Validation / Decision Value | 승격 후 CU는 next-period인데 spoken 질문은 generic |

Fix Gate는 여기서 열지 않는다. CPO가 이 PARTIAL을 다음 개선 대상으로 볼지 판단한다.

## 미변경

Analyzer · Presenter · Question Engine · Auth · SoT · `#127` · `#128` 코드 · `#129`

## Production

UNCHANGED `5cd89dc`. CEO Founder Test 미요청.
