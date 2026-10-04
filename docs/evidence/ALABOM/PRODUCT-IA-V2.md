# Product IA V2 — ALABOM Information Architecture

**Status:** DESIGN ONLY — CPO 2차 보완. No code.  
**Production:** PR #79 (`ecdec53`) remains live and untouched.  
**Scope:** Founder가 사업을 입력한 뒤 사업성 판단/보고서를 받을 때까지 **무엇을 보고, 확인하고, 검증하는지**.

제품 기본 흐름:

```text
입력 → AI 이해 → 검증 → 판단 → 결과
```

이 문서는 아이디어가 아니라 **구현 Sprint가 바로 쪼갤 수 있는 IA 계약**이다. 이번 Phase는 코드 없음.

---

## 0. Freeze

| 유지 | 이번 Phase 금지 |
| --- | --- |
| V3 SoT (`buildAnswerReview`, `updateGapStateFromReview`, `gapState`, `evaluateStageReadiness`, `decideNextQuestionFromReview`) | 코드 수정 |
| Accuracy Sprint gap 의미 | 새 V3 gapId 추가 |
| Auth / OAuth | Production 데이터 변경 |
| PR #79 Production | Cherry-pick / hotfix |

IA 변경은 **표현 계층(Presentation / Product IA)** 에서만 정의한다.  
런타임 결정 계층은 읽기만 하고, 구현 Sprint는 CPO 승인 후에만 연다.

---

## 1. 한 문장

ALABOM Workspace는 보고서를 읽는 곳이 아니다.  
**AI PM이 Source를 해석하고, Founder가 확인하고, 확인된 지식으로 단계를 닫고, 그 결과로 사업성을 판단하는 곳**이다.

사용자는 사업/고객/시장/경쟁 폼을 채우지 않는다.  
사용자는 **사업내용**을 주고, **맞습니다** 또는 **이 부분은 다릅니다**로 검증한다.

---

## 2. 현재 IA가 깨진 지점 (CEO Production)

| ID | 현재 | 문제 | V2 |
| --- | --- | --- | --- |
| P0-1 | 헤더/제목이 사업내용 앞부분을 사용 | 프로젝트명과 사업내용이 한 덩어리 | Title ≠ Description |
| P0-2 | 슬롯 값이 원문 truncation | AI 이해 = Source 잘라붙임 | Source / Interpretation / Confirmed 3원 분리 |
| P0-3 | 「현재까지 이렇게 이해했습니다」+「제가 이렇게 이해했습니다」 | AI가 두 명 | 사용자 노출명 하나: **AI가 이해한 내용** |
| P0-4 | 입력 직후 「사업이해 ✓」 | 화면 진입 = 단계 완료 | 단계 완료 = 핵심 정보 확보 |
| P0-5 | 중앙·우측이 같은 문장 반복 | 역할 붕괴 | Left=위치, Center=지금, Right=얼마나 |
| P0-6 | 맞습니다 → 같은 확인 카드 재등장 | 상태 전이가 없음 | Confirm은 한 번, 다음은 unresolved gap |

---

## 3. 정보 객체 (사용자에게 보이는 것)

### 3.1 Project Title

```text
Project Title
= 사용자가 프로젝트 생성 때 입력한 이름
≠ 사업내용 첫 줄
≠ AI 한 줄 이해
```

표시: GNB / 헤더 한 줄. truncation은 **제목에만** 허용.  
제목이 비면 placeholder `이름 없는 프로젝트` — 사업내용을 제목으로 승격하지 않는다.

### 3.2 Source (사업 원문)

```text
SOURCE
= 사용자가 입력/첨부한 원문 전체
```

표시: `[전체 사업내용 보기]` 접힘. 임의 말줄임으로 핵심을 대체하지 않는다.  
AI 이해 칸에 Source를 붙여 넣지 않는다.

### 3.3 AI Interpretation

```text
AI INTERPRETATION
= AI가 Source(+이후 답변)를 분석해 이해한 서술
≠ Source substring
```

사용자 노출 명칭은 단 하나다.

```text
AI가 이해한 내용
```

내부 별칭(`document-first`, `current-understanding`, `shared understanding`)은 엔지니어링 전용.

