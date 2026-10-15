# PR #197 엔진 검증 · R1–R4 실패 원인

**상태:** CPO 구현 재개 보류 · 분석만 제출  
**PR:** [#197](https://github.com/jyp-ai1/ai-startup-validation/pull/197)  
**시나리오 본문 기준 SHA:** `5263e83e`  
**검토 패키지 SHA:** `03415eed`  
**Production:** `0b465226` 불변 · Merge 금지 · **제품 코드 변경 없음**  
**재현:** `apps/web/features/workflow-journey/lib/business-understanding/__tests__/pr197-cpo-engine-probe.test.ts`  
**로그:** `docs/evidence/ALABOM/AI-PM/PR197-R1-R4-ENGINE-PROBE.json`  
**경로:** `applyBusinessChoiceThroughLoop` → `interpretAnswerSemantics` → `appendLoopTurnWithReview` → `applyWorkspaceLoopAnswer`(mergeable일 때만) → `runLoopAnswerProcessing` → `syncJudgmentAfterAnswer` → `resolveNextQuestionDecision` (`decideNextQuestionFromReview` → `applyNoAskPolicy` → `applyJudgmentNextQuestionBinding` → `applyAntiRepeatPolicy`)

시나리오 문서(`docs/product/ai-pm-closed-conversation-scenarios.md`)는 동결한다. 문서 기대를 실행 PASS로 바꾸지 않았다.

---

## 1. 실패 원인 분석표

### R1 — 고객 선택 후 문제 재질문

| 칸 | 내용 |
|---|---|
| 호출 경로 | T1 `problemJtbd` 적용 후 T2 `customerPersona` 적용 → `resolveNextQuestionDecision` → `applyJudgmentNextQuestionBinding` / `applyNoAskPolicy` |
| 입력 | 문제=`주문과 배송을 따로 관리해야 함`. 고객=`반찬가게` |
| 실제 출력 | `nextTargetGap=problemJtbd`, `questionType=confirm`, `nextQuestionText=핵심 불편은(는) 「주문」으로 이해했습니다. 맞나요?` |
| 기대 | 구매자/도입 결정자. 문제 「맞나요?」 금지 |
| 원인 | 1) 문제 답 이후 `judgment.problem`은 `needs_check`로만 오른다. FIX-10 `isFix10DimensionUnresolved(problem)`은 `needs_check`를 미해결로 본다 (`ai-pm-judgment-next-question-binding.ts`). 고객이 `clear`가 되면 다음 focus는 다시 problem. 2) `payer`는 `isOffTrackGapForFix10`에 포함되어 다음 질문 후보에서 밀린다. 3) `applyNoAskPolicy`가 problemJtbd를 CONFIRM으로 바꾸고, 확인 값이 전체 문제 문장이 아니라 `주문`으로 잘린다. |
| 최소 수정 범위 (계획) | `isFix10DimensionUnresolved` — 창업자가 방금 확인한 문제는 재CONFIRM 대상이 아님. `isOffTrackGapForFix10`에서 고객이 닫힌 뒤 `payer`를 허용. `applyNoAskPolicy` CONFIRM이 직전 턴에 답한 슬롯을 되묻지 않음. **엔진 재작성 없음.** |
| 회귀 테스트 계획 | S1 T2→T3: next ≠ 문제 확인, next gap=`payer` 또는 동등한 지불 주체. 승인 후만 작성 |

### R2 — 결제 증거 유무가 판단에 안 붙음

