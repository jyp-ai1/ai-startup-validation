# S.I. Pivot 0 — 현행 최초 사업성 판단 구조

```text
SHA base: origin/main (조사 시점)
Mode: Diagnostic / HOLD
Code Change: 이 문서 1개만
PR #89 / V3 / UX / Preview / LLM: NOT TOUCHED
```

이 문서는 S.I. Framework를 구현하지 않는다.  
**신규 프로젝트 생성 → 최초 “AI 분석/판단”이 실제로 무엇인지만 코드로 확인한다.**

---

## 1. 결론 먼저

현재 ALABOM의 1차 경로에서 Founder가 보는 “최초 AI 분석/판단”은 **LLM 사업성 판단이 아니다.**

사업 문장을 받아 **키워드/정규식으로 슬롯을 채우고**, 그 다음 **질문 루프를 시작하는 엔진**이다.

LLM(OpenRouter → Gemini)은 코드베이스에 존재하지만, **신규 프로젝트 직후 1차 판단 경로에서는 호출되지 않는다.**

---

## 2. Founder 1차 경로 (실제 호출)

```text
/workspace  (프로젝트 없음)
  → MyProjectsHome 폼
      title + reviewType + description + (optional file)
  → createMyProjectAction
      LLM 없음
      텍스트만 저장
  → redirect /workspace?project={id}
  → extractProjectSeedDocument(onboardingContext.v2Demo.pastedContent)
  → V2StrategyWorkspace
      saveWorkspaceDocumentText(seed)
      inferDomainFromPaste / extractDocumentEntities
      buildBusinessUnderstanding(documentText)     ← 최초 “분석”
  → 읽기 확인 (readingCompleted)
  → Shared Understanding confirm
  → commitFirstAskAfterUnderstandingConfirm
      resolveNextQuestionDecision                  ← 최초 질문
  → AI PM 질문 루프
      interpretAnswerSemantics / buildAnswerReview  ← 역시 LLM 없음
```

파일:

| 단계 | 파일 |
|------|------|
| 생성 폼 | `apps/web/features/my-projects/components/my-projects-home.tsx` |
| 서버 생성 | `apps/web/features/my-projects/actions/my-project-actions.ts` `createMyProjectAction` |
| 시드 병합 | `apps/web/lib/project/merge-intake-document.ts` |
| 문서 추출(업로드) | `apps/web/lib/intake/extract-document-text.ts` — PDF/DOCX/TXT만. LLM 없음 |
| Workspace 진입 | `apps/web/app/[locale]/(shell)/workspace/page.tsx` |
| 시드 복원 | `apps/web/lib/project/project-seed-document.ts` |
| 최초 이해 | `apps/web/features/workflow-journey/lib/business-understanding/build-business-understanding.ts` |
| 엔티티 | `apps/web/features/workflow-journey/lib/domain/extract-document-entities.ts` |
| 첫 질문 | `apps/web/features/workflow-journey/lib/business-understanding/understanding-confirm-ask-transition.ts` |
| 다음 질문 | `apps/web/features/workflow-journey/lib/business-understanding/resolve-next-question-decision.ts` |

`createMyProjectAction`은 title/summary/`onboardingContext`만 `createOwnedProject`에 넣는다. AI 호출 없음.

파일 업로드는 `/api/intake/extract-document` → `mammoth` / `pdf-parse`로 텍스트만 뽑는다.

---

## 3. 최초 “AI 분석”이 하는 일

`buildBusinessUnderstanding(raw)`:

1. `extractDocumentEntities(text)` — 섹션/키워드
2. `extractCustomerMentions` — 고정 패턴 (`MZ 관광객`, `FIT 관광객`, `방한 외국인` 등)
3. business / customer / problem / revenue / partner / solution 필드를 `document | inferred | unknown`으로 채움

출력 타입: `BusinessUnderstanding` (`@repo/types/domain/business-understanding`).