올바른 예 (양조장 — 설계 예시, 하드코딩 정답 아님):

```text
AI가 이해한 내용

전통주·양조장 체험을 원하는 내국인 및 외국인 관광객에게
양조장 체험과 주변 관광을 연결하는 서비스로 이해했습니다.

근거
사업내용에서 확인
```

잘못된 예:

```text
사업
다양한 관광객이 늘며, 개인별 다양한...
```

### 3.4 Confirmed Understanding

```text
CONFIRMED UNDERSTANDING
= 사용자가 맞습니다 / 수정 후 확정한 지식
```

Interpretation을 확인하기 전에는 Confirmed가 아니다.  
문서에서 읽힌 값은 **제안**이지 완료가 아니다.

### 3.5 Evidence class (이미 V3에 존재 — 의미 변경 없음)

사용자 카피:

| 사용자 | V3 `EvidenceClass` / provenance |
| --- | --- |
| 확인된 사실 | `FACT` + `USER_CONFIRMED` / `USER_CORRECTED` / `DOCUMENT`(사용자 원문 명시) |
| AI의 가정 | `ASSUMPTION` |
| AI가 추측한 내용 | `INFERENCE` / `AI_INFERENCE` |
| 아직 모름 | `UNKNOWN` / gap `OPEN` |
| 서로 다름 | `CONTRADICTION` / `CONTRADICTED` |

### 3.6 Founder Context — 입력 / 보존 / 소비 계약

Founder Context는 “나중에 정의할 역할”이 아니다.  
**프로젝트 생성 때 이미 받는 값을, AI PM과 결과가 끝까지 읽는 Context**다.

새 컬럼·새 테이블·새 V3 키·DB migration **없음**.

#### 입력 (이미 존재)

```text
화면   apps/web/features/my-projects/components/my-projects-home.tsx
필드   <input name="reviewType">
값     startup-idea | new-business | existing-strategy | investment-prep
필수   createMyProjectAction이 isReviewType()로 거부
```

구현 Sprint 1에서 라디오 **값(enum)은 유지**하고, 사용자 라벨만 Founder Context 언어로 바꾼다 (i18n). 새 입력 컨트롤을 추가하지 않는다.

| `reviewType` (SoT 값) | 사용자 라벨 (카피) | 렌즈 |
| --- | --- | --- |
| `startup-idea` | 예비창업자 · 초기 대표 | 실행 가능성, 첫 검증 |
| `new-business` | 기존 사업 운영자 | 진입, 수익, 기존 사업 충돌 |
| `existing-strategy` | 사업전략 담당자 | 시장 / 경쟁 / 차별 |
| `investment-prep` | 투자검토 | 리스크, 경제성, HOLD 이유 |

`예비창업자`와 `초기 스타트업 대표`를 **서로 다른 enum으로 쪼개지 않는다.** 같은 `startup-idea` 렌즈다. 쪼개려면 이후 CPO 승인 하에 `REVIEW_TYPES`에 값 하나를 더하는 최소 변경이며, 새 저장소가 아니다. 구현 Sprint 1 범위 밖.

#### 보존 (이미 존재)

```text
쓰기    createMyProjectAction
        → createOwnedProject.onboardingContext.sprint12
        → buildInitialInterviewState(reviewType, summary)

경로    project.onboarding_context.sprint12.reviewType
타입    Sprint12InterviewState.reviewType
읽기    parseInterviewBundle(project.onboardingContext).sprint12?.reviewType
기본값  없거나 파싱 실패 → startup-idea
```

`onboarding_context` JSON은 이미 프로젝트 행에 있다. 마이그레이션 없음.

#### 소비 (구현 Sprint 1 — presenter only, V3 결정 함수 금지)

```text
AI PM 질문 카피 / 「왜 이 질문인가요」
  read  reviewType
  write 없음 (decideNextQuestionFromReview 입력에 넣지 않음)

Right 「판단 가능 여부」 부가 문장
  read  reviewType
  write 없음

④ 결과 · 보고서 섹션 순서
  read  reviewType
  write 없음
        startup-idea      → 다음 실행 / 첫 검증 먼저
        new-business      → 진입 / 수익 / 충돌 먼저
        existing-strategy → 시장 / 경쟁 / 차별 먼저
        investment-prep   → 리스크 / 경제성 / HOLD 먼저

재질문 금지
  Center에서 Founder Context를 다시 묻지 않음
```

