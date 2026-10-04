# Product State / Data Model V2

**Status:** DESIGN ONLY — CPO review. No code.  
**Rule:** 새 SoT를 만들지 않는다. 기존 V3 + Living + Project 필드의 **읽기 모델**만 정의한다.

---

## 1. 데이터 흐름 (필수)

```text
Project Context
        ↓
Source
        ↓
AI Interpretation
        ↓
Evidence
        ↓
Knowledge State
        ↓
User Confirmation
        ↓
Confirmed Knowledge
        ↓
Gap State
        ↓
Stage Readiness
        ↓
Next Question
        ↓
Business Judgment
        ↓
Report
```

각 상자마다: SoT · 입력 · 출력 · 상태 · 사용자 표현.

**화살표는 구현에서 새 파이프라인을 뜻하지 않는다.**  
이미 V3 체인이 답변 턴에 대해 아래를 수행한다.

```text
submit
 → buildAnswerReview
 → updateGapStateFromReview
 → evaluateStageReadiness
 → decideNextQuestionFromReview
```

V2는 이 체인 **앞뒤의 제품 의미**를 적는다. 함수 시그니처를 바꾸라는 뜻이 아니다.

---

## 2. 계층 정의

### 2.1 Project Context

| | |
| --- | --- |
| SoT | 프로젝트 레코드. 현재 `reviewType`. V2 설계 필드 `founderPurpose`는 **미구현** |
| 입력 | 생성 화면 |
| 출력 | 질문 톤 / 결과 렌즈 가중치 (구현 Sprint) |
| 상태 | 불변에 가깝다. AI PM이 재질문하지 않음 |
| 사용자 표현 | 「사용 목적」한 줄. 폼 슬롯 「창업자」가 아님 |

기존 `reviewType`: `startup-idea` / `new-business` / `existing-strategy` / `investment-prep`.  
의미 유지. Context는 별 축이다. 이번 Phase 스키마 변경 없음.

### 2.2 Source

| | |
| --- | --- |
| SoT | 프로젝트 seed document + **별도** `title` |
| 입력 | 생성 폼 Title / Description, 첨부 |
| 출력 | 원문 전체. Interpretation 입력 |
| 상태 | 사용자가 문서를 바꾸기 전까지 고정 |
| 사용자 표현 | 헤더 Title + `[전체 사업내용 보기]` |

제약: Title SoT에 Description을 복사하지 않는다.

### 2.3 AI Interpretation

| | |
| --- | --- |
| SoT | Living claims 중 provenance `AI_INFERENCE` / 문서 추출 후 **미확인** + 서술 합성 |
| 입력 | Source, 이후 답변 |
| 출력 | 한 덩어리 서술 + 슬롯 초안 |
| 상태 | `draft` → (확인) `superseded-by-confirmed` |
| 사용자 표현 | **AI가 이해한 내용** 하나 |

PR #79 `composeUnderstoodNarrative`는 이 층의 시작이다. 슬롯에 Source substring을 넣는 것은 이 층의 위반이다.

### 2.4 Evidence

| | |
| --- | --- |
| SoT | V3 `ExtractedFact.evidenceClass` — `FACT` `INFERENCE` `ASSUMPTION` `UNKNOWN` `CONTRADICTION` |
| 입력 | AnswerReview |
| 출력 | claim별 근거 한 줄 |
| 상태 | 턴마다 append. 모순 시 해당 fact 재분류 |
| 사용자 표현 | 「근거 · 사업내용에서 확인 / 답변에서 확인 / AI 추측」 |

Evidence class **의미 변경 없음**.

### 2.5 Knowledge State

| | |
| --- | --- |
| SoT | `LivingUnderstandingState.claims[]` |
| 입력 | Source, memory, entities, turns |
| 출력 | fieldKey, value, status, provenance, confidence |
| 상태 | `known` `inferred` `confirmed` `unknown` `contradiction` `superseded` |
| 사용자 표현 | 직접 노출하지 않음. Right/Center의 재료 |

Living은 이미 「single SoT」로 문서화되어 있다. V2는 이것을 **폐기하지 않고** Confirmed의 읽기 소스로 고정한다.

### 2.6 User Confirmation

| | |
| --- | --- |
| SoT | 이벤트. 지속 상태는 아래 Confirmed / gapState |
| 입력 | 맞습니다 / 이해 수정하기 / 답변 제출 / 충돌 선택 |
| 출력 | confirmation event `{target, action, value}` |
| 상태 | 아래 §4 machine |
| 사용자 표현 | CTA 두 개 + 답변창 + (필요 시) 충돌 |

### 2.7 Confirmed Knowledge — SoT 명확화

