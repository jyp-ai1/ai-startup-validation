# S.I. Validation Priority Adapter — PR #97

**Branch:** `cursor/si-validation-priority-adapter-e648`  
**Base:** PR #96 Diagnostic → CPO `ADAPT`  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-priority-adapter.json`  
**금지:** `decideNextQuestionFromReview` 수정 · Gap Loop 삭제 · PR #89 · 새 SoT · Production · 사업별 예외 · CU 복사

기존 엔진은 fallback이다. S.I. Validation Priority가 있을 때만 S.I. 검증 질문이 우선한다.

```text
S.I. Validation Priority 존재?
  YES → S.I. Validation Question → si-v1-update → Re-Judgment → 다음 priority
  NO / SI 오류 → 기존 Gap Loop
```

Confirm 질문(`제가 이해한 사업… 맞나요?`)은 훔치지 않는다.

## 5사업

| 사업 | Gap Loop 첫 질문 | Adapter 선택 | SI 질문 |
|---|---|---|---|
| 주인집 | 사업 한 줄 | **si-v1-priority** | 쓰는 사람과 돈을 내는 사람이 같습니까? |
| LMULM | 사업 한 줄 | **si-v1-priority** | 재판매 등록·거래 체결·재구매… 있습니까? |
| RIDM AI | 사업 한 줄 | **si-v1-priority** | 돈을 내는 사람 + 직무 |
| 클리닉플로우 | 사업 한 줄 | **si-v1-priority** | 유료 제안/결제 한 건 |
| 핏브릿지 | 사업 한 줄 | **si-v1-priority** | 유료 제안/결제 한 건 |

답변은 Phase 2 `si-v1-update`. 질문 엔진 파일 diff 없음. P0-1/P0-2 unit 유지.

**Browser 2026-10-06:** Integration Gate 5사업 + Phase 3 bind = 6 passed. `#ai-pm-loop`가 보여도 `이 사업은 누구에게 무엇을 제공하나요?`는 없음.
