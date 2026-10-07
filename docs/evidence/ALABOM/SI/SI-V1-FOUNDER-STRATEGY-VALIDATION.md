# S.I. V1 Founder Strategy Validation Gate — MEASUREMENT COMPLETE

**Branch:** `cursor/si-founder-strategy-validation-e648`  
**Production baseline:** `1690cbf` **UNCHANGED** — no redeploy, no Accuracy/Fix  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-founder-strategy-validation.json`  
**Harness:** `apps/web/features/strategic-intelligence/lib/__tests__/si-founder-strategy-validation.test.ts`  
**금지:** Analyzer · Evidence classification · Question Generator · persist SoT · Auth · 사업명 분기 · Accuracy Fix · Production 변경

Founder Journey가 S.I. 루프를 **제품 경험**으로 연결하는지 측정했다. Engine 0-diff vs `1690cbf`.

```text
사업 입력 → S.I. 판단 → Critical Unknown → Decision-Changing Evidence
  → AI PM 질문 → Founder 답변 → Evidence 업데이트 → S.I. 재판단
  → 새로운 Critical Unknown / Validation Priority
```

질문을 잘 생성하는지가 목적이 아니다. 핵심은 **답변이 Evidence가 되고, Evidence가 판단을 바꾸는가**.

## Businesses

Calibration 5: 주인집 · LMULM · RIDM AI · ClinicFlow · FitBridge  
Unnamed 6 (fresh holdout, 사업명 없음): salon no-show 15% · photo mismatch 17% · queue load 28% · claim 불일치 11% · handoff no-metric · care job

총 11 × 시나리오 A/B/C.

## Taxonomy

| 축 | PASS | PARTIAL | FAIL | Rollup |
|---|---|---|---|---|
| Core Loop | 11 | 0 | **0** | PASS |
| Positive | 11 | 0 | **0** | PASS |
| Partial | 11 | 0 | **0** | PASS |
| Negative | 11 | 0 | **0** | PASS |
| Conflict | 11 | 0 | **0** | PASS |
| CU | 11 | 0 | **0** | PASS |
| Question | 5 | 6 | **0** | PARTIAL |
| Founder Outcome | 11 | 0 | **0** | PASS |

## Founder-visible surfaces (①–⑥)

| Surface | PASS | PARTIAL | FAIL |
|---|---|---|---|
| ① Executive Judgment | 11 | 0 | 0 |
| ② Why (Evidence classed) | 11 | 0 | 0 |
| ③ Critical Unknown | 11 | 0 | 0 |
| ④ Decision-Changing Evidence | 11 | 0 | 0 |
| ⑤ Validation Question | 5 | 6 | 0 |
| ⑥ Re-Judgment | 11 | 0 | 0 |

내부 ID / score / targetGap Founder 화면 노출: **0**.  
`그렇다` / `할 예정이다` / `계획이다` / intent → VALIDATED: **아님** (CLAIM 또는 FACT).

## Scenarios

### A — 긍정 증거

검증 증거가 들어오면 판단이 승격되고 이전 CU가 닫히며 새 CU·질문이 열린다.

| Business | Hop | Next CU moved |
|---|---|---|
| 주인집 | S1→S3 | 결제자 → 세그먼트 |
| LMULM | S3→S4 | 재판매 → 반복 (#107) |
| RIDM AI | S1→S3 | 결제자·직무 → 다음 미검증 |
| ClinicFlow | S1→S3 | no-show DCE 2/2 → 다음 고객/기간 |
| FitBridge | S1→S3 | 반품 DCE 2/2 → 다음 고객/기간 |
| unnamed ×6 | S0/S1→S3 | CU 이동 11/11 |

### B — 부분 증거 (#104)

DCE 2/2(지불+지표)에서 결제만 넣으면 S3/S4로 오승격되지 않는다.

- ClinicFlow / FitBridge / salon / photo / queue / claim: payment-only **off S3**
- 주인집 / RIDM / handoff / care: DCE가 2/2 지표가 아님. 결제 답이 매출 신호로 읽히면 S3로 갈 수 있음 — #104 범위 밖. Accuracy Closure와 동일.

Intent / plan / yes는 VALIDATED가 되지 않는다.

### C — 부정 / 직접 반증

승격 후 반증 → 판단 하향. 직접 부인 → `CONFLICT`. leftover 긍정 headline **0**. 11/11 CONFLICT.

예: 주인집 S3 `가능성이 높음` → 결제자 거절 → S1 `판단을 보류한다`. 이전 VALIDATED가 무조건 유지되지 않고 CONFLICT가 같이 보인다.

## Question PARTIAL (6)

ClinicFlow · FitBridge · salon · photo · queue · claim.

승격 후 CU가 `다음 고객/기간`이면 질문이 generic으로 떨어진다. **Accuracy Closure Pattern A**와 동일. whyAsking / CU surface는 다음 고객·기간을 복구한다. Founder Outcome은 11 PASS. Obstruction FAIL 0. Fix Gate 열지 않음.

## Question ≠ Progress · CU ≠ Question · Answer ≠ Validation

- 질문 수행만으로 progress로 치지 않음. Progress = Evidence class / 판단 변화.
- 질문 텍스트 ≠ CU 복사. CU는 미검증 문제, 질문은 검증 수단.
- `그렇다` = FACT, `할 예정이다` / intent = CLAIM. 자동 VALIDATED 없음.

## Hops

| Hop | Cases |
|---|---|
| Positive upgrade → S3/S4 | 11/11 |
| #104 payment-only stays off S3 (2/2 DCE) | 6/6 |
| Negative downgrade | 11/11 |
| Direct CONFLICT | 11/11 |
| CU moved after upgrade | 11/11 |

## Regression

78 passed. Engine 0-diff vs `1690cbf`.

| Gate | Result |
|---|---|
| #104 Partial DCE | PASS |
| #107 2/2 → next CU | PASS |
| P0-1 Recovery confirm | PASS |
| P0-2 Question loop | PASS |
| Accuracy Closure | PASS |
| Alignment Fix / Holdout | PASS |
| Negative / Conflict | PASS |
| Evidence reconciliation | PASS |
| Founder Journey E2E | PASS |
| Integration (gap-loop ignore) | PASS |

## Production

| Check | Result |
|---|---|
| Production SHA | `1690cbf` 불변 |
| Engine diff vs `1690cbf` | **0** |
| Redeploy | 금지 · 하지 않음 |
| Accuracy / Fix | 금지 · 하지 않음 |

## STOP

해당 없음. 루프 구조 연결 · invariant 회귀 · 새 SoT · 사업명 하드코딩 · Auth · Production 오염 · Founder/내부 의미 불일치 없음.

## Recommendation

**CONDITIONAL PASS**

Core Loop / Positive / Partial / Negative / Conflict / CU / Founder Outcome = PASS.  
Question = PARTIAL — 이미 CLOSED된 Pattern A generic next-CU ask. 신규 결함 아님. CPO가 Accuracy Closure에서 허용한 범위.

CPO가 전략 관점에서 2차 판단한다. Fix / 재배포는 이 보고 이후 CPO 판단에 따른다.
