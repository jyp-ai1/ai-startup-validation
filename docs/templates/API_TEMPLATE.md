# API Endpoint Template

> Add to `docs/API.md` when creating new routes.

---

## [METHOD] /api/[path]

**Status:** Draft | Implemented  
**Auth:** None | Session | Admin  
**Sprint:** N

### Description

Brief description of what this endpoint does.

### Request

**Headers:**

```
Content-Type: application/json
Authorization: Bearer <token>  # if auth required
```

**Body:**

```json
{
  "field": "value"
}
```

**Zod schema:**

```typescript
const schema = z.object({
  field: z.string(),
});
```

### Response

**Success — 200**

```json
{
  "success": true,
  "data": {}
}
```

**Error — 4xx/5xx**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "..."
  }
}
```

### Notes

- Service: `XxxService`
- Repository: `XxxRepository`

---

## Changelog

| Date | Change |
|------|--------|
| YYYY-MM-DD | Initial documentation |
