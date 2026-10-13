# PR #197 로그인 UI S4 입력 라우팅 — CTO 제출 (병합 보류)

**CPO 전달용 한 페이지 평문(전체 선택 복사):** `docs/evidence/ALABOM/AI-PM/PR197-CPO-LOGIN-UI-S4-ROUTING-COPY.txt`

고객 모순 모델은 확장하지 않았다. UI typed submit이 엔진 `applyBusinessChoiceThroughLoop`로 들어가게만 고쳤다.  
엔진 CPO VERIFIED는 유지. 엔진 PASS와 UI PASS를 한 줄로 합치지 않는다. 병합·Production 하지 않는다.

상태 어휘: NOT STARTED · IMPLEMENTED · CTO VERIFIED · CPO VERIFIED · NEEDS FIX · NOT VERIFIED

---

## 0. 한 줄

로그인 UI에서 T6 `아니라` 입력이 더 이상 유실되거나 payer 턴으로 저장되지 않는다. 엔진 경로로 들어가 `customerPersona=CONTRADICTED`가 되고, T7 재확인 후 고객 gap·Memory·judgment current가 20대로 맞는다. S6/S2/S3/S5 회귀 유지.

**CTO 판정:** 로그인 UI S4 라우팅 = **CTO VERIFIED**. 병합 보류. CPO 재판정 대기.

---

## 1. 구현

| 항목 | 값 |
|---|---|
| 브랜치 | `cursor/ai-pm-mcq-understanding-e648` |
| 엔진 수정 (불변) | `8965af43` |
| 이전 UI 검증 (FAIL) | `bc4c06a6` |
| 이번 구현 | `08a36d8c` (라우팅 헬퍼 + 패널 연결) |
| 덤프 실행 HEAD | `08a36d8c` (실행 당시 working tree = 이 커밋과 동일 라우팅) |
| Production | `0b465226` 불변 |

### 변경 파일·함수

| 파일 | 함수 | 역할 |
|---|---|---|
| `route-typed-answer-through-loop.ts` **신규** | `isOffSlotCustomerCorrection` · `shouldRouteTypedAnswerThroughLoop` · `resolveThroughLoopGap` · `applyTypedAnswerThroughLoop` | 기존 정정 감지(`isCorrectionUtterance` / `parseNotXButYCorrection` / `isCustomerFieldCorrection`)만 재사용. off-slot 정정은 엔진 T6과 같이 `validationTestability`로 throughLoop. CONTRADICTED 재확인은 `customerPersona`로 throughLoop |
| `workspace-ai-pm-loop-panel.tsx` | `submitAnswer` | `아니라` early-return **전에** 위 라우팅. persist 없이 대화상자만 띄우던 경로를 건너뛰고 엔진 write를 호출 |
| `pr197-login-ui-s4-routing.test.ts` **신규** | — | T6/T7/S6 라우팅 단위 검증 |
| `pr197-cpo-login-ui.spec.ts` | `typeFreeText` | 기타=`business-choice-other` 클릭 후 textarea 제출 |

`parkUnresolvedContradiction` · `build-answer-review` CONTRADICTED 규칙 · Memory parking은 변경하지 않음.

---

## 2. 실패 경로 (수정 전, `bc4c06a6` dump)

로그인 UI `submitAnswer`:

1. `/다릅니다|아니라/`이면 persist 없이 return (T6 턴 유실).
2. T7 `지금 메인 고객은 혼자 사는 20대예요`는 열린 payer에 `buyer`로 저장.
3. `customerPersona`는 CLOSED 맞벌이 부모 유지. judgment 요약만 20대.

| 시점 | 질문 | 입력 | 실제 |
|---|---|---|---|
| T6 전 | payer | — | customer CLOSED=맞벌이 부모 |
| T6 | payer | `사실 아이가 아니라 혼자 사는 20대가 메인이에요` | 턴 미저장. next=같은 payer |
| T7 | 같은 payer | `지금 메인 고객은 혼자 사는 20대예요` | lastTurn gap=`payer`. Memory buyer=20대. customer current=부모 |

---

## 3. 수정 후 실제 I/O (로그인 UI dump `2026-10-13T11:37:46Z`)

경로: QA magic-link → `/ko/workspace` → 프로젝트 생성 → confirm/MCQ/기타+`submitAnswer`.  
서버: `http://127.0.0.1:3210`.

### S4 T6 — **PASS**

| 항목 | 수정 후 실제 |
|---|---|
| asked | 이 문제를 해결할 때, 실제로 비용을 지불하거나 도입을 결정하는 사람은 누구인가요? |
| 입력 | `사실 아이가 아니라 혼자 사는 20대가 메인이에요` · via=typed |
| lastTurn | asked=payer 질문 · answer=T6 · **gap=`validationTestability`** · **intent=`correction`** |
| customerPersona | **CONTRADICTED** · rationale=`Founder corrected a previously closed customer claim from another slot.` |
| Memory customer | 맞벌이 부모=`superseded` · 20대=`conflict` · **current 없음** |
| judgment.customer | summary=`충돌: 맞벌이 부모 ↔ 혼자 사는 20대가 메인 — 재확인 필요` · status=`needs_check` |
| next | 이 서비스를 가장 필요로 하는 사람은 누구인가요? · target=`customerPersona` |
| lastDecision | `어느 쪽이 지금 맞는 고객인가요? 이전 고객 이해와 방금 답이 충돌합니다.` · reason=`judgment-bound customer reconfirm after contradiction` |