| 칸 | 내용 |
|---|---|
| 호출 경로 | `applyBusinessChoiceThroughLoop` (`validationTestability`) → `interpretAnswerSemantics` → `mergeable=false` → `applyWorkspaceLoopAnswer` 생략 → `syncJudgmentAfterAnswer`는 빈 차원 유지 |
| 입력 A | `이미 결제 3건이 있어 고객이 돈을 내고 있습니다.` |
| 입력 B | `아직 실제 결제·사용 증거는 없습니다.` |
| 실제 출력 | 둘 다 `applied=false`, `customerChange=unknown`, 동일 결론(`현재 대화만으로는…`). `sameConclusion=true`, `sameCustomerChange=true` |
| 기대 | 없음=결제 의향·지불 사실 미확정. 있음=약증거, Fact/GO 아님. **두 상태가 달라야 함** |
| 원인 | `interpret-answer-semantics.ts` `askedGap === 'validationTestability'`는 `hasDiffRelevanceEvidence()`가 참일 때만 mergeable. 그 정규식은 `왜 중요|체감|관련성|가치|불편|줄여|…`이지 **결제 건수·증거 없음이 아님**. 결제 문장은 PARTIAL로 버려진다. `dimensionsFromAnswerText` / `CUSTOMER_CHANGE_CUE_RE`까지 도달하지 않는다. |
| 최소 수정 범위 (계획) | validation 슬롯의 결제 증거/증거 없음을 `diffRelevance` 강제 대신 customerChange 약증거·미확정으로 라우팅. `applyAnswerToJudgment`에서 두 상태 차이만 기록. **GO/Fact 승격 없음.** |
| 회귀 테스트 계획 | S1 T7 대조: 없음 vs 있음의 customerChange/결론이 다름. 둘 다 GO 아님. 승인 후만 작성 |

### R3 — 다음 질문이 미해결 핵심 가설에 적응하지 못함

| 칸 | 내용 |
|---|---|
| 호출 경로 | `pickFix10JudgmentFocus` (customer→problem→solution→customerChange) + `ai-pm-simple-question-presenter.ts` `WHY_BY_GAP.customerPersona` + `buildNextCheckPrompt('customer')` |
| 입력 | S1: 문제+고객 확인. S2–S6: 문제 선택 후 고객 선택 |
| 실제 출력 | S1 다음 why=`고객이 실제로 겪는 핵심 문제와 우선순위를 더 확인해야 합니다.` (문제 재확인). S2–S6 다음 why=`누구를 위한 사업인지 더 구체적으로 확인해야 합니다.` 이며 `nextTargetGap`이 `customerPersona`에 고정 |
| 기대 | 사업 유형 × 남은 가설(구매자·증거·공급 등). 고정 문구 금지 |
| 원인 | FIX-10 포커스가 4차원만 본다. `payer`/`revenueModel`/`validationTestability`는 off-track이거나 포커스 밖. 고객 답이 `CUSTOMER_CUE_RE`(반찬/꽃집/소상공인 등)에 안 걸리면 `customer`가 `unknown`으로 남아 S2–S6가 고객 질문에 멈춘다. Presenter `WHY_BY_GAP`은 gap만 보고 답을 무시한다. |
| 최소 수정 범위 (계획) | 닫힌 고객 이후 why/next를 payer·검증으로 넘김. Presenter 고정 문구를 living/judgment 공백에 종속. S2–S6 고객 라벨이 판단.customer에 반영되게 추출 큐를 사업 명사에 맞춤. |
| 회귀 테스트 계획 | S1–S6 각 T2 다음 why가 서로 다르고, 이미 닫힌 고객을 되묻지 않음. 승인 후만 작성 |

### R4 — 전통주 대안이 발견 문제를 확장하지 못함

