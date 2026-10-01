# P0-3 — CTO 1차 검증 (Phase 1: 원인 증명, 코드 수정 없음)

**Gate:** CEO TEST HOLD  
**Production SHA (health):** `6657b4fe9c9b01b782fbaeb980ce603e21f24e0d`  
**Production URL:** https://ai-startup-validation-tau.vercel.app  
**Date:** 2026-10-01 UTC  

**Scope:** 시나리오 A–D state 추적 · Root Cause · 코드 위치 · Production 재현 가능 여부.  
**Out of scope (this phase):** fixes, V3 redesign, P0-2C rewrite, Auth/Supabase surgery.

---

## Executive summary

CEO가 보고한 4계열 증상은 **단일 버그가 아니라**, canonical document / session hydration / UI truncation / loop state machine이 **겹친 복합 회귀**로 판단됩니다.

| 계열 | 한 줄 Root Cause |
|------|------------------|
| Demo → SmartPM | Guided demo **mount effect가 sample document로 session document를 반복 덮어씀** + `fresh=1` 시 **clearAllDemoClientState** + 수정 플로우가 **document / `DEMO_CUSTOM_DOCUMENT_KEY` 미동기화** |
| 1,000자 → ~100자 | **AI 입력은 대체로 full `pastedContent`/stored doc**; CEO 체감은 **`project.summary`(≤200)·Shared Understanding `truncate(48)`·storage 비었을 때 `buildDocumentContext` domain fallback** 혼동 |
| 고객/문제 누락 | **추출/ canonical spine**에서 값 없음 → UI는 `SHARED_UNDERSTANDING_PENDING` 또는 빈 줄 (데이터 vs UI 분리 필요) |
| 다음 질문 → 이전 화면 | **loop state rollback** (`invalidateDownstreamTurns`, `phase: 'issue'`, failed answer `turns.slice(0,-1)`, `lockedAskSurface` 재hydrate) |

**시나리오 B (로그인 신규 프로젝트):** Production Google OAuth / Supabase host **NXDOMAIN**으로 **CTO Production E2E 차단** (infra). 코드 경로는 아래 B절에서 추적 완료.

---

## CTO 결과표 (CPO 필수)

| 시나리오 | 현상 | Root Cause | 코드 위치 | Production 재현 | 수정 필요 |
| ------- | --------------- | ---------- | ----- | ------------- | ----- |
| Demo 수정 | 샘플 SmartPM 재등장 | (1) `isDemoGuided` **useEffect가 매 실행마다** `saveWorkspaceDocumentText(sample.document)` — `sample=custom`이 아니면 **`getDemoSample()` → `saas` 문서(스마트PM)**. (2) URL에 `fresh=1` + loop progress 없으면 **`clearAllDemoClientState`가 custom key·document key 삭제**; `preservedCustomDocument`는 **sessionStorage만** 보존(document cache fallback 전 wipe 없음). (3) **수정 확인(`handleEditConfirmYes`)은 domain/memory/loop만 갱신** — 붙여넣은 canonical document / `DEMO_CUSTOM_DOCUMENT_KEY` 미반영. (4) effect deps에 **`router`** 포함 → navigation/remount 시 **재hydration** 가능. | `v2-strategy-workspace.tsx` L282–368, L438–448 · `demo-samples.ts` L25–30, L67 · `demo-guided-session.ts` L49–56 · `demo-start-view.tsx` L70–84 · `workspace-ai-pm-main.tsx` L380–452 | **부분 Y:** `/workspace?demo=guided&sample=custom&fresh=1` HTTP 200 (구 Sep-30 500과 상이). Playwright `s17-internal-qa`는 intake placeholder **30s timeout** (UI/entry 경로 drift). CEO 경로 `/demo/start` → custom paste는 코드상 정상 진입. SmartPM 문자열은 **`sample=saas` 또는 effect가 non-custom sample로 덮을 때**만 literal 일치. | **Yes — P0** |
| 사업내용 | 1,000자 → 약 100자 | **A:** 신규 프로젝트 description 필드 `maxLength=1000` — DB `onboardingContext.v2Demo.pastedContent`에는 **full merge** (`buildAuthProjectIntakeContent`). **B:** `project.summary`는 description 없을 때 **pastedContent 앞 3줄·200자**만 — **AI seed가 아님** (`extractProjectSeedDocument`는 **pastedContent 우선**). **C:** session/DB snapshot `documentText` 비면 workspace effect가 seed 재주입 실패 시 **짧은 domain join**. **D:** AI prompt는 `loadWorkspaceDocumentText` / `buildBusinessUnderstanding(doc)` — doc 전체. **E:** Shared Understanding / spine **`truncate(..., 48)`** — **표시만 짧음**. Demo Smart Intake paste **`SMART_INTAKE_MAX_CHARS = 500`** (별 경로). | `my-project-actions.ts` L210–236 · `merge-intake-document.ts` · `project-seed-document.ts` · `workspace-ai-pm-main.tsx` L127–144, L220–231 · `build-shared-understanding.ts` L57, L179, L244 · `v2-smart-intake-data.ts` L9 | **B/C/D E2E blocked** (OAuth). 코드 경로 **확정**. Auth 복구 후 `pastedContent.length` vs `loadWorkspaceDocumentText().length` vs UI 원문 패널 교차검증 필요. | **Yes — P0 (auth 후 prod 증명)** |
| 고객 | 표시 안 됨 | **데이터:** intake/문서에서 `extractDocumentEntities` / `buildBusinessUnderstanding`이 customer signal weak → `resolveCustomerField` → **`SHARED_UNDERSTANDING_PENDING`**. **UI:** `WorkspaceSharedUnderstandingPanel`은 value 그대로 렌더 — **“안 보임” = 빈/pending copy 또는 collapsed summary가 2필드만 join**. Domain edit 후에는 **`truncate(domainCustomer, 48)`** 로 USER_CORRECTED. 별도 “고객/문제 swap”은 entity line parser heuristic (`extract-document-entities.ts`). | `build-shared-understanding.ts` L160–232, L317–325 · `workspace-shared-understanding-panel.tsx` L84–88 · `extract-document-entities.ts` | Demo에서 **부분 재현 가능** (추출 실패 케이스). Auth 프로젝트는 **blocked** | **Yes** |
| 문제 | 표시 안 됨 | **데이터:** `resolveProblemField` — memory fact / problem turn / `understanding.problem` 없으면 pending. 많은 onboarding paste가 **“사업 설명”만** 있고 **문제 라벨 부재**. **UI:** customer와 동일 패널 — problem row 빈 문자열이면 **항목 자체가 빈 줄**. | `build-shared-understanding.ts` L235–268 · `build-business-understanding.ts` | Demo **부분 Y** | **Yes** |
| 다음 질문 | 이previous 질문으로 복귀 | **State rollback (주):** (1) Edit confirm `handleEditConfirmYes` → `invalidateDownstreamTurns` + **`phase: 'issue'`** + `currentIssueId` 재설정 → **이전 issue UI**. (2) Answer submit 실패 시 **`turns.slice(0, -1)`** rollback (`!result.applied`). (3) **`lockedAskSurface` / `loadAiPmLoopState` rehydrate** on mount (`loop-panel` L1055–1074). (4) `handleLoopComplete` → `criticalGapsBlockAnalysis` → **`phase: 'answer'` reopen** (main L509–516). **Navigation-only vs rollback:** persisted loop store 변경이 있으면 **rollback**. | `workspace-ai-pm-main.tsx` L414–444, L482–516 · `workspace-ai-pm-loop-panel.tsx` L2103–2114, L1055–1074, L844–853 | Demo loop **Y (코드+기존 E2E 패턴)**; CEO exact timing은 **수동 trace 권장** | **Yes — P0** |

