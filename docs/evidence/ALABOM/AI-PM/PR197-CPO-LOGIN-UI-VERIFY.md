# PR #197 로그인 UI 검증 — CTO 제출 (병합 보류)

CPO가 이 본문만으로 판정할 수 있게 작성한다.  
엔진 PASS를 UI PASS로 쓰지 않는다. 병합·Production 배포하지 않는다.  
고객 모순 상태 모델을 이번 턴에서 추가로 확장하지 않았다.

상태 어휘: NOT STARTED · IMPLEMENTED · CTO VERIFIED · CPO VERIFIED · NEEDS FIX · NOT VERIFIED

---

## 0. 한 줄

로그인 UI(QA magic-link → Workspace → `WorkspaceAiPmLoopPanel`)에서 S6 payer와 S2/S3/S5 한 줄 후퇴 방지는 재현됐다.  
S4 T6/T7 고객 모순 전이는 **재현되지 않았다.** T6 입력은 턴으로 남지 않았고, T7은 payer 슬롯에 buyer로 저장됐다.

**CTO 판정:** 로그인 UI S4 = **FAIL**. FIX-S6 / FIX-ONELINER UI = **CTO VERIFIED**. 병합 보류 유지.

---

## 1. 테스트 환경과 실행 경로

| 항목 | 값 |
|---|---|
| PR | #197 |
| 브랜치 | `cursor/ai-pm-mcq-understanding-e648` |
| 구현 SHA (실행 시점 HEAD) | `febe7a83` |
| 엔진 수정 SHA | `8965af43` (CPO 엔진 범위 VERIFIED — 별도) |
| 서버 | `http://127.0.0.1:3210` · `pnpm --filter web build` 후 `next start` |
| 로그인 | QA magic-link 쿠키 주입 → `/ko/workspace` (Google 버튼 클릭 **아님**) |
| 적용 경로 | confirm-yes / MCQ choice-click / 기타+`submitAnswer` (`WorkspaceAiPmLoopPanel`) |
| 엔진 경로 | 사용하지 않음 (`applyBusinessChoiceThroughLoop` 직접 호출 없음) |
| 스펙 | `apps/web/e2e/pr197-cpo-login-ui.spec.ts` |
| 원시 dump | `docs/evidence/ALABOM/AI-PM/PR197-CPO-LOGIN-UI-DUMP.json` (`meta.implSha`=`febe7a83`, `executedAt`=`2026-10-13T10:53:50.384Z`) |
| Production | `0b465226` 불변 · **NOT VERIFIED** |
| Merge | 하지 않음 |

로그인 착지: `http://127.0.0.1:3210/ko/workspace` · `/auth/login` 리다이렉트 없음.

### 실행 명령과 실제 결과

```text
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3210 \
PLAYWRIGHT_E2E_HOST=127.0.0.1 \
PLAYWRIGHT_E2E_PORT=3210 \
pnpm exec playwright test e2e/pr197-cpo-login-ui.spec.ts --reporter=list
```

실제 출력:

```text
✓  1 [chromium] › e2e/pr197-cpo-login-ui.spec.ts:405:7 › PR #197 CPO login UI › S4 T6/T7 + S6 payer + S2/S3/S5 after-payer on login UI (2.1m)
1 passed (2.2m)
```

Playwright green은 “질문이 보였다”는 하네스 생존 검사다. CPO 판정은 dump verdict와 아래 I/O다.

1차 실행(같은 SHA, 고정 순서 하네스)은 T6/payer가 `submit-failed`로 갭에 닿지 않았다. 아래는 2차 — 실제 질문 순서를 따라 confirm → MCQ → 기타+입력.

---

## 2. 판정 표

| # | CPO 검증 항목 | 판정 | 근거 |
|---|---|---|---|
| 1 | S4 T6 `사실 아이가 아니라 혼자 사는 20대가 메인이에요` 후 고객이 모순으로 표시 | **FAIL** | `customerPersona=CLOSED` (맞벌이 부모). living/화면 `충돌` 없음. contradiction dialog 없음. T6 턴 미저장 |
| 2 | T6 이후·T7 전: 맞벌이 부모는 현재 확정 Fact가 아니고, 20대도 승격되지 않음 | **FAIL** | Memory `customer` current = `맞벌이 부모`. 20대 current 없음. 부모를 superseded로 내리지 않음 |
| 3 | T7 `지금 메인 고객은 혼자 사는 20대예요` 후 living·Memory·judgment가 같은 고객을 current로 보고 다음=대안 | **FAIL** | gap 고객은 여전히 맞벌이 부모 CLOSED. Memory `customer` current=맞벌이 부모. 20대는 Memory `buyer`로 저장. judgment.customer summary는 20대로 바뀜 (층 불일치). next는 대안이나 T7이 고객 재확인이 아님 |
| 4 | S6 `집이 낸다` 후 payer 비반복 | **PASS** | payer CLOSED. next=`alternativesCompetitors` confirm. payer 질문 반복 없음 |
| 5 | S2/S3/S5 payer 후 문서 한 줄(`누구에게 무엇을 제공`)로 후퇴하지 않음 | **PASS** | 세 사업 모두 next=`비슷한 역할을 이미 하고 있는 서비스가 있나요?` |

