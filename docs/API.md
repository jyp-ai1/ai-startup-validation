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

## Auth surfaces

### Public login

```
GET /auth/login
```

Google OAuth only. No password fields.

### QA login (internal)

```
GET /auth/qa
```

Allowlisted login id + password. Login id maps to `*@launchlens.dev`. Not linked from the public login screen.  
Server Action: `signInWithQaPasswordAction` in `apps/web/features/auth/actions/auth-actions.ts`.

**Out of scope:** admin dashboard, CRM, Google OAuth changes.

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
| 2026-07-19 | Initial API documentation scaffold |
