# ALABOM — 신규 페이지 Discovery & Execution Plan

**작성:** 2026-10-03 UTC · CTO (Cursor Cloud Agent)
**단계:** Discovery (코드 변경 없음 · PR 없음)
**기준 SHA:** `origin/main` = Production `/api/health` `data.commit` = `baf2ecad048c498f0e1f88a24061a47436de70a5`
**브랜치:** `cursor/new-page-discovery-e648` (문서만. Sprint 2 브랜치 미접촉)
**운영 기준:** `docs/evidence/ALABOM/AI-PM-CPO-CTO-HANDOFF.md`

표기 규칙
- **[사실]** 코드 / Production DB / Production HTTP에서 직접 확인한 값
- **[추정]** 사실에서 도출했지만 직접 검증하지 않은 해석
- **[CPO 결정]** 구현 전에 CPO가 정해야 할 항목

## 0. 조사 방법

| 대상 | 방법 |
|------|------|
| 라우트 / 화면 / CTA | `apps/web/app/**/page.tsx` 85개와 `/workspace` canvas 컴포넌트 트리를 코드로 추적 |
| 공개 경로 | Production에 비로그인 HTTP 요청 (`/`, `/ko`, `/demo/start`, `/auth/login`, `/workspace`, `/projects`, `/decision-center`) |
| 실사용 데이터 | Production Supabase를 **읽기 전용**으로 조회 (service role REST SELECT). `analytics_events` 6,459건(2026-07-28 ~ 2026-10-02), `startup_projects` 89건, auth users 14명 |
| QA 계정 구분 | 소유자 이메일에 `qa / test / cursor / e2e / smoke`가 포함되면 QA로 분류 [추정: 휴리스틱] |

로그인 후 화면은 브라우저로 직접 조작하지 않았다. 대신 Production DB에 저장된 실제 프로젝트 상태(`onboarding_context.v2Workspace`)와 코드 경로를 대조했다. 인증 코드는 건드리지 않았다.

---

## 1. 현재 Founder Journey

### 1-1. 진입 [사실]

```text
Landing (/ , /ko)
 → Demo (/demo/start → /workspace?demo=…&sample=…)  또는  Google 로그인 (/auth/login)
 → /workspace                    프로젝트 목록 (MyProjectsHome)
 → /workspace?project=<id>       단일 canvas (WorkspaceProjectCanvas)
```

- `/projects`, `/decision-center`는 `307 → /workspace`로 리다이렉트된다 (레거시 정리 완료)
- 프로젝트 목록의 카드와 "열기" 버튼은 모두 canvas로 간다 (`my-project-list-item.tsx` L68, L83 → `buildProjectCanvasUrl`)

### 1-2. Canvas 내부 단계 [사실]

| # | 단계 | 컴포넌트 | 주 CTA |
|---|------|----------|--------|
| 1 | 문서 입력 | `WorkspaceDocumentIntake` | 읽기 시작 |
| 2 | 문서 읽기 | `WorkspaceAiPmReadingSequence` | 계속 |
| 3 | 공유 이해 확인 | `WorkspaceBusinessUnderstandingCard` | 맞아요 |
| 4 | AI PM 질문 루프 | `WorkspaceAiPmLoopPanel` (+ CEO 6 Surfaces) | 답변 제출 |
| 5 | 루프 종료 → 검토 준비 | 루프 완료 블록 → `WorkspaceNextStepPanel` | `finalConfirmCta` → `runReview` |
| 6 | 분석 / 판단 | `WorkspaceAnalysisResultPanel` | hero CTA |
| 7 | 검토 후 | `WorkspaceDecisionWorkshopBlock` + `WorkspacePostReviewRoadmap` | 워크숍 동의 |

경로: `apps/web/features/workflow-journey/components/v2/v2-strategy-workspace.tsx`, `…/project-workspace-shell/workspace-ai-pm-main.tsx`, `…/workspace-ai-pm-loop-panel.tsx`

