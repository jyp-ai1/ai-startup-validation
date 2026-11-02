# Sprint 2 — Follow-up question generation proposal

Checked: 2026-11-02 14:12 KST

Sprint 2 stays PARTIAL. Production stays locked. Sprint 3 does not start. This slice is a proposal. Product code, prompts, the parser, and `docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json` are unchanged. The failed row `0e75ff46-88fd-4ce2-b567-bdc3f3048531` is unchanged. GPT calls in this slice: 0. Base commit: `548f3c11`.

The stored round 3 response failed because the model wrote the already-answered questions again. `stage_questions_repeated` blocked that response. That block stays. This proposal does not turn the failed row into a success and does not make it a round 4 parent.

## Cause

Source: call index 3 in `sprint-2-e2e-live-gpt.json`. Response `chatcmpl-Efbd9RroEWRZwQtaeBwxSkYw9Vm74`, model `gpt-4o-mini-2024-07-18`. The user message the model saw is the historical payload below, not the payload `548f3c11` would build today.

Founder answers on the succeeded round 2 parent `5f6d705d-fe2a-468f-97be-da16482abd32`:

| questionKey after `548f3c11` | questionId in that round | choice | supplement |
| --- | --- | --- | --- |
| `5f6d705d-fe2a-468f-97be-da16482abd32:q1` | `q1` | `설문조사 실시` | same text |
| `5f6d705d-fe2a-468f-97be-da16482abd32:q2` | `q2` | `비용 분석` | same text |

Both are menu selections. Neither text contains a count, a price, a respondent, or a result. `answerReading` on the historical request labeled each one `choice` only.

The model did read those answers. `answerInterpretation` cites `q1`/`c1` and `q2`/`c1` and says each decision is not a confirmed fact. `verifiedFacts` is `[]`. `resolvedIssues` is `[]`. `unverifiedClaims` describes the choices as intended actions. The gap also appears in the candidates: prerequisite `설문조사 결과가 필요하다` and `비용 분석이 필요하다`.

The next questions were still the two round 2 questions, with the same choices. `verificationPurpose` was `고객층 정의가 불확실하다` and `가격 설정이 불확실하다`. There is no `reaskReason`. `openRisk` is hypothetical (“if the result differs”), not “the result is absent”.

### Why the answers did not become the next question

Six instructions and records pointed at the old question instead of the missing result.

1. Historical `areaStatus` was `not_analyzed` for all ten areas. `revisionTask.nextQuestion` said to pick the unanswered area from `areaStatus`. Customer and price looked empty while `stagePairs` already held the answers.
2. `currentAnswerStatements` listed `설문조사 실시` twice and `비용 분석` twice. The record was the label. It did not say what that label confirmed or what it left open.
3. Two different questions were both `questionId: q1`. `closedQuestions` and `answerReading` could not tell the brewery-meeting question from the customer question by id.
4. The prompt said to ask only `selectedCandidateId`’s objective. The model copied each closed question into `objective`, then asked that objective. The schema already says an objective is not a question sentence. The model did not follow that sentence.
5. The historical system prompt contains `areaStatus`, `overlapsReviewedObjective`, `selectedCandidateId`, and `choiceLabel`. It does not contain `설문`, `메뉴`, `재질문`, `실행 결과`, `수치`, or `확인된 정보`. Nothing told the model that a menu label is a method name and that the next question has to ask for the missing execution result or figure.
6. The model emitted both candidates as `nextQuestions`, not only the selected one.

`548f3c11` already changes (1), (2), and (3) for the next rebuild of this body. It does not add a per-answer confirmed / unconfirmed / resolution record. Price stays `not_analyzed`. The prompt still does not say that a menu choice must be followed by a result question.

### Why `selectedCandidateId` was `"1"`

`selectedCandidateId` is model-authored. Candidate `"1"` has `areaId: customer` and its `objective` is the customer question verbatim. `selectionReason` says customer definition decides the direction of the business, so it should be investigated first.

