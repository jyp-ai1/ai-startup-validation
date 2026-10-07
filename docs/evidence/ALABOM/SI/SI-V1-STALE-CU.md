# S.I. Stale Critical Unknown — MEASUREMENT COMPLETE

**PR:** #106 측정 전용 (Fix 아님)  
**Branch:** `cursor/si-stale-cu-e648`  
**Base:** PR #105 측정 · PR #104 PASS CLOSED · Baseline SHA `fbf6f1c`  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-stale-cu.json`  
**정의:** `apps/web/features/strategic-intelligence/lib/__tests__/stale-cu-definition.ts`  
**금지:** 엔진 수정 · UI · Production · 사업명 분기 · `decideNextQuestionFromReview` · 신규 SoT · Fix Gate 자동 개방

#104 기준선은 불변이다. 이번 Gate는 `stale_cu_after_full_dce`가 **클리닉/핏브릿지 문구 문제인지, 일반 DCE 상태 일관성 결함인지**만 측정한다.

## 고정 정의

DCE = 두 조건.

```text
(1) 유료 전환
(2) 수치화 지표 전후
```

`stale_cu_after_full_dce`는 2/2가 들어온 뒤에 다음이 동시에 참인 상태 결함이다.

```text
Judgment = S3 / viable | conditionally_viable
AND
CU 또는 다음 질문이 여전히
  "지불만으로는 확정할 수 없다"
  / "지표가 줄었는가"
  / "전후를 재라"
를 말한다.
```

| 판정 | 의미 |
|---|---|
| **PASS** | 2/2 후 이전 CU가 해소·교체되고 다음 검증이 새 미검증으로 이동 |
| **FAIL** | 2/2 후 Judgment는 올랐는데 이전 CU/질문이 남음 |
| **HOLD** | CU만 leftover이고 다음 질문은 이미 새 미검증으로 이동 |
| **N/A** | 0/2 · 1/2 — 이전 CU가 남는 것이 정직하다 (#104) |

## 20행 (5입력 × 4 fill)

이름 없는 입력 3개 (no-show / 반품률 / 이탈) + 클리닉플로우 / 핏브릿지.

| fill | 의미 | 승격 | stale 판정 |
|---|---|---|---|
| 0/2 | 답 없음 | 아니오 · S1/S0 | N/A |
| 1/2 | 지불만 | 아니오 · S1 | N/A · #104 유지 |
| 2/2 | 지불 + 지표 전후 | 예 · S3 | **FAIL** 5/5 |
| 2/2 + 추가 답 | 2/2 후 재결제만 | 예 · S3 | **FAIL** 5/5 |

2/2 표면은 전부 leftover다: CU · DCE · Priority · 다음 질문.

이름 없는 `이탈 25%`도 클리닉/핏브릿지와 같은 FAIL이다. 사업명·도메인 분기가 아니다.

```text
DCE 2/2
→ Evidence VALIDATED
→ Judgment S3
→ CU = "지불만으로는 확정할 수 없다"
→ Ask  = 방금 받은 전후 질문 반복
```

추가 답을 넣어도 CU는 퇴직하지 않는다.

## #104

지불만 (1/2)은 모든 입력에서 `judgment_deferred` / ≠ S3. 부분 상태의 CU는 stale이 아니다.

## 엔진

Analyzer / Presenter vs `fbf6f1c` = 0. 수정 없음. Production 불변.

## 판정 요청

범용성 증거는 충분하다. Fix Gate는 여기서 열지 않는다. CPO가 FAIL을 확정한 뒤에만 다음 수정을 연다.
