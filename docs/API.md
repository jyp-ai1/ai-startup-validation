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

`POST /api/ai-pm-review` accepts JSON `{ text }` or multipart `text` plus `file` (txt, md, pdf, docx). Both become one normalized input. A stored ready review for that input is returned with `reused: true` and no model call.

The server calls the OpenAI chat adapter only when `OPENAI_API_KEY` is set. The model id, token counts, latency, and error stay in the sqlite record. The JSON `review` object sent to the screen has sections, version, and feedback. It does not include the model id or token counts.

`POST /api/ai-pm-review/feedback` stores agreement, accuracy, revision areas, comment, and next action on that review version. It does not call a model. A comment is accepted when "other" is not selected.

`POST /api/ai-pm-review/follow-up` body: `reviewId`, optional `supplement`. It requires stored feedback. The prompt carries the previous sections, the feedback, and the supplement. The original plan text stays on the record and is not sent again. Repeating the same feedback and supplement returns the stored follow-up.

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
| 2026-10-27 | `GET/POST /api/ai-pm-review`, feedback, and follow-up. Screen name is AI PM. |
| 2026-10-06 | Funnel events `si_ai_pm_question_asked` / `si_ai_pm_answer_applied` for S.I.→AI PM bind (no new REST route) |
| 2026-10-06 | Funnel event `si_judgment_viewed` when S.I. Review Surface renders (no new REST route) |
| 2026-07-19 | Initial API documentation scaffold |
