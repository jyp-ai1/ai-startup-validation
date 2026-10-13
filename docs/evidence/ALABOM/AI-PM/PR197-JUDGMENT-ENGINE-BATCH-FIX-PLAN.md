# PR #197 AI PM 판단 엔진 — 실패 분기점과 일괄 수정안

**상태:** 원인 분석 · 수정 계획 제출. 구현 아님.  
**PR:** #197  
**시나리오 문서:** `docs/product/ai-pm-closed-conversation-scenarios.md` (동결, SHA `5263e83e`)  
**시나리오 패키지:** `03415eed`  
**이전 증상 로그:** `20eb6985` (`PR197-R1-R4-ENGINE-PROBE.json`) — 여기서 반복하지 않음  
**이번 단계 추적:** `PR197-V3-STAGE-TRACE.json` · `pr197-v3-stage-trace.test.ts`  
**Production:** `0b465226` · 코드 변경·병합·배포 금지  
**FIX-10 플래그:** `isAiPmJudgmentFix10V1Active()` 기본값 `true` (추정 아님)

이전 패키지는 “무엇이 틀렸는지”를 적었다. 이 문서는 **어느 V3 단계가 맞고, 어느 단계가 그것을 덮는지**, 그리고 **같은 구멍을 두 번 고치지 않는 최소 수정**을 확정한다.

---

## 0. 추적한 흐름

```
Answer
  → interpretAnswerSemantics
  → buildAnswerReview (gapVerdicts, recommendedAction)
  → updateGapStateFromReview (CLOSED monotonic)
  → gapState
  → evaluateStageReadiness (Stage A: businessOneLiner → customerPersona → payer → problemJtbd)
  → decideNextQuestionFromReview          ← V3 본결정
  → applyNoAskPolicy
  → applyJudgmentNextQuestionBinding      ← FIX-10 덮어쓰기
  → applyAntiRepeatPolicy
  → lastDecision
  → CEO surfaces (simple presenter WHY_BY_GAP, MCQ options)
```

CEO 화면에 내부 ID·점수를 노출하는 수정은 범위 밖이다.

---

## 1. R1–R4 — 단계별 분기 (실행 증거)

### R1 고객 선택 후 문제 재질문 — **FAIL**

S1 실행 입력: 문제=`주문과 배송을 따로 관리해야 함` → 고객=`반찬가게`.

| 단계 | 실제 | 기대와의 관계 |
|---|---|---|
| interpret | `VALID`, `mergeable`, fact=`problem` 그다음 `customer` | 맞음 |
| buildAnswerReview | T1 `problemJtbd=CLOSED`, `advance`. T2 `customerPersona=CLOSED` + 이전 문제 CLOSED 유지, `advance` | 맞음. CLOSED 지식 보존됨 |
| gapState | T2 후 problem CLOSED, customer CLOSED, **payer OPEN**, businessOneLiner OPEN | 맞음 |
| readiness | Stage A NOT_READY. blocker=`businessOneLiner` | 설계값. payer가 다음 핵심 공백인데 blocker가 한 줄 정의 |
| decideNext (raw) | T2 후 target=`businessOneLiner` 「이 사업은 누구에게 무엇을 제공하나요?」 | **이미 빗나감.** Stage A 배열 첫 OPEN이 payer가 아님 |
| No-Ask | raw 유지 | 덮지 않음 |
| FIX-10 binding | target=`problemJtbd`, confirm `핵심 불편은 「주문」으로 이해했습니다. 맞나요?` | **올바른 V3/raw를 덮음.** 원인 함수: `applyJudgmentNextQuestionBinding` → `buildJudgmentBoundQuestion` |
| 최종 lastDecision | 위 confirm | FAIL |

**갈라지는 단계:** 두 곳. (1) `pickNextRequiredGap`이 document에 이미 있는 `businessOneLiner`를 payer보다 앞세움. (2) FIX-10이 gapState CLOSED인 문제를 `judgment.problem=needs_check` + `PRIMARY: 주문`으로 보고 재CONFIRM.

**덮어쓰기:** 있음. `overwrite=true`. raw=`businessOneLiner` → FIX-10=`problemJtbd` confirm.

**중복 수정 금지:** No-Ask는 이 경로에서 confirm을 만들지 않았다. 이전 패키지의 “No-Ask와 FIX-10을 둘 다 고친다”는 **중복**이다. confirm 문구의 단일 생성점은 `buildJudgmentBoundQuestion` (clipConfirm + `extractProblemPrimaryText` → `PRIMARY: 주문`).

**CLOSED 보존:** gapState.problem은 CLOSED로 남는다. FIX-10이 화면만 되돌린다. 지식은 지워지지 않고 **재질문으로 오염**된다.