`BusinessUnderstanding.founder` 필드는 문서에서 읽힌 **창업자 언급**이다. Founder Context(검토 관점)와 다른 객체다. 섞어 쓰지 않는다.

---

## 4. 3 Column — 역할이 곧 IA

`docs/WORKSPACE_IA.md`의 2-column freeze는 **이 V2가 제품 IA를 승계**한다.  
PR #79가 이미 3열을 그렸으므로, V2는 그 열의 **중복을 제거하고 역할을 고정**한다. V3 로직 freeze와 무관하다.

```text
LEFT   = WHERE              어디에 있는가
CENTER = NOW                지금 무엇을 이해하고 묻는가
RIGHT  = HOW MUCH VERIFIED  얼마나 검증되었는가
```

동일 서술(한 줄 이해, 원문 앞부분)을 Center와 Right에 동시에 두지 않는다.

| 열 | 담는 것 | 담지 않는 것 |
| --- | --- | --- |
| Left | ①~④ 단계, 현재 위치, 단계 상태 기호 | 질문 본문, 원문, 슬롯 값 |
| Center | AI가 이해한 내용 → 확인/수정 → 현재 질문 → 답변 | 전체 gap 체크리스트, 단계 목록 반복 |
| Right | gap별 확인 상태, n/m 확인, 현재 단계, 판단 가능 여부 | AI 서술 전문, 질문 카드 복제 |

---

## 5. Stage IA

사용자 Stage (V2):

```text
① 사업 정의                         V3 Stage A — Canonical gap 완료
② 시장 검증                         V3 Stage B — Canonical gap 완료
③ 사업성 판단에 필요한 정보 확인/종합  새 required gap 없음. 종합 화면
④ 결과                              판단 + 보고서
```

**③은 새로운 검증 Stage가 아니다.**  
①②에서 닫힌 지식(+ living Facet 표시)을 **판단 재료로 모아 보여주는 화면**이다.

```text
③ = 실제 C-stage required-gap 검증 단계  ❌ 금지
③ = A/B 확보 정보로 사업성을 판단하기 위한 확인/종합  ✅
```

**완료 기준:** ①②는 Canonical 확보. ③은 자체 readiness SoT가 없다. ④는 기존 판단 산출물. 화면 진입 ≠ ①② 완료.

```text
사업내용 입력  ≠  사업 정의 완료
```

### 5.1 상태 기호

```text
○ 미확인
△ 부분 확인
● 검증 진행   (이 Stage가 지금 초점)
✓ 충분히 확인
```

Left의 Stage 기호와 Right의 gap 기호는 같은 네 값을 쓴다.

### 5.2 Stage ↔ V3 연결 (의미 변경 없음)

V3 `ProductStageId` / readiness는 그대로 둔다.

| V2 Stage | V3 | 완료 조건 (표현) | 런타임 조건 (읽기 전용) |
| --- | --- | --- | --- |
| ① 사업 정의 | `A_understanding` | Stage A required 4개가 충분히 확인 | `evaluateStageReadiness.stageAReady` — `businessOneLiner`, `customerPersona`, `payer`, `problemJtbd` 모두 `CLOSED` |
| ② 시장 검증 | `B_validation` | Stage B required 4개가 충분히 확인 | `STAGE_B_REQUIRED_GAPS` 전부 `CLOSED` |
| ③ 확인/종합 | 없음. `C_risk`를 required로 승격하지 않음 | **완료 게이트 없음.** A/B 지식을 한 화면에 종합 | living Facet(`revenueModel`, `pricingHint`, `executionConstraints`, `topRisks`) **표시만**. `evaluateStageReadiness`에 stageC 추가 금지 |
| ④ 결과 | `D_decision` 산출물 | 판단 화면이 존재 | 기존 결과 presenter / `currentJudgment` — 새 엔진 없음 |

