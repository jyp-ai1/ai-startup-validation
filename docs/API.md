# API Documentation

> **Status:** Scaffold — endpoints will be documented as they are implemented.

## Conventions

- **Base URL:** `/api`
- **Format:** JSON request/response bodies
- **Auth:** Session-based (planned, Sprint 2)
- **Errors:** Consistent `{ error: string, code: string }` shape

## Endpoints

### Health Check

```
GET /api/health
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-07-19T00:00:00.000Z"
  }
}
```

---

### Gemini rounds

```
GET /api/gemini-rounds
POST /api/gemini-rounds
```

Logged-in session required. Without a session the status is `401` and `content` is null.

`POST` body: `executionId`, `round` (`1` or `2`), `business`, optional `customer`, `problem`, and for round 2 `feedback` plus `parentExecutionId`.

The server calls `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent` only when `GEMINI_LIVE_CALL_APPROVED=yes`, `GOOGLE_AI_API_KEY`, and `GOOGLE_AI_MAX_OUTPUT_TOKENS` are all set. Otherwise it stores `status: not_run`, `content: null`, and `liveCall: NOT_RUN`. It does not create a response text.

Round text is stored in the local sqlite file `GEMINI_ROUND_DB_PATH` (default `.data/gemini-rounds.sqlite`). That file is not the production database. Rollback: `DROP TABLE gemini_rounds` and delete the file, including `-wal` and `-shm`.

Search grounding is not requested. `sourceUrls` is empty and `sourceStatus` is `absent`.

---

### AI PM review

```
GET /api/ai-pm-review
POST /api/ai-pm-review
POST /api/ai-pm-review/feedback
POST /api/ai-pm-review/follow-up
```

Logged-in session required. Without a session the status is `401`.

`POST /api/ai-pm-review` accepts JSON `{ text }` or multipart `text` plus `file` (txt, md, pdf, docx). Both become one normalized input. A stored ready review for that input is returned with `reused: true` and no model call. Reuse and lookup use `user_id`, `project_id`, and the input hash. `project_id` alone is not access. The route rejects a project the session user does not own. A later failed version does not return an older succeeded review inside that same project. Another project with the same text does not reuse it. The workspace sends its project id with the business body. The result screen shows the stored `nextQuestion`. An older rejected follow-up summary is not placed above a newer ready review. The intake title line is not part of the comparison. The model request keeps the existing OpenAI path and `gpt-4o-mini`, with an input budget of 3,000 estimated tokens and an output cap of 800 tokens. The model returns `problem`, `target_customer`, `solution`, `business_model`, `validation_metric`, and `nextQuestion`. ALABOM maps that object into the stored review sections. A credit or quota error (`credit_balance_exhausted` or `insufficient_quota`) switches once to `gemini-3.1-flash-lite` when `GOOGLE_AI_API_KEY` is set. There is no retry loop. Other failures stay on the first provider.

The server calls the OpenAI chat adapter only when `GPT_API_KEY` is set. `OPENAI_API_KEY` does not start this route. The model id, token counts, latency, and error stay on the review record. The JSON `review` object sent to the screen has sections, version, feedback, and `questionSource`. It does not include the model id or token counts. A ready review includes `nextQuestion`, `nextQuestionReason`, and `answerHint` parsed from the model JSON. `questionSource` is `model-review` only in that case. The fixed S.I. paid-conversion sentence is rejected and is not shown as this review. Missing `GPT_API_KEY` stores `unavailable` with no sections.

`openReviewBackend()` chooses the store. When the Supabase service role is configured, the routes use `SupabaseAiPmReviewRepository` and a successful response has `storage.durable: true`. When it is not configured, the routes use local sqlite and `storage.durable` is `false`. A thrown storage error returns `503` `storage_unavailable` with `durable: false` and no review text.

The durable tables are `public.ai_pm_reviews` and `public.ai_pm_feedback` in `packages/db/src/migration/023_ai_pm_reviews.sql`. `024_ai_pm_review_project.sql` adds nullable `project_id` with no default. The app's project delete sets `deleted_at` and leaves the review on that project. A hard delete of the project row removes its reviews, and the review foreign key removes their feedback. A null `project_id` is not attached to a remaining workspace. `user_id` references `auth.users` and deletes that user's plan text, reviews, and feedback with the account. Feedback is deleted with its review. `public.business_plans` is a different document and is not this store. The local sqlite file is not kept across Vercel redeploys. A sqlite write is not a durable success.

`POST /api/ai-pm-review/feedback` stores the founder's marks on that review version and does not call a model. Opening that same review again shows the latest stored marks in the revised notes and does not call a model. `marks` may be any of `understanding_accurate`, `understanding_wrong`, `core_missing`, `unnecessary`, `evidence_unclear`, and `question_unfit`. The server maps those marks onto agreement, accuracy, revision areas, and the next action. A body that already has agreement, accuracy, revision areas, and next action is still accepted. Feedback save does not start a follow-up call.

`POST /api/ai-pm-review/follow-up` body: `reviewId`, optional `supplement`. A non-empty supplement is the founder's answer to `nextQuestion` and can run without stored feedback. An empty supplement still requires feedback. The user message is one JSON object with separate `originalInput`, `previousReview`, `feedback`, `supplement`, and, when the marks require it, `revision`. `revision.reconfirm.hypotheses` names the problem, customer, and revenue claims that depend on `understanding_wrong`, each with `requiredState` `unconfirmed`. The same object carries `confirmation` with those three keys set to `unconfirmed`. The model reply must return that `confirmation` object. A missing or non-`unconfirmed` value is not accepted. Those claims stay visible and are not accepted while the sentence that states the claim reads as a confirmed fact, even when `confirmation` says `unconfirmed`. A marker in a later sentence does not change that state. Unrelated solution and validation text is not required to be deleted, and wiping it is not acceptance. `revision.askFounder.requiredMeaning` is `ask_what_core_is_missing`. A next question that stays on a partnership or plan, including one that only inserts a missing-core phrase into that plan, is not accepted. The application compares each claim's state and the question's meaning with the previous review before accepting the follow-up. A failed comparison is stored as not accepted and is not reused as the ready review. The same feedback and supplement are not sent to the model again after that judgment. The original plan text stays on the stored row. A follow-up that already passed the comparison is returned again.

Rows live in `AI_PM_REVIEW_DB_PATH` (default `.data/ai-pm-reviews.sqlite`). That file is not the production database. Rollback: `DROP TABLE ai_pm_reviews` and `DROP TABLE ai_pm_feedback`, then delete the file, including `-wal` and `-shm`.

---

## Server Actions (Planned)

Server Actions will be documented here with:

- Action name and file path
- Input schema (Zod)
- Return type
- Auth requirements

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-27 | AI PM routes use `SupabaseAiPmReviewRepository` when the service role is configured. `storage.durable` is true only for that path. Migration 023 is not applied. |
| 2026-10-27 | Migration `023_ai_pm_reviews.sql` defines the durable review and feedback tables. It is not applied. |
| 2026-10-27 | `.env.example` names `GPT_API_KEY` for the AI PM review route. A live call is still not run. |
| 2026-10-27 | `GET/POST /api/ai-pm-review`, feedback, and follow-up. Screen name is AI PM. |
| 2026-10-06 | Funnel events `si_ai_pm_question_asked` / `si_ai_pm_answer_applied` for S.I.→AI PM bind (no new REST route) |
| 2026-10-06 | Funnel event `si_judgment_viewed` when S.I. Review Surface renders (no new REST route) |
| 2026-07-19 | Initial API documentation scaffold |