### R2 결제 증거 유무 — **FAIL**

입력 A: `이미 결제 3건이 있어 고객이 돈을 내고 있습니다.`  
입력 B: `아직 실제 결제·사용 증거는 없습니다.`

| 단계 | A | B |
|---|---|---|
| interpret | `mergeable=false`, quality=PARTIAL, factKey=`diffRelevance`, rationale=「왜 중요한지 근거 부족」 | **동일** |
| review | `validationTestability=OPEN`, `probe` | 동일 |
| gapState | 변화 없음 | 동일 |
| judgment | customerChange=`unknown`, 동일 결론 | 동일 |
| rawNext | 같은 validation 재probe | 동일 |
| FIX-10 | 둘 다 customerPersona로 덮음 | 동일 |

**갈라지는 단계:** `interpretAnswerSemantics` `askedGap==='validationTestability'` — `hasDiffRelevanceEvidence()` 실패 시 결제 문장을 버리고 Memory/판단에 넣지 않음. `dimensionsFromAnswerText`는 결제 유무를 customerChange로 매지 않음.

**덮어쓰기:** 있음. 설령 판단이 달랐어도 FIX-10이 다음을 고객 질문으로 고정한다. 그러나 **판단 차이 자체는 interpret/extract에서 이미 소실**된다.

**중복 수정 금지:** interpret와 judgment를 둘 다 “결제 Fact로 승격”하면 가드 3·4를 깨뜨린다. 일괄안은 **판단 차원만** 갱신하고 Memory Fact는 열지 않는다.

### R3 다음 질문의 사업별 적응 — **FAIL**

R1과 **같은 덮어쓰기**가 원인이다. 별도 엔진이 아니다.

추가 실행:

- S2–S6 follow-engine은 T2에서 `customerPersona` 반복. 답 템플릿은 `필요로 하는 사람은 …`이라 gapState는 닫힐 수 있으나, `judgment.customer`는 `CUSTOMER_CUE_RE`(반찬/꽃집/소상공인/양조 등)에 없으면 `unknown`으로 남음 (**추정 아님:** S2–S6 프로브에서 customer status=`unknown`).
- Presenter `WHY_BY_GAP.customerPersona`가 whyNow를 「누구를 위한 사업인지 확인하려고 합니다」로 교체. Decision이 고쳐져도 **화면 why가 다시 고정**될 수 있다.

**갈라지는 단계:** Decision 덮어쓰기 + Presenter why 고정. Semantic/Review는 S1에서 맞음.

### R4 전통주 대안 — **FAIL** (V3 밖)

`buildBusinessChoiceQuestion` → `extractStatusQuo`가 `문제:` 줄을 `지금은 ${problemLine}`로 넣음. 질문 문구는 `gap-question-map` 고정 「비슷한 역할을 이미 하고 있는 서비스가 있나요?」.

Review/gapState/FIX-10과 **무관**. 판단 엔진과 겹쳐 고치지 않는다.

대안 답이 차별 판단에 반영되는지는 이 경로에서 **NOT VERIFIED** (엔진이 대안 턴까지 도달하지 못함).

---

## 2. 핵심 가드 — 계층 · 규칙 · 공백

| # | 가드 | 적용 계층 | 입력 조건 | 상태 규칙 | 실패 경로 | 기존 테스트 | 판정 |
|---|---|---|---|---|---|---|---|
| 1 | `아직 모르겠음` ≠ Fact | interpret (`unknown_signal`, mergeable false) | `아직 모르겠습니다.` | Memory 미병합, 턴만 저장 | 없음 (실행 PASS) | real-loop it 3, journey unknown payer, MCQ E | **PASS** |
| 2 | 고객 선택 ≠ 구매자·의향·지불 | review AC10: payer는 명시적 지불자만 CLOSED | 고객 답 | payer gap OPEN 유지 (S1 T2 gapState.payer=OPEN) | 고객 cue가 payer 문장을 만들면 오닫힘 가능 | journey unknown payer | **PASS** (S1 실행). 고객→payer 오닫힘은 관측 없음 |
| 3 | 결제 의향 ≠ 지불 사실 | **없음** | 결제 3건 vs 아직 없다 | 둘 다 미반영 | interpret가 둘 다 PARTIAL discard | real-loop it 6, MCQ F — 「검증 완료가 아님」만 assert → **거짓 통과** | **FAIL** |
| 4 | 지인 1회 ≠ 반복 수요 | 가드 3과 동일 구멍 | 지인 1회 | 판단 불변 | 승격도 약증거도 없음 | 전용 테스트 없음 | **FAIL** |
| 5 | 모순 시 동시 Fact 금지 | review: CONTRADICTORY→CONTRADICTED. correction 시맨틱 | S4 「사실은…20대」 | intent=`correction`, customer=`unknown`, contradicted 상태 없음 | deriveGapCompleteness가 CONTRADICTED를 안 냄 | recovery2 J4 등 다른 사업 | **FAIL** (S4 실행). 기존 CLOSED 고객을 superseded로 표시하는 테스트 없음 |
| 6 | 한쪽 면 ≠ 플랫폼 검증 완료 | 결론 빌더가 증거 없이 GO를 안 만듦 | 공급 0 + 결제 0 | 기본 「정보 부족」. 양면 HOLD 아님 | GO 문구는 없음 | 전용 테스트 없음 | **PASS (약함)** |
| 7 | 미확인 증거 ≠ GO | 결론 빌더 | 전 시나리오 | GO 미관측 | 가드 3이 열리면 과대 GO 위험 | MCQ A/F | **PASS (약함)** — GO 방지이지 판단 갱신은 아님 |

