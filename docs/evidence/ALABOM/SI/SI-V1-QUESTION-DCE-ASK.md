# S.I. Question DCE Ask Gate

**PR:** #102  
**Branch:** `cursor/si-question-dce-ask-e648`  
**Base:** PR #101 Question Alignment MEASUREMENT COMPLETE / CONDITIONAL PASS  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-question-alignment.json`  
**금지:** 사업명 질문 분기 · GPT 문장 복사 · First-Pass 재설계 · `decideNextQuestionFromReview` · 신규 SoT · Production

PR #101이 측정한 끊김을 고친다. 질문은 S.I. triad에서 특수 지표를 읽어 문장에 태운다.

```text
DCE/Priority에 수치화 운영 명사(+ 이름 있는 대안)가 있으면
AI PM 질문이 그 토큰을 말한다.
없으면 kind 템플릿을 유지한다.
```

클리닉플로우→no-show, 핏브릿지→반품을 심지 않는다.

## 5사업

| 사업 | t0 질문 | #101 | #102 |
|---|---|---|---|
| 주인집 | 쓰는 사람 / 결제자 *(고정)* | PASS | **PASS** |
| LMULM | 재판매 등록·체결·재구매 *(고정)* | PASS | **PASS** |
| RIDM AI | 결제자 + 직무 *(고정)* | PASS | **PASS** |
| 클리닉플로우 | no-show 수치 + EMR 대비 + 결제 사례 | PARTIAL | **PASS** |
| 핏브릿지 | 반품률 수치 + True Fit 대비 + 결제 사례 | PARTIAL | **PASS** |

```text
5/5 PASS · Evidence 재진입 5/5 · PR #98 2회 루프 유지
FAIL 0 · 사업명 분기 없음
```

이름 없는 `no-show 18% + EMR`, `반품률 32% + True Fit` 입력에도 같은 질문이 붙는다. 수치가 없으면 일반 유료 질문을 유지한다.

## 2번째 질문

유료 답이 들어가도 클리닉플로우·핏브릿지는 재판매를 묻지 않는다. 다음 질문도 no-show / 반품률 전후를 유지한다. LMULM만 재판매 루프를 유지한다.

유료 전환은 생겼는데 수치화 문제가 아직 안 줄었으면, 다음 CU도 그 지표 전후를 묻는다. `resale_thesis` / `payer_split` / `job_unknown`이 먼저 이긴다.

## 고정

- `decideNextQuestionFromReview` 미사용
- 신규 persist SoT 없음
- Production 불변. CEO 재테스트 없음.