별도 유지:

| 항목 | 판정 |
|---|---|
| Google OAuth 버튼 8턴 | **NOT VERIFIED** |
| 동결 시나리오 T1–T8 문구 일치 | **NOT VERIFIED** |
| S6 공급 측 검증 | **NOT VERIFIED** (payer 다음이 대안 확인. 공급 미도달) |
| V3-03 / V3-12 | 이번 근거 아님 |
| Production | **NOT VERIFIED** |

---

## 3. S4 실제 질문 · 입력 · 출력 · 상태

경로: 프로젝트 `아이 간식 구독 박스` 생성 → 문서 확인 → 객관식 진행 → payer 질문에서 T6/T7 자유 입력.

### 준비 턴 (T6 전)

| 단계 | 질문 | 입력 | via | next / gap |
|---|---|---|---|---|
| 확인 | 제가 이해한 사업은 「서비스: 아이 간식…」입니다. 맞나요? | [confirm-yes] | confirm-yes | 이 서비스를 가장 필요로 하는 사람은 누구인가요? / `customerPersona` |
| 고객 | 이 서비스를 가장 필요로 하는 사람은 누구인가요? | 맞벌이 부모 선택 | choice-click | 고객이 지금 가장 불편해하는 점은 무엇인가요? / `problemJtbd` |
| 문제 | 고객이 지금 가장 불편해하는 점은 무엇인가요? | 선택지 클릭 (아이\|부모 패턴이 문제 슬롯에 걸려 첫 구체 선택) | choice-click | 이 문제를 해결할 때, 실제로 비용을 지불하거나 도입을 결정하는 사람은 누구인가요? / `payer` |

T6 직전: `customerPersona=CLOSED` · Memory customer current=`이 서비스를 가장 필요로 하는 사람은 맞벌이 부모입니다.` · judgment.customer summary=`맞벌이 부모` · status=`needs_check`.

### T6

| 항목 | 실제 |
|---|---|
| asked | 이 문제를 해결할 때, 실제로 비용을 지불하거나 도입을 결정하는 사람은 누구인가요? |
| optionLabels | AI PM 확인 · 쓰는 사람이 직접 낸다 · 선물하는 사람이 낸다 · 부모가 낸다 · 기타 · 아직 모르겠음 |
| actualUserInput | `사실 아이가 아니라 혼자 사는 20대가 메인이에요` |
| via | typed (기타 후 textarea 제출) |
| contradictionVisible | **false** |
| nextQuestion | **같은 payer 질문** (이동 없음) |
| lastTurn | 문제 턴 그대로. T6 문장은 turns에 없음. turnCount=3 |
| customerPersona | **CLOSED** · evidence=`맞벌이 부모` |
| Memory customer current | `맞벌이 부모` |
| Memory customer conflict / 20대 | 없음 |
| judgment.customer | summary=`맞벌이 부모` · status=`needs_check` |
| 화면 충돌 표시 | 없음 |

엔진(첨부 증거, CPO VERIFIED)과 다름: 엔진은 같은 입력에서 `customerPersona=CONTRADICTED`, living=`contradiction`, Memory current 없음, 부모=`superseded`, 20대=`conflict`.

### T7

T6가 질문을 바꾸지 않아 같은 payer 질문에서 입력.

| 항목 | 실제 |
|---|---|
| asked | 이 문제를 해결할 때, 실제로 비용을 지불하거나 도입을 결정하는 사람은 누구인가요? |
| actualUserInput | `지금 메인 고객은 혼자 사는 20대예요` |
| via | typed |
| nextQuestion | 비슷한 역할을 이미 하고 있는 서비스가 있나요? |
| next targetGap | `alternativesCompetitors` |
| lastTurn | asked=payer · answer=지금 메인 고객은 혼자 사는 20대예요 · gap=`payer` · intent=`business_fact` |
| customerPersona | **CLOSED** · evidence=`맞벌이 부모` (불변) |
| Memory customer current | **맞벌이 부모** |
| Memory buyer current | `지금 메인 고객은 혼자 사는 20대예요` |
| payer | CLOSED · evidence buyer=`고객` |
| judgment.customer | status=`clear` · summary=`지금 메인 고객은 혼자 사는 20대예요` · knowledgeSource=`ceo_confirmed` · evidenceRecords meaning=`맞벌이 부모` · correctionApplied=`false` |

엔진 T7과 다름: 엔진은 living/Memory/judgment current=20대, 부모=superseded, next=대안.  
UI는 next만 대안이고, 고객 Fact는 부모, 20대는 buyer로 들어갔다. judgment 요약만 20대로 바뀌어 층이 갈라진다.

### S4 재현 절차