### 1-3. 실제 사용자가 도달한 곳 [사실 · Production DB]

| 지표 | 값 |
|------|----|
| `startup_projects` 전체 / non-demo | 89 / 87 |
| AI PM loop 상태가 저장된 프로젝트 | 23 (non-QA 6 · QA 17) |
| 루프 `phase === 'complete'` 도달 | **0 / 23** |
| `reviewCount > 0` (분석 단계 진입) | **0 / 87** |
| non-QA 루프 프로젝트의 소유자 수 | 2명 |

non-QA 6개 프로젝트 상세:

| 답변 수 | 답변한 날짜 | gapState | phase |
|--------:|-------------|----------|-------|
| **37** | 08-31, 09-05, 09-06 (**3일**) | Stage A + B 필수 9개 **전부 CLOSED** | `answer` |
| 22 | 08-30, 08-31 (2일) | 없음 (V3 이전 상태) | `answer` |
| 7 | 09-08 | 5개 전부 CLOSED | `answer` |
| 5 | 09-07 | CLOSED 3 · PARTIAL 1 · OPEN 1 | `answer` |
| 1 | 08-26 | 없음 | `reanalyze` |
| 0 | — | 없음 | `issue` (`understandingPhase: edit_confirm`) |

**요약:** 실사용자는 질문 루프 안에서 머문다. 여러 날에 걸쳐 돌아와 계속 답하지만(37개 답변, 3일), 검토 단계에 도달한 사례가 하나도 없다.

> 표본은 non-QA 사용자 2명, 프로젝트 6개로 작다. 경향 판단용이며 통계적 결론이 아니다.

---

## 2. 발견한 사용자 행동 문제

### P-1. 돌아온 Founder가 "지금 어디까지 왔는지"를 볼 곳이 없다 [사실]

- 확인된 것 / 확인되지 않은 것을 보여주는 화면은 **질문 루프 안의 CEO 6 Surfaces뿐**이다. 이 화면은 현재 턴 기준이다 (`workspace-ceo-six-surfaces.tsx`, `build-ceo-six-surfaces.ts`)
- 프로젝트를 다시 열면 canvas가 바로 **다음 질문**으로 돌아간다. 프로젝트 전체 상태를 요약해 주는 화면이 없다
- 프로젝트 목록 카드에는 제목, 요약 48자, 마지막 수정 시각, `project.status`만 있다. AI PM이 무엇을 확인했는지는 보이지 않는다
- 매일 다시 여는 흐름(Morning Brief)용 컴포넌트는 있지만 **아무 데서도 쓰지 않는다**: `V2AiPmDailyBrief`, `V2MorningInvestigationBrief`는 자기 파일 밖에서 참조가 0건이다. `FounderTodayWorkspace`는 어떤 라우트에도 마운트되지 않은 `StrategyWorkspaceShell` 안에서만 쓰인다
- 레거시 `/projects/[id]/decision`, `executive-report`, `evidence`, `validation/summary`, `knowledge`는 canvas에서 링크가 없고, V3 `gapState`가 아닌 레거시 데이터를 읽는다

### P-2. 필요한 확인이 끝나도 Founder에게 "충분하다"는 신호가 없다 [사실]

- 37개 답변 프로젝트는 `STAGE_A_REQUIRED_GAPS`와 `STAGE_B_REQUIRED_GAPS`가 모두 CLOSED다. `evaluateStageReadiness` 기준으로는 `B_validation / READY`다 (`evaluate-stage-readiness.ts` L123–174)
- 그런데도 `phase`는 `answer`에 머물고 `lastDecision.action`은 `advance`다. 루프가 끝나지 않아 `WorkspaceNextStepPanel`(검토 시작 CTA)이 한 번도 나타나지 않았다
- 7개 답변 프로젝트도 저장된 gap 5개가 전부 CLOSED인 상태에서 멈췄다