That selection treats “the customer is still not defined” as “the customer question was never answered”. The payload supported that reading: customer `areaStatus` was `not_analyzed`, and the answer on record was only the method name `설문조사 실시`. The model noticed the missing survey result in `prerequisite` and still selected the old question as the objective.

### Why `overlapsReviewedObjective` is false

The flag is model-authored. `priorReview.reviewedObjectives` on that request is the three closed question texts, including both round 2 questions. Each candidate `objective` is equal to one of those texts. Both flags are `false`.

The schema says a matching objective must set the flag true, and the prompt says not to select a true flag. The model set false, so that rule never applied. The server does not compare the flag with the objective text. `false` here means the model mislabeled the overlap. It does not mean the objective was new. `stage_questions_repeated` then compared the question text and rejected the row. That comparison stays. This proposal does not add a new issue for the stored raw, and it does not remove the existing one.

### `areaStatus` against `revisionTask.nextQuestion`

Historical conflict: every area was `not_analyzed`, and the task said to pick the next question from those areas, while the answers were in the same user JSON.

After `548f3c11`, rebuilt from the same stored profile and the same answers, without a new model call:

| area | status | provenance | informationPresent | verified | analysisComplete |
| --- | --- | --- | --- | --- | --- |
| customer, problem, market | `founder_claim` | `FOUNDER_INPUT` | true | false | false |
| revenue | `assumption` | `AI_INFERENCE` | true | false | false |
| operations | `founder_claim` | `AI_INFERENCE` | true | false | false |
| product, supply, marketing | `not_analyzed` | null | false | false | false |
| price, risk | `not_analyzed` | null | false | false | false |

Customer prose `전통주를 좋아하는 내국인 및 외국인 관광객` is a claim. It is not a completed customer analysis. Price and risk have no profile field. The price marker is `/가격/`. `비용 분석` does not match it, so the price area stays `not_analyzed` even though the founder chose that menu item.

The current `revisionTask.nextQuestion` still says the unconfirmed areas are the `not_analyzed` rows. A later model can treat price as empty and ask the price question again. `verified: false` allows another question, and nothing in the current payload says that question must be about the missing cost result rather than the menu already chosen.

### Menu selection and verification

| Record | What the round 2 answers are |
| --- | --- |
| Menu | `choiceLabel` equals `supplement`. The text is an offered choice. |
| Claim | Founder selected a method. Epistemic status is `FOUNDER_CLAIM`. |
| Provenance | `founder` on the historical `answerSource`. Not `SIMULATION`. |
| Verification | No external evidence id. `verifiedFacts` stays empty. `verified` and `analysisComplete` stay false. |
| Not in the request | A field that says the method was selected and the execution result, number, target, and responses are absent. |

`founderAnswerKinds` returns `choice` when `choiceLabel` is non-empty. That label is not a verified fact. The question generator never receives it as “method selected, result absent”.

## Request payload

### Before — historical call index 3

The model saw this shape. Statements and question ids are abbreviated to the fields that drove the repeat.

```json
{
  "currentAnswerStatements": [
    { "questionId": "q1", "statement": "설문조사 실시" },
    { "questionId": "q1", "statement": "설문조사 실시" },
    { "questionId": "q2", "statement": "비용 분석" },
    { "questionId": "q2", "statement": "비용 분석" }
  ],
  "closedQuestions": [
    { "questionId": "q1", "text": "양조장과의 협업을 위한 초기 미팅에서 어떤 사항을 논의해야 할까?", "askAgain": false },
    { "questionId": "q1", "text": "전통주 체험 프로그램의 고객층을 명확히 정의하기 위해 어떤 조사를 해야 할까?", "askAgain": false },
    { "questionId": "q2", "text": "체험 프로그램의 구체적인 내용 및 가격을 설정하기 위해 어떤 요소를 고려해야 할까?", "askAgain": false }
  ],
  "businessState": {
    "areaStatus": "all ten areas not_analyzed"
  },
  "revisionTask": {
    "nextQuestion": "미확인 영역은 areaStatus에서 고른다. selectedCandidateId의 목적만 묻는다. 방금 답한 질문을 반복하지 않는다."
  }
}
```