---

## 3. 기존 테스트 vs 미검증

**있는 테스트 (통과가 시나리오 8턴이 아님)**

| 테스트 | 실제 보장 | 구멍 |
|---|---|---|
| `ai-pm-mcq-business-understanding` A–G | 라벨 사업별, unknown 미승격, 「검증 완료」 금지 | D는 **옵션 재노출**만. R1 next confirm 미검출 |
| `ai-pm-mcq-journey` | 문제 선택 후 next≠같은 problem 옵션 | 고객 다음 턴 미검증 |
| `ai-pm-mcq-real-loop` 1–7 | throughLoop 경로 | it 6은 결론이 GO가 아닌지만 봄. 유무 차이 없음 |
| recovery2 P0-1/P0-2 | 사업 confirm, 고객 정정(관광) | S4 구독 모순 상태 머신 없음 |
| `pr197-cpo-engine-probe` / `pr197-v3-stage-trace` | 실패 재현·단계 덤프 | 기대를 PASS로 assert하지 않음 |

**미검증 (NOT VERIFIED)**

- 로그인 UI 8턴
- UI `submitAnswer` 자유 입력 (throughLoop 기타는 FAIL)
- S2 T5 이후 대안 답이 차별 판단에 반영되는지
- S3 빈도 모름 8턴, S6 양면 HOLD를 인식하는지
- 수정 후 회귀 (아직 코드 없음)

---

## 4. 일괄 수정 범위 (중복 없음)

한 실패를 여러 파일에 나눠 고치지 않는다. 계층당 한 책임.

| 레버 | 파일 · 함수 | 고치는 실패 | 하지 않는 것 |
|---|---|---|---|
| **A. 덮어쓰기 게이트** | `ai-pm-judgment-next-question-binding.ts` — `isFix10DimensionUnresolved`, `applyJudgmentNextQuestionBinding`, `buildJudgmentBoundQuestion` | R1, R3 | gapState가 CLOSED인 차원을 미해결로 보지 않음. CLOSED 문제를 confirm으로 되돌리지 않음. `payer`를 “항상 off-track”으로 두지 않음(고객+문제 CLOSED일 때). No-Ask를 건드리지 않음 |
| **B. Stage A 다음 공백** | `decide-next-question-from-review.ts` — `pickNextRequiredGap` | R1 raw가 businessOneLiner로 가는 것, R3 | document/living에 한 줄이 있으면 `businessOneLiner`를 건너뛰고 **payer**를 고름. STAGE_A 배열 자체를 폐기하지 않음 |
| **C. 결제 증거 → 판단만** | `ai-pm-judgment-aggregation.ts` — `applyAnswerToJudgment` / `dimensionsFromAnswerText` | R2, 가드 3·4 | 증거 없음=`customerChange` 미확정(명시). 결제 N건=약증거 `needs_check`, Fact/GO 아님. 지인 1회=약증거·반복 수요 아님. `interpretAnswerSemantics` mergeable을 열어 Memory Fact로 올리지 않음 |
| **D. 화면 why** | `ai-pm-simple-question-presenter.ts` — `buildWhySummary` | R3 표시 | `WHY_BY_GAP`은 해당 gap이 아직 OPEN일 때만. 닫힌 고객에 「누구를 위한 사업인지」 금지 |
| **E. 대안 MCQ** | `build-business-choice-question.ts` — `extractStatusQuo` (+ 질문 문구 overlay) | R4 | 문제 줄 재사용 삭제. 확인된 문제에 묶인 우회 행동만. V3/FIX-10 미변경 |

**명시적으로 이번 배치에서 빼는 것**