T6 턴의 targetGap은 payer가 아니다.

### S4 T7 — **PASS**

| 항목 | 수정 후 실제 |
|---|---|
| asked | 이 서비스를 가장 필요로 하는 사람은 누구인가요? |
| 입력 | `지금 메인 고객은 혼자 사는 20대예요` · via=typed |
| lastTurn | asked=`어느 쪽이 지금 맞는 고객인가요?…` · gap=`customerPersona` · intent=`business_fact` |
| customerPersona | **CLOSED** · evidence=`혼자 사는 20대` |
| Memory customer current | `지금 메인 고객은 혼자 사는 20대예요` |
| Memory 맞벌이 부모 | superseded |
| judgment.customer | status=`clear` · summary=`지금 메인 고객은 혼자 사는 20대예요` |
| next | 비슷한 역할을 이미 하고 있는 서비스가 있나요? · `alternativesCompetitors` |
| payer / 기존 고객 재질문 | 없음 |

### S6 / S2 / S3 / S5 — **PASS** (회귀)

| 사업 | 입력 | next |
|---|---|---|
| S6 | `집이 낸다` choice-click | 경쟁·대안 확인. payer CLOSED. 한 줄 후퇴 없음 |
| S2 | `쓰는 사람이 직접 낸다` | 비슷한 역할을 이미 하고 있는 서비스가 있나요? |
| S3 | `대표가 결재한다` | 같은 대안 질문 |
| S5 | `쓰는 사람이 직접 낸다` | 같은 대안 질문 |

---

## 4. 실행 명령과 실제 결과

```text
pnpm --filter web exec vitest run \
  features/workflow-journey/lib/business-understanding/__tests__/pr197-login-ui-s4-routing.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/pr197-conversation-quality.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/pr197-cpo-second-verify-dump.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/recovery2-p0-1-state-edit-confirm.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/recovery2-p0-2-question-loop.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/ai-pm-mcq-journey.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/ai-pm-mcq-real-loop.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/ai-pm-mcq-business-understanding.test.ts \
  features/workflow-journey/lib/business-understanding/__tests__/ai-pm-correction-semantics.test.ts
→ 9 files / 68 tests PASS
```

```text
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3210 \
pnpm exec playwright test e2e/pr197-cpo-login-ui.spec.ts --reporter=list
→ 1 passed (2.1m)
```

Playwright green은 생존 검사. CPO 판정은 dump verdict:

| 항목 | 판정 |
|---|---|
| S4 T6 고객 정정 | **PASS** |
| T6 이후 현재 고객 | **PASS** (부모 current 아님, 20대 미승격) |
| S4 T7 재확인 | **PASS** |
| S6 payer | **PASS** |
| S2/S3/S5 한 줄 후퇴 | **PASS** |
| Google OAuth 8턴 | **NOT VERIFIED** |
| 동결 T1–T8 문구 | **NOT VERIFIED** |
| S6 공급 측 | **NOT VERIFIED** |
| Production | **NOT VERIFIED** |
| 엔진 범위 | **CPO VERIFIED** (유지, 이번 근거 아님) |

단위 테스트가 추가로 확인: 정상 `집이 낸다` / `아직 모르겠음`은 라우팅하지 않음. on-slot `아니라`(customer CLOSED)는 기존 대화상자에 남김. off-slot `꽃집이 아니라 반찬가게`는 throughLoop.

---

## 5. 남은 위험

1. T6 엔진 경로가 의미 추출로 `buyer` secondary Fact를 남길 수 있다. 턴 자체는 payer가 아니다. 모순 모델은 건드리지 않음.
2. 화면 질문은 `이 서비스를 가장 필요로 하는 사람은 누구인가요?`이고 lastDecision 문구는 `어느 쪽이 지금 맞는 고객인가요?`일 수 있다. 갭은 둘 다 customerPersona.
3. 재확인 MCQ 선택지가 20대가 아니라 문서 파편일 수 있다. 기타+자유 입력으로 T7은 들어간다.
4. QA magic-link ≠ Google 버튼. Production 미실행.
5. `useMemo`에 `gapState`를 넣는 변경은 하지 않았다. throughLoop가 Memory/living을 쓴다.

---

## 6. CTO 요청 범위

CPO는 위 3–4만 보면 된다.

1. T6가 고객 정정으로 저장·처리되는가 → **됨**. gap=CONTRADICTED. 턴 gap≠payer.
2. T7 전 부모 current 아님 · 20대 미승격인가 → **됨**.
3. T7 후 고객 gap·Memory·judgment가 같은 20대인가 · next=대안인가 → **됨**.
4. S6/S2/S3/S5 회귀 → **유지**.

CTO는 병합하지 않는다.

(CTO) CPO 요청 작업: 로그인 UI S4 라우팅 수정 제출 — T6/T7 CTO VERIFIED, 병합 보류  
(CPO) 검토·지시 필요: 예 — UI S4 재판정 전 병합 승인 불가
