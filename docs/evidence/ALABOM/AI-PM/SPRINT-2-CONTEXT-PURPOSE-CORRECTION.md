# Sprint 2 — Context and Purpose Correction

Checked: 2026-11-02 13:22 KST

Sprint 2 stays PARTIAL. Production stays locked. This slice changes the stage request and the stage parser. It does not call GPT. It does not rewrite `sprint-2-e2e-live-gpt.json` or any stored Founder row.

## What changed

| File | Why |
| --- | --- |
| `apps/web/features/business-validation-journey/lib/ai-pm-review.ts` | Delivered profile prose is no longer `not_analyzed`. Identical choice and supplement sentences are sent once. Cross-round questions use `questionKey` = `sourceReviewId:questionId`. The stage prompt no longer treats an unchanged judgment as a failed reassessment. A repeated question fails unless `reaskReason` names what the existing answer left unconfirmed. `stage_judgment_copied` is not a failed-row issue. |
| `apps/web/features/business-validation-journey/lib/ai-pm-review-store.ts` | `StageReading.nextQuestions` may carry optional `reaskReason`. Stored rows without it stay valid. |
| `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-consulting-stage.test.ts` | Expectations follow the new request shape and the parser. The stored round 3 body is read and rebuilt with zero model calls. |

Local `questionId` values stay `q1`, `q2` inside one stage. The UI and stored answer rows are not renumbered. `closedQuestions`, `stagePairs`, `priorStagePairs`, `answerLinks`, `currentAnswerStatements`, `answerReading`, and `answerSource` all carry the same `sourceReviewId` and `questionKey` when a link exists.

## Round 3 body, before and after

Source body: `docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json` call index 3, user message. The file is unchanged. The comparison rebuilds that message with `buildProductReanalysisRequest`.

### areaStatus

Before: all 10 areas were `not_analyzed`, including customer, while `latestAnalysis.customer` was `전통주를 좋아하는 내국인 및 외국인 관광객`.

After, from that same profile:

| area | status | note |
| --- | --- | --- |
| customer | `founder_claim` | original sentence kept, epistemic `FOUNDER_CLAIM`, provenance `AI_INFERENCE` |
| problem | `founder_claim` | delivered problem sentence |
| market | `founder_claim` | delivered market sentence |
| revenue | `assumption` | the stored sentence says it is a hypothesis |
| operations | `founder_claim` | the stored operations sentence |
| product, supply, marketing | `not_analyzed` | the stored text is still `아직 분석되지 않았다` |
| price, risk | `not_analyzed` | no profile field, and the answers do not name those areas |

`statedRecord.confirmed` stays empty. A profile sentence is not a verified fact. Verified facts still require external evidence.

`revisionTask.nextQuestion` now says a `not_analyzed` area is the one with no delivered sentence. `founder_claim`, `assumption`, `unconfirmed`, and `claim` are already delivered.

### Duplicate answers

Before, `currentAnswerStatements` was `설문조사 실시`, `설문조사 실시`, `비용 분석`, `비용 분석`.

After, it is one `설문조사 실시` and one `비용 분석`. Each keeps `questionId`, `sourceReviewId`, `questionKey`, and `source`.

### Question identity

Before, `closedQuestions` had two different texts both labeled `q1`.

After:

| question | questionKey |
| --- | --- |
| 양조장과의 협업을 위한 초기 미팅에서 어떤 사항을 논의해야 할까? | `48d06eaa-ad74-4851-a919-fbd8ecefdc1a:q1` |
| 전통주 체험 프로그램의 고객층을 명확히 정의하기 위해 어떤 조사를 해야 할까? | `5f6d705d-fe2a-468f-97be-da16482abd32:q1` |
| 체험 프로그램의 구체적인 내용 및 가격을 설정하기 위해 어떤 요소를 고려해야 할까? | `5f6d705d-fe2a-468f-97be-da16482abd32:q2` |

`priorStagePairs[0].questionKey` and `stagePairs[0].questionKey` are different. `originalInput`, the unlinked simulation sentence, and the consulting-path question text remain in the rebuilt request.

## Prompt

Removed from `stageReanalysisSystemPrompt()` and from `revisionTask.updatedJudgment`:

- `updatedJudgment가 priorJudgmentText와 같거나 그 문장을 포함하면 재평가가 아니다`
- `그 문장을 유지라고 다시 적는 것은 재평가가 아니다`
- `priorJudgmentText를 출력하지 않는다` as a ban on keeping the judgment sentence

Added:

- `이전 사업성 판단을 초기화하지 말고, 최초 사업 아이디어와 모든 이전 분석, 질문, Founder 답변을 종합하여 현재 시점의 사업성을 다시 판단하라.`
- A kept judgment is a reassessment when the accumulated answers were reviewed. Same wording alone is not a failure.
- A repeated question needs `reaskReason` that says what the existing answer left unconfirmed. `불확실하다` by itself is not that reason.
- `questionKey` distinguishes a prior `q1` from the current `q1`.

The schema field `reaskReason` is optional. A new question does not need it. Omitting it does not raise `stage_fields_missing`.

## Parser

| Check | Result on the stored round 3 response |
| --- | --- |
| `stage_questions_repeated` | still fails. The two next questions are the answered questions. Purposes `고객층 정의가 불확실하다` and `가격 설정이 불확실하다` are not a re-ask reason. |
| Same response plus `reaskReason` that names the gap in each existing answer | `stage_questions_repeated` does not fire. Sections are kept. |
| Same response plus `reaskReason` set only to those two purpose sentences | `stage_questions_repeated` still fires. |
| Same `updatedJudgment` with two new question texts | `stage_judgment_copied` is absent. Sections are kept and the judgment sentence is the round 2 sentence. |
| `invalid_json`, missing fields, blank fields, choices, choice links, answer echo, claim promotion | unchanged |

`stage_judgment_copied` is no longer pushed. The historical string in `sprint-2-quality-fix-2.json` is not rewritten. Replaying that raw response no longer adds `stage_judgment_copied` to the new row error. `stage_questions_repeated` and `stage_issues_copied` still fail that replay.

## Tests

No network. GPT calls in this slice: 0.

- `ai-pm-consulting-stage.test.ts`, `ai-pm-e2e-continuity.test.ts`, `ai-pm-founder-context.test.ts`, `ai-pm-continuity-contract.test.ts`: 43 passed.
- `ai-pm-review.test.ts`: passed in the same run.

## Still open for Sprint 2

- CPO review of this correction.
- Round 4 was not sent. The stored round 3 row remains `failed`, so it is still not a parent.
- Product screen and Supabase re-read of these reviews were not run.
- Whether a later live response uses `areaStatus` and `reaskReason` as instructed is not measured. This slice does not grade the business judgment.