There is no per-question confirmed / unconfirmed / resolution record.

### After `548f3c11` — current code, not this proposal

A rebuild of the same stored body, already covered by `SPRINT-2-CONTEXT-PURPOSE-CORRECTION.md` and `SPRINT-2-ROUND3-REPROCESS.md`:

- `currentAnswerStatements` is one `설문조사 실시` and one `비용 분석`.
- question keys are `48d06eaa-ad74-4851-a919-fbd8ecefdc1a:q1`, `5f6d705d-fe2a-468f-97be-da16482abd32:q1`, and `5f6d705d-fe2a-468f-97be-da16482abd32:q2`.
- Customer, problem, and market are `FOUNDER_INPUT` claims. They are not verified and their analysis is not complete.
- The prompt no longer treats an unchanged judgment sentence as a failed reassessment.
- A verbatim repeat still fails `stage_questions_repeated` unless `reaskReason` names the gap.

Still absent: `answeredQuestionState`. Price is still `not_analyzed`. A menu label can still be followed by the same question when a gap-naming `reaskReason` is present. The current test expects that path to pass.

### Proposed — not implemented

Add `answeredQuestionState` beside the deduped statements. The code fills it from `priorStagePairs` and `stagePairs`. It does not write the next question and it does not pick `selectedCandidateId`.

For the stored round 2 answers the record would be:

```json
{
  "answeredQuestionState": [
    {
      "questionKey": "5f6d705d-fe2a-468f-97be-da16482abd32:q1",
      "sourceReviewId": "5f6d705d-fe2a-468f-97be-da16482abd32",
      "questionId": "q1",
      "question": "전통주 체험 프로그램의 고객층을 명확히 정의하기 위해 어떤 조사를 해야 할까?",
      "answer": {
        "choiceId": "c1",
        "choiceLabel": "설문조사 실시",
        "supplement": null,
        "provenance": "FOUNDER_INPUT",
        "epistemicStatus": "FOUNDER_CLAIM"
      },
      "answerLevel": "menu_choice",
      "confirmedByAnswer": "선택한 항목: 설문조사 실시",
      "unconfirmedAfterAnswer": "이 답은 방법 또는 항목의 이름이다. 실행 결과, 수치, 대상, 응답 내용은 이 답에 없다.",
      "resolution": "method_selected"
    },
    {
      "questionKey": "5f6d705d-fe2a-468f-97be-da16482abd32:q2",
      "sourceReviewId": "5f6d705d-fe2a-468f-97be-da16482abd32",
      "questionId": "q2",
      "question": "체험 프로그램의 구체적인 내용 및 가격을 설정하기 위해 어떤 요소를 고려해야 할까?",
      "answer": {
        "choiceId": "c1",
        "choiceLabel": "비용 분석",
        "supplement": null,
        "provenance": "FOUNDER_INPUT",
        "epistemicStatus": "FOUNDER_CLAIM"
      },
      "answerLevel": "menu_choice",
      "confirmedByAnswer": "선택한 항목: 비용 분석",
      "unconfirmedAfterAnswer": "이 답은 방법 또는 항목의 이름이다. 실행 결과, 수치, 대상, 응답 내용은 이 답에 없다.",
      "resolution": "method_selected"
    }
  ]
}
```

`supplement` is null in this record when it equals `choiceLabel`, so the new record does not repeat the label. `stagePairs` keeps the stored pair. `currentAnswerStatements` stays deduped. `epistemicStatus` is never `VERIFIED_FACT` for this builder. A `SIMULATION` prefix keeps provenance `SIMULATION`.