---

## 시나리오 A — Demo (state 레이어 추적)

### CEO 시나리오 매핑

| Step | 기대 | 실제 관측 (CEO) | 추적 |
|------|------|-----------------|------|
| A-1 custom paste | CEO 사업문 | (다름) | `/demo/start` → `DEMO_CUSTOM_DOCUMENT_KEY` + `sample=custom&fresh=1` |
| A-2 Understanding | 입력 일치 | AI 해석 drift | `buildBusinessUnderstanding(documentContext)` — doc는 storage |
| A-3 수정 | correction 유지 | — | domain edit → **document text unchanged** |
| A-4 다음 화면 | session canonical 유지 | **스마트PM literal** | **sample.document overwrite** 또는 **`sample=saas`** |

### ①–⑤ 레이어 (SmartPM 전환 지점)

| Layer | Key / API | SmartPM이 나올 조건 |
|-------|-----------|---------------------|
| ① sessionStorage | `launchlens.demo.customDocument`, `launchlens.document.demo-session.raw` | custom key cleared + raw cleared → empty; **non-custom sample effect** writes **saas doc** into raw |
| ② React client | `domain`, `entities`, `understandingPhase`, `businessStateRevision` | effect re-run resets `optional` **empty** L357–361 |
| ③ canonical workspace | `loadWorkspaceDocumentText('demo-session')` | overwritten by L351 `saveWorkspaceDocumentText(sample.document)` |
| ④ Demo sample fallback | `getDemoSample(demoSampleId)` when `demoSampleId !== 'custom'` | **`saas` id → SmartPM block** (`demo-samples.ts`) |
| ⑤ URL/query | `demo=guided`, `sample`, `fresh` | missing/invalid `sample` → default **`launchlens`** (not SmartPM); **SmartPM = `saas` explicit** |

**결론:** CEO가 본 SmartPM literal은 **④ `saas` sample hydration** 또는 **①+③ wipe 후 non-custom re-save**와 **코드상 일치**. “Demo는 DB 없으니 정상”으로 **CLOSED 불가**.

---

## 시나리오 B — 로그인 신규 프로젝트 (truncation 판별)

### CEO 관측 “~100자” vs 코드 경로

```text
입력 UI → createMyProjectAction → DB onboardingContext.v2Demo.pastedContent
  → workspace page extractProjectSeedDocument → seedDocument
  → saveWorkspaceDocumentText (new project effect)
  → WorkspaceAiPmMain documentContext → buildBusinessUnderstanding → loop / judgment
```