**새 테이블/컬렉션을 만들지 않는다.**

```text
Confirmed Knowledge
  = Living claims where
      status = confirmed
      OR provenance ∈ {USER_CONFIRMED, USER_CORRECTED}
  ∪ gapState.gaps[id] where completeness = CLOSED
      (Canonical keys only for Stage 완료)
```

정렬 규칙 (이미 V3가 하는 일 — 변경하지 않음):

- 사용자 확정 값이 inference를 덮는다.
- `CONTRADICTED`는 CLOSED가 아니다.
- CLOSED는 monotonic (V3 freeze).

저장 위치:

| 런타임 | 어디에 있나 |
| --- | --- |
| 세션 | `conversation-memory` + `ai-pm-loop.gapState` + living 재계산 |
| 프로젝트 | 기존 workspace persist 스냅샷 (PR #79 경로) |

Migration 불필요. Production 데이터 변환 없음.

### 2.8 Gap State

| | |
| --- | --- |
| SoT | `GapKnowledgeState` — **FROZEN** |
| 입력 | `updateGapStateFromReview` (호출 유지, 수정 금지) |
| 출력 | gapId → `OPEN` `PARTIAL` `CLOSED` `CONTRADICTED` |
| Canonical keys | Stage A: `businessOneLiner` `customerPersona` `payer` `problemJtbd` · Stage B: `marketChannel` `alternativesCompetitors` `differentiationVsAlternatives` `validationTestability` |
| 사용자 표현 | Right 기호. gapId 문자열은 숨김 |

**gap 의미 변경 없음.** Facet(`사용 상황` 등)은 gapState 키가 아니다.

### 2.9 Stage Readiness

| | |
| --- | --- |
| SoT | `evaluateStageReadiness` — **FROZEN** |
| 입력 | gapState |
| 출력 | `stageAReady` `stageBAllowed` `currentStageFocus` |
| 상태 | A not ready → A focus. A ready → B 허용 |
| 사용자 표현 | Left ①~② 완료. ③④는 living C/D 필드의 **표시 뷰** (새 readiness 함수 없음) |

```text
사업내용 입력  ≠  stageAReady
화면 진입      ≠  Stage 완료
```

### 2.10 Next Question

| | |
| --- | --- |
| SoT | `decideNextQuestionFromReview` / `resolveNextQuestionDecision` — **FROZEN** |
| 입력 | gapState, living, last review, turns |
| 출력 | `targetGap` + questionText |
| 상태 | 한 개의 locked ask |
| 사용자 표현 | Center 「지금 확인할 것」 |

질문은 **OPEN/PARTIAL Canonical** 에서 고른다.  
확인 카드와 질문이 동시에 같은 확인을 요구하면 안 된다 (표현 규칙, 결정 함수 변경 아님).

### 2.11 Business Judgment

| | |
| --- | --- |
| SoT | 기존 analysis presenter / conversational final output / `currentJudgment` |
| 입력 | Confirmed + 가정 + UNKNOWN + (표시) Context |
| 출력 | GO / HOLD / 조건부 + why |
| 상태 | 판단 불가 / 판단 가능 |
| 사용자 표현 | 결과 화면 「현재 판단」 |

새 viability 엔진 없음. PR #79 결과 매퍼 유지.

### 2.12 Report

| | |
| --- | --- |
| SoT | 결과 view + PDF CTA 상태 (PR #79: 미지원이면 명시) |
| 입력 | Judgment + claim rows + Context 렌즈 |
| 출력 | 사실 / 가정 / 미확인 / 리스크 / 다음 검증 |
| 사용자 표현 | 결과 화면, 이후 PDF |

---

## 3. 상태 기호 매핑 (표시 전용)

V3 completeness를 바꾸지 않는다. UI 기호만 대응한다.

| 사용자 | gapState | living status | 의미 |
| --- | --- | --- | --- |
| ○ 미확인 | `OPEN` 또는 키 없음 | `unknown` | 아직 없음 |
| △ 부분 확인 | `PARTIAL` | `inferred` / `known` 미확인 | 제안·일부 |
| ● 검증 진행 | 현재 `targetGap` 또는 현재 Stage focus | — | 지금 이 칸/단계 |
| ✓ 충분히 확인 | `CLOSED` | `confirmed` | 확정 |

`CONTRADICTED`는 ✓가 될 수 없다. 충돌 UI가 해소할 때까지 △ 또는 별도 「충돌」.

---

## 4. Confirmation state machine (표현 계약)

구현하지 않는다. 현재와 기대를 적는다.

### 4.1 기대 machine

```text
S0  SOURCE_RECEIVED
      Interpretation 생성
      ↓
S1  INTERPRETATION_SHOWN     Center: AI가 이해한 내용 + 맞습니다/수정
      이벤트 CONFIRM
      ↓
S2  INTERPRETATION_CONFIRMED  카드 unmount. 서술 동의만. Canonical 자동 CLOSED 금지
      ↓
S3  ASKING                    locked ask = 1 unresolved Canonical
      이벤트 ANSWER | EDIT | CONFLICT
      ↓
S4  KNOWLEDGE_UPDATED         review → gapState → readiness
      ↓
      if stageAReady then Stage ② focus
      else S3 next unresolved
      ↓
S5  JUDGMENT_AVAILABLE        결과 CTA
S6  REPORT
```

금지 전이:

```text
S2 → S1     같은 Interpretation 카드 재표시
S3 → S1     답변 후 맞습니다 카드로 리셋
S0 → ①✓    입력만으로 사업 정의 완료
```

### 4.2 현재 Production (관측)

```text
현재 상태     UnderstandingPhase = pending
              CurrentUnderstandingBlock + document-first-card 동시 존재
현재 이벤트   understanding-confirm-yes / 맞습니다
현재 기대     S2 후 S3 only
현재 실제     phase=accepted 여도 이해 UI + composer 확인 CTA가 남을 수 있음
```

```text
현재 상태     ASKING (답변창 존재)
현재 이벤트   맞습니다 (composer)
현재 기대     해당 질문이 아님 — 확인은 S1에서 끝
현재 실제     동일 확인이 재렌더됨
```

코드 수정은 구현 Sprint. 이 표가 그 Sprint의 인수 계약이다.

### 4.3 답변 턴 (이미 V3 — 변경 없음)

```text
ANSWER
 → AnswerReview
 → gapState
 → StageReadiness
 → NextQuestion
```

V2는 이 턴 전후에 **S1 카드가 끼어들지 못하게**만 규정한다.

---

## 5. Title / Description 상태

```text
project.title        = Project Title
project.sourceText   = Business Description 전체
display.header       = title || "이름 없는 프로젝트"
display.sourcePanel  = sourceText  (접힘, 비절단이 기본)
display.interpretation = compose(living)  ≠  sourceText.slice
```

현재 결함: `projectName`에 seed 앞줄이 들어오는 경로.  
설계 수정은 표시 계약. 스키마 migration 아님 (필드가 이미 둘로 있음).

---

## 6. Architecture Acceptance

| # | 질문 | 답 |
| --- | --- | --- |
| 7 | Source vs Interpretation | §2.2–2.3. 원문 접힘 / 서술 이해. 동일 문자열 금지 |
| 8 | Confirmed 저장 | §2.7 living confirmed ∪ gapState CLOSED. 신규 SoT 없음 |
| 9 | Stage 완료 | §2.9 `stageAReady` / B required. 진입 ≠ 완료 |
| 10 | Gap | Canonical V3 키 + 표시 Facet. Facet은 완료 게이트 아님 |
| 11 | Next Question | CLOSED가 아닌 Canonical에서 V3 decision. 확인 카드와 분리 |
| 12 | V3 연결 | 흐름 §1 = 기존 체인에 제품 이름을 붙인 것. 함수 변경 없음 |

---

## 7. STOP 점검 (이 설계)

| STOP | 판정 |
| --- | --- |
| V3 SoT 변경 필요 | **아니오.** 읽기 매핑만 |
| Auth 변경 필요 | **아니오** |
| AI accuracy runtime 변경 | **아니오** |
| 기존 gap state 의미 변경 | **아니오.** 기호 매핑만 |
| Production data migration | **아니오** |
| PR #79 수정 필요 | **아니오.** 구현은 승인 후 신규 Sprint |
| Stage/GAP vs Accuracy Matrix 충돌 | **아니오.** `사용 상황` 등 Facet은 required에 안 넣음 |
| Confirmed Knowledge SoT 불명확 | **아니오.** §2.7 |

해당 STOP 없음. 구현 Sprint가 required gap을 늘리려 하면 그때 STOP.

---

## 8. 기존 문서와의 관계

| 문서 | 관계 |
| --- | --- |
| `V3_LOGIC_FREEZE.md` | 준수. 결정 모듈 비변경 |
| `understanding-contract.ts` Domain 01–20 | 필드 키 유지. 폼으로 노출 금지 |
| `WORKSPACE_IA.md` 2-column | 제품 IA는 V2 3-column이 승계. V3 비영향 |
| PR #79 UX recovery | Production 유지. V2는 그 위의 역할 정리 |

Code change: **NONE**