`unconfirmedAfterAnswer` is a fixed template. It is not a founder-facing question. The business question stays with the model. Illustrations of a better direction are not copied into the prompt and are not stored as the expected next question.

The prior brewery-meeting answer is a third item on the same array, with its own `questionKey`. Its level follows the same rules. It is not merged into `q1`.

## Prompt change — not applied

Add the following rules to `stageReanalysisSystemPrompt()` and replace the `not_analyzed`-only picker in `revisionTask.nextQuestion`. Do not add sample business questions.

1. Keep `originalInput` and the full consulting history. Do not start the business over.
2. Reassess current viability from the prior judgment plus every founder answer. A kept judgment sentence can still be that reassessment. `impactOnPreviousJudgment` still has to tell the founder what this answer newly left open.
3. Do not repeat an answered question’s text, its `choiceLabel`, or its supplement.
4. When `answerLevel` is `menu_choice` or `stated_without_result`, do not ask which menu item was chosen. Ask for the execution result or figure that `unconfirmedAfterAnswer` says is absent. The server does not supply that sentence.
5. A follow-up names the unconfirmed part and why the existing answer is not enough. `불확실하다` alone is not that reason. For a menu choice, `reaskReason` does not make the old question text valid.
6. `confirmedByAnswer` and `unconfirmedAfterAnswer` stay separate. `method_selected` is not resolved, not `analysisComplete`, and not `VERIFIED_FACT`.
7. `closedQuestions.askAgain: false` means do not emit that wording again. It does not mean the business gap is closed.
8. `not_analyzed` means no delivered sentence. A `method_selected` row on `answeredQuestionState` is not an empty area, including when price stays `not_analyzed` because the answer text has no `가격` marker.
9. `overlapsReviewedObjective` is true when the objective text matches a closed question or a reviewed objective, including a wording-only change. Do not select that candidate. The objective is a business judgment, not the previous question sentence.
10. `nextQuestions` asks only the selected objective, and that objective is the missing result or the next real gap, not both candidates’ old questions.

## Question-generation logic — not applied

New helper next to `currentAnswerStatementPayload`, called from the stage user payload. Inputs are the pairs and `answerLinks`. Output is `answeredQuestionState`. No model call.

Answer level, first match wins:

| Level | When | confirmedByAnswer | unconfirmedAfterAnswer | resolution |
| --- | --- | --- | --- | --- |
| `unresolved_gap` | The answer says it is not known yet (`아직`, `확인하지`, `모른다`, `정하지`) | none | The founder said this is not known. Do not treat the gap as a result. | `still_open` |
| `reported_result` | A digit or an explicit result marker (`결과`, `응답`, `명`, `원`, `%`) is present | The reported figure, still a `FOUNDER_CLAIM` | No verification record is attached to that figure. | `result_reported` |
| `menu_choice` | `choiceLabel` is non-empty and the supplement is empty or equal to it, with no digit and no result marker | `선택한 항목: ` plus the label | The answer is a method or item name. Execution result, number, target, and responses are absent. | `method_selected` |
| `stated_without_result` | The supplement is longer and still has no result marker | The supplement as a claim | The answer is an explanation. Execution result and number are absent. | `gap_named` |

Parser, after this proposal is approved:

- Keep `stage_questions_repeated`.
- For `menu_choice` and `stated_without_result`, a next question whose text matches the prior question, the choice label, or the supplement still fails, even when `reaskReason` names the gap.
- A different question text is not failed by that rule. The test does not require a particular business sentence.
- The existing `reaskReason` exemption remains for an answer that is not a menu or a result-free statement.
- `reaskReason` stays optional on the schema so old responses do not fail `stage_fields_missing`.
- Do not drop `stage_questions_repeated`. Do not make the stored round 3 raw succeed. That raw has no `reaskReason` and repeats both questions, so it still fails.
- Do not add a gate that scores strategy quality.
- An optional later check can reject `overlapsReviewedObjective: false` when the objective text equals a closed question. That check would add an issue to the stored raw. It is not required to explain this failure, and it is not part of the first code change.

