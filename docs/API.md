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
| 2026-10-06 | Funnel events `si_ai_pm_question_asked` / `si_ai_pm_answer_applied` for S.I.→AI PM bind (no new REST route) |
| 2026-10-06 | Funnel event `si_judgment_viewed` when S.I. Review Surface renders (no new REST route) |
| 2026-07-19 | Initial API documentation scaffold |
