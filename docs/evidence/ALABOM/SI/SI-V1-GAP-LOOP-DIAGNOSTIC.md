# S.I. vs Gap Loop — Diagnostic Gate

**Branch:** `cursor/si-gap-loop-diagnostic-e648`  
**Base:** PR #95 Integration Gate PASS  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-gap-loop-diagnostic.json`  
**목적:** 교체가 아니라 교체 여부 증거.  
**금지:** `decideNextQuestionFromReview` 수정 · Gap Loop 삭제 · 엔진 리팩터 · UI · 새 SoT · Production · 사업별 예외

엔진은 black box로 호출만 했다. 제품 코드는 바꾸지 않았다.

## 분류

| 코드 | 의미 |
|---|---|
| A | 기존 엔진과 S.I.가 동일 방향 |
| B | 기존 엔진이 비효율적이지만 S.I.를 방해하지 않음 |
| C | 기존 엔진이 S.I. 판단과 충돌 |
| D | 기존 엔진이 S.I. 검증을 불가능하게 함 |

**C/D가 실제로 존재해야만 교체한다.**

## 5사업 결과

| 사업 | S.I. kind / Priority | 엔진 첫 질문 (`decideNextQuestionFromReview`) | Slot | Evidence→SI | Judgment impact | Class |
|---|---|---|---|---|---|---|
| 주인집 | payer_split · 결제자 지불 이유 | `businessOneLiner` · 이 사업은 누구에게 무엇을 제공하나요? | 다름 | 아니오 | 아니오 | **B** |
| LMULM | repeat_loop · 재판매 등록·체결 | `businessOneLiner` · 이 사업은 누구에게 무엇을 제공하나요? | 다름 | 아니오 | 아니오 | **B** |
| RIDM AI | payer_job · 결제자+직무 | `businessOneLiner` · 이 사업은 누구에게 무엇을 제공하나요? | 다름 | 아니오 | 아니오 | **B** |
| 클리닉플로우 | paid_conversion · 유료 제안 1건 | `businessOneLiner` · 이 사업은 누구에게 무엇을 제공하나요? | 다름 | 아니오 | 아니오 | **B** |
| 핏브릿지 | paid_conversion · 유료 제안 1건 | `businessOneLiner` · 이 사업은 누구에게 무엇을 제공하나요? | 다름 | 아니오 | 아니오 | **B** |

6차원:

1. **Intent** — S.I.는 판단을 바꿀 증거. 엔진은 사업 한 줄.  
2. **Priority** — 엔진 첫 질문은 남은 Stage A gap이지 Decision Evidence가 아님.  
3. **Slot** — 5/5 불일치.  
4. **Evidence** — 엔진 답변은 gapState로 가고 `updateStrategicIntelligence()`로 들어가지 않음.  
5. **Judgment impact** — 엔진 질문의 답은 S.I. 판단을 움직이지 않음.  
6. **Conflict** — Integration Gate A6: 엔진은 S.I. 소스를 덮지 않음. S.I.보다 우선되지도 않음.

엔진 walk(4턴)도 Stage A 체크리스트(`businessOneLiner` → `customerPersona` → `payer`/`problemJtbd`)에 머문다. LMULM/클리닉플로우는 `customerPersona`에 반복된다. **재판매 등록·유료 전환 건수처럼 S.I. Decision Evidence를 묻는 턴은 없다.**

## CPO 결정 입력

```text
C = 0
D = 0
A = 0
B = 5
```

현재 제품(S.I. bind + Gap Loop 병행)에서는 엔진이 S.I.를 막지 않으므로 **REPLACE는 강제되지 않는다.**

엔진을 **유일한 질문 소스**로 쓰면 S.I. 검증 질문은 선택되지 않는다. 그건 KEEP 이유가 아니라 ADAPT/REPLACE 후보 이유다. 결정은 CPO의 `KEEP / ADAPT / REPLACE`.