> **이 문제의 원인 수정은 이번 범위가 아니다.** 루프 종료 조건은 `decideNextQuestionFromReview`와 루프 handoff, 즉 AI PM 로직이다. Sprint 2 HOLD 원칙에 따라 손대지 않는다. CPO가 별도로 판정할 후보로 올린다 (§15-3).

### P-3. 측정 공백 [사실]

- `analytics_events` 6,459건 모두 `user_id`가 NULL이다. 서버(`analytics-persistence.ts` L18)는 `params.user_id`를 저장하지만, 클라이언트 `recordFunnelEvent`(`product-analytics.ts` L142–166)는 `user_id`를 보내지 않는다
- 그래서 재방문(`daily_return`)과 사용자별 퍼널을 이벤트로 측정할 수 없다. 위 재방문 근거는 이벤트가 아니라 turn의 `appliedAt`에서 계산했다
- AI PM 루프와 검토 경로(문서, 질문, readiness, 분석)에서는 퍼널 이벤트가 발생하지 않는다. `daily_return`, `morning_report_view`는 정의만 있고 발생 0건이다. G1 계측은 localStorage에만 남는다

### P-4. 그 밖의 막힘 (참고, 이번 범위 아님) [사실]

- 분석 결과 hero 버튼: `WorkspaceAnalysisResultPanel`은 `onCta`를 받지만 `WorkspaceAiPmMain`이 넘기지 않는다. 버튼을 눌러도 아무 일이 없다
- 루프 완료 블록에는 CTA가 없다 (부모 상태 전환에 의존)
- 세션 일시정지는 React state라서 remount되면 사라진다
- 검토 후 로드맵의 다음 단계들은 "coming soon"이다

---

## 3. 신규 페이지가 해결할 행동 (단 하나)

> **다시 돌아온 Founder가 10초 안에 "확인된 것 / 아직 확인되지 않은 것 / 충돌하는 것 / 지금 할 일 하나"를 파악하고, 바로 다음 행동으로 넘어간다.**

지금은 돌아온 Founder가 맥락 없이 질문 한가운데로 들어간다. 37번째 답변을 하면서도 자기 사업에서 무엇이 확인됐는지 볼 수 없다.

---

## 4. 페이지 목적

AI PM이 지금까지 확인한 내용을 **프로젝트 단위의 현재 판단 상태**로 보여준다. 다음에 할 행동 하나를 근거와 함께 제시한다.

- 새 분석을 하지 않는다. **저장된 V3 결과만 읽는다** (CEO 6 Surfaces와 같은 원칙: 렌더만 하고 재계산하지 않음)
- 대시보드 위젯 모음이 아니다. AI PM이 보고하는 톤의 1페이지다 (`product-vision.mdc`: "Workspace: AI PM tone — not dashboard widgets")

가칭: **사업 판단 현황** (Project Brief)

---

## 5. 핵심 사용자

- **로그인한 Founder** 중 AI PM 질문에 **1번 이상 답한** 프로젝트 소유자
- 특히 다른 날 다시 돌아온 Founder (Production 근거: non-QA 2명 모두 2~3일에 걸쳐 재방문)
- 데모 / 게스트 사용자는 대상이 아니다

---

## 6. 제안 Route

```text
/workspace/brief?project=<projectId>
```

- 파일: `apps/web/app/[locale]/(shell)/workspace/brief/page.tsx`
- 이유: canonical 진입인 `/workspace?project=`와 같은 계층에 둔다. 레거시 `/projects/[id]/*`(orphan, 레거시 데이터)는 재사용하지 않는다
- 소유권 검사: 기존 `getOwnedProject(user.id, projectId)`. 소유자가 아니면 `/workspace`로 보낸다 (canvas와 같은 규칙)

[CPO 결정] 대안: `/workspace/status?project=`. 이름만 다르다.

---

## 7. 진입 동선

