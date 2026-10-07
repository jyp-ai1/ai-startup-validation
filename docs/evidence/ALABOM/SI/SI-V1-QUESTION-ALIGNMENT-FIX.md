# S.I. Question Alignment Fix — CU axis preserved

**Branch:** `cursor/si-question-alignment-fix-e648`  
**Holdout:** `a25a5f5` 1 PASS / 6 PARTIAL / 4 FAIL  
**Production:** `dea7cb1916cfbd4e6f8c54a86e6da920ed708bd2` 불변  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-question-alignment-fix.json`

## RCA

경로:

```text
1. next CU          analyzer pickCriticalUnknown     — 반복 가능한 사업 유지
2. kind             detectSiValidationKind           — repeat_loop (반복 가능) 유지
3. template         QUESTION_BY_KIND.repeat_loop     — 두 번째 행동 질문
4. weave            composeQuestion                  — FAIL 지점
5. spoken question  Presenter                        — 이탈 수치
```

원인은 kind가 아니다. default DCE 「이탈 없는 두 번째 거래」가 `stakeFromAsk(blob)`에 잡혀, CU에 없는 이탈 축으로 질문이 바뀌었다. Analyzer / CU / Priority / `detectSiValidationKind`는 변경하지 않았다.

## Fix 범위

`present-si-ai-pm-question.ts`만.

Stake weave는 **CU(`criticalUnknown`)에 있는 지표만** 사용한다. DCE 보일러플레이트 지표는 검증 축이 아니다.

CU에 no-show가 있는 paid_conversion은 기존처럼 전후 질문을 유지한다 (#102).

## 결과

| | 전 | 후 |
|---|---|---|
| Pattern B (반복 가능 CU) | 4 FAIL 이탈 수치 | **4 PASS** 두 번째 행동/재구매 |
| Pattern A (다음 고객/기간) | 6 PARTIAL generic | **6 PARTIAL generic** 유지 |
| 주인집 control | PASS 세그먼트 | **PASS** |
| Spoken FAIL | 4 | **0** |

새 unnamed ledger/fieldops에서도 동일 축 보존.

## Regression

#104 · #107 · Negative hops · leftover 0 · P0-1/P0-2 · present-si-dce-ask lock · Analyzer/`detectSiValidationKind` 0-diff.

## Production

UNCHANGED `dea7cb1`. Promotion은 CPO 판단.