③ 진입: V3 `stageAReady` 그리고 Stage B required가 CLOSED이거나, Founder가 결과로 가려 할 때 종합 한 박자.  
③에서 새 질문을 강제하지 않는다. 비어 있는 Facet은 Right에 ○로만 보이고, ④ 판단을 새 gap으로 막지 않는다.  
`stageCReady` 같은 새 SoT를 만들지 않는다.

입력 직후 Left는 이렇게 보여야 한다.

```text
① 사업 정의   ●
② 시장 검증   ○
③ 확인/종합   ○
④ 결과       ○
```

「사업 정의 ✓」가 되면 안 된다.

---

## 6. Sub-gap 카탈로그 — 설계 검증용

CPO가 준 목록을 **구현하지 않는다.**  
아래는 **표시 단위**와 **V3/living 키 매핑**이다.

범례:

- **Canonical** — 기존 V3 `gapState` 키. Next Question SoT. 의미 변경 금지.
- **Facet** — 기존 living/memory 필드의 표시 별칭. 새 `gapId` 아님. Stage 완료를 강제하지 않음.

### ① 사업 정의

| 표시 | 매핑 | 종류 | Stage ① 완료에 필요 |
| --- | --- | --- | --- |
| 사업/제품 | `businessOneLiner` | Canonical | Yes |
| 실제 사용자 | `customerPersona` | Canonical | Yes |
| 핵심 문제 | `problemJtbd` | Canonical | Yes |
| 결제자 | `payer` | Canonical | Yes |
| 사용 맥락 | `problemFrequencySeverity` 등에서 파생 | Facet | No |

`사용 맥락`을 Stage A required에 넣으면 Accuracy Matrix / `evaluateStageReadiness`와 충돌한다. **넣지 않는다.** Right에는 ○/△로 보여줄 수 있으나, 이 칸이 비어도 ① 완료를 막지 않는다.

### ② 시장 검증

| 표시 | 매핑 | 종류 | Stage ② 완료에 필요 |
| --- | --- | --- | --- |
| 시장 / 채널 | `marketChannel` | Canonical | Yes |
| 기존 대안 | `alternativesCompetitors` (대안 측면) | Canonical — **한 키** | Yes (경쟁과 동일 SoT) |
| 경쟁 | `alternativesCompetitors` (경쟁 측면) | Canonical — **한 키** | Yes |
| 차별성 | `differentiationVsAlternatives` | Canonical | Yes |
| 검증 가능성 | `validationTestability` | Canonical | Yes |

기존 대안과 경쟁을 두 개의 신규 `gapId`로 쪼개지 않는다. Right는 두 줄로 보여줄 수 있으나 Completeness는 `alternativesCompetitors` 하나다.

### ③ 확인/종합 (표시 Facet — required 아님)

| 표시 | 매핑 | 종류 |
| --- | --- | --- |
| 지불 의향 | `payer` 확인 + 답변 서술 | Facet (결제자는 ① Canonical) |
| 가격 | `pricingHint` | Facet |
| 결제 가능성 | `payer` + `pricingHint` 합성 | Facet |
| 수익모델 | `revenueModel` | Facet |
| 반복 사용/구매 | living / 답변 파생 | Facet |
| 고객획득 | `marketChannel` 파생 | Facet |
| 경제성 | 수익·가격·payer 합성 | Facet |
| 시장 진입 가능성 | `marketChannel` + `executionConstraints` | Facet |

③ 카탈로그는 **종합 화면의 표시 목록**이다. Stage 완료 집합이 아니다.  
강제 게이트는 기존 final integrity / handoff를 읽기만 한다.

### ④ 결과 (gap이 아님 — 산출물)

```text
현재 사업성 판단
확인된 사실
AI의 가정
아직 모르는 것
핵심 리스크
추가 검증해야 할 것
다음 실행/검증 항목
Founder Context에 맞춘 보고서
[보고서] → 향후 PDF 생성
```

이미 PR #79 결과 view가 뼈대를 가진다. V2는 **추가 검증 / 다음 실행 / Context 렌즈 / PDF 연결점**을 같은 산출물에 고정한다. 새 판단 엔진 없음.

---

## 7. 「창업자 / 사업 / 고객 / 시장 / 경쟁」의 역할

이것들은 **입력 폼 필드가 아니다.**  
AI가 아래로부터 **추출**하는 지식 슬롯이다.