| 가설 | 판별 | 근거 |
|------|------|------|
| A 입력 UI 잘림 | **부분** | `ProjectDescriptionField` max **1000**; file `documentContent` hidden field **no max**; Demo intake **500** (`SMART_INTAKE_MAX_CHARS`) |
| B DB 저장 잘림 | **아니오 (pastedContent)** | Full `intake.pastedContent` stored; **`summary` only 200/1000** — separate column |
| C hydration 잘림 | **조건부** | DB snapshot `documentText` stale/empty → `buildDocumentContext` **domain-only join** (짧음) |
| D AI prompt 잘림 | **아니오 (기본 경로)** | `buildBusinessUnderstanding(full doc)`; field-level **excerpt** slices in entities only |
| E UI 표시만 | **예 — 기여 큼** | `truncate(..., 48)` everywhere in Shared Understanding |
| F fallback/sample | **Demo only** | `buildSampleInvestigationContext` not auth path |

**Production:** OAuth blocked — **B 시나리오 E2E 미실행**. Auth 복구 후 checklist:

1. `onboardingContext.v2Demo.pastedContent.length`
2. Browser `sessionStorage` document key length
3. Network/API persisted snapshot `documentText.length`
4. UI “원문” / collapsible full text vs spine summary

---

## 시나리오 C — 고객 / 문제 누락

```text
DB pastedContent (full text)
  → inferDomainFromPaste / extractDocumentEntities
  → buildBusinessUnderstanding
  → buildUnderstandingSpine → resolveCustomerField / resolveProblemField
  → WorkspaceSharedUnderstandingPanel rows
```

| 구분 | 조건 |
|------|------|
| DB에 존재 → canonical 없음 | 추출 heuristic miss (라벨 없는 장문 paste) |
| canonical 존재 → UI 미표시 | **unlikely** — panel maps all three keys; **empty string looks “missing”** |
| 입력 → 중간 소실 | Demo **clearAllDemoClientState** / effect overwrite; Auth snapshot not merged |

**Swap (고객↔문제):** investigate `extract-document-entities.ts` customer line vs problem line classification (CEO 케이스별 prod trace).

---

## 시나리오 D — 「맞습니다, 다음으로」 후 이전 질문

### 정상 vs CEO

| | 정상 | CEO 회귀 |
|---|------|----------|
| Shared Understanding confirm | `proceedAfterUnderstandingConfirm` → `understandingPhase: accepted` → loop `answer` | 동일 entry |
| After answer | `resolveNextQuestionDecision` → new `lockedAskSurface` | **이전 questionText resurfaced** |

### Rollback 트리거 (우선순위)

1. **`handleEditConfirmYes`** — correction path sets **`phase: 'issue'`** (의도적 rewind).
2. **`applyWorkspaceLoopAnswer` !applied** — **turn pop** + stay on same `currentIssueId`.
3. **Remount** — `lockedAskSurface` from session store **pins old question**.
4. **`criticalGapsBlockAnalysis`** — forces **`phase: 'answer'`** without advancing narrative.

**판별법:** DevTools → Application → sessionStorage `launchlens.aiPmLoop.{projectId}` — confirm 직후 **`turns.length` / `phase` / `lockedAskSurface.questionText`** 변화.

---

## Production 재현 로그 (this run)

| Check | Result |
|-------|--------|
| `GET /api/health` | OK, commit `6657b4f` |
| `GET /workspace?demo=guided&sample=custom&fresh=1` | **200** (Sep-30 evidence 500과 불일치 — env/deploy 변화) |
| Playwright `s17-internal-qa` vs prod | **5/5 fail** — workspace intake placeholder not visible within 30s (entry UX / test drift; `/demo/start` path not used in `startGuided`) |

---

## Phase 2 (CTO 수정) — 방향 스케치 ( **미구현** )

1. **Demo:** Guard demo hydration effect — **do not overwrite** stored document when loop progress / user corrections exist; sync edits → `DEMO_CUSTOM_DOCUMENT_KEY` + document text; narrow effect deps (remove spurious `router` re-run).
2. **Truncation:** Prod-verify auth path; UI **full document length indicator** for CEO parity; avoid using `summary` anywhere in AI path (audit).
3. **Customer/problem:** Stronger problem/customer extraction for Korean labeled intake; show explicit “미확인” row instead of blank.
4. **Loop:** After confirm, **commit** new ask surface atomically; avoid stale `lockedAskSurface` on remount; document edit-rollback vs answer-rollback in UX.

---

## Gate status

```text
CEO TEST: 🔴 HOLD
CTO Phase 1 (this doc): ✅ Root cause table + code anchors
CTO Phase 2 fixes + prod re-verify: ⏳ NEXT
CPO 2nd / CEO GO: blocked on Phase 2 + Auth for Scenario B
```

---

## Related evidence

- Sep-30 blocked report: `docs/evidence/p0-validation-sept30-still-blocked.md` (500 on workspace — **superseded for HTTP status**; logic issues herein still open)
- P0-2C CLOSED: `6657b4f` — **do not rewrite** loop handoff fixes
