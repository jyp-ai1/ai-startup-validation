# Sprint 2 — Round 3 reprocess

Checked: 2026-11-02 13:47 KST

Sprint 2 stays PARTIAL. Production stays locked. GPT calls in this slice: 0. `sprint-2-e2e-live-gpt.json` is unchanged. The failed row `0e75ff46-88fd-4ce2-b567-bdc3f3048531` is not overwritten.

## Provenance

A profile sentence that restates the founder idea or a founder answer is `FOUNDER_INPUT`. `AI_INFERENCE` is only a sentence that does not. `FOUNDER_CLAIM` is not `VERIFIED_FACT`. `verified` and `analysisComplete` stay false when the record is a claim.

Rebuilt from the stored round 3 profile and the original idea:

| Area | Sentence origin | Epistemic | Provenance | informationPresent | verified | analysisComplete |
| --- | --- | --- | --- | --- | --- | --- |
| customer | 전통주를 좋아하는 내국인 및 외국인 관광객 | FOUNDER_CLAIM | FOUNDER_INPUT | true | false | false |
| problem | founder idea restated | FOUNDER_CLAIM | FOUNDER_INPUT | true | false | false |
| market | founder idea restated | FOUNDER_CLAIM | FOUNDER_INPUT | true | false | false |
| revenue | hypothesis the idea does not state | ASSUMPTION | AI_INFERENCE | true | false | false |
| operations | model operating sentence | FOUNDER_CLAIM | AI_INFERENCE | true | false | false |

`informationPresent` means the sentence is on the record. It does not close the area. The stage prompt says a verification question may continue when it does not repeat that sentence.

A stub customer `방문객` that is absent from its idea stays `AI_INFERENCE`.

## Round 3 reprocess

Original response `chatcmpl-Efbd9RroEWRZwQtaeBwxSkYw9Vm74`. Parser result on that text: `stage_questions_repeated`. `stage_judgment_copied` is absent. `sections` is null. The two next questions are the answered questions, and their purposes do not name why the existing answers are insufficient.

That response cannot be stored as `succeeded`.

Local sqlite only (`productionDatabase: false`, `durable: false`). Not Supabase. Not the product screen.

| Row | reviewId | status | error | sections | rawContent |
| --- | --- | --- | --- | --- | --- |
| preserved failed row | `0e75ff46-88fd-4ce2-b567-bdc3f3048531` | failed | `stage_judgment_copied,stage_questions_repeated` | null | original response body |
| separate reprocess | `reprocess-round3-local` | failed | `stage_questions_repeated` | null | same original response body |

`insertReview` on the preserved id returns `wrote: false`. Re-read keeps the historical error, `rawContent`, and `parentReviewId` `5f6d705d-fe2a-468f-97be-da16482abd32`. The response id remains in the evidence file.

## Round 4 parent

`runStageReanalysis` on the reprocess id returns `review_missing` before any chat. A failed row with `sections: null` is not a parent. `questionKey`, `priorStagePairs`, `closedQuestions`, and `unlinkedStatements` for a fourth request are assembled only after that gate. They were not assembled.

The preserved row still has `parentReviewId` and the two answered `stagePairs` (`설문조사 실시`, `비용 분석`). Those fields re-read. They do not open round 4.

## Product path, not this run

Screen `ai-pm-review-panel.tsx` posts to `/api/ai-pm-review/follow-up`. The route reads `GPT_API_KEY` and calls `submitConsultingStage` with `openReviewChat()`. That calls `runStageReanalysis`, then one `finishCall`, then `judgeStageContract`. The store is `openReviewBackend`: Supabase when the admin client is configured (`productionDatabase: true`), otherwise `.data/ai-pm-reviews.sqlite`.

This check used a temporary sqlite file and did not call that route, Supabase, or the screen.

## Calls and cost

This slice: 0 calls. Repository rate for `gpt-4o-mini` is $0.15 / $0.60 per 1M tokens. That rate is not an invoice. No round 4 call is estimated as spend, because there is no succeeded parent. A later approved product round 4 would be 1 call on `gpt-4o-mini`. The stored round 3 size was 16,807 prompt tokens and 1,473 completion tokens. One call of that size is about $0.0034 at the repository rate. This slice does not make it.

## Still open

- A round 3 response the parser accepts, then a product-store write and re-read
- Screen → API → one GPT call → parser → Supabase → screen
- Sprint 2 PASS is not declared
