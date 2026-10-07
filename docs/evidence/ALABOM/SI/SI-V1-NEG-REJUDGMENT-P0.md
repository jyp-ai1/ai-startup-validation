# [P0] Negative Evidence → Re-Judgment Integrity

**Gate:** FIX OPEN · Preview only  
**Production:** `0638f77` 불변  
**Branch:** `cursor/si-neg-rejudgment-e648`  
**Scope:** Evidence → reconciliation → promotion 경계. CONFLICT-only 아님.

## 1. Root Cause

동일 답변 `1차 판매는 있었지만 재판매 등록 0건, 재구매 0건이다.`가 축을 갈라 처리됐다.

- `1차 판매` → `revenue` FACT
- `재구매 0` → `unverified` ASSUMPTION (`validationStrength`)
- CONFLICT 없음, C2C CU 유지
- `decideVerdict`가 `hasRevenue ? 'viable'`로 승격

즉 측정된 반복 0건이 같은 business axis에서 기존 판매 FACT와 재조정되지 않았고, 열린 C2C CU / DCE(없으면 1차 판매 브랜드로 내린다)를 우회해 headline만 올렸다.

## 2. 변경 파일

- `apps/web/features/strategic-intelligence/lib/analyze-strategic-intelligence.ts`
- `apps/web/features/strategic-intelligence/lib/update-strategic-intelligence.ts`
- `apps/web/features/strategic-intelligence/lib/__tests__/si-negative-rejudgment.test.ts`
- `docs/TASKS.md`

미변경: Auth, PDF/input, Question Engine, Persistent SoT, 사업명 분기.

## 3. Before / After

| | Before (`0638f77`) | After |
|---|---|---|
| 0건 class | ASSUMPTION (`unverified`) | FACT (`repeat_zero`) |
| 1차 판매 FACT | 유지 + 승격 연료 | 유지, 승격 연료 아님 |
| Verdict | `conditionally_viable` → `viable` | `conditionally_viable` 유지 / `viable` → 하향 |
| Delta | `up` | `unchanged` 또는 `down` |
| CU | C2C OPEN인데 headline만 상향 | C2C OPEN 유지, headline 비상향 |
| S4 | 없음 | 없음 |

## 4. Positive / Negative / Partial

| Case | Input | Result |
|---|---|---|
| A Positive | 35명 등록 / 12건 거래 | S4 · `viable` · delta `up` · CU 이동 |
| B Negative | 재판매 등록 0 / 재구매 0 | S3 · `conditionally_viable` · CU OPEN · CONFLICT 없음 |
| C Partial | 재구매 2건 + 재판매 등록 0 | S4/viable 금지 · DCE 미충족 |

## 5. CU / DCE

- 0건 이후 C2C CU CLOSED 되지 않음
- `repeat_loop` 질문 유지
- DCE “없으면 1차 판매 브랜드로 내린다”와 verdict 일치

## 6. Headline / Stage

- Headline: `조건부 사업화 가능` (가능성이 높음 금지)
- Stage: S3 유지 · S4 금지
- Stage와 headline 일치

## 7. Regression

Local: SI + P0-1 + P0-2 = **178 passed**

- #104 payment-only off S3: PASS
- #107 재구매 0 ≠ CONFLICT / not S4: PASS
- P0-1 / P0-2: PASS
- Calibration T0 LMULM `viable` 유지: PASS

## 8. Commit SHA

`0b3429f44db8596be2b5676930af9a31adf075de`  
PR: https://github.com/jyp-ai1/ai-startup-validation/pull/118

## 9. Preview evidence

Production deploy 없음.

- PR: https://github.com/jyp-ai1/ai-startup-validation/pull/118
- Preview: https://ai-startup-validation-git-cursor-si-ne-243c22-jyp-ai1s-projects.vercel.app