```text
Source
+ 사업계획서(있으면)
+ 사용자 답변
        ↓
창업자(Context) / 사업 / 고객 / 시장 / 경쟁
        ↓
FACT | ASSUMPTION | INFERENCE | UNKNOWN
        ↓
사용자 확인/수정
```

수정 UX는 빈 양식 재작성이 아니다. **AI가 채운 이해를 고친다.**

---

## 8. 왜 이 IA가 AI PM을 필요로 하는가

Founder는 자기 사업을 이미 알고 있다고 느낀다.  
실제로 비는 것은 **확인된 지식과 가정과 모름의 경계**다.

AI PM의 존재 이유:

1. Source를 Interpretation으로 바꿈 (복붙 금지)
2. 무엇이 사실/가정/모름인지 표시
3. 닫히지 않은 Canonical gap만 질문
4. 확인된 지식만으로 사업성 판단을 만듦

사용자가 사업/고객/시장/경쟁을 처음부터 모두 쓰는 제품은 **폼**이다.  
ALABOM은 **확인 루프**다.

---

## 9. 최종 판단이 나오는 정보

```text
Confirmed Knowledge (Canonical gaps + 사용자 확정 claim)
+ 명시된 가정 (INFERENCE / ASSUMPTION)
+ 남은 UNKNOWN
+ Project Context 렌즈
        ↓
현재 판단 (GO / HOLD / 조건부)
+ 확인된 사실
+ AI의 가정
+ 미확인 사항
+ 핵심 리스크
+ 다음 검증
```

점수도, 답변 개수도, 화면 체류도 판단 SoT가 아니다.

---

## 10. Acceptance — IA가 답하는 질문

1. **어디까지 왔는가** — Left Stage + Right `n/m 확인`
2. **왜 다음이 아닌가** — Right에 비어 있는 Canonical gap
3. **AI가 무엇을 이해했는가** — Center `AI가 이해한 내용` (Interpretation)
4. **무엇을 추측했는가** — 가정/추측 라벨 (INFERENCE/ASSUMPTION)
5. **사용자가 확인할 것** — 현재 질문 하나, 또는 첫 Interpretation 확인
6. **아직 모르는 것** — Right ○ 항목
7. **Source vs Interpretation** — 원문은 접힘, 이해는 서술
8. **Confirmed 저장** — 새 DB 없음. living `confirmed` + `gapState.CLOSED` (State Model)
17–18. **열 역할 / 비중복** — §4
19. **맞습니다 반복 불가** — Journey / State Model의 confirmation machine

---

## 11. V3 / PR #79 영향

| 항목 | 판정 |
| --- | --- |
| V3 SoT | **NONE** — 매핑만. gap 의미·required 집합 불변 |
| Accuracy Matrix | **충돌 없음** — 신규 required gap 없음. Facet은 표시 전용 |
| PR #79 | **NONE** — Production 유지. 구현은 승인 후 별도 Sprint |
| Confirmed Knowledge SoT | **명확** — 신규 스토어 없이 기존 living + gapState 뷰 |

STOP 조건 해당 없음.

---

## 12. CPO 5항목 자체검토

| Check | 질문 | 이 IA의 답 | 판정 |
| --- | --- | --- | --- |
| 1 | 사업내용 3~4줄 입력 = 사업 정의 완료인가? | 아니오. ① 완료는 Canonical 4키 `CLOSED`만. 입력 직후 Left는 ① ● | **PASS** |
| 2 | Source / Interpretation / Confirmed가 분리되는가? | §3.2–3.4. 원문 접힘, 이해 서술 하나, Confirmed는 사용자 확정만 | **PASS** |
| 3 | Left / Center / Right가 같은 내용을 반복하지 않는가? | WHERE / NOW / HOW MUCH. 서술 전문은 Center만 | **PASS** |
| 4 | 맞습니다 → 카드 제거 → 다음 unresolved → 다음 질문인가? | C1은 카드 unmount만. C2(답변)가 해당 gap CLOSED. 카드 재렌더 금지. State Model §4 | **PASS** |
| 5 | V3 SoT 변경 없이 구현 가능한가? | required gap 추가 없음. living ∪ gapState 뷰. presenter/unmount만 | **PASS** |
