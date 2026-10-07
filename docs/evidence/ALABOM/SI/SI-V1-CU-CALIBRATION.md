# S.I. CU Calibration Gate

**PR:** #100  
**Branch:** `cursor/si-cu-calibration-e648`  
**Base:** PR #99 First-Pass Calibration (`cursor/si-first-pass-calibration-e648`)  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-first-pass-calibration.json`  
**Tests:** `cu-calibration.test.ts` · `si-first-pass-calibration.test.ts`  
**금지:** First-Pass 재설계 · 사업명 하드코딩 · GPT 문장 복사 · Production · CEO 재테스트

PR #99는 측정 Gate다. 이 PR은 **CU Calibration만** 한다. Production은 PR #98 승인 SHA 그대로다.

검증 대상은 브랜드 예외가 아니다.

```text
S.I.가 사업 입력에서 핵심 CU를 더 구체적으로 추출할 수 있는
일반화 가능한 규칙인가?
```

클리닉플로우면 no-show, 핏브릿지면 반품을 말하도록 만든 것이 아니다.

## Rule

유료 전환 경로에서만:

1. 문서에 `%`와 붙어 있는 운영 명사(`quantified_problem`)가 있으면 그 지표를 CU/DCE/Priority/Risk에 묶는다.
2. 같은 문서에 이름 있는 대안(`named_alternative`: 대안·경쟁·솔루션·차별 + EMR/CRM/Title Case)이 있으면 DCE에 대비 조건을 붙인다.
3. `%`에 인접한 명사를 쓴다. 같은 줄의 원인 명사(불일치)가 결과 지표(반품률)를 덮지 않는다.
4. 수치화 문제가 없으면 기존 일반 유료 전환 CU를 유지한다.
5. `payer_split` / `resale_thesis` / `job_unknown`이 먼저 이긴다.

Analyzer 소스에 주인집·LMULM·RIDM·클리닉플로우·핏브릿지 분기는 없다.

## Gate — 5사업 t0 재실행

| 사업 | #99 | #100 | 비고 |
|---|---|---|---|
| 주인집 | PASS | **PASS** | CU/verdict/stage/priority 불변 |
| LMULM | PASS | **PASS** | CU/verdict/stage/priority 불변 |
| RIDM AI | PASS | **PASS** | CU/verdict/stage/priority 불변 |
| 클리닉플로우 | PARTIAL | **PASS** | CU가 no-show, DCE가 EMR 대비 |
| 핏브릿지 | PARTIAL | **PASS** | CU가 반품률, DCE가 True Fit 대비 |

```text
2 improved (클리닉플로우 · 핏브릿지)
3 unchanged (주인집 · LMULM · RIDM)
FAIL 0
```

Referee 6축이 5/5 PASS로 올라온 것은 **CU 구체성 gap이 이 규칙으로 닫혔다**는 뜻이다. 이것을 GPT/Gemini 수준이라고 선언하지 않는다.

## 이름 없는 입력 (브랜드 예외가 아님)

- `no-show 18%` + `EMR` → CU가 no-show, DCE가 EMR
- `반품률 32%` + `True Fit` → CU가 반품, DCE가 True Fit
- 수치 없는 “예약 관리가 어렵다” → 일반 유료 전환 CU 유지

## 남은 얇은 곳

AI PM 질문 템플릿은 여전히 `paid_conversion` kind 문장이다. 판단 CU는 지표를 말하지만, 첫 질문은 “유료 제안·받은 돈 한 건”이다. 이번 Gate 범위 밖이다.

## Production

변경 없음. CEO 재테스트 없음.