- `ai-pm-no-ask-policy.ts` (R1 confirm의 생성점이 아님)
- V3 review/gapState 재작성
- Journey/Agent 계약 변경
- 엔진 교체, 새 화면, CEO 노출용 점수

**S4 모순:** 별도 작은 레버. `deriveGapCompleteness`가 correction+충돌을 CONTRADICTED로 남기고, 이전 customer Fact를 superseded. `build-answer-review.ts` 한 함수. R1–R4와 겹치지 않음. 이번 일괄의 **부가 항목**으로만 제안.

---

## 5. 수정 후 예상되는 S1–S6 변화

시나리오 기대(`5263e83e` 본문)를 낮추지 않는다. 아래는 레버 A–E 적용 시 **예상**이며 실행 PASS가 아니다.

| 시나리오 | 지금 | 수정 후 예상 |
|---|---|---|
| S1 | T2 다음=문제 「주문」 confirm | T2 다음=구매자/도입 결정자. 고객 선택≠payer CLOSED. T7 증거 유무가 판단에서 갈림. 둘 다 GO 아님 |
| S2 | T2 고객 반복. 대안=문제 문장 | T2 다음=선물 결제자. T5=발견 우회 행동 (아는 술/지인/아는 양조장) |
| S3 | T2 고객 반복, 문제 라벨 절단 | T2 다음=결재자. 빈도 모름은 OPEN 유지 |
| S4 | T2 고객 반복. 모순=correction만 | T2 다음=결제자. 모순은 CONTRADICTED 후 재확인 (부가 레버) |
| S5 | T2 고객 반복. 지인 1회 무시 | 지인 1회=약증거, 반복 수요 아님 |
| S6 | T2 고객 반복 | 공급 0+결제 0 → GO 아님을 유지하면서 HOLD 근거가 양면 공백을 가리킴 |

---

## 6. 회귀 테스트 계획 (승인 후만)

| ID | assert | 레버 |
|---|---|---|
| S1 T2→T3 | next ≠ 문제 confirm. gap=`payer`. why ≠ 「누구를 위한 사업인지」 | A, B, D |
| S1 단계 | raw와 final이 같은 payer. `overwrite=false` | A, B |
| S1 T7 | 증거 있음/없음의 customerChange·결론이 다름. 둘 다 GO 아님. Memory에 결제 Fact 없음 | C |
| S2 T5 | 대안 라벨에 문제 문장 재사용 없음 | E |
| S2–S6 T2 | next gap이 `customerPersona` 반복이 아님 | A, B, D |
| 가드 1 | unknown 회귀 유지 | 기존 테스트 그대로 |
| 가드 2 | 고객 선택 후 payer OPEN | 신규 |
| S4 | CONTRADICTED → 이전 고객 Fact 아님 | 부가 레버 승인 시 |

기존 it 6 / MCQ F의 「검증 완료가 아님」은 유지하되, **유무 차이 assert를 추가**하지 않으면 다시 거짓 통과한다.

---

## 7. 남는 위험 · 별도 검증

| 항목 | 판정 | 내용 |
|---|---|---|
| FIX-10과 V3 이중 SoT | 잔여 위험 | gapState CLOSED vs judgment needs_check. 레버 A가 게이트만 고치고 두 SoT를 합치지 않음 (의도) |
| businessOneLiner skip | 잔여 위험 | document echo를 건너뛰는 조건이 너무 넓으면 진짜 빈 한 줄을 놓침 |
| S2–S6 고객 추출 | 별도 검증 | judgment.customer cue가 반찬가게 중심. 레버 A/B만으로 부족할 수 있음. **추정:** cue 확장은 이번 최소안에서 빼는 편이 중복을 줄임. 승인 후 S2 T2가 실패하면 추출 큐만 추가 |
| 기타+submitAnswer | NOT VERIFIED | UI 경로 미실행 |
| 로그인 UI | NOT VERIFIED | 엔진 ≠ E2E |
| #196 P1 | 범위 밖 | Merge-hold 유지 |

---

## 8. CPO가 구현을 결정할 때

구현 승인은 이 문서의 **레버 A–E**에 한정하는 것을 권한다.

1. A+B+D = 다음 질문이 닫힌 문제를 되묻지 않고 payer로 감 (R1·R3)  
2. C = 결제 증거가 판단을 가르고 Fact/GO가 되지 않음 (R2·가드 3·4)  
3. E = 전통주 대안이 발견 문제에 붙음 (R4)  
4. S4 CONTRADICTED는 부가. 빠져도 R1–R4 일괄과 충돌하지 않음  

분석 제출 ≠ 구현 승인. 코드는 아직 바꾸지 않았다.