The current test that adds a gap-naming `reaskReason` to the two repeated questions and expects sections to be kept would change. Those two answers are `menu_choice`. Under this proposal that fixture still fails `stage_questions_repeated`.

## Tests

This slice did not add tests and did not edit the parser.

Reconfirmed on `548f3c11` at 2026-11-02 14:11 KST, no network, GPT calls 0:

- `rebuilds the stored round 3 request so delivered context selects the next question` — passed.
- `keeps the failed round 3 row and stores a separate reprocess that cannot parent round 4` — passed.

The stored raw still judges as `stage_questions_repeated` with `sections: null`. The failed id still cannot parent round 4.

Tests to add only after this proposal is accepted. All of them rebuild the stored body or call `judgeStageContract`. None call GPT.

| Check | Expected |
| --- | --- |
| Same answer text is not sent twice inside `currentAnswerStatements` or inside one `answeredQuestionState` item | one `설문조사 실시`, one `비용 분석`; identical supplement omitted on the new record |
| Answered questions split into resolved and unresolved | both round 2 items are `method_selected`, not a closed resolution; `askAgain` stays false |
| A menu choice does not complete verification | `FOUNDER_CLAIM`, provenance `FOUNDER_INPUT`, no `VERIFIED_FACT`, area `verified` and `analysisComplete` stay false |
| Already delivered information is not asked again | prompt and `revisionTask` forbid repeating the question text and the choice label |
| An insufficient answer asks for a concrete follow-up | prompt requires the missing execution result or figure named by `unconfirmedAfterAnswer`; the test does not lock a business sentence |
| Existing parser gate | stored raw still `stage_questions_repeated`, `sections` null; a menu repeat with `reaskReason` also fails; a different question text does not fail this gate |

## Files

This commit changes documentation only.

| File | This slice |
| --- | --- |
| `docs/evidence/ALABOM/AI-PM/SPRINT-2-FOLLOWUP-QUESTION-PROPOSAL.md` | added |
| `docs/TASKS.md` | status sentence prepended |
| `apps/web/features/business-validation-journey/lib/ai-pm-review.ts` | not edited |
| `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-consulting-stage.test.ts` | not edited |
| `docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json` | not edited |

After acceptance, the first code change is `ai-pm-review.ts` (`answeredQuestionState`, the stage prompt, `revisionTask.nextQuestion`, the menu-choice repeat exemption) and `ai-pm-consulting-stage.test.ts`. No store migration. No change to `firstReviewSystemPrompt`, `STATE_SYSTEM`, `SELECTION_SYSTEM`, or experiment B.

## Calls and cost

This slice: 0 calls. Production was not deployed. Supabase was not called. The product screen was not opened.

Repository rate for `gpt-4o-mini` in `packages/ai/src/token/manager.ts` is $0.15 / $0.60 per 1M tokens. That rate is not an invoice. The stored round 3 call was 16,807 prompt tokens and 1,473 completion tokens, about $0.0034 at that rate. The proposed record is two or three small objects plus a prompt paragraph. One later call of that size stays on the order of $0.004.

That call is not authorized. The failed row cannot be its parent. A later live check of this prompt would be a new round 3 against the succeeded round 2 parent, one `gpt-4o-mini` call, and only after the code change itself is accepted. Round 4 still needs a succeeded round 3. This proposal does not create one.

## Sprint 2 position

| Slice | Result |
| --- | --- |
| Context delivery | PASS |
| Provenance and question links | PASS |
| Follow-up question generation | PARTIAL — cause is recorded, change is not applied |
| Product save and re-read | NOT RUN |
| Round 4 continuity | NOT RUN |

Sprint 3 stays blocked. Production stays locked.
