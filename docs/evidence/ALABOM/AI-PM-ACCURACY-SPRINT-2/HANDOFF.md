# Handoff — AI PM Accuracy Sprint 2 (2026-10-03 UTC)

## 1. 현재 상태

| 항목 | 상태 |
|------|------|
| Improvement Sprint 1 | **COMPLETE** (CPO 판정) |
| Sprint 2 Phase 1 (Longitudinal Calibration + auto adjudication) | **완료** |
| Sprint 2 Phase 2 (Structural Fix) | **열리지 않음** — CPO가 AI PM 결함 subset을 확정해야 시작 |
| AI PM 제품 로직 | Sprint 2에서 **변경 없음** (harness / evaluator / GT 쪽만 변경) |
| 실행 중인 작업 | 없음 |
| CEO 테스트 | 필요 없음 |

Production: https://ai-startup-validation-tau.vercel.app — 검증된 코드 SHA `bf770c2`, 현재 배포 `baf2eca` (문서만 바뀐 후속 커밋, `bf770c2`의 자손)

## 2. 열린 PR (merge 순서)

1. **PR #70** `cursor/phase4b-production-smoke-6423` — Sprint 1 Phase 4-B Production F11/F04 인증 smoke 증거. Draft.
2. **PR #71** `cursor/ai-pm-accuracy-sprint2-calibration-6423` — Sprint 2 Phase 1. Draft.
   - #70의 커밋 `f781b26` 위에 쌓여 있으므로 **#70을 먼저 merge**하거나, #71이 두 내용을 함께 포함한다는 점을 감안할 것.

## 3. Sprint 2 Phase 1 결과 (auto adjudication — CPO가 뒤집을 수 있음)

70개 checkpoint 행. 분류: GT 결함 10 · Evaluator 결함 30 · AI PM 결함 후보 30 · Harness 0

**P0 — F11 Turn 5 이후 contradiction 보존**
- Turn 5 (contradiction 시작): 10/10 PASS — `customerPersona` = CONTRADICTED, 다음 질문이 A/B 충돌을 반영
- Turn 4: 10/10 GT 결함 — 단순 정정 turn인데 GT가 CONFLICT를 기대함
- **Turn 6–7: 20건 FAIL (AI PM 결함 후보)** — CONTRADICTED가 해소 절차 없이 CLOSED로 바뀜 → **가장 유력한 실제 결함**

**P1 — F04 revenue / pricing 장기 흐름**
- Turn 3: hedge 표현이 FACT로 잘못 분류된 사례 0건 (PASS)
- 단, pricing 질문이 아닌 화면에서 hedge가 입력되어 revenue fact 자체가 추출되지 않음 (slot/journey PARTIAL)
- Turn 5: validation 발화에서 revenue FACT가 관측되지 않음 10/10
- Turn 6: Turn 5에 FACT가 없으니 보존 판정도 FAIL
- → P1은 **AI PM 결함인지 harness 결함인지 CPO 재분류 필요** (pricingHint 질문 도달 전에 발화가 들어가는 시나리오 설계 문제일 가능성)

## 4. 다음에 할 일 (순서 고정)

1. **CPO 판단 대기**: `EVAL/longitudinal-adjudication-submission.json`의 `confirmedAiPmDefects` 중 실제 fix 대상 subset 확정
   - 특히 P0 Turn 6–7 보존 실패, P1 pricing 여정 분류
2. CPO가 확정하면 → 해당 cluster 하나만 Structural Fix (case별 패치 금지)
3. Validation Engine Before/After → Golden / Seed / Holdout(biz-16, biz-17 튜닝 금지) → Production
4. 이어서 남은 waves: P2 F08 · P3 F13 · P4 STATE_DRIFT — **evaluator / GT부터 검증**, AI PM 코드부터 고치지 않음
   - F13은 `enrichMultiFactSemantic` 확장으로 다시 들어가지 않음

## 5. 금지 사항

- Calibration / CPO 확정 전에는 AI PM 코드 수정 금지
- 인증 로직 변경, OAuth 우회 추가 금지 (Production smoke는 기존 Supabase QA magic-link 방식 사용)
- server-side 회귀 테스트만으로 Production UI smoke를 대체 금지
- 중간에 CEO에게 테스트 요청 금지

## 6. 보고 방식

- 중간 진행 보고는 하지 않음. 아래 두 가지만 보고.

막히면 즉시:

```text
[STOP]
원인:
영향:
현재 SHA:
CPO 판단 필요:
```

Sprint 완료 시:

```text
[SPRINT COMPLETE]

목표:
Calibration:
Confirmed Defects:
Structural Fix:
Regression:
Holdout:
Production:
Remaining Risks:
Next Candidates:
```

- 매 보고 끝에 상태 두 줄:

```text
[CTO] CPO 요청 작업: <진행중|완료> — <한 줄 요약>
[CPO] 검토·지시 필요: <예|아니오> — <무엇을 판단해야 하는지>
```

## 7. 재현 명령

```bash
cd apps/web
node scripts/sync-qa-env.mjs                              # Supabase QA secrets → .env.local
pnpm test:longitudinal-calibration-pack                   # Sprint 2 pack 재생성
pnpm test:longitudinal-adjudication                       # Sprint 2 auto adjudication 재생성
node scripts/production-improvement-sprint1-f11-f04-smoke.mjs   # Production 인증 smoke (F11/F04)
```

## 8. 핵심 파일

| 용도 | 경로 |
|------|------|
| Longitudinal 시나리오 (사용자 발화 스크립트) | `apps/web/lib/ai-pm-validation-engine/deterministic-user-agent.ts` (`longitudinal_f11`, `longitudinal_f04_pricing`) |
| Pack 생성 | `apps/web/lib/ai-pm-validation-engine/longitudinal-calibration-replay.ts` |
| Adjudication 규칙 | `apps/web/lib/ai-pm-validation-engine/longitudinal-adjudication.ts` |
| GT transition | `apps/web/lib/ai-pm-validation-engine/ground-truth-engine.ts` |
| F11/F04 AI PM 로직 (Sprint 1 수정분) | `features/workflow-journey/lib/business-understanding/{interpret-answer-semantics,build-answer-review,semantic-slot-normalization}.ts` |
| Sprint 1 최종 증거 | `docs/evidence/ALABOM/AI-PM-IMPROVEMENT-SPRINT-1/IMPROVEMENT-SPRINT-1-FINAL-COMPLETION-EVIDENCE.md` |
| Sprint 2 증거 폴더 | `docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-2/` |
