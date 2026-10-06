# S.I. Integration Gate

**Branch:** `cursor/si-integration-gate-e648`  
**Base:** PR #94 Phase 3 PASS  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-integration-gate.json`  
**Tests:** `pnpm exec vitest run features/strategic-intelligence` → 9 files / 47 passed  
**금지:** `decideNextQuestionFromReview` 개조 · PR #89 · P0-1/P0-2 · 새 SoT · 사업별 예외 · gap loop 교체 · Production

#94는 보존한다. Gap loop는 유지한다. S.I.가 원본 사업 입력만 읽고, gap-loop 문서 재작성은 무시한다.

## Product layer (frozen)

```
S.I. — Business Judgment
        ↓ Validation Priority
AI PM — Validation Executor
        ↓ Evidence
      S.I. re-judgment
```

ADR-049 · `docs/ARCHITECTURE.md`

## Six acceptances × five businesses

| Case | Kind | First | VALIDATED | INTENT | A1–A6 |
|---|---|---|---|---|---|
| 주인집 | payer_split | deferred / S1 | S1→S3, CU 유지 | CLAIM / S1 유지 | PASS |
| LMULM | repeat_loop | viable / S3 | S3→S4, CU 이동 | CLAIM / S3 유지 | PASS |
| RIDM AI | payer_job | deferred / S1 | S1→S3, CU 유지 | CLAIM / S1 유지 | PASS |
| 클리닉플로우 | paid_conversion | deferred / S1 | S1→S3, CU 이동 | CLAIM / S1 유지 | PASS |
| 핏브릿지 | paid_conversion | deferred / S1 | S1→S3, CU 이동 | CLAIM / S1 유지 | PASS |

1. S.I. 판단이 질문보다 먼저 있다  
2. 질문은 Decision Evidence를 검증하고 CU를 복사하지 않는다  
3. Founder 답변이 Evidence로 들어간다 (`si-v1-update`)  
4. Evidence가 판단을 재계산한다  
5. INTENT는 CLAIM이며 CU / Validation Priority를 유지한다  
6. Gap-loop 문서 재작성은 S.I. 소스가 아니다 (P0)

## Not decided here

Gap loop를 S.I. 중심으로 교체할지는 이 Gate 이후 CPO 결정이다.