이것은 **문서에서 무엇이 보이나**이지, GO/HOLD·시장성·지불의사 판단이 아니다.

화면에 처음 나오는 문장도 고정 카피다.

```ts
// build-business-understanding.ts
'검토 전에 사업 이해를 함께 확인하겠습니다.'
'대표님이 확인한 내용을 기준으로 사업성을 검토하겠습니다.'
```

Review Surface의 “판단” 문장도 템플릿이다.

```ts
// build-review-centric-surface.ts
if (closed.customerPersona && !closed.payer)
  → '고객 문제는 비교적 보이지만, 실제 지불 주체와 기존 대안에 대한 근거가 부족합니다.'
```

---

## 4. Provider / Model — 1차 경로 vs 존재하는 LLM

### 4-A. 1차 경로 (이 조사의 대상)

| 항목 | 값 |
|------|----|
| Provider | **없음 (로컬 TypeScript)** |
| Model | **없음** |
| Prompt | **없음** |
| Structured Output | 코드 객체 (`BusinessUnderstanding`, `AnswerReview`, `GapKnowledgeState`) |
| LLM HTTP | 0회 |

`interpretAnswerSemantics` / `buildAnswerReview` / `updateGapStateFromReview` / `evaluateStageReadiness` / `decideNextQuestionFromReview` / `applyJudgmentNextQuestionBinding` — 전부 동기 규칙.

### 4-B. 코드에 있는 LLM (1차 경로 밖)

플랫폼: `@repo/ai` → 기본 OpenRouter.

| 항목 | 값 |
|------|----|
| 기본 Provider | OpenRouter (`OPENROUTER_API_KEY`가 있을 때) |
| 기본 Model | `google/gemini-2.5-flash` (`packages/ai/src/config/defaults.ts`) |
| Fallback | `gpt-4o-mini` (`OPENAI_API_KEY`, `AI_FALLBACK_MODEL`) |
| 직접 Google/Gemini SDK | 사용하지 않음 |
| 직접 OpenAI SDK in apps | 금지 (`@repo/ai`만) |

호출부 (Founder 1차 판단이 아님):

| 용도 | 파일 | Prompt | Output |
|------|------|--------|--------|
| Research agent | `apps/web/features/agents/research/providers/openrouter-provider.ts` | `research.agent` v2 | `responseFormat: json_object` |
| Decision agent | `apps/web/features/decision/services/providers/openrouter-decision-provider.ts` | `decision.agent` v1 | `json_object` — 규칙 verdict를 LLM이 문장화 |
| Consultant chat | `apps/web/features/ai-consultant/services/consultant-llm-service.ts` | `consultant.chat` | 자유 텍스트 |
| Strategy pipeline | `apps/web/lib/agents/run-strategy-pipeline.ts` → `/api/agents/strategy-run` | 위 research/decision | V2 research 화면이 enable일 때만 |
| Validation 문서 | `@repo/ai/validation` | PRD/BP/report 템플릿 | 별도 리포트 생성 |

Research system prompt (`packages/ai/src/prompts/defaults.ts`):

```text
You are a startup research agent with web-style sources. Return JSON only.
```

Decision system prompt:

```text
You are LaunchLens strategic decision AI. Respond in {{locale}}.
Use project metrics to validate verdict. Baseline verdict from rules: {{mockVerdict}}.
Return JSON only: { verdict, executiveSummary, reasons }
```

Decision provider는 **먼저 `MockDecisionProvider`(규칙)** 를 돌리고, LLM은 그 verdict를 문장으로 덮는다.

V2 `runReview` (`v2-strategy-workspace.tsx`)의 GO/HOLD도 LLM이 아니다.

```ts
runAnalysis(analysisInput)  // apps/web/lib/analysis-engine — "No LLM"
saveAnalysisResult(...)
```

질문 루프가 어느 정도 진행된 뒤 **검토 시작**을 눌렀을 때의 규칙 엔진이다. 신규 생성 직후가 아니다.

