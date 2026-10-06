# S.I. First-Pass Judgment Calibration Gate

**Branch:** `cursor/si-first-pass-calibration-e648`  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-first-pass-calibration.json`  
**금지:** 새 기능 · UI · Production · engine 수정 · 사업별 patch · GPT 문장 복사

S.I.를 고치기 전에, **같은 5개 Calibration 문서의 t0**만 보고 GPT/Gemini 1차 판단과 독립 비교한다.

입력은 `si-calibration-cases.ts`. 샘플 PDF는 런타임 SoT가 아니다.

## 6축

1. 판단 방향  
2. 핵심 리스크  
3. Critical Unknown이 의사결정을 막는가  
4. Decision-Changing Evidence가 구체적인가  
5. Validation Priority가 타당한가  
6. 근거 없는 낙관/비관

## 5사업

| 사업 | 방향 | 리스크 | CU | DCE | Priority | 근거 | 종합 |
|---|---|---|---|---|---|---|---|
| 주인집 | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| LMULM | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| RIDM AI | PASS | PASS | PASS | PASS | PASS | PASS | **PASS** |
| 클리닉플로우 | PASS | PARTIAL | PARTIAL | PASS | PASS | PASS | **PARTIAL** |
| 핏브릿지 | PASS | PARTIAL | PARTIAL | PASS | PASS | PASS | **PARTIAL** |

FAIL 0. 최초 판단 방향은 5/5 같다. 근거 없는 낙관(자사 매출 오인, t0 VALIDATED)은 없다.

### GPT/Gemini 대비 얇은 곳

클리닉플로우·핏브릿지는 보류/S1로 같다. 다만 S.I. CU/리스크가 **일반 유료 전환**으로 수렴한다.

- GPT/Gemini 클리닉: 병원이 유료로 쓰고 **no-show가 주는가**, EMR·개인정보  
- S.I. 클리닉: 가치가 지불로 이어지는가  
- GPT/Gemini 핏브릿지: 브랜드가 위젯에 돈을 내고 **반품이 주는가**, True Fit·실측  
- S.I. 핏브릿지: 가치가 지불로 이어지는가  

주인집·LMULM·RIDM은 결제자 분리 / C2C 반복 / 직무+결제자까지 GPT/Gemini와 같은 축이다.

### 샘플 PDF 메모 (이번 Gate 입력 아님)

`docs/evidence/ALABOM/SI/samples/ridm-투자자-사업계획서-260317.pdf`는 AI 에이전트 사업 플랫폼이다. Calibration fixture의 감정 컴패니언과 제품 정의가 다르다. Founder가 원본 PDF를 넣으면 1차 판단 입력이 바뀐다. 측정만 하고 엔진은 그대로 둔다.

## Gate

```text
MEASURED — 5/5 방향 일치, 3 PASS / 2 PARTIAL, FAIL 없음
```

고치지 않았다. 다음 정확도 작업이 필요하면 클리닉/핏브릿지의 **도메인 CU**(no-show, 반품)부터다.