| # | 진입점 | 변경 내용 | 권장 |
|---|--------|-----------|------|
| E1 | 프로젝트 목록(`/workspace`) 카드 | 답변 1개 이상인 프로젝트에 "현황" 보조 링크를 추가한다. 기존 "열기"(canvas)는 그대로 둔다 | **권장** |
| E2 | Canvas 헤더 | "지금까지 확인한 내용" 텍스트 링크 | 권장 |
| E3 | 재방문 자동 경유 | 마지막 답변이 다른 날이면 canvas 대신 brief를 먼저 보여준다 | **[CPO 결정]**: 기존 진입 흐름을 바꾸므로 1차 범위에서 제외를 권장 |

나가는 동선: brief의 주 CTA → `/workspace?project=<id>` (canvas, 저장된 질문 위치로 복귀)

---

## 8. 핵심 CTA 1개

| readiness 상태 | CTA 문구 (안) | 이동 |
|----------------|---------------|------|
| `NOT_READY` | **이어서 확인하기** | `/workspace?project=<id>` |
| `READY` | **이어서 진행하기** (안내 문구: "검토에 필요한 핵심 내용이 확인되었습니다") | `/workspace?project=<id>` |

화면에 equal-weight 버튼은 하나만 둔다.

[CPO 결정] `READY`일 때 CTA를 **"사업 검토 시작"**으로 바꾸고, 기존 `runReview`로 바로 들어가게 할지 정해야 한다 (`/workspace?project=<id>&intent=review` 같은 deep link). AI PM 로직은 바뀌지 않는다. 다만 canvas가 query를 읽어 기존 `onStartReview`를 호출하도록 **canvas 진입 코드를 수정해야** 한다. P-2(READY인데 검토 진입 0건)에 가장 직접적인 효과가 있다. 그래도 루프 종료 판정을 우회하는 것이므로, P-2 결함 판정과 함께 CPO가 정한다.

---

## 9. 실제 데이터 / Sample 여부

- **실제 데이터만 쓴다.** 출처: `startup_projects.onboarding_context.v2Workspace.aiPmLoop` (DB 스냅샷, `parseWorkspacePersistedSnapshot`)
- Production 근거: non-QA 루프 프로젝트 6개 중 `gapState`가 있는 것은 3개다. QA를 포함하면 23개 중 20개가 `gapState`, 19개가 `lastDecision`을 가진다
- `gapState`가 없는 프로젝트(V3 이전, 0~1턴)는 Sample로 채우지 않는다. "아직 AI PM과 확인한 내용이 없습니다" 빈 상태와 같은 CTA를 보여준다
- **Sample 사용 없음** → `[Sample]` 라벨이 필요 없다

---

## 10. 로그인 필요 여부

- **필요.** 서버에서 `getServerAuthUser` / 기존 shell 인증 경로를 그대로 쓴다
- 인증 코드, OAuth, middleware는 바꾸지 않는다
- 비로그인이면 기존 shell 규칙대로 로그인으로 보낸다

---

## 11. AI PM 연결 여부

- **연결한다 (읽기 전용).** AI PM이 저장한 결과를 보여주는 화면이다
- AI PM에 새 입력을 보내지 않고, 질문을 생성하지 않고, 상태를 쓰지 않는다
- 다음 질문은 `lastDecision.questionText`(저장값)를 그대로 미리 보여준다. 답변은 canvas에서만 받는다

---

## 12. V3 SoT 의존성

| SoT | 사용 | 방식 |
|-----|------|------|
| `buildAnswerReview` | 사용 안 함 | — |
| `updateGapStateFromReview` | 사용 안 함 (결과 `gapState`만 읽음) | 저장값 읽기 |
| `evaluateStageReadiness` | **호출** | 순수 함수, 저장된 `gapState` 입력 → readiness. 함수는 수정하지 않는다 |
| `decideNextQuestionFromReview` | 사용 안 함 (결과 `lastDecision`만 읽음) | 저장값 읽기 |

