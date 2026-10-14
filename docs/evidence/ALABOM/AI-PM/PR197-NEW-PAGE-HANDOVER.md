# PR #197 — 신규 페이지 인수인계

**누가 읽는가:** 다음 Cursor 페이지의 CTO 에이전트. CEO/CPO가 별도 코드 탐색 없이 이어서 지시할 때도 이 문서를 연다.  
**작성 SHA:** `956a9438`  
**작성 시각:** 2026-10-14  
**이 문서의 일:** 롤·동결·진행·파일·다음 금지선을 한곳에 둔다. 구현 지시서가 아니다.

---

## 0. 새 페이지가 먼저 할 일

1. 이 파일을 끝까지 읽는다.
2. 브랜치 `cursor/ai-pm-mcq-understanding-e648` 에 있는지 확인한다. `git fetch origin cursor/ai-pm-mcq-understanding-e648` 후 HEAD를 대조한다.
3. CPO의 **새 작업지시서**가 있으면 그것만 실행한다. 지시서가 없으면 구조를 새로 만들거나 전략을 재논의하지 않는다.
4. 병합·Production 배포·CEO Founder Test·Pro 결제 업그레이드를 하지 않는다.

붙여넣기 프롬프트: `docs/evidence/ALABOM/AI-PM/PR197-NEW-PAGE-PROMPT.txt`

---

## 1. 롤

**PM/CPO:** 제품 비전과 승인 게이트. 병합·배포는 CPO 별도 승인 전 금지.  
**CTO(이 에이전트):** 구현·조사·테스트·증거 제출. 승인을 요청하지 않는다. 보고는 기록이다.  
**CEO:** 추가 자료를 요청하지 않는다. CTO가 근거를 제출한다.

상태 어휘만 쓴다. `NOT STARTED · IMPLEMENTED · CTO VERIFIED · CPO VERIFIED · NEEDS FIX · NOT VERIFIED · FAIL`.  
엔진 PASS와 UI PASS를 합치지 않는다. Preview PASS를 Production PASS로 쓰지 않는다.

보고 끝은 항상:

```text
Next Autonomous Target
Epic / 진행률 / 다음 보고 08:00

AI는 Founder의 성공 확률을 높이기 위한 다음 개선을 계속 진행 중입니다.
```

금지 말: 승인해주세요 · 진행할까요 · 배포할까요 · PASS/FAIL 부탁 · 다음 Loop.

---

## 2. 좌표

- 저장소: `jyp-ai1/ai-startup-validation`
- 작업 브랜치: `cursor/ai-pm-mcq-understanding-e648`
- PR: https://github.com/jyp-ai1/ai-startup-validation/pull/197 (draft, base `main`)
- 현재 HEAD(인수인계 시점): `956a9438`
- Phase 1 구현: `bcf443b7`
- D4 최소 수정: `2b583754`
- Preview TS2367 수정: `b78e4d29` — Vercel Preview 2/2 PASS. Production 아님
- Preview 기록: `e499fab8`
- S1–S6 whyNow: `956a9438`
- Production 잠금: `0b465226`
- T1–T8 동결 문구: `5263e83e` (`docs/product/ai-pm-closed-conversation-scenarios.md`)
- Production URL: https://ai-startup-validation-tau.vercel.app

---

## 3. 동결 · 금지

- CPO 승인 전 PR 병합 금지
- Production 배포 금지. lock `0b465226`
- Track A 동결 문구를 낮춰 PASS로 만들지 않음
- V3 AC16 / AC5 기대를 바꾸지 않음
- FIX-10 official `day8i-fix10-revalidation` 기대값·공식 리포트 덮어쓰기 금지
- T6 buyer-as-payer 재구현 금지
- 모순 모델 확장 금지
- Stage A / FIX-10을 problem-first로 다시 쓰지 않음. CEO problem-first 미승인
- 문서 echo confirm-yes 기본 첫 질문을 되돌리지 않음 (D7)
- `apps/` · `packages/core`에 Supabase/OpenAI SDK import 금지
- 랜딩 리디자인·무관 UI 폴리시 금지
- 로그인 UI 8턴 / Google OAuth / Production을 실행 없이 VERIFIED로 쓰지 않음
- 추정치를 실측 호출·토큰처럼 쓰지 않음
- 비밀키·토큰을 보고서에 넣지 않음

---

## 4. 진행 상태 (분리)

Phase 1 D1–D7 전략 경로: IMPLEMENTED. `pr197-strategy-restore-phase1` 8/8 PASS  
FIX-10 overallPass: FAIL 유지. D7 confirm-yes 표면 FAIL은 의도. D4 solution-while-identity-open은 최소 수정  
Preview `b78e4d29`: 2/2 PASS. 빌드 게이트이지 전략 성공 아님  
S1–S6 엔진 경로: 이해·증거·판단·다음 **이유** 분기는 측정 PASS. 다음 **gap**은 문제 OPEN이면 모두 `problemJtbd`  
T6 buyer≠payer: CPO VERIFIED. 회귀 7/7 PASS  
T7 payer hold: CPO VERIFIED. 회귀 5/5 PASS  
conversation-quality: 24/24 PASS  
Track A: FAIL. compared=32 exact=0  
Track B: NEEDS FIX  
V3 AC16: FAIL. expected `businessOneLiner` received `validationTestability`  
V3 AC5: FAIL. expected `marketChannel` received `validationTestability`  
로그인 UI 8턴: NOT VERIFIED  
Google OAuth: NOT VERIFIED  
Production: NOT VERIFIED