| 칸 | 내용 |
|---|---|
| 호출 경로 | `buildBusinessChoiceQuestion` → `fallbackOptionsForGap('alternativesCompetitors')` → `extractStatusQuo` |
| 입력 | S2 문서. 확인된 문제=발견 어려움 |
| 실제 출력 | 질문=`비슷한 역할을 이미 하고 있는 서비스가 있나요?` (generic binding). 선택지=`지금은 양조장마다 채널이 흩어져 소비자가 좋은 술을 발견하기 어…` + 기타 + 아직 모르겠음 |
| 기대 | `선물하는 30–40대는 좋은 전통주를 찾기 어려울 때 지금은 어떻게 하나요?` / 아는 술만 · 지인 추천 · 아는 양조장만 |
| 원인 | `extractStatusQuo`가 `문제:` 줄을 `지금은 ${problemLine}`로 재사용한다. 발견 문제에 연결된 경쟁 행동을 만들지 않는다. 질문 문구는 `gap-question-map.ts` 고정 문장이다. |
| 최소 수정 범위 (계획) | `extractStatusQuo`에서 문제 줄 재사용 제거. 확인된 문제에 묶인 우회 행동 후보만. 질문 문구는 binding을 문제 맥락으로 덮어쓰기. **대화 엔진 재작성 없음.** |
| 회귀 테스트 계획 | S2 T5 라벨에 문제 문장 재사용 없음. 승인 후만 작성 |

---

## 2. 핵심 가드 실행 검증

| 가드 | 결과 | 실행 증거 |
|---|---|---|
| `아직 모르겠음` → Fact 미승격 | **PASS** | S1 payer unknown: `intent=unknown_signal`, `applied=false`, customerChange/payer Fact 없음. 다음 gap=`customerPersona` (다른 공백으로 이동) |
| 결제 증거 없음 → 의향·지불 미확정 | **FAIL** | 증거 있음/없음 모두 판단 불변. 「미확정」이 아니라 **무시** |
| 지인 1회 ≠ 수요 검증 | **FAIL (약함)** | `내가 지인에게 판 것이 1회 있습니다.` → `applied=false`, 판단 불변. 승격은 안 했지만 약증거로도 안 남음. R2와 동일 구멍 |
| 모순 시 이전 고객 Fact 유지 금지 | **FAIL** | `사실 아이가 아니라 혼자 사는 20대가 메인이에요` → `intent=correction`, `applied=true`. `customer`는 `unknown`으로 남고 `contradicted` 없음. 다음=고객 재질문. T7 재확인·superseded 전이 없음 |
| 한쪽 면 마켓플레이스 ≠ GO | **PASS (약함)** | 공급 없음+결제 없음 후 결론은 정보 부족. GO 문구 없음. 다만 양면/공급 0을 인식한 HOLD가 아니라 기본 부족 문구 |
| 빈 기타 대기 | **PASS** | `waitingForFreeText=true`, 턴 0 |
| 기타+자유입력 → 이해 반영 | **FAIL** | `applyBusinessChoiceThroughLoop`가 `isEscapeChoice(other)`에서 즉시 return. `persisted=false`. UI는 이후 `submitAnswer`로 보낼 수 있으나 그 경로는 이 프로브에서 미실행 → UI는 NOT VERIFIED |

---

## 3. S1–S6 엔진 대화 (follow next)

엔진이 고른 next를 따라 최대 8턴. 첫 specific 옵션을 자동 선택. **8턴을 끝까지 가지 못했다. 기대를 PASS로 쓰지 않는다.**

| 시나리오 | 실행 턴 | 어디서 멈춤 | 결과 |
|---|---|---|---|
| S1 | 3 | T2 다음이 문제 CONFIRM. T3 선택지=기타/아직 모르겠음뿐 | **FAIL** (R1) |
| S2 | 2 | 고객 라벨이 `전통주를 선물` / `취미로 찾는 30–40대`로 절단. customer `unknown` 유지. 같은 고객 질문 반복 | **FAIL** (R3) |
| S3 | 2 | 문제 라벨이 `메일`/`엑셀`로 절단. 고객 선택 후에도 customer `unknown`. 고객 질문 반복 | **FAIL** |
| S4 | 2 | `맞벌이 부모` 선택 후에도 customer `unknown`. 고객 질문 반복 | **FAIL** |
| S5 | 2 | `운동하는 20–30대` 선택 후에도 customer `unknown`. 고객 질문 반복 | **FAIL** |
| S6 | 2 | 문제 라벨이 `믿을 사람을 찾기 어렵고`로 절단. 고객 선택 후 동일 반복 | **FAIL** |

