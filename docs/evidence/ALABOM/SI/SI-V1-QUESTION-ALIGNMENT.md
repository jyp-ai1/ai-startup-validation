# S.I. Question Alignment Gate

**PR:** #101  
**Branch:** `cursor/si-question-alignment-e648`  
**Base:** PR #100 CU Calibration CLOSED  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-question-alignment.json`  
**금지:** 질문 생성기 수정 · 사업별 질문 하드코딩 · GPT 문장 복사 · Production · CEO 재테스트

CU Calibration은 CLOSED다. 이번 Gate는 **측정만** 한다. `presentSiAiPmQuestion` / `QUESTION_BY_KIND`는 그대로다.

검증 대상:

```text
S.I.가 결정한 DCE / Validation Priority를
AI PM 질문이 따라가는가?
```

사업별 질문을 심는 것이 아니다.

## 6항

1. S.I. Validation Priority  
2. 그 Priority로 만든 AI PM 질문  
3. 질문이 Decision-Changing Evidence를 묻는가  
4. 질문이 `paid_conversion` 일반 문장으로 퇴행하지 않는가  
5. 답변이 S.I. Evidence로 들어가는가  
6. PR #98 2회 루프가 깨지지 않는가  

## 5사업 t0

| 사업 | Kind | 질문 축 | DCE 정합 | 일반 퇴행 | Evidence | 2회 루프 | 종합 |
|---|---|---|---|---|---|---|---|
| 주인집 | payer_split | PASS | PASS | PASS | PASS | PASS | **PASS** |
| LMULM | repeat_loop | PASS | PASS | PASS | PASS | PASS | **PASS** |
| RIDM AI | payer_job | PASS | PASS | PASS | PASS | PASS | **PASS** |
| 클리닉플로우 | paid_conversion | PASS | PARTIAL | PARTIAL | PASS | PASS | **PARTIAL** |
| 핏브릿지 | paid_conversion | PASS | PARTIAL | PARTIAL | PASS | PASS | **PARTIAL** |

```text
MEASURED — 3 PASS / 2 PARTIAL / 0 FAIL
질문 생성기는 고치지 않았다
```

주인집·LMULM·RIDM은 kind 문장이 DCE 축과 같다. 클리닉플로우·핏브릿지만 판단 CU가 구체화된 뒤 질문이 일반 유료로 남는다.

## 클리닉플로우 — 끊긴 연결

| 층 | 문장 |
|---|---|
| Priority | 유료 제안을 하고, 문서가 적은 **no-show의 전후**를 한 번 잰다 |
| DCE | 유료 파일럿 1건과 **no-show 전후**. **EMR** 대비 차별이 그 지표에서 보이는지 |
| 질문 | 유료로 제안했거나, 실제로 받은 돈이 있습니까? |
| whyAsking | 유료 파일럿 1건과 no-show 전후 비교 *(질문은 아님)* |

Founder가 답해야 할 칸은 결제 한 건이다. no-show / EMR / 전후는 부연에만 있다.

## 핏브릿지 — 같은 끊김

| 층 | 문장 |
|---|---|
| Priority | 유료 제안을 하고, 문서가 적은 **반품률의 전후**를 한 번 잰다 |
| DCE | 유료 파일럿 1건과 **반품률 전후**. **True Fit** 대비 |
| 질문 | 유료로 제안했거나, 실제로 받은 돈이 있습니까? |

## 추가로 관측된 2번째 질문

1차 유료 답이 문서에 붙으면 클리닉플로우·핏브릿지의 다음 kind가 `repeat_loop`가 된다. 질문은 재판매를 묻는다. PR #98 fixture 계약(2번째 답이 병원/브랜드 재결제이고 재판매가 아님)은 유지된다. 루프 기계는 살아 있고, 2번째 질문 축은 DCE와 어긋난다.

## 고정

- Analyzer / Presenter / Scorer에 사업명 분기 없음
- `QUESTION_BY_KIND.paid_conversion` 원문 유지
- 답 → `si-v1-update` VALIDATED 5/5
- PR #98 two-turn unit 유지
- Production 불변

## 다음 수정이 필요하면

일반화 대상은 kind 템플릿이 DCE의 특수 지표(`%` 옆 명사, 이름 있는 대안, 전후)를 질문 문장에 태우는 것이다. 클리닉플로우→no-show, 핏브릿지→반품 분기가 아니다.