표시 라벨은 기존 함수를 재사용한다.
- 상태 라벨: `gapCeoSurfaceKind` / `gapCeoSurfaceLabel` (`gap-ceo-surface-label.ts`, export됨)
- 항목 이름: `founderFieldLabel` (`founder-field-labels.ts`, export됨)
- 주의: `build-ceo-six-surfaces.ts`의 `GAP_LABELS`는 export되어 있지 않다. 이 파일은 고치지 않고 `founderFieldLabel`을 쓴다. 두 라벨 체계의 문구가 다르면 CPO에게 보고한다

노출 금지 규칙은 `FORBIDDEN_UI_PATTERNS`와 같다: internal gapId, score, targetGap, reviewId, recommendedAction, routing을 노출하지 않는다.

**V3 SoT 영향: 없음** (호출과 읽기만 하고 수정 0)

---

## 13. Funnel Event

새 이벤트 (`PRODUCT_ANALYTICS_EVENTS`에 추가, `recordFunnelEvent`):

| 이벤트 | 시점 | params |
|--------|------|--------|
| `project_brief_viewed` | brief 렌더 | `project_id`, `readiness` (`NOT_READY`/`READY`), `stage_focus`, `closed_count`, `open_count`, `conflict_count`, `entry` (`list`/`canvas`) |
| `project_brief_cta_clicked` | 주 CTA 클릭 | `project_id`, `readiness` |

측정 질문: brief를 본 Founder가 canvas로 돌아가 **다음 답변을 제출하는 비율**. 기존 데이터만으로는 답변 제출 이벤트가 없어 직접 연결하기 어렵다. 그래서 1차 지표는 "brief CTA 클릭 → canvas 진입"으로 둔다.

[CPO 결정] P-3 `user_id` 누락:
- 신규 이벤트는 `project_id`를 반드시 보낸다. 서버는 이미 `project_id` 컬럼에 저장하므로 프로젝트 단위 측정은 된다
- 전역 `user_id` 누락 수정(`recordFunnelEvent` 공통 경로)은 모든 이벤트에 영향이 있다. 그래서 이번 페이지 범위에 넣지 않고 별도 작업 후보로 둔다

---

## 14. 화면 구조 초안

```text
┌──────────────────────────────────────────────┐
│ <프로젝트 제목>                                │
│ AI PM이 지금까지 확인한 내용 · 마지막 확인 <날짜> │
├──────────────────────────────────────────────┤
│ [AI PM 한 줄 판단]                              │
│  NOT_READY: "<항목>이 아직 확인되지 않아         │
│              다음 판단으로 넘어가기 어렵습니다"   │
│  READY:     "검토에 필요한 핵심 내용이           │
│              확인되었습니다"                     │
├──────────────────────────────────────────────┤
│ 확인된 내용          (CLOSED → 현재 판단에 충분함) │
│  · 고객 · 결제자 · 문제 …                        │
│ 아직 확인되지 않은 내용 (OPEN / PARTIAL)          │
│  · 수익 구조 — 가설은 있으나 검증 필요            │
│ 서로 다른 설명       (CONTRADICTED, 있을 때만)    │
│  · 고객 — 서로 다른 설명이 충돌함                 │
├──────────────────────────────────────────────┤
│ 다음에 확인할 것                                 │
│  "<lastDecision.questionText>"                 │
│  왜: <lastDecision의 근거 문구 — 저장값>          │
├──────────────────────────────────────────────┤
│            [ 이어서 확인하기 ]   ← 단일 CTA       │
└──────────────────────────────────────────────┘
```

UI 규칙 (`ui-quality.mdc`, `DESIGN_CONSTITUTION.md`)
- card-first, CTA 1개, 짧은 문구
- 점수, 퍼센트, 진행 막대, GO/HOLD 표기 없음
- `@repo/ui` 컴포넌트만 쓰고, 앱에 UI 컴포넌트를 복제하지 않는다
- 상태 데이터를 만드는 로직(`build-project-brief.ts`, 순수 함수)과 렌더 컴포넌트를 분리한다. 비즈니스 로직을 React 컴포넌트 안에 두지 않는다

---

## 15. 구현 범위 / 비범위

