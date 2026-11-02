# Sprint 2 — Follow-up question information level

Checked: 2026-11-02 18:45 KST

Sprint 2 stays PARTIAL. Production stays locked. Sprint 3 does not start. GPT calls in this slice: 0. `sprint-2-e2e-live-gpt.json` is unchanged. The failed row `0e75ff46-88fd-4ce2-b567-bdc3f3048531` is not overwritten. Its stored error remains `stage_judgment_copied,stage_questions_repeated`.

Approved proposal: `4d9b2ba2`. Base before that proposal: `548f3c11`.

## Contract

`answeredQuestionState` is built for every answered question on the stage request. The code does not write the next question. Each record carries `questionKey`, the question text, the founder answer, provenance, what that answer confirmed, what it left open, and a resolution. `epistemicStatus` is `FOUNDER_CLAIM`. `verified` and `analysisComplete` are false. A founder claim is not promoted to `VERIFIED_FACT`.

| Level | When | Resolution | Confirmed | Still open |
| --- | --- | --- | --- | --- |
| `menu_choice` | The choice label is the whole answer | `method_selected` | The method name | Target, whether it ran, and the response |
| `planned_action` | The answer is a plan or a schedule, even when it contains a number | `plan_stated` | The plan text | Execution and the actual result. The number is not a result |
| `reported_result` | The answer reports a completed execution | `result_reported` | The reported result | No external evidence. Reliability and business meaning stay unverified |
| `stated_without_result` | A longer explanation has no plan marker and no completion marker | `gap_named` | The explanation | Execution result and figures |
| `unresolved_gap` | The founder says it is not known yet | `still_open` | No result | The gap stays open |

`planned_action` is the extra level required so a sentence such as “100명을 대상으로 할 예정이다” is not stored as `reported_result`. A digit, or the word 결과, does not by itself select `reported_result`. Completion language is required, and plan language wins when there is no completion language.

An identical choice label and supplement are stored once. `answer.supplement` is null in that case. `stagePairs` still keep the founder’s original pair. A `SIMULATION` prefix stays on the supplement and sets provenance to `SIMULATION`.

`questionKey` remains `sourceReviewId:questionId`. Two rounds can both use `q1`.

## Repeat gate and overlap

`stage_questions_repeated` stays. The same question text, the same purpose, or the choice label fails even when `reaskReason` names the gap. A different question text is not failed by that rule. The test does not lock a business sentence.

`stage_judgment_copied` is still not a failure. The same judgment sentence can be stored when the new questions and the selected objective are not the old questions.

`overlapsReviewedObjective` is no longer trusted by itself. `selectedObjectiveRepeats` compares the selected objective with the asked question texts and their purpose keys. A model value of false does not make a matching objective a new question. That case adds `stage_objective_overlap` and leaves `sections` null.

The stored round 3 raw, judged again with no model call, is `stage_questions_repeated,stage_objective_overlap`. `sections` is null. The historical row in the evidence file is not rewritten, so its saved error string is unchanged. A second insert of that id does not write. `runStageReanalysis` on the failed reprocess id returns `review_missing` and does not call chat.

## Payload

Historical call index 3, the body the model saw:

- `currentAnswerStatements` listed `설문조사 실시` twice and `비용 분석` twice.
- Two different questions were both `q1`.
- Every `areaStatus` was `not_analyzed`.
- There was no per-question confirmed / unconfirmed / resolution record.

Rebuild of that same stored body with this code, file bytes unchanged:

- Statements are one `설문조사 실시` and one `비용 분석`.
- Question keys are `48d06eaa-ad74-4851-a919-fbd8ecefdc1a:q1`, `5f6d705d-fe2a-468f-97be-da16482abd32:q1`, `5f6d705d-fe2a-468f-97be-da16482abd32:q2`.
- `answeredQuestionState` has three records. The prior “아직 핵심을 정하지 못했다” answer is `unresolved_gap` / `still_open`. The two round 2 answers are `menu_choice` / `method_selected`, provenance `FOUNDER_INPUT`, epistemic `FOUNDER_CLAIM`, `verified` false, `analysisComplete` false, supplement null.
- `originalInput` and the unlinked simulation sentence stay on the request.
- Customer, problem, and market stay founder claims. They are not verified.

## Tests

No network. GPT calls: 0.

`ai-pm-consulting-stage.test.ts` 42 passed, including:

| Check | Result |
| --- | --- |
| Method only | `menu_choice`, `method_selected`, result absent, not verified |
| Reported execution | `reported_result`, `FOUNDER_CLAIM`, external evidence absent |
| Numbered plan | `planned_action`. “예산 메모는 100이다” is not `reported_result` |
| Explanation without a result | `stated_without_result`, `gap_named` |
| Unresolved, including a simulation prefix | `unresolved_gap`, provenance kept |
| Duplicate menu label | One statement each. Supplement null on the new record |
| Two `q1` questions | Distinct `questionKey` values |
| Repeated question, with or without `reaskReason` | `stage_questions_repeated` and `stage_objective_overlap`. Sections null |
| Same judgment, new question text, selected objective moved off the old question | Sections kept. Judgment sentence kept |
| Same new questions while the selected objective still copies the old question and the flag is false | `stage_objective_overlap`. Sections null |
| Stored round 3 file and failed id | File bytes unchanged. Failed id cannot parent round 4 |

`ai-pm-review.test.ts` 77 passed. `ai-pm-e2e-continuity.test.ts` 2 passed. `ai-pm-founder-context.test.ts` 2 passed. `ai-pm-continuity-contract.test.ts` 5 passed.

## Calls and cost

This slice: 0 calls. Production was not deployed. Supabase was not called. The product screen was not opened.

Repository rate for `gpt-4o-mini` is $0.15 / $0.60 per 1M tokens. That rate is not an invoice. The stored round 3 size was 16,807 prompt tokens and 1,473 completion tokens, about $0.0034. One later call of that size, with this extra record, stays about $0.004.

That call is not part of this slice. It would be a new round 3 whose parent is the succeeded round 2 `5f6d705d-fe2a-468f-97be-da16482abd32`. The failed round 3 row is not a parent. Round 4 still needs a succeeded round 3.

## Position

| Slice | Result |
| --- | --- |
| Context delivery | PASS |
| Provenance and question links | PASS |
| Follow-up question generation | PARTIAL — the request and the parser now carry the information level. A live round 3 is NOT RUN |
| Product save and re-read | NOT RUN |
| Round 4 continuity | NOT RUN |