S1만 고객이 `clear`가 된다(`반찬가게`가 기존 customer cue에 해당). 나머지 사업 명사는 판단.customer를 움직이지 못한다.

### S1 결제 증거 대조

동일 결론 · 동일 customerChange=`unknown`. **FAIL (R2).**

### S4 모순 전이

문서 기대: T6 `contradicted` → T7 Claim 재설정 → HOLD.  
실행: correction intent만 있고 상태 머신 없음. **FAIL** (실행함. NOT VERIFIED가 아님).

### 로그인 UI

**NOT VERIFIED.** 엔진 프로브를 UI E2E PASS로 쓰지 않는다.

---

## 4. PASS / FAIL / NOT VERIFIED

**PASS**

- 객관식 라벨이 배송 문서에서 주문·배송을 씀 (S1 T1)
- `아직 모르겠음` Fact 미승격
- 빈 기타 대기
- S1 T2 고객 선택 → customer `clear`
- 한쪽 면만으로 GO 문구를 만들지 않음 (약함)
- MCQ 단위 테스트 · 본 프로브 파일 실행

**FAIL**

- R1 문제 재확인
- R2 결제 증거 무반영
- R3 다음 질문/why 고정
- R4 전통주 대안=문제 문장 재사용
- S1–S6 8턴 완주 실패
- S4 contradicted 전이 없음
- 지인 1회가 약증거로도 안 남음
- throughLoop 기타+텍스트 미반영
- S2–S6 고객 답이 판단을 안 바꿈

**NOT VERIFIED**

- 실제 로그인 UI 8턴
- UI `submitAnswer`로 보낸 자유 입력
- 승인 후 예정인 회귀 테스트 (아직 없음)

---

## 5. 최소 수정 범위와 회귀 테스트 계획

CPO 재승인 전에는 구현하지 않는다.

| 순서 | 범위 | 파일 (예정) | 회귀 |
|---|---|---|---|
| 1 | R1: 닫힌 문제 재CONFIRM 금지, 고객 닫힌 뒤 payer 허용 | `ai-pm-judgment-next-question-binding.ts`, `ai-pm-no-ask-policy.ts` | S1 T2→T3 |
| 2 | R3: why/next를 4차원+off-track이 아니라 남은 가설에 | 위 파일 + `ai-pm-simple-question-presenter.ts` `WHY_BY_GAP` | S1–S6 T2 why가 사업별로 다름 |
| 3 | R2: validation 결제 증거/없음을 customerChange에 다르게 반영 | `interpret-answer-semantics.ts` validation 분기, judgment sync | S1 T7 대조 |
| 4 | R4: 문제 줄 재사용 제거, 발견 우회 행동 | `build-business-choice-question.ts` `extractStatusQuo` | S2 T5 라벨 |
| 5 | S4 상태: contradicted → superseded | 기존 correction 경로에 상태만 기록. 엔진 재작성 없음 | S4 T6–T7 표 |

V3 living/review/next-question 계약을 바꾸지 않는다.

---

## 6. 잔여 위험 · 미검증

| 항목 | 위험 |
|---|---|
| 시나리오 vs 코드 | 시나리오 기대는 `03415eed`에 고정. 코드는 위 FAIL 상태 |
| S2–S6 고객 추출 | 반찬가게 밖에서 customer가 안 닫히면 R1 수정만으로 8턴이 안 열림 |
| 기타 자유입력 | throughLoop와 UI submit 경로가 갈라짐 |
| 로그인 UI | 미실행 |
| FIX-10 payer off-track | R1 수정이 judgment 포커스와 충돌할 수 있음. 승인 후 한 번에 검증 |

구현·병합·Production 배포는 CPO가 이 분석과 수정 범위를 승인하기 전까지 보류한다.