---

## 5. Storage

| 무엇 | 어디 |
|------|------|
| 프로젝트 title/summary/시드 문서 | Supabase `startup_projects.onboardingContext.v2Demo.pastedContent` |
| Workspace 스냅샷 (loop, document, facts) | Supabase `onboardingContext.v2Workspace` (`workspace-persisted-state.ts`) |
| 런타임 루프 | `sessionStorage` `launchlens.aiPmLoop.{projectId}` |
| 원문 | `sessionStorage` `launchlens.document.{projectId}.raw` |
| 대화 메모리 | sessionStorage + persist 시 DB |
| AnalysisResult (후행 규칙 GO/HOLD) | `analysis-result-store` (클라이언트) |
| CEO judgment / Review VM | **런타임 재계산**. persist SoT 아님 |

1차 판단 결과물(`BusinessUnderstanding`)은 DB에 “판단 레코드”로 저장되지 않는다. 문서를 다시 돌리면 다시 만들어진다.

---

## 6. AI PM 질문 루프 연결

```text
buildBusinessUnderstanding
    → living / gapState bootstrap
    → confirm
    → commitFirstAskAfterUnderstandingConfirm
    → resolveNextQuestionDecision
         decideNextQuestionFromReview     (V3 Stage A: business → customer → payer → problem)
         applyJudgmentNextQuestionBinding (FIX-10 overlay)
    → lastDecision + lockedAskSurface
    → 화면 질문
```

답변 후:

```text
processLoopAnswer / appendLoopTurnWithReview
    → interpretAnswerSemantics
    → buildAnswerReview
    → updateGapStateFromReview
    → resolveNextQuestionDecision
```

연결은 **단단하다**. 다만 연결되는 것은 “사업성 판단 결과 → 다음 검증”이 아니라 **슬롯/갭 상태 → 다음 질문**이다.

---

## 7. 1차가 아닌 것 (혼동 방지)

- PR #89 Review Surface: 위 루프의 **표시층**. 새 LLM 없음.
- `runAnalysis` GO/HOLD: 후행 규칙 엔진. 생성 직후 아님.
- OpenRouter Gemini research/decision: V2 strategy/research 파이프라인. 1차 경로에서 안 탐.
- `/api/ai/chat`, consultant, PRD/BP generator: 별도 기능.

---

## 8. CPO 비교용 한 줄

S.I. v0.1이 물을 질문:

> 좋은 AI가 사업을 어떻게 판단하는가?

현재 ALABOM이 하는 일:

> 문장에서 고객/문제/사업 토큰을 집어내고, 빈 슬롯을 질문한다.

[CURRENT]
최초 사업성 판단: LLM 없음. `buildBusinessUnderstanding` + 키워드 추출. 후행 `runAnalysis`도 규칙 GO/HOLD.
Provider: 1차 경로 없음. (코드 기본 LLM은 OpenRouter. 1차에서 미호출)
Model: 1차 경로 없음. (코드 기본 `google/gemini-2.5-flash`, fallback `gpt-4o-mini`)
Prompt: 1차 경로 없음. (LLM 경로: `research.agent` / `decision.agent` / `consultant.chat`)
Output: `BusinessUnderstanding` 객체 + 고정 카피. Structured LLM schema 아님.
Storage: 원문은 Supabase `onboardingContext.v2Demo.pastedContent` + `v2Workspace`. 판단 자체는 런타임 재계산.
AI PM 연결: Understanding confirm → `commitFirstAskAfterUnderstandingConfirm` → V3/FIX-10 질문 루프. 판단 갱신이 아니라 갭 질문.

[CPO 판단]
현재 구조가 "사업성 판단 엔진"인가?
아니면 "사업내용 해석 + 질문 생성 엔진"인가?

→ **사업내용 해석 + 질문 생성 엔진**이다.
사업성 판단 엔진이 아니다.