마지막 CPO 지시(조사): AI 처리 경로·API 비용·전략 정합성. **코드 변경 없이 조사만.** 결과는 채팅으로 제출함. 리포에 별도 조사 커밋은 없음. CPO가 품질·비용·정합성을 분리 판단한 뒤 다음 구현을 정한다. 그 지시가 오기 전에 새 구조나 LLM 도입을 시작하지 않는다.

---

## 5. 현재 구현이 실제로 하는 일 (조사 결론)

생각하는 주체: TypeScript 규칙 엔진. Gemini/OpenAI를 AI PM 답변→다음 질문 경로에서 호출하지 않는다.  
답변 1회 외부 AI API: 0회. 토큰·비용 장부 없음.  
객관식: `buildBusinessChoiceQuestion` 템플릿 + 문서 키워드 추출. LLM 생성 아님.

런타임 경로 (`workspace-ai-pm-loop-panel.tsx`):

- 정확함/구체 선택 → `submitAnswer` → `interpretAnswerSemantics` → `appendLoopTurnWithReview` → `buildAnswerReview` → `updateGapStateFromReview` → `applyWorkspaceLoopAnswer` → `runLoopAnswerProcessing` → `syncJudgmentAfterAnswer` → `resolveNextQuestionDecision`
- 모르겠음 → `applyBusinessChoiceThroughLoop` (같은 엔진을 한 함수에서)
- 일부 타이핑 → `applyTypedAnswerThroughLoop`
- 화면 질문이 SI 문구와 같으면 `applySiFounderAnswer`로 빠지고 V3 리뷰를 건너뛸 수 있음

두 판단:

- 루프 판단: `buildCeoJudgmentStateWithTrace` / `syncJudgmentAfterAnswer`
- S.I. 판단: `analyzeStrategicIntelligence` (정규식). gap-loop 문서 재작성을 소스로 쓰지 않음

`@repo/ai` 기본 모델 문자열 `google/gemini-2.5-flash`는 `/api/ai/chat` 등 다른 기능용. 워크스페이스 루프는 그 라우트를 부르지 않는다.

---

## 6. 합의 전략 vs 구현

- 문서+이전 답 통합 이해 갱신: 부분 충족 (SI와 루프가 갈라질 수 있음)
- 이해 검증 객관식: 부분 충족 (템플릿. LLM 맥락 생성 없음)
- 확인 ≠ FACT: 충족
- 새 답 → 판단 재평가: 부분 충족 (루프는 함. SI는 별 엔진)
- 판단에 영향을 줄 다음 질문/검증 행동: 부분 충족 (whyNow는 갈림. next gap은 잘 안 갈림)
- 반복 금지 + 검증 행동 전환: 부분 충족 (문구는 있음. 외부 검증 실행 없음. Track B 반복 NEEDS FIX)
- 8턴 성공 지표 사용 안 함: 충족 (측정). UI 질문 횟수 예산은 별개

CPO가 다음에 분리해서 볼 세 축:

1. AI 품질 — 모델이 맥락을 종합하는가, 규칙 선택인가
2. 비용 — 호출 수·재전송·측정·제어
3. 전략 정합성 — 새 답이 이해·판단을 바꾸고 다음 행동이 달라지는가

비용을 줄이려고 API를 없애거나, 모든 단계에 무거운 모델을 넣는 결정은 아직 없다.

---

## 7. 열린 결함 (우선순위 힌트. CPO가 확정)

P1. 이 경로에 LLM이 없다. 품질 상한은 규칙·템플릿.  
P1. 루프 판단과 SI 판단이 둘. SI 답이 V3 리뷰를 건너뛸 수 있음.  
P2. next gap이 confirm/revise/unknown에서 같음 (`problemJtbd`).  
P2. Track A / Track B / AC16 / AC5 실패 유지.  
P3. 로그인 UI 8턴 · OAuth · Production 미검증.  
P3. LLM을 붙이면 쓸 비용 관측이 이 경로에 없음.

---

## 8. 핵심 파일

엔진:

- `apps/web/features/workflow-journey/components/project-workspace-shell/workspace-ai-pm-loop-panel.tsx`
- `apps/web/features/workflow-journey/components/project-workspace-shell/workspace-ai-pm-main.tsx`
- `apps/web/features/workflow-journey/lib/business-understanding/apply-business-choice-through-loop.ts`
- `apps/web/features/workflow-journey/lib/business-understanding/build-answer-review.ts`
- `apps/web/features/workflow-journey/lib/business-understanding/update-gap-state-from-review.ts`
- `apps/web/features/workflow-journey/lib/business-understanding/evaluate-stage-readiness.ts`
- `apps/web/features/workflow-journey/lib/business-understanding/decide-next-question-from-review.ts` — `whyNowAfterUnderstanding` / `whyNowAfterEvidence`
- `apps/web/features/workflow-journey/lib/business-understanding/resolve-turn-decision.ts`
- `apps/web/features/workflow-journey/lib/business-understanding/resolve-next-question-decision.ts`
- `apps/web/features/workflow-journey/lib/business-understanding/ai-pm-judgment-next-question-binding.ts` — `isIdentityStillOpenForFix10`
- `apps/web/features/workflow-journey/lib/business-understanding/ai-pm-anti-repeat-policy.ts` — STAGE_A/B에 `=== 'solution'` 비교 금지 (TS2367)
- `apps/web/features/workflow-journey/lib/business-understanding/build-business-choice-question.ts`
- `apps/web/features/workflow-journey/lib/business-understanding/si-turn-insight.ts`
- `apps/web/features/strategic-intelligence/lib/analyze-strategic-intelligence.ts`
- `apps/web/features/strategic-intelligence/lib/resolve-si-journey-integration.ts`

테스트:

- `.../__tests__/pr197-s1-s6-strategy-quality.test.ts`
- `.../__tests__/pr197-fix10-failure-classification.test.ts`
- `.../__tests__/pr197-strategy-restore-phase1.test.ts`
- `.../__tests__/pr197-login-ui-s4-routing.test.ts` — T6
- `.../__tests__/pr197-t7-payer-hold.test.ts` — T7
- `.../__tests__/pr197-conversation-quality.test.ts`
- `.../__tests__/pr197-frozen-t1-t8-divergence.test.ts` — Track A/B
- `.../__tests__/ai-pm-loop-v3.test.ts` — AC16/AC5는 FAIL 유지

증거 복사본:

- `docs/evidence/ALABOM/AI-PM/PR197-CPO-S1-S6-VERIFY-COPY.txt` — 최신 전략 품질 보고
- `docs/evidence/ALABOM/AI-PM/PR197-CPO-STRATEGY-RESTORE-FOLLOWUP-COPY.txt` — FIX-10 분리
- `docs/evidence/ALABOM/AI-PM/PR197-CPO-STRATEGY-RESTORE-PHASE1-COPY.txt`
- `docs/evidence/ALABOM/AI-PM/PR197-CPO-S1-S6-STRATEGY-QUALITY-DUMP.json`
- `docs/evidence/ALABOM/AI-PM/PR197-CPO-FIX10-FAILURE-CLASSIFICATION.json`
- `docs/evidence/ALABOM/AI-PM/PR197-CPO-T1-T8-DIVERGENCE-DUMP.json`
- 공식 FIX-10 리포트는 덮지 않음: `docs/evidence/ALABOM/DAY_8I_P0_FIX10_REVALIDATION_REPORT.md`

---

## 9. 회귀 명령

```bash
cd apps/web && pnpm exec vitest run \
  features/workflow-journey/lib/business-understanding/__tests__/pr197-s1-s6-strategy-quality.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/pr197-strategy-restore-phase1.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/pr197-fix10-failure-classification.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/pr197-login-ui-s4-routing.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/pr197-t7-payer-hold.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/pr197-conversation-quality.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/pr197-frozen-t1-t8-divergence.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/ai-pm-loop-v3.test.ts
```

AC16/AC5 FAIL은 성공 조건이 아니다. 기대를 낮추지 말고 FAIL을 기록한다.

Preview 타입 가드:

```bash
cd apps/web && pnpm exec tsc --noEmit
```

`ai-pm-anti-repeat-policy.ts`에 STAGE_A/B 리터럴 `=== 'solution'` 비교를 다시 넣지 않는다.

Vercel과 같은 빌드: `pnpm --filter web build`

---

## 10. 커밋 이력 (이 브랜치, 최근)

- `0ef7ac80` D1–D7 전략 경로. Preview typecheck FAIL
- `bcf443b7` Stage B `solution` 비교 제거
- `2b583754` identity open이면 solution/Stage B 금지
- `b78e4d29` 같은 TS2367을 anti-repeat에서 재제거. Preview 2/2
- `e499fab8` Preview PASS 기록. Production 아님
- `956a9438` whyNow가 확인/수정/모르겠음에 따라 갈림

---

## 11. 새 페이지가 하면 안 되는 추측

- Preview 2/2를 전략 복원 완료로 쓰지 않음
- S1–S6 엔진 PASS를 로그인 UI PASS로 쓰지 않음
- 호출 0회를 “비용을 절감했다”로 포장하지 않음. 이 경로에 API가 원래 없다
- CPO 지시 없이 Gemini/OpenAI를 루프에 붙이지 않음
- CPO 지시 없이 next gap을 억지로 갈라 PASS를 만들지 않음
- `#196` P1을 이 PR에 넣지 않음
