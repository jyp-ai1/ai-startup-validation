# ALABOM — CPO / CTO 운영 인수인계 패키지

**작성:** 2026-10-03 UTC · CTO (Cursor Cloud Agent)
**용도:** 새 Cursor 세션(다른 AI Mode 포함)의 **운영 기준 문서**. 이 문서 하나로 운영을 이어간다.
**Sprint 2 세부 SoT:** `docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-2/HANDOFF.md`

표기 규칙
- **[사실]** 저장소 / Production에서 확인한 값
- **[원칙]** CPO가 확정한 운영 원칙
- **[미확정]** CPO 판단 대기
- **[HANDOFF CONFLICT]** 기존 문서·규칙·코드와 충돌. 임의로 합치지 않았다. 판단은 CPO가 한다.

---

## A. 프로젝트 기본 정보

| 항목 | 값 |
|------|----|
| 프로젝트명 | **ALABOM** |
| 저장소 | `jyp-ai1/ai-startup-validation` (pnpm monorepo, Next.js `apps/web`) |
| 서비스 목적 | Founder의 사업 문서와 답변을 AI PM이 이해하고, 확인된 것과 확인되지 않은 것을 구분하고, 다음에 확인할 질문을 근거와 함께 제시해 사업 판단을 돕는다 |
| Production URL | https://ai-startup-validation-tau.vercel.app |
| Production 상태 [사실] | `/api/health` → `status: ok`, `commit: baf2ecad048c498f0e1f88a24061a47436de70a5`, `environment: production` (2026-10-03 00:40 UTC) |
| Git main [사실] | `origin/main` = `baf2eca` (Production SHA와 일치) |
| 마지막 코드 변경 merge | `bf770c2` (PR #69, Improvement Sprint 1 Phase 3-B F11/F04). `baf2eca`는 문서만 추가한 후속 커밋 |
| Sprint 상태 | Improvement Sprint 1 **COMPLETE** · AI PM Accuracy Sprint 2 **Phase 1 COMPLETE / Phase 2 NOT STARTED** |

**[HANDOFF CONFLICT] 명칭 불일치** — 아래 위치에서는 제품명이 **LaunchLens**다. 임의로 바꾸지 않았다.
- `README.md`, `docs/PRODUCT_VISION_V3.md`
- `.cursor/rules/product-constitution-operations.mdc` ("LaunchLens is an AI Strategy Company")
- 브라우저 sessionStorage key `launchlens.aiPmLoop.<projectId>` (코드 식별자라서 바꾸면 기존 세션 상태가 끊긴다)
- 반면 증거 문서 폴더는 `docs/evidence/ALABOM/`

---

## B. 조직 역할

### CEO
- 제품·사업의 최종 의사결정자
- 실제 사용자 관점의 최종 테스트 담당
- 개발 세부사항을 직접 관리하지 않으며, CTO에게 직접 코딩을 지시하는 구조가 아니다
- CPO가 검증 완료를 선언한 뒤 필요한 경우에만 테스트한다

### CPO — ChatGPT
- 제품 전략, Product requirement, UX / User Journey
- AI PM reasoning 구조 검토
- CTO 작업지시, CTO 결과 검증, 독립적인 2차 검증
- Calibration 결과 adjudication, AI PM defect 여부 판정
- 구조적 수정 여부 결정
- Production acceptance 판단, CEO 테스트 시점 판단

> **CTO가 "완료"라고 보고해도 자동으로 완료가 아니다. CPO가 검토하고 acceptance해야 완료다.**

### CTO — Cursor / 개발 에이전트
- CPO 작업지시 구현 (코드 / 테스트 / 문서)
- Validation Engine 실행, Regression, Production deploy, Evidence 작성, 결과 보고
- **CPO가 확정하지 않은 AI PM defect는 임의로 수정하지 않는다**

---

## C. 기본 운영 흐름

```text
CEO
 ↓
CPO
 ↓
CTO
 ↓
Implementation
 ↓
Validation
 ↓
CPO 1차 검토
 ↓
CPO 2차 독립 검증
 ↓
Production Acceptance
 ↓
필요 시 CEO Test
```

CEO는 개발 작업을 직접 지휘하지 않는다.

**[HANDOFF CONFLICT] 승인 구조** — 저장소의 always-applied 규칙은 위 흐름과 다르게 쓰여 있다.
- `.cursor/rules/pm-review-policy.mdc`: "PM is NOT an approver", "PM response not required to continue", 파이프라인 `Develop → … → Production → Tag → 회고 → Next Epic` (no stop)
- `.cursor/rules/product-constitution-operations.mdc`: "ship cycle automatic, never ask for commit/push/deploy approval"
- 이 문서의 원칙은 **CPO acceptance gate가 있는 흐름**이다. 새 세션은 CPO 작업지시를 우선하되, 규칙 파일을 수정할지는 CPO가 결정한다.

---

## D. CTO 작업 원칙

1. CPO가 문제를 정의한다
2. CTO가 원인을 분석한다
3. 구조적 해결책을 구현한다
4. Regression을 수행한다
5. Evidence를 제출한다
6. CPO가 최종 판단한다

케이스별 하드코딩, 개별 예외처리, 임시 패치는 지양한다.

---

## E. 개발 DoD (코드 변경이 있는 모든 작업)

```text
Code
 ↓
Target Tests
 ↓
Full Build
 ↓
Git Commit
 ↓
Git Push
 ↓
Production Deploy
 ↓
Production SHA
 ↓
SHA Match
 ↓
Production Smoke
```

Production acceptance 조건:

```text
Git SHA = Build SHA = Production SHA
+ 실제 Production smoke (UI 실경로)
```

서버 API 응답만으로 UI·실사용 검증을 대체하지 않는다.

**SHA 확인 방법 [사실]**
- `GET /api/health` → `data.commit` (Vercel `VERCEL_GIT_COMMIT_SHA`)
- 함께 쓰는 route: `/api/build-info`, `/api/version`
- 관련 코드: `apps/web/lib/analytics/server/build-info.ts`, `apps/web/next.config.ts`

**Production smoke 구조 [사실]**
- 인증: Supabase QA magic-link 세션 주입 (service role로 magic-link 생성 → `sb-<ref>-auth-token` 쿠키를 Playwright context에 주입). 인터랙티브 Google OAuth는 거치지 않으며, 인증 코드도 바꾸지 않는다
- env 동기화: `apps/web/scripts/sync-qa-env.mjs`
- 실경로 smoke 예시: `apps/web/scripts/production-improvement-sprint1-f11-f04-smoke.mjs` (문서 업로드 → document-first 확인 → AI PM loop 답변 → sessionStorage `launchlens.aiPmLoop.<projectId>` 확인)
- 그 밖의 smoke 스크립트: `production-authenticated-gate-smoke.mjs`, `production-flow-qa.mjs`, `production-track-f-smoke.mjs`, `run-production-eval-smoke.mjs`
- Playwright E2E: `apps/web/e2e/v3-p0-production-readiness.spec.ts`

**[미확정] merge / deploy 권한** — Production deploy는 `main`에 merge되어야 일어난다. 그런데 이 문서는 "CTO는 PR을 임의로 merge하지 않는다"(L)고 정하고 있다. DoD의 Production Deploy 단계에서 **누가 merge를 실행하는지**를 CPO가 정해야 한다. 지금까지는 PR #69가 merge된 뒤 Production에 반영되었다.

**[HANDOFF CONFLICT] commit 규칙** — `.cursor/rules/sprint-5-closed-alpha.mdc`는 "Commit unless user explicitly requests"를 금지한다. DoD는 Commit / Push를 필수 단계로 둔다. 지금까지는 CPO 작업지시를 명시적 요청으로 보고 commit / push 했다.

---

## F. AI PM V3 Architecture (코드 기준)

경로 prefix: `apps/web/features/workflow-journey/lib/business-understanding/`

```text
Answer (Founder 답변)
 ↓
buildAnswerReview              build-answer-review.ts                → AnswerReview (gapVerdicts 포함)
 ↓
gapVerdicts                    @repo/types/domain/answer-review      GapVerdict { gapId, completeness, rationale, factKeys }
 ↓
updateGapStateFromReview       update-gap-state-from-review.ts       → GapKnowledgeState
 ↓
gapState                       AiPmLoopState.gapState                workspace-ai-pm-loop-types.ts
 ↓
evaluateStageReadiness         evaluate-stage-readiness.ts
 ↓
decideNextQuestionFromReview   decide-next-question-from-review.ts   → NextQuestionDecision
 ↓
lastDecision                   AiPmLoopState.lastDecision
 ↓
CEO 6 Surfaces                 build-ceo-six-surfaces.ts             (저장된 결과만 렌더, 재계산 없음)
 ↓
hydrate / remount              hydrate-ai-pm-loop-state.ts, resolve-remount-ask-surface.ts
```

| SoT | 함수 |
|-----|------|
| Semantic | `buildAnswerReview` |
| Gap State | `updateGapStateFromReview` |
| Readiness | `evaluateStageReadiness` |
| Decision | `decideNextQuestionFromReview` |

보조 구성 요소 [사실]
- 의미 해석: `interpret-answer-semantics.ts`, `semantic-slot-normalization.ts`
- Sprint 1 F11/F04 수정 위치: `build-answer-review.ts`, `interpret-answer-semantics.ts`, `semantic-slot-normalization.ts`
- 레거시 우회 방지: `v3-legacy-bypass-guards.ts`
- 공유 타입: `packages/types/src/domain/answer-review.ts`, `packages/types/src/domain/gap-knowledge-state.ts`

**[원칙]** V3 architecture는 CPO의 별도 지시 없이 재작성하지 않는다.

---

## G. AI PM UX 원칙

```text
이해 → 판단 → 이유 → 질문 → 확정
```

**CEO 6 Surfaces [사실]** (`CeoSixSurfaces`, `build-ceo-six-surfaces.ts`)

| # | 필드 | 화면 의미 |
|---|------|-----------|
| ① | `userAnswer` | 내 답변 |
| ② | `aiUnderstanding` | AI가 이해한 내용 |
| ③ | `confirmedFacts` | 확인된 내용 |
| ④ | `unconfirmedItems` | 아직 확인되지 않은 내용 |
| ⑤ | `whyAsk` | 왜 이것을 묻는지 (actionRationale → whyNow → decisionImpactHint → questionText) |
| ⑥ | `nextQuestion` | 다음 질문 |

노출 금지: internal ID, score, targetGap, 내부 evaluator 정보.
코드에서는 `FORBIDDEN_UI_PATTERNS`(`targetGapId`, `reviewId`, `score`, `recommendedAction`, `routing` 등)로 막는다. 내부 gapId는 `GAP_LABELS`를 거쳐 한국어 라벨로만 보여준다.

사용자는 사업 판단에 필요한 정보만 본다.

---

## H. AI PM Accuracy Framework

Layer
1. Understanding
2. State
3. Gap
4. Question
5. Reasoning / Judgment

Evidence Strength는 별도 Layer가 아니라 Reasoning / Judgment Layer 안의 요소다.

증거 구분: **FACT / ASSUMPTION / INFERENCE**

> 관심 표현 ≠ 지불 의사 ≠ 실제 결제 검증

**[HANDOFF CONFLICT] 상태 값 체계** — CPO 정의(`CLOSED / PARTIAL / OPEN / CONFLICT / UNKNOWN`)와 코드가 다르다.

| 구분 | 코드 정의 [사실] | 위치 |
|------|------------------|------|
| Gap 완결도 (내부) | `CLOSED / PARTIAL / OPEN / CONTRADICTED` (`UNKNOWN` 없음, `CONFLICT` 대신 `CONTRADICTED`) | `GapCompleteness` (`answer-review.ts`) |
| 증거 분류 | `FACT / INFERENCE / ASSUMPTION / UNKNOWN / CONTRADICTION` | `EvidenceClass` (`answer-review.ts`) |
| CEO 화면 라벨 | `CLOSED→SUFFICIENT`, `PARTIAL→UNVERIFIED`, `CONTRADICTED→CONFLICT`, `OPEN→MISSING`, 추가로 `AMBIGUOUS` | `gap-ceo-surface-label.ts` |
| 다음 행동 | `probe / clarify / advance / challenge` | `RecommendedAction` |

CPO 문서의 `CONFLICT`는 코드의 `CONTRADICTED`(내부)와 `CONFLICT`(CEO 라벨)에 대응한다. `UNKNOWN`은 Gap 상태가 아니라 증거 분류에만 있다. 코드는 바꾸지 않았다.

검증 도구 [사실]: `apps/web/lib/ai-pm-validation-engine/` (Validation Engine, ground-truth engine, deterministic user agent, longitudinal replay / adjudication)

---

## I. 현재 Sprint 상태

### Improvement Sprint 1 — COMPLETE

전체 정확도 문제를 해결한 것이 아니라, 아래 한 사이클을 완료한 것이다.

```text
Calibration
 → F11 / F04 실제 결함 확정
 → 구조 수정
 → Regression
 → Holdout
 → Production real path
```

증거: `docs/evidence/ALABOM/AI-PM-IMPROVEMENT-SPRINT-1/IMPROVEMENT-SPRINT-1-FINAL-COMPLETION-EVIDENCE.md`

### AI PM Accuracy Sprint 2 — Phase 1 COMPLETE / Phase 2 NOT STARTED

Phase 1 범위
- Longitudinal Calibration + auto adjudication
- 10 business archetypes × 7 turns = 70 checkpoints

| 분류 | 건수 |
|------|------|
| GT defect | 10 |
| Evaluator defect | 30 |
| AI PM defect candidate | 30 |
| Harness defect | 0 |

> 위 수치는 **auto adjudication 결과**이며 CPO의 최종 defect 판정이 아니다.

증거: `docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-2/` (`EVAL/longitudinal-calibration-pack.json`, `EVAL/longitudinal-adjudication-submission.json`, `PHASE-1-*.md`)

**[HANDOFF CONFLICT] "Sprint 2" 명칭 중복** — `docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/ALABOM-AI-PM-ACCURACY-SPRINT-2.md`는 이전 "AI PM Accuracy **Validation** Sprint 2"(Golden 8 / generalization) 문서다. 현재의 **AI PM Accuracy Sprint 2**(Longitudinal, `AI-PM-ACCURACY-SPRINT-2/` 폴더)와는 다른 문서다.

---

## J. Sprint 2에서 CPO가 판단할 핵심 [미확정]

### P0 — F11 (가장 중요한 후보)

```text
Turn 5+ Contradiction
 → Turn 6 / 7에서 CONTRADICTED가 CLOSED로 해소됨 (20건)
```

이것이 실제 AI PM 구조 결함인지 확인한다. 기준은 아래 종단 흐름이 턴이 지나도 유지되는가이다.

```text
Existing State + New Answer
 → Fact Extraction
 → Same Slot / Entity
 → Compatibility
 → FACT / CORRECTION / CONFLICT
```

- 참고 [사실]: Turn 5는 10/10 PASS
- 참고 [사실]: Turn 4의 10건은 GT defect (단순 정정인데 GT가 CONFLICT를 기대)

### P1 — F04
- hedge를 FACT로 잘못 분류한 사례는 확인되지 않았다
- 가격 질문 전에 추정 발화가 들어가 revenue 자체가 추출되지 않는 사례가 있다
- → **아직 AI PM defect로 확정하지 않는다** (시나리오 설계 문제일 가능성)

### P2 — F08 Gap Priority
Evaluator / GT 먼저 검증한다.

### P3 — F13 Multi-fact
Evaluator / GT alignment를 우선한다. AI PM `enrichMultiFactSemantic`(`build-answer-review.ts`) 확장은 **HOLD**.

### P4 — STATE_DRIFT
GT / transition validation을 우선한다.

---

## K. Sprint 2 중단 상태 [사실]

```text
No active process
No uncommitted changes (Sprint 2 브랜치 기준)
No AI PM code modification
```

CPO가 defect를 확정할 때까지 Phase 2를 시작하지 않는다.

---

## L. PR 상태

| 순서 | PR | 브랜치 | 내용 | 상태 |
|------|----|--------|------|------|
| 1 | #70 | `cursor/phase4b-production-smoke-6423` | Sprint 1 Phase 4-B Production F11/F04 인증 smoke 증거 | Draft |
| 2 | #71 | `cursor/ai-pm-accuracy-sprint2-calibration-6423` | Sprint 2 Phase 1 Calibration + 인수인계 문서 | Draft |

- #71은 #70의 커밋 `f781b26` 위에 쌓여 있다. merge 순서는 **#70 → #71**
- CTO는 임의로 merge하지 않는다

---

## M. 금지사항

1. CPO 확정 전에 AI PM 제품 로직을 수정하지 않는다
2. 케이스별 땜질을 하지 않는다
3. OAuth를 우회하거나 인증 로직을 변경하지 않는다
4. Production 검증을 서버 테스트만으로 대체하지 않는다
5. Holdout `biz-16`, `biz-17`에 튜닝하지 않는다
6. 중간에 CEO 테스트를 요청하지 않는다
7. Sprint 도중 임의로 범위를 확대하지 않는다

---

## N. 보고 방식 (유지)

일반적인 중간 진행 보고는 하지 않는다.

### STOP

```text
[STOP]
원인:
영향:
SHA:
CPO 판단 필요:
```

### COMPLETE

```text
[SPRINT COMPLETE]
목표:
Calibration:
확정 결함:
구조적 수정:
Regression:
Holdout:
Production:
남은 위험:
다음 후보:
```

### 모든 보고의 마지막 두 줄

```text
[CTO] CPO 요청 작업: <진행중|완료> — 요약
[CPO] 검토·지시 필요: <예|아니오> — 판단할 내용
```

**[HANDOFF CONFLICT] 보고 규칙** — always-applied 규칙과 충돌한다.
- `product-constitution-operations.mdc`: 08:00 KST Daily report 의무, 고정 closing 문구 의무, "완료 / Stage·Epic·Sprint 완료" 출력 금지
- `pm-review-policy.mdc`: 보고 끝에 "Next Autonomous Target / Epic / 진행률 / 예상 완료 / 다음 보고 08:00" 의무, "PASS/FAIL 부탁 · 검토/승인 부탁" 금지
- 실제 운영에서는 위 STOP / SPRINT COMPLETE / 두 줄 형식을 써 왔다. 규칙 파일 정리는 CPO가 결정한다.

---

## O. 신규 페이지 작업 운영 규칙

- 신규 페이지는 Accuracy Sprint와 분리한다
- 브랜치: `cursor/<페이지명>-6423` (소문자). Sprint 2 브랜치와 섞지 않는다
- 착수 전 최소 정의 (8개):
  1. 페이지 목적
  2. 핵심 사용자
  3. Route
  4. 진입 동선
  5. 핵심 CTA 1개
  6. 실제 데이터 / Sample (Sample이면 화면에 `[Sample]` 표시)
  7. 로그인 필요 여부
  8. Founder Journey에서 개선하는 행동
- 판단 기준: 새 화면을 만드는 것이 목적이 아니다. **Founder가 실제로 어떤 행동을 더 빠르고 정확하게 하게 되는가**로 판단한다
- 구현 시 저장소 규칙 [사실]: route는 `apps/web/app/`, 재사용 UI는 `@repo/ui`, 앱/`packages/core`에서 Supabase·OpenAI SDK 직접 import 금지, 새 행동에는 `recordFunnelEvent()` 계측, 새 API route는 `docs/API.md`에 반영

**[HANDOFF CONFLICT] 신규 화면 제한** — `product-constitution-operations.mdc`는 "New screens/menus as goals"를, `sprint-5-closed-alpha.mdc`는 "landing redesign or unrelated UI polish"를 금지한다. 신규 페이지는 8번 항목(Founder 행동 개선)으로 정당화되어야 하며, 해당하는지는 CPO가 판단한다.

---

## P. 새 Cursor AI Mode 운영 원칙

### AI가 해야 할 것
- repository 읽기
- 기존 architecture와 SoT 확인 (F절)
- CPO 작업지시 실행
- 테스트, evidence 작성, 결과 보고 (N절 형식)

### AI가 임의로 하지 말 것
- 제품 전략 변경
- UX 방향 변경
- architecture rewrite
- accuracy defect 임의 수정
- 인증 구조 변경
- 범위 확대
- CEO에게 직접 테스트 요구
- CPO 승인 없이 Production acceptance 선언

---

## Q. 신규 페이지 작업 흐름 (CPO → CTO)

```text
CEO 아이디어 / 요구
 ↓
CPO 구조화
 ↓
User Journey 정의
 ↓
UX / 화면 구조
 ↓
CTO Work Order
 ↓
구현
 ↓
QA
 ↓
Production
 ↓
CPO 2차 검증
 ↓
CEO 실제 테스트
```

---

## R. 새 세션 시작 체크리스트

1. 이 문서를 읽고, 이어서 `AI-PM-ACCURACY-SPRINT-2/HANDOFF.md`를 읽는다
2. `git fetch origin main` 후 `origin/main` SHA와 `/api/health`의 `data.commit`이 같은지 확인한다
3. Sprint 2 브랜치(`cursor/ai-pm-accuracy-sprint2-calibration-6423`)는 건드리지 않는다
4. CPO의 신규 페이지 Work Order(O절 8개 항목)를 받은 뒤 `cursor/<페이지명>-6423` 브랜치를 만든다
5. 위 문서의 [HANDOFF CONFLICT] 항목은 CPO 결정 전까지 이 문서의 원칙(CPO acceptance gate, N절 보고 형식)을 따른다