### 15-1. 구현 범위 (1차)

1. Route `apps/web/app/[locale]/(shell)/workspace/brief/page.tsx` (서버 컴포넌트, 소유권 검사, 스냅샷 읽기)
2. 순수 함수 `build-project-brief.ts`: `AiPmLoopState` → 확인 / 미확인 / 충돌 / readiness / 다음 질문 view model. `evaluateStageReadiness`를 호출하고 라벨 함수를 재사용한다
3. 렌더 컴포넌트 `ProjectBriefView` (feature 폴더, `@repo/ui` 사용)
4. 진입 E1(목록 카드 "현황" 링크)과 E2(canvas 헤더 링크)
5. 이벤트 `project_brief_viewed`, `project_brief_cta_clicked`
6. i18n 키 (ko 우선, 기존 메시지 파일 구조 따름)
7. 테스트
   - unit: `build-project-brief` (빈 상태, NOT_READY, READY, CONTRADICTED 포함, gapState 없음)
   - unit: forbidden pattern 노출 0건
   - E2E / Production smoke: 기존 QA magic-link 방식 → brief 진입 → 항목 표시 → CTA → canvas 복귀
8. 문서: `docs/TASKS.md`, 증거 문서. 새 API route가 없으므로 `docs/API.md`는 바꾸지 않는다

### 15-2. 비범위

- AI PM 로직, V3 SoT 4개 함수, 루프 종료 조건, Sprint 2 브랜치
- 인증, OAuth, middleware
- canvas 내부 흐름 변경 (E3 자동 경유, `intent=review` deep link는 CPO 결정 전까지 제외)
- 레거시 `/projects/[id]/*` 정리, Daily Brief 컴포넌트 재활용·삭제
- 전역 `recordFunnelEvent` `user_id` 수정
- P-4 항목 (analysis hero `onCta` 미연결 등)
- 랜딩 / 다른 화면 리디자인
- DB 스키마 변경 (기존 `onboarding_context` JSON 읽기만)

### 15-3. CPO 판정 대기 후보 (이번 페이지와 별개)

| # | 후보 | 근거 | 성격 |
|---|------|------|------|
| C1 | **READY인데 루프가 끝나지 않음** (P-2) | 37개 답변, 필수 9개 CLOSED, `phase: answer`, `action: advance` | AI PM 로직 → Sprint 2 판정 대상 |
| C2 | `recordFunnelEvent`에 `user_id` 누락 (P-3) | 6,459건 전부 NULL | 계측 공통 경로 |
| C3 | 분석 hero `onCta` 미연결 (P-4) | `WorkspaceAiPmMain`이 prop을 넘기지 않음 | canvas UI 버그 |

---

## 부록 A. Production DB 조회 (읽기 전용)

- `GET {SUPABASE_URL}/rest/v1/analytics_events?select=event_name,user_id,session_id,project_id,created_at`
- `GET {SUPABASE_URL}/rest/v1/startup_projects?select=id,user_id,is_demo,created_at,updated_at,onboarding_context`
- `GET {SUPABASE_URL}/auth/v1/admin/users` (QA 계정 분류용 이메일 패턴만 사용, 문서에는 이메일을 기록하지 않음)

쓰기 요청은 하지 않았다.

## 부록 B. 이벤트 상위 분포 (2026-07-28 ~ 2026-10-02)

| 이벤트 | 건수 |
|--------|-----:|
| `web_vital` | 2,096 |
| `page_view` | 1,307 |
| `workspace_open` | 744 |
| `landing_viewed` | 582 |
| `demo_started` | 433 |
| `google_login_success` / `oauth_success` | 103 / 103 |
| `workspace_restored` / `workspace_entered` | 82 / 82 |
| `investigation_started` | 48 |
| `review_completed` | 6 (07-28 ~ 07-31, 같은 `session_id` 1개, `project_id` 없음 — 현 V3 canvas 이전 경로로 추정) |
| `daily_return` / `morning_report_view` | 0 / 0 |
