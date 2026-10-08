# Question Alignment Fix Gate — P1-A

**Production:** `acbbf24` 불변  
**Analyzer:** `c0b9bc3` 불변  
**PR #119 / #120:** Draft 유지 · Merge 금지  
**이 PR:** Draft · CPO 2-pass 전 Merge/Production 금지  
**P1-B (MVP 런칭 → 이미 출시):** 이번 Gate에서 수정하지 않음 · Observation/Backlog

---

## 수정 범위

| 파일 | 역할 |
|---|---|
| `present-si-ai-pm-question.ts` | `repeat_loop`를 CU/DCE 축 → 원문 축 → generic 순으로 bind |
| `run-si-ai-pm-bind-turn.ts` | 원문 `documentText`만 presenter에 전달 |
| `resolve-si-v1-validation-priority.ts` | 동일 |

Analyzer · `decideSiValidationAsk` kind 규칙 · SoT · Auth · Gap Loop 엔진 · 사업명 branching: **없음**.

`[Founder evidence]` 이후(답변 원문)는 축 추출에서 제외한다. 유료 답의 `월 구독`이 모든 사업을 구독 축으로 끌어가지 않게 한다.

---

## Binding 규칙

1. CU/DCE/Priority에 `C2C|재판매` → 재판매 질문 (LMULM 유지)
2. 원문에 `양조장|관광객|전통주|FIT` → 두 번째 계약 / 관광 수요
3. 원문에 `구독` → 구독 유지·재결제 (`SaaS` 토큰은 사용하지 않음)
4. 원문에 `B2B`만 있으면 → 두 번째 고객·계약
5. 그 외 → 일반적인 두 번째 행동/반복성
6. `whyAsking`은 같은 축을 설명한다

---

## Targeted 결과

유료 답 원문(RIDM · 주인집):

```text
결제 후보 2명이 월 구독을 결제했고 유료 전환 1건이 발생했다.
```

| 경로 | 질문 축 | 재판매 |
|---|---|---|
| RIDM afterPaid | 구독 유지·재결제 | 없음 |
| 주인집 afterPaid | 두 번째 계약 / 관광 수요 | 없음 |
| LMULM T0 / Negative | 재판매 등록 유지 | 유지 |
| Pattern B unnamed | 두 번째 행동 | 없음 |

Dump: `si-v1-question-alignment-p1a.json`

---

## Regression

| Gate | 결과 |
|---|---|
| P1-A targeted | PASS |
| present-si-dce-ask lock | PASS (LMULM T0 문장 유지) |
| Question Alignment / Fix / Holdout | PASS |
| SI full suite | **170 passed** |
| LMULM Positive S4 / Negative S3 조건부 / Partial S3 | 유지 |
| #104 / #107 / Negative re-judgment | PASS |
| Recovery P0-1 / P0-2 | PASS (23) |
| Analyzer diff | empty |
| P1-B 출시 Strength | 미수정 |

---

## Preview / Production

- Preview: https://ai-startup-validation-git-cursor-si-qu-b67f1e-jyp-ai1s-projects.vercel.app
- Vercel: Ready
- Production `acbbf24` 불변
- Merge · Production deploy: CPO 2-pass 승인 이후
- P1-B는 별도 Analyzer Fix Gate를 열지 않는다