1. QA magic-link로 `/ko/workspace` 로그인.
2. 아이 간식 구독 박스 문서 생성.
3. 사업 한 줄 확인 → 고객=맞벌이 부모 선택 → 문제 선택 → payer 질문 도달.
4. 기타 후 `사실 아이가 아니라 혼자 사는 20대가 메인이에요` 제출.
5. 기대: 고객 CONTRADICTED / 충돌 표시. 실제: 질문 유지, 턴 미저장, 부모 current.
6. 같은 질문에 `지금 메인 고객은 혼자 사는 20대예요` 제출.
7. 기대: 고객 current=20대. 실제: payer CLOSED, buyer=20대, 고객 gap/Memory는 부모.

---

## 4. S6 · S2 · S3 · S5

공통 준비: confirm-yes → 고객 선택 → 문제 선택 → payer 질문 도달 후 역할 클릭.

### S6 — `집이 낸다` · **PASS**

| 항목 | 실제 |
|---|---|
| asked | 이 문제를 해결할 때, 실제로 비용을 지불하거나 도입을 결정하는 사람은 누구인가요? |
| optionLabels | AI PM 확인 · **집이 낸다** · 도우미가 낸다 · 양쪽이 낸다 · 기타 · 아직 모르겠음 |
| actualUserInput | `집이 낸다` |
| via | choice-click |
| payer | **CLOSED** · buyer=`집이 낸다` FACT |
| nextQuestion | 경쟁·대안은(는) 「서비스: 가사 도우미와 맞벌이 집을 연결하는 중개 앱 …」으로 이해했습니다. 맞나요? |
| next targetGap | `alternativesCompetitors` |
| payer 반복 | 없음 |
| 문서 한 줄 후퇴 | 없음 (`누구에게 무엇을 제공` 아님) |

공급 측 검증 질문까지는 가지 않음 → 별도 **NOT VERIFIED**.

### S2 / S3 / S5 — payer 후 한 줄 후퇴 없음 · **PASS**

| 사업 | payer 입력 | via | next |
|---|---|---|---|
| S2 전통주 | `쓰는 사람이 직접 낸다` | choice-click | 비슷한 역할을 이미 하고 있는 서비스가 있나요? |
| S3 견적 자동화 | `대표가 결재한다` | choice-click | 비슷한 역할을 이미 하고 있는 서비스가 있나요? |
| S5 단백질 쿠키 | `쓰는 사람이 직접 낸다` | choice-click | 비슷한 역할을 이미 하고 있는 서비스가 있나요? |

세 경우 모두 next targetGap=`alternativesCompetitors`. `이 사업은 누구에게 무엇을 제공하나요?` 아님.

---

## 5. UI 경로가 엔진과 갈라지는 지점 (관찰. 이번 턴 미수정)

1. **T6 `아니라` 입력이 엔진 `parkUnresolvedContradiction`에 도달하지 않음.** 턴 미저장. contradiction dialog도 관측되지 않음. 패널 `submitAnswer`는 `/다릅니다|아니라/`이면 persist 없이 대화상자를 띄우도록 되어 있으나, 이번 실행에서는 대화상자 없이 질문이 그대로였다.
2. **T7이 고객 재확인이 아니라 열린 payer에 저장됨.** Memory buyer=20대, customer current=부모. judgment 요약만 20대.
3. **로그인 UI Memory/living `useMemo`는 `gapState`를 넘기지 않음.** 엔진 apply 경로는 `gapState`를 넘긴다. T6가 persist되어도 UI Memory는 CONTRADICTED를 엔진과 같이 반영하지 않을 수 있다. 이번 실행은 persist 전에 이미 실패해서 이 줄은 원인 확정이 아니다.

CPO 지시대로 고객 모순 모델을 여기서 확장하지 않았다.

---

## 6. 잔여

- Google 로그인 버튼 경로 미실행.
- 동결 T1–T8 문구 일대일 미실행.
- S6 공급 측 미도달.
- Production 미실행.
- 1차 하네스 실패는 증거에서 제외. 2차 I/O만 판정에 사용.

---

## 7. CTO 요청 범위

CPO는 위 1–4만으로 다음을 보면 된다.

1. 로그인 UI에서 T6 고객 모순 표시가 되는가 → **안 됨 (FAIL)**.
2. T7 전 부모/20대 Fact 분리인가 → **안 됨 (FAIL)**.
3. T7 후 living·Memory·judgment가 같은 20대 current인가 → **안 됨 (FAIL)**.
4. S6 `집이 낸다` 후 payer가 끝나는가 → **됨 (PASS)**.
5. S2/S3/S5 payer 후 문서 한 줄로 후퇴하지 않는가 → **됨 (PASS)**.

엔진 범위 CPO VERIFIED는 유지. 로그인 UI 전체 · Production · 병합은 승인 대상이 아니다.

(CTO) CPO 요청 작업: 로그인 UI 검증 제출 — S4 FAIL, S6/S2/S3/S5 PASS, 병합 보류  
(CPO) 검토·지시 필요: 예 — UI S4 증거 확인 전 병합 승인 불가
