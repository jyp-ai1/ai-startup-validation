# S.I. V1 Founder Decision Presentation Gate — MEASUREMENT COMPLETE

**Branch:** `cursor/si-decision-presentation-e648`  
**Prior:** Founder Decision Value **CONDITIONAL PASS** (LMULM STOP headline)  
**Production baseline:** `1690cbf` **UNCHANGED** — no redeploy  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-founder-decision-presentation.json`  
**Presenter:** `apps/web/features/strategic-intelligence/lib/present-si-founder-judgment.ts`  
**Surface:** `SiReviewSurface` uses presenter headline + prose

Analyzer / classifier / CU / Priority / Question / Negative / Conflict / persist SoT는 0-diff vs `1690cbf`.  
`재구매 0 ≠ CONFLICT` 유지.

## RCA

내부 상태와 Founder headline이 어긋난 지점은 Analyzer가 아니라 **표시 계층**이었다.

`SiReviewSurface`가 `SI_VERDICT_LABELS[verdictId]`만 그렸다. `viable`은 S3·S4 모두 `사업화 가능성이 높음`이다. LMULM STOP에서 단계는 S4→S3, CU는 재판매로 재오픈됐는데 headline은 S4와 같았다.

## Fix (Presenter only)

원칙: Founder headline = **현재 validation altitude에서의 verdict 의미**.

| 내부 상태 | Founder headline |
|---|---|
| S4 + viable | 사업화 가능성이 높음 |
| S3 + viable | 출시·초기 매출은 있으나 반복 검증은 아직이다 |
| deferred / insufficient / conditional | 기존 verdict label |

사업명 분기 없음. Analyzer `judgment` 문자열은 그대로 두고, 화면의 첫 문장만 같은 규칙으로 맞춘다.

## Taxonomy

5 calibration + 3 unnamed.

| 축 | PASS | PARTIAL | FAIL | N/A | Rollup |
|---|---|---|---|---|---|
| Positive promotion | 8 | 0 | **0** | 0 | PASS |
| Partial evidence | 8 | 0 | **0** | 0 | PASS |
| Direct conflict downgrade | 8 | 0 | **0** | 0 | PASS |
| S4 → S3 downgrade | 1 | 0 | **0** | 7 | PASS |
| Headline ↔ Stage | 8 | 0 | **0** | 0 | PASS |
| CU ↔ Headline | 8 | 0 | **0** | 0 | PASS |
| Actionability | 8 | 0 | **0** | 0 | PASS |

## States A–D

### A. 정상 승격 S1→S3

주인집 등: `지금은 판단을 보류한다` → `출시·초기 매출은 있으나 반복 검증은 아직이다`. S4 headline과 같지 않다.

### B. 부분 증거

DCE 2/2 payment-only는 S3 미승격, headline이 `가능성이 높음`으로 올라가지 않는다 (#104).

### C. 직접 반증 S3→S1

CONFLICT + `지금은 판단을 보류한다`. leftover 긍정 headline 없음.

### D. 재구매 0 · S4→S3 (핵심)

LMULM:

| | GO | STOP (재구매 0) |
|---|---|---|
| Stage | S4 | S3 |
| Verdict | viable | viable |
| Evidence | VALIDATED | FACT (CONFLICT 아님) |
| CU | 반복 가능 | 재판매 재오픈 |
| Headline | 사업화 가능성이 높음 | 출시·초기 매출은 있으나 반복 검증은 아직이다 |

하향이 headline에서 보인다. `#107` 경로 S3→S4→S3와 직접 반증 S3→S1이 동시에 유지된다.

## Founder Decision Value

이전 PARTIAL(LMULM STOP headline)은 이 Presenter로 닫힌다. 왜 하향인지·무엇이 다시 미검증인지·다음에 무엇을 보는지(CU/DCE/Priority/질문)는 Analyzer가 그대로 제공한다.

## Regression

53 passed. Engine 0-diff vs `1690cbf`.

| Gate | Result |
|---|---|
| #104 | PASS |
| #107 | PASS |
| P0-1 | PASS |
| P0-2 | PASS |
| Accuracy Closure | PASS |
| Negative / Conflict | PASS |
| Alignment Fix | PASS |
| Founder Journey E2E | PASS |

## Production

`1690cbf` 불변. 이 Gate는 측정+Presenter 최소 수정이다. Promotion은 CPO 판단 이후.

## Recommendation

**PASS**

CPO가 CEO 실사용 Founder Test 전환을 승인할 수 있는 상태다. 이 보고는 배포가 아니다.
